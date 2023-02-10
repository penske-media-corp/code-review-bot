import {
    ReactionAddedEvent,
    ReactionRemovedEvent
} from '@slack/bolt';
import {
    ReactionData,
    UserInfo
} from './types';
import {
    ConversationsRepliesResponse
} from '@slack/web-api/dist/response/ConversationsRepliesResponse';
import {
    GenericMessageEvent
} from '@slack/bolt/dist/types/events/message-events';
import app from './app';

let botUserId : string | unknown = null;

export async function getBotUserId() {
    if (!botUserId) {
        const result = await app.client.auth.test();
        botUserId = result.user_id;
    }
    return botUserId;
}

// https://api.slack.com/methods/users.profile.get
export async function getUserInfo(user: string): Promise<UserInfo> {
    const info = await app.client.users.profile.get({user: user});
    const {real_name, display_name} = info.profile ?? {};

    return {
        slackUserId: user,
        displayName: display_name?.length ? display_name : real_name as string,
    }
}

export async function getReactionData(event: ReactionAddedEvent|ReactionRemovedEvent): Promise<ReactionData | null> {
    if (event.item.type !== 'message') {
        return null;
    }

    let result = await app.client.conversations.replies({
        channel: event.item.channel,
        inclusive: true,
        latest: event.item.ts,
        limit: 1,
        ts: event.item.ts,
    });

    const getMessageInfo = (data: ConversationsRepliesResponse) => {
        const message = (data.messages ?? [])[0] as GenericMessageEvent;
        return {
            slackMsgText: message.text,
            slackMsgId: message.client_msg_id,
            slackMsgUserId: message.user,
            slackThreadTs: message.thread_ts ?? message.ts
        }
    };
    const botUserId = await getBotUserId();
    let messageInfo;

    if (!result.client_msg_id && botUserId === event.item_user) {
        messageInfo = getMessageInfo(result);
        result = await app.client.conversations.replies({
            channel: event.item.channel,
            inclusive: true,
            latest: messageInfo.slackThreadTs,
            limit: 1,
            ts: messageInfo.slackThreadTs,
        });

    }

    messageInfo = getMessageInfo(result);

    result = await app.client.chat.getPermalink({
        channel: event.item.channel,
        message_ts: messageInfo.slackThreadTs,
    });

    const {permalink} = result;

    const match = /https:\/\/github.com\/[^ ]+?\/pull\/\d+/.exec(messageInfo.slackMsgText as string);
    return {
        ...messageInfo,
        slackPermalink: permalink as string,
        reaction: event.reaction,
        reactionUserId: event.user,
        pullRequestLink: match ? match[0] : '',
        slackChannelId: event.item.channel,
    };
}
