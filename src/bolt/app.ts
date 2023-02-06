/* eslint-disable no-console */
/* eslint-disable import/no-internal-modules */

import {
    App,
    LogLevel,
} from '@slack/bolt';
import {
    SLACK_APP_TOKEN,
    SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET
} from '../utils/env';
import CodeReview from '../service/CodeReview';
import {
    getReactionData,
    getUserInfo,
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

app.event('reaction_added', async ({ event, client, say }) => {
console.log('EVENT', event);
    const data = await getReactionData(event);

    if (!data || !data.pullRequestLink) {
        return;
    }

    // @TODO
    const reactionUserName = (await getUserInfo(data?.reactionUserId)).displayName;

    if (['review'].includes(data.reaction)) {
        const result = await CodeReview.add(data);
        const {user} = result;

        // If user object isn't available, there must be something wrong.
        if (!user) {
            await say({
                text: `<@${data.reactionUserId}>, ${result.message}.`,
                thread_ts: data.slackMsgThreadTs,
            });
        }
        else {
            await say({
                // @TODO: Replace with configuration mention @groups/team to alert on.
                text: `<@TODO>, *${user.displayName}* has request a code review! ${result.message}.`,
                thread_ts: data.slackMsgThreadTs,
            });
        }
    }
    else if (['eyes'].includes(data.reaction)) {
        const result = await CodeReview.claim(data);
        await say({
            text: `<@${data.slackMsgUserId}>, *${reactionUserName}* claimed the code review.  ${result.message}`,
            thread_ts: data.slackMsgThreadTs,
        });
    }
    else if (['white_check_mark', 'heavy_check_mark','approved'].includes(data.reaction)) {
        const result = await CodeReview.approve(data);
        await say({
            text: `<@${data.slackMsgUserId}>, ${reactionUserName} approved your code. ${result.message}`,
            thread_ts: data.slackMsgThreadTs,
        });
    }
    else if (['trash'].includes(data.reaction)) {
        await CodeReview.remove(data);
        await say({
            text: `Pull request has been removed from review queue.`,
            thread_ts: data.slackMsgThreadTs,
        });
    }
    else if (['memo','request-changes'].includes(data.reaction)) {
        await CodeReview.requestChanges(data);
        await say({
            text: `<@${data.slackMsgUserId}>, *${reactionUserName}* requested changes on your pull request.`,
            thread_ts: data.slackMsgThreadTs,
        });
    }
});

app.event('reaction_removed', async ({ event, client, say }) => {
console.log('DEBUG', event);
    const data = await getReactionData(event);
    const reactionUserName = (await getUserInfo(data?.reactionUserId)).displayName;

    if (!data) {
        return;
    }

    if (['review'].includes(data.reaction)) {
        await CodeReview.withdraw(data);
        await say({
            text: `*${reactionUserName}* withdraw the code review request.`,
            thread_ts: data.slackMsgThreadTs,
        });
    }
    else if(['eyes'].includes(data.reaction)) {
        await CodeReview.finish(data);
        await say({
            text: `*${reactionUserName}* finished reviewing the code.`,
            thread_ts: data.slackMsgThreadTs,
        });
    }
});

app.message(/https:\/\/github.com\/.*?\/pull\/.+/, async ({ message, say }) => {
    console.log("\nDEBUG", message, "\n");
    if (message.subtype === undefined || message.subtype === 'bot_message') {
        await say({
            text: `<@${message.user}>, your pull request has been added to the queues.`,
            thread_ts: message.event_ts,
        });
    }
});

export default app;
