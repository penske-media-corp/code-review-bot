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
    getBotUserId,
    getReactionData,
} from './utils';
import Review from '../service/Review';
import {logDebug} from '../utils/log';

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
        }
        else {
            const notify = channelNotify[data.slackChannelId] || channelNotify.default;

            await say({
                text: `<${notify}>, ${result.message}`,
                thread_ts: slackThreadTs,
            });
        }
    }
    else if (slackActions.claim.includes(data.reaction)) {
        const result = await Review.claim(data);

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
    else if (slackActions.approved.includes(data.reaction)) {
        const result = await Review.approve(data);
        if (!result.user) {
            await say({
                text: `<@${reactionUserId}>, ${result.message}`,
                thread_ts: slackThreadTs,
            });
        }
        else if (['inprogress', 'pending', 'ready'].includes(result.codeReview.status)) {
            await say({
                text: `<@${slackMsgUserId}>, ${result.message}`,
                thread_ts: slackThreadTs,
            });
        }
    }
    else if (slackActions.remove.includes(data.reaction)) {
        const result = await Review.remove(data);

        if (!result.user) {
            await say({
                text: `<@${reactionUserId}>, ${result.message}`,
                thread_ts: slackThreadTs,
            });
        }
        else {
            await say({
                text: `<@${slackMsgUserId}>, ${result.message}`,
                thread_ts: slackThreadTs,
            });
        }
    }
    else if (slackActions.change.includes(data.reaction)) {
        const result = await Review.requestChanges(data);

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

app.event('app_mention', async ({ event, say }) => {
    logDebug('app_mention', event);

    const {text, ts, thread_ts, channel} = event;

    if (/.*?\btime\b/.test(text)) {
        const dateString = new Date().toString();

        await say({
            text: `The current date and time is ${dateString}`,
            thread_ts: thread_ts ?? ts,
        });
    }
    /**
     * @TODO custom bot commands:
     *
     * @pmc_code_review_bot schedule add "0 0 14 * * 1-5"
     * @pmc_code_review_bot schedule list
     * @pmc_code_review_bot schedule remove <schedule-id>
     * @pmc_code_review_bot schedule clear all
     * @pmc_code_review_bot schedule reload
     * @pmc_code_review_bot login
     *    https://api.slack.com/methods/chat.postEphemeral
     *
     * @pmc_code_review_bot status
     * @pmc_code_review_bot set notify <@team>
     * @pmc_code_review_bot set number review <repo-name> 2
     * @pmc_code_review_bot time
     */
});

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

export default app;
