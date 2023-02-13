import {channelNotify, slackActions} from '../../utils/config';
import {App} from '@slack/bolt';
import Review from '../../service/Review';
import {getReactionData} from '../utils';
import {logDebug} from '../../utils/log';

export default function registerEventReactionAdd(app: App) {
    app.event('reaction_added', async ({event, say}) => {
        logDebug('reaction_added', event);

        // Check to make sure we only look into reaction we subscribed to
        if (!Object.values(slackActions).some((items) => items.includes(event.reaction))) {
            return;
        }

        const data = await getReactionData(event);

        if (!data?.pullRequestLink) {
            return;
        }

        const {reactionUserId, slackMsgUserId, slackThreadTs} = data;

        if (slackActions.request.includes(data.reaction)) {
            const result = await Review.add(data);
            const {user} = result;

            // If user object isn't available, there must be something wrong.
            if (!user) {
                await say({
                    text: `<@${reactionUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            } else {
                const notify = channelNotify[data.slackChannelId] || channelNotify.default;

                await say({
                    text: `<${notify}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
        } else if (slackActions.claim.includes(data.reaction)) {
            const result = await Review.claim(data);

            if (!result.user) {
                await say({
                    text: `<@${reactionUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            } else if (['inprogress', 'pending'].includes(result.codeReview.status)) {
                await say({
                    text: `<@${slackMsgUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
        } else if (slackActions.approved.includes(data.reaction)) {
            const result = await Review.approve(data);
            if (!result.user) {
                await say({
                    text: `<@${reactionUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            } else if (['inprogress', 'pending', 'ready'].includes(result.codeReview.status)) {
                await say({
                    text: `<@${slackMsgUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
        } else if (slackActions.remove.includes(data.reaction)) {
            const result = await Review.remove(data);

            if (!result.user) {
                await say({
                    text: `<@${reactionUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            } else {
                await say({
                    text: `<@${slackMsgUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
        } else if (slackActions.change.includes(data.reaction)) {
            const result = await Review.requestChanges(data);

            if (!result.user) {
                await say({
                    text: `<@${reactionUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            } else if (['inprogress', 'pending'].includes(result.codeReview.status)) {
                await say({
                    text: `<@${slackMsgUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
        }
    });
}
