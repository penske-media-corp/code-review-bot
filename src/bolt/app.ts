import {
    App,
    LogLevel,
} from '@slack/bolt';
import {
    SLACK_APP_TOKEN,
    SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET
} from '../utils/env';
import {
    channelNotify,
    slackActions
} from '../utils/config';
import {
    getReactionData,
    getUserInfo,
} from './utils';
import CodeReview from '../service/CodeReview';

const app = new App({
    appToken: SLACK_APP_TOKEN,
    logLevel: LogLevel.ERROR,
    signingSecret: SLACK_SIGNING_SECRET,
    socketMode: true,
    token: SLACK_BOT_TOKEN,
});

app.use(async ({ next }) => {
    await next();
});

app.event('reaction_added', async ({ event, client, say }) => {
    console.log('EVENT', event);
    const data = await getReactionData(event);

    if (!data?.pullRequestLink) {
        return;
    }

    const {slackMsgUserId, slackMsgThreadTs} = data;

    // @TODO
    const reactionUserName = (await getUserInfo(data.reactionUserId)).displayName;

    if (slackActions.request.includes(data.reaction)) {
        const result = await CodeReview.add(data);
        const {codeReviewRequestUser} = result;

        // If user object isn't available, there must be something wrong.
        if (!codeReviewRequestUser) {
            await say({
                text: `<@${data.reactionUserId}>, ${result.message}.`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else {
            const userDisplayName = codeReviewRequestUser.displayName as string;
            // @TODO: Replace with configuration mention @groups/team/channel to alert on.
            const notify = channelNotify[data.slackChannelId] || channelNotify.default;

            await say({
                text: `<${notify}>, *${userDisplayName}* has request a code review! ${result.message}.`,
                thread_ts: slackMsgThreadTs,
            });
        }
    }
    else if (slackActions.claim.includes(data.reaction)) {
        const result = await CodeReview.claim(data);
        const {codeReviewClaimUser} = result;

        if (!codeReviewClaimUser) {
            await say({
                text: `<@${data.reactionUserId}>, ${result.message}.`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else {
            const claimUserDisplayName = codeReviewClaimUser.displayName as string

            await say({
                text: `<@${slackMsgUserId}>, *${claimUserDisplayName}* claimed the code review.  ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
    }
    else if (slackActions.approved.includes(data.reaction)) {
        const result = await CodeReview.approve(data);
        const {codeReviewApprovedUser} = result;
        if (!codeReviewApprovedUser) {
            await say({
                text: `<@${data.reactionUserId}>, ${result.message}.`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else {
            const approvedUserDisplayName = codeReviewApprovedUser.displayName as string
            await say({
                text: `<@${slackMsgUserId}>, *${approvedUserDisplayName}* approved your code. ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
    }
    else if (slackActions.remove.includes(data.reaction)) {
        await CodeReview.remove(data);
        await say({
            text: `TODO: Pull request has been removed from review queue.`,
            thread_ts: slackMsgThreadTs,
        });
    }
    else if (slackActions.change.includes(data.reaction)) {
        await CodeReview.requestChanges(data);
        await say({
            text: `TODO: <@${slackMsgUserId}>, *${reactionUserName}* requested changes on your pull request.`,
            thread_ts: slackMsgThreadTs,
        });
    }
});

app.event('reaction_removed', async ({ event, client, say }) => {
    console.log('DEBUG', event);
    const data = await getReactionData(event);

    if (!data) {
        return;
    }

    const reactionUserName = (await getUserInfo(data.reactionUserId)).displayName;

    const {slackMsgThreadTs} = data;

    if (slackActions.change.includes(data.reaction)) {
        await CodeReview.withdraw(data);
        await say({
            text: `TODO: *${reactionUserName}* withdraw the code review request.`,
            thread_ts: slackMsgThreadTs,
        });
    }
    else if(slackActions.claim.includes(data.reaction)) {
        await CodeReview.finish(data);
        await say({
            text: `TODO: *${reactionUserName}* finished reviewing the code.`,
            thread_ts: slackMsgThreadTs,
        });
    }
});

export default app;
