import type {
    App,
    Block,
    GenericMessageEvent,
    KnownBlock,
    ReactionAddedEvent,
    ReactionRemovedEvent,
} from '@slack/bolt';
import type {
    ChatPostMessageArguments,
    ConversationsRepliesResponse
} from '@slack/web-api';
import type {
    ReactionData,
    UserInfo
} from './types';
import {
    extractJiraTicket,
    extractPullRequestLink
} from '../lib/utils';
import {APP_BASE_URL} from '../lib/env';
import type {ChannelInfo} from './types';
import type {GithubBotEventData} from './types';
import {generateAuthToken} from '../service/User';
import getCodeReviewList from './lib/CodeReviewList';
import {logDebug} from '../lib/log';
import pluralize from 'pluralize';
import {prisma} from '../lib/config';
import {registerSchedule} from '../lib/schedule';

let slackBotUserId: string | null = null;
let slackBotApp: App;

export async function getBotUserId (): Promise<string | null> {
    if (!slackBotUserId) {
        const result = await slackBotApp.client.auth.test();
        slackBotUserId = result.user_id ?? null;
    }
    return slackBotUserId;
}

// https://api.slack.com/methods/users.profile.get
export async function getUserInfo (user: string): Promise<UserInfo> {
    const info = await slackBotApp.client.users.profile.get({user: user});
    const {profile: {real_name, display_name} = {}} = info;

    return {
        slackUserId: user,
        displayName: display_name?.length ? display_name : real_name as string,
    };
}

/**
 * Return the list of channel information that the bot is a member of.
 */
export async function getChannels (): Promise<ChannelInfo[]> {
    const result = await slackBotApp.client.users.conversations({
        types: 'public_channel, private_channel',
    });
    if (!result.channels) {
        return [];
    }

    return result.channels.reduce((acc, val) => {
        acc.push({
            id: val.id,
            name: val.name,
        } as ChannelInfo);
        return acc;
    }, [] as ChannelInfo[]);
}

export const channelMaps: {[index: string]: ChannelInfo} = {};
export let channelList: ChannelInfo[] = [];
export function updateChannelInfo (): void {
    void getChannels().then((result) => {
        channelList = result;
        result.forEach((channelInfo) => {
            channelMaps[channelInfo.id] = channelMaps[channelInfo.name] = channelInfo;
        });
    });
}

export async function getReactionData (event: ReactionAddedEvent | ReactionRemovedEvent): Promise<ReactionData | null> {
    if (event.item.type !== 'message') {
        return null;
    }

    let result = await slackBotApp.client.conversations.replies({
        channel: event.item.channel,
        inclusive: true,
        latest: event.item.ts,
        limit: 1,
        ts: event.item.ts,
    });

    const getMessageInfo = async (data: ConversationsRepliesResponse): Promise<ReactionData> => {
        const message = (data.messages ?? [])[0] as GenericMessageEvent;
        let pullRequestLink = '';
        let jiraTicket = '';
        let slackMsgUserId = message.user;

        // Try to parse github pull request from text message if available.
        if (message.text) {
            pullRequestLink = extractPullRequestLink(message.text) || pullRequestLink;
            jiraTicket = await extractJiraTicket(message.text) || jiraTicket;
        }

        // If there is no PR info, try to check the message attachments, message is coming from github event.
        if (!pullRequestLink.length && message.attachments?.length) {
            const title = message.attachments[0].title;
            pullRequestLink = title && extractPullRequestLink(title) || pullRequestLink;
            // If the message coming from the event bot, we want to assign the request to the reaction user.
            slackMsgUserId = event.user;
        }

        return {
            jiraTicket,
            pullRequestLink,
            slackMsgText: message.text,
            slackMsgId: message.client_msg_id,
            slackMsgUserId,
            slackThreadTs: message.thread_ts ?? message.ts,
        } as ReactionData;
    };
    const botUserId = await getBotUserId();
    let messageInfo = await getMessageInfo(result);

    if (!result.client_msg_id && botUserId === event.item_user && !messageInfo.pullRequestLink.length &&
        messageInfo.slackMsgTs !== messageInfo.slackThreadTs) {

        result = await slackBotApp.client.conversations.replies({
            channel: event.item.channel,
            inclusive: true,
            latest: messageInfo.slackThreadTs,
            limit: 1,
            ts: messageInfo.slackThreadTs,
        });
        messageInfo = await getMessageInfo(result);
    }

    result = await slackBotApp.client.chat.getPermalink({
        channel: event.item.channel,
        message_ts: messageInfo.slackThreadTs,
    });

    const {permalink} = result;

    return {
        ...messageInfo,
        slackPermalink: permalink as string,
        reaction: event.reaction,
        reactionUserId: event.user,
        slackChannelId: event.item.channel,
    };
}

/**
 * Parse and return the data we needed.
 * Currently only process Github bot pull request closed message.
 *
 * @param event
 */
