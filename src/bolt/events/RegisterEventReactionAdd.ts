import type {
    App,
    SayArguments
} from '@slack/bolt';
import {
    getGroupToMentionInChannel,
    slackActions,
} from '../../lib/config';
import Review from '../../service/Review';
import {getReactionData} from '../utils';
import {logDebug} from '../../lib/log';
import {prisma} from '../../lib/config';

export default function registerEventReactionAdd (app: App): void {
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

        const {pullRequestLink, reactionUserId, slackThreadTs} = data;

        if (slackActions.request.includes(data.reaction)) {
            const result = await Review.add(data);
            const {codeReview} = result;

            // If user object isn't available, there must be something wrong.
            if (!codeReview) {
                await say({
                    text: `<@${reactionUserId}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            } else {
                const notify = await getGroupToMentionInChannel(data.slackChannelId);

                await say({
                    text: `<${notify}>, ${result.message}`,
                    thread_ts: slackThreadTs,
                });
            }
        }

        const codeReview = await prisma.codeReview.findFirst({
            include: {
                user: true,
                reviewers: true,
            },
            where: {
                pullRequestLink,
            }
        });

        // All actions beyond this line must have a valid code review record existed.
        if (!codeReview) {
            return;
        }

        if (slackActions.claim.includes(data.reaction)) {
            const result = await Review.claim(codeReview, reactionUserId);

            if (['inprogress', 'pending'].includes(codeReview.status)) {
                await say(result.slackNotifyMessage as SayArguments);
            }
        } else if (slackActions.approved.includes(data.reaction)) {
            const result = await Review.approve(codeReview, reactionUserId);

            if (['inprogress', 'pending', 'ready'].includes(codeReview.status)) {
                await say(result.slackNotifyMessage as SayArguments);
            }
        } else if (slackActions.remove.includes(data.reaction)) {
            const result = await Review.remove(codeReview, reactionUserId);

            await say(result.slackNotifyMessage as SayArguments);
        } else if (slackActions.change.includes(data.reaction)) {
            const result = await Review.requestChanges(codeReview, reactionUserId);

            if (['inprogress', 'pending'].includes(codeReview.status)) {
                await say(result.slackNotifyMessage as SayArguments);
            }
        } else if (slackActions.close.includes(data.reaction)) {
            const result = await Review.close(codeReview);

            if (codeReview.status === 'closed') {
                await say(result.slackNotifyMessage as SayArguments);
            }
        }
    });
}
