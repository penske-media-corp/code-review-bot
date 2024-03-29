import type {App, SayArguments} from '@slack/bolt';
import Review, {findCodeReviewRecord} from '../../service/Review';
import {getReactionData} from '../utils';
import {logDebug} from '../../lib/log';
import {slackActions} from '../../lib/config';

export default function registerEventReactionRemove (app: App): void {
    app.event('reaction_removed', async ({event, say}) => {
        logDebug('reaction_removed', event);

        // Check to make sure we only look into reaction we subscribed to
        if (!slackActions.request.includes(event.reaction) && !slackActions.claim.includes(event.reaction)) {
            return;
        }

        const data = await getReactionData(event);

        if (!data?.pullRequestLink) {
            return;
        }

        const {pullRequestLink, reactionUserId, slackThreadTs} = data;

        const codeReview = await findCodeReviewRecord({pullRequestLink});

        // All actions beyond this line must have a valid code review record existed.
        if (!codeReview) {
            await say({
                text: `<@${reactionUserId}>, Cannot locate existing code review request data.`,
                thread_ts: slackThreadTs,
            });
            return;
        }

        if (slackActions.request.includes(data.reaction)) {
            const result = await Review.withdraw(codeReview);

            await say(result.slackNotifyMessage as SayArguments);
        } else if (slackActions.claim.includes(data.reaction)) {
            const result = await Review.finish(codeReview, reactionUserId);

            if (['inprogress', 'pending'].includes(codeReview.status)) {
                await say(result.slackNotifyMessage as SayArguments);
            }
        }
    });
}
