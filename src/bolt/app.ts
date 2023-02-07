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

    if (slackActions.request.includes(data.reaction)) {
        const result = await CodeReview.add(data);
        const {user} = result;

        // If user object isn't available, there must be something wrong.
        if (!user) {
            await say({
                text: `<@${data.reactionUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else {
            const notify = channelNotify[data.slackChannelId] || channelNotify.default;

            await say({
                text: `<${notify}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
    }
    else if (slackActions.claim.includes(data.reaction)) {
        const result = await CodeReview.claim(data);

        if (!result.user) {
            await say({
                text: `<@${data.reactionUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else {
            await say({
                text: `<@${slackMsgUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
    }
    else if (slackActions.approved.includes(data.reaction)) {
        const result = await CodeReview.approve(data);
        if (!result.user) {
            await say({
                text: `<@${data.reactionUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else {
            await say({
                text: `<@${slackMsgUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
    }
    else if (slackActions.remove.includes(data.reaction)) {
        const result = await CodeReview.remove(data);

        if (!result.user) {
            await say({
                text: `<@${data.reactionUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else {
            await say({
                text: `<@${slackMsgUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
    }
    else if (slackActions.change.includes(data.reaction)) {
        const result = await CodeReview.requestChanges(data);

        if (!result.user) {
            await say({
                text: `<@${data.reactionUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else {
            await say({
                text: `<@${slackMsgUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
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
