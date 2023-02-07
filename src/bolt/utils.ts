import {
    ReactionAddedEvent,
    ReactionRemovedEvent
} from '@slack/bolt';
import {
    ReactionData,
    UserInfo
} from './types';
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
        displayName: display_name?.length ? display_name : real_name!,
    }
}

export async function getReactionData(event: ReactionAddedEvent|ReactionRemovedEvent): Promise<ReactionData | null> {
    if (event.item.type !== 'message') {
        return null;
    }

    let ts = event.item.ts;
    let result = await app.client.conversations.replies({
        channel: event.item.channel,
        inclusive: true,
        latest: ts,
        limit: 1,
        ts: ts,
    });

    const botUserId = await getBotUserId();

    if (!result.client_msg_id && botUserId === event.item_user) {
        ts =  (result.messages ?? [])[0].thread_ts as string;
        result = await app.client.conversations.replies({
            channel: event.item.channel,
            inclusive: true,
            latest: ts,
            limit: 1,
            ts: ts,
        });
    }

    const {
        text: slackMsgText,
        client_msg_id: slackMsgId,
        user: slackMsgUserId,
        reactions,
        thread_ts: slackMsgThreadTs
    } = (result.messages ?? [])[0] as GenericMessageEvent;

    const match = /https:\/\/github.com\/[^ ]+?\/pull\/\d+/.exec(slackMsgText as string);

    console.log('DEBUG getReactionData', result);
    console.log('DEBUG Reactions', reactions)
    return {
        slackMsgId: slackMsgId as string,
        slackMsgUserId,
        slackMsgText: slackMsgText as string,
        slackMsgThreadTs: slackMsgThreadTs as string,
        reaction: event.reaction,
        reactionUserId: event.user,
        pullRequestLink: match ? match[0] : '',
    }
}
