import {
    getBotUserId,
    updateChannelInfo
} from '../utils';
import type {App} from '@slack/bolt';
import {logDebug} from '../../lib/log';

export default function registerEventMemberJoinedChannel (app: App): void {
    app.event('member_joined_channel', async ({event, say}) => {
        logDebug('member_joined_channel', event);

        if (await getBotUserId() !== event.user) {
            return;
        }
        await updateChannelInfo();
    });
}
