import {App} from '@slack/bolt';
import {getBotUserId} from '../utils';
import {logDebug} from '../../utils/log';
export default function registerEventMemberJoinedChannel(app: App) {
    app.event('member_joined_channel',async ({ event, say }) => {
        logDebug('member_joined_channel', event);

        if (await getBotUserId() !== event.user) {
            return;
        }

        /**
         * @TODO: if bot is detected to join a channel
         * Trigger default setup for the channel, notification, etc...
         */
    });
}
