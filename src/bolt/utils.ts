import type {
    App,
    Block,
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
    prisma,
    scheduledReminders
} from '../utils/config';
import {APP_BASE_URL} from '../utils/env';
import type {
    GenericMessageEvent
} from '@slack/bolt/dist/types/events/message-events';
import getCodeReviewList from './lib/CodeReviewList';
import {logDebug} from '../utils/log';
import pluralize from 'pluralize';
import {scheduleJob} from 'node-schedule';

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

    const getMessageInfo = (data: ConversationsRepliesResponse): ReactionData => {
        const message = (data.messages ?? [])[0] as GenericMessageEvent;
        let pullRequestLink = '';

        // Try to parse github pull request from text message if available.
        if (message.text) {
            const match = /https:\/\/github.com\/[^ ]+?\/pull\/\d+/.exec(message.text);
            pullRequestLink = match ? match[0] : '';
        }

        // If there is no PR info, try to check the message attachments, message is coming from github event.
        if (!pullRequestLink.length && message.attachments?.length) {
            const {title} = message.attachments[0];
            if (title) {
                const match = /https:\/\/github.com\/[^ ]+?\/pull\/\d+/.exec(title);
                pullRequestLink = match ? match[0] : '';
            }
        }

        return {
            slackMsgText: message.text,
            slackMsgId: message.client_msg_id,
            slackMsgUserId: message.user,
            slackThreadTs: message.thread_ts ?? message.ts,
            pullRequestLink,
        } as ReactionData;
    };
    const botUserId = await getBotUserId();
    let messageInfo = getMessageInfo(result);

    if (!result.client_msg_id && botUserId === event.item_user && !messageInfo.pullRequestLink.length &&
        messageInfo.slackMsgTs !== messageInfo.slackThreadTs) {

        result = await slackBotApp.client.conversations.replies({
            channel: event.item.channel,
            inclusive: true,
            latest: messageInfo.slackThreadTs,
            limit: 1,
            ts: messageInfo.slackThreadTs,
        });
        messageInfo = getMessageInfo(result);
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


export async function postSlackMessage (slackMessage: ChatPostMessageArguments): Promise<void> {
    await slackBotApp.client.chat.postMessage(slackMessage);
}

export async function sendCodeReviewSummary (channel: string): Promise<void> {
    let text = '*Reminders!*';
    let pendingCount: number = 0;
    let inProgressCount: number = 0;

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

    result.forEach((item) => {
        switch (item.status) {
            case 'pending':
                pendingCount += item._count.status;
                break;
            case 'inprogress':
                inProgressCount += item._count.status;
        }
    });

    if (!pendingCount && !inProgressCount) {
        return;
    }

    if (pendingCount) {
        text = `${text}\nThere ${pluralize('is', pendingCount)} <${APP_BASE_URL}|*${pendingCount}* outstanding ${pluralize('request', pendingCount)}> waiting for code review.`;
    }
    if (inProgressCount) {
        text = `${text}\n*${inProgressCount}* in progress ${pluralize('request', inProgressCount)} ${pluralize('is', inProgressCount)} waiting for approval.`;
    }

    logDebug(`Sending reminders to channel ${channel}`);
    await postSlackMessage({
        mrkdwn: true,
        channel,
        text,
    });
}

export async function sentHomePageCodeReviewList (slackUserId: string, status: string = 'pending'): Promise<void> {
    const blocks: (Block | KnownBlock)[] = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Outstanding Code Review Queue:* <${APP_BASE_URL}>`
            }
        },
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Pending Reviews',
                        emoji: true
                    },
                    value: `pending`,
                    action_id: `pending`
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'In Progress Reviews',
                        emoji: true
                    },
                    value: `inprogress`,
                    action_id: `inprogress`
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'My Reviews',
                        emoji: true
                    },
                    value: 'mine',
                    action_id: `mine`,
                },
            ]
        },
        ...await getCodeReviewList(status, slackUserId)
    ];

    await slackBotApp.client.views.publish({
        user_id: slackUserId,
        view: {
            type: 'home',
            callback_id: 'home_page',

            blocks,
        }
    });
}

// @TODO: Support different schedule for each channel
export async function sendReminders (): Promise<void> {
    const result = await prisma.codeReview.findMany({
        where: {
            status: {
                in: ['pending', 'inprogress'],
            },
        },
        distinct: ['slackChannelId'],
    });

    result.forEach((item) => {
        if (!item.slackChannelId) {
            return;
        }
        void sendCodeReviewSummary(item.slackChannelId);
    });
}

export function registerSlackBotApp (app: App): void {
    slackBotApp = app;
    scheduledReminders.forEach((rule) => scheduleJob(rule, sendReminders));
}
