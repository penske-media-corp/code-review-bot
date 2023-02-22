import {App, SayArguments} from '@slack/bolt';
import {PrismaClient} from '@prisma/client';
import Review from '../../service/Review';
import {getReactionData} from '../utils';
import {logDebug} from '../../utils/log';
import {slackActions} from '../../utils/config';

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

        const {pullRequestLink, reactionUserId, slackThreadTs} = data;

        const prisma = new PrismaClient();
        const codeReview = await prisma.codeReview.findFirst({
            include: {
                user: true,
            },
            where: {
                pullRequestLink,
            }
        })

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
        }
        else if(slackActions.claim.includes(data.reaction)) {
            const result = await Review.finish(codeReview, reactionUserId);

            if (['inprogress', 'pending'].includes(codeReview.status)) {
                await say(result.slackNotifyMessage as SayArguments);
            }
        }
    });
}