export function getGithubBotEventData (event: GenericMessageEvent): GithubBotEventData | null {
    if (!event.bot_id || !event.attachments?.length) {
        return null;
    }

    const {pretext, title} = event.attachments[0];
    const pullRequestLink = title && extractPullRequestLink(title) || '';

    if (pullRequestLink === '' || !pretext) {
        return null;
    }

    if (!pretext.includes('Pull request closed by')) {
        return null;
    }

    return {
        pullRequestLink,
        action: 'close',
        message: pretext,
    };
}

export async function postSlackMessage (slackMessage: ChatPostMessageArguments): Promise<void> {
    await slackBotApp.client.chat.postMessage(slackMessage);
}

export async function sendCodeReviewSummary (channel: string): Promise<void> {
    let text = '*Reminders!*';

    const result = await prisma.codeReview.groupBy({
        by: ['status'],
        where: {
            status: {
                in: ['pending', 'inprogress'],
            },
            slackChannelId: channel,
        },
        _count: {
            status: true,
        }
    });

    // Translate result array into object.  @TODO: Should combine the code an move the groupBy codes into a reusable module.
    const counts: {pending?: number; inprogress?: number} = result.reduce((acc, item) => {
        return {
            ...acc,
            ...{
                [item.status]: item._count.status,
            }
        };
    }, {});

    const pendingCount: number = counts.pending ?? 0;
    const inProgressCount: number = counts.inprogress ?? 0;

    if (pendingCount + inProgressCount === 0) {
        return;
    }

    if (pendingCount > 0) {
        text = `${text}\nThere ${pluralize('is', pendingCount)} <${APP_BASE_URL}|*${pendingCount}* outstanding ${pluralize('request', pendingCount)}> waiting for code review.`;
    }
    if (inProgressCount > 0) {
        text = `${text}\n*${inProgressCount}* in progress ${pluralize('request', inProgressCount)} ${pluralize('is', inProgressCount)} waiting for approval.`;
    }

    logDebug(`Sending reminders to channel ${channel}`);
    await postSlackMessage({
        mrkdwn: true,
        channel,
        text,
    });
}

export async function sentHomePageCodeReviewList ({slackUserId, codeReviewStatus, slackChannelId}: {slackUserId: string; codeReviewStatus?: string; slackChannelId?: string}): Promise<void> {
    const buttonPendingReviews = {
        type: 'button',
        text: {
            type: 'plain_text',
            text: 'Pending Reviews',
            emoji: true
        },
        value: 'pending',
        action_id: 'pending'
    };
    const buttonInProgressReviews = {
        type: 'button',
        text: {
            type: 'plain_text',
            text: 'In Progress Reviews',
            emoji: true
        },
        value: 'inprogress',
        action_id: 'inprogress'
    };
    const buttonMyReviews = {
        type: 'button',
        text: {
            type: 'plain_text',
            text: 'My Reviews',
            emoji: true
        },
        value: 'mine',
        action_id: 'mine',
    };

    // Retrieve the user session info from user record in db.
    const user = await prisma.user.findFirst({
        where: {
            slackUserId,
        }
    });

    const session = (user?.session ?? {filterChannel: '', filterStatus: ''}) as {filterChannel?: string; filterStatus?: string};
    const filterChannel = slackChannelId ?? session.filterChannel;
    const filterStatus = codeReviewStatus ?? session.filterStatus;

    if (user) {
        // If the request filter changed, save them to the session.
        if (filterChannel !== session.filterChannel || filterStatus !== session.filterStatus) {
            Object.assign(session, {filterChannel, filterStatus});
            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    session,
                }
            });
        }
    }

    const filterByChannel = {
        type: 'channels_select',
        placeholder: {
            type: 'plain_text',
            text: 'Filter by channel',
            emoji: true
        },
        // initial_channel: '',
        action_id: 'channel',
        ...filterChannel?.length && {
            initial_channel: filterChannel,
        } || {}
    };

    let webLoginUrl = APP_BASE_URL;

    if (user) {
        let {authToken} = user.session as Partial<{authToken: string}>;

        if (!authToken?.length) {
            authToken = await generateAuthToken(user) as string;
        }

        if (authToken?.length) {
            webLoginUrl = `${APP_BASE_URL}/auth/slack/${slackUserId}/${authToken}`;
        }
    }

    const blocks: (Block | KnownBlock)[] = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Outstanding Code Review Queue:* <${webLoginUrl}|${APP_BASE_URL}>`
            }
        },
        {
            type: 'actions',
            elements: [
                filterByChannel,
                buttonPendingReviews,
                buttonInProgressReviews,
                buttonMyReviews,
            ],
        },
        ...await getCodeReviewList({codeReviewStatus: filterStatus, slackChannelId: filterChannel, userId: user?.id})
    ];

    switch (filterStatus) {
        case 'mine':
            Object.assign(buttonMyReviews, {style: 'primary'});
            break;
        case 'inprogress':
            Object.assign(buttonInProgressReviews, {style: 'primary'});
            break;
        default:
            Object.assign(buttonPendingReviews, {style: 'primary'});
            break;
    }

    await slackBotApp.client.views.publish({
        user_id: slackUserId,
        view: {
            type: 'home',
            callback_id: 'home_page',

            blocks,
        }
    });
}

export function registerSlackBotApp (app: App): void {
    slackBotApp = app;
    registerSchedule();
    updateChannelInfo();
}
