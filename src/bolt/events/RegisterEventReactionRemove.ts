import {channelNotify, slackActions} from '../../utils/config';
import {App} from '@slack/bolt';
import Review from '../../service/Review';
import {getReactionData} from '../utils';
import {logDebug} from '../../utils/log';

export default function registerEventReactionRemove(app: App) {
    app.event('reaction_removed', async ({ event, say }) => {
        logDebug('reaction_removed', event);

        // Check to make sure we only look into reaction we subscribed to
        if (!slackActions.request.includes(event.reaction) && !slackActions.claim.includes(event.reaction)) {
            return;
        }

        const data = await getReactionData(event);

        if (!data) {
            return;
        }

        const {reactionUserId, slackMsgUserId, slackThreadTs} = data;

        if (slackActions.request.includes(data.reaction)) {
            const result = await Review.withdraw(data);

            if (!result.user) {
                await say({
                    text: `<@${reactionUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
            else {
                const notify = channelNotify[data.slackChannelId] || channelNotify.default;

                await say({
                    text: `<${notify}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
        }
        else if(slackActions.claim.includes(data.reaction)) {
            const result = await Review.finish(data);

            if (!result.user) {
                await say({
                    text: `<@${reactionUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
            else if (['inprogress', 'pending'].includes(result.codeReview.status)) {
                await say({
                    text: `<@${slackMsgUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
        }
    });
}
