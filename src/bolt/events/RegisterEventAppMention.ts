import type {App} from '@slack/bolt';
import {logDebug} from '../../utils/log';

export default function registerEventAppMention (app: App): void {
    app.event('app_mention', async ({event, say}) => {
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
}
