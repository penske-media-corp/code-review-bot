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
import type {
    GenericMessageEvent
} from '@slack/bolt/dist/types/events/message-events';
import getCodeReviewList from './lib/CodeReviewList';

let slackBotUserId: string | null = null;
let slackBotApp: App;

export function registerSlackBotApp (app: App): void {
    slackBotApp = app;
}

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
        if (!pullRequestLink.length && message.attachments && message.attachments.length) {
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

export async function sentHomePageCodeReviewList (slackUserId: string, status: string = 'pending'): Promise<void> {
    const blocks: (Block | KnownBlock)[] = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '*Outstanding Code Review Queue:* <https://code-review.pmcdev.io>'
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

export async function postSlackMessage (slackMessage: ChatPostMessageArguments): Promise<void> {
    await slackBotApp.client.chat.postMessage(slackMessage);
}
