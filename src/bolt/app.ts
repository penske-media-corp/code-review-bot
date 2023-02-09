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
import CodeReview from '../service/CodeReview';
import {
    getBotUserId,
    getReactionData,
} from './utils';

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

app.event('reaction_added', async ({ event, say }) => {
    const data = await getReactionData(event);

    if (!data?.pullRequestLink) {
        return;
    }

    const {reactionUserId, slackMsgUserId, slackMsgThreadTs} = data;

    if (slackActions.request.includes(data.reaction)) {
        const result = await CodeReview.add(data);
        const {user} = result;

        // If user object isn't available, there must be something wrong.
        if (!user) {
            await say({
                text: `<@${reactionUserId}>, ${result.message}`,
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
                text: `<@${reactionUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else if (['inprogress', 'pending'].includes(result.codeReviewRequest.status as string)) {
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
                text: `<@${reactionUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else if (['inprogress', 'pending', 'ready'].includes(result.codeReviewRequest.status as string)) {
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
                text: `<@${reactionUserId}>, ${result.message}`,
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
                text: `<@${reactionUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else if (['inprogress', 'pending'].includes(result.codeReviewRequest.status as string)) {
            await say({
                text: `<@${slackMsgUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
    }
});

app.event('reaction_removed', async ({ event, say }) => {
    const data = await getReactionData(event);

    if (!data) {
        return;
    }

    const {reactionUserId, slackMsgUserId, slackMsgThreadTs} = data;

    if (slackActions.request.includes(data.reaction)) {
        const result = await CodeReview.withdraw(data);

        if (!result.user) {
            await say({
                text: `<@${reactionUserId}>, ${result.message}`,
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
    else if(slackActions.claim.includes(data.reaction)) {
        const result = await CodeReview.finish(data);

        if (!result.user) {
            await say({
                text: `<@${reactionUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
        else if (['inprogress', 'pending'].includes(result.codeReviewRequest.status as string)) {
            await say({
                text: `<@${slackMsgUserId}>, ${result.message}`,
                thread_ts: slackMsgThreadTs,
            });
        }
    }
});

app.event('app_mention', async ({ event, say }) => {
    const {text, ts, thread_ts, channel} = event;

    console.log('DEBUG: app_mention', event);

    if (/.*?\btime\b/.test(text)) {
        const dateString = new Date().toString();

        await say({
            text: `The current date and time is ${dateString}`,
            thread_ts: thread_ts ?? ts,
        });
    }

    console.log('DEBUG getBotUserId()', await getBotUserId())
});

app.event('member_joined_channel',async ({ event, say }) => {
    console.log('DEBUG: member_joined_channel', event);
});

export default app;
