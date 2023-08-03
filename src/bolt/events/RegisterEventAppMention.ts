import {channelList, updateChannelInfo} from '../utils';
import {
    getGroupToMentionInChannel,
    getRepositoryNumberOfApprovals,
    getRepositoryNumberOfReviews,
    setGroupToMentionInChannel,
    setJiraTicketRegEx,
    setRepositoryNumberOfApprovals,
    setRepositoryNumberOfReviews,
} from '../../lib/config';
import type {App} from '@slack/bolt';
import {logDebug} from '../../lib/log';

export default function registerEventAppMention (app: App): void {
    app.event('app_mention', async ({event, say}) => {
        logDebug('app_mention', event);

        const {text, ts, thread_ts, channel} = event;

        if (/What time is it\?/i.test(text)) {
            const dateString = new Date().toString();

            await say({
                text: `The current date and time is ${dateString}`,
                thread_ts: thread_ts ?? ts,
            });
        } else {
            const regExCmd = /\s+(set|update)\s+([^\s]+)(?:\s+([^\s]+)(?:\s+)?(\d+)?)?/i;
            const result = regExCmd.exec(text);

            if (!result) {
                return;
            }

            result.shift();
            logDebug('set|update command', result);
            switch (result[1]) {
                case 'channels':
                    await updateChannelInfo();
                    await say({
                        text: `Channel list updated: ${JSON.stringify(channelList)}`,
                        thread_ts: thread_ts ?? ts,
                    });
                    break;
                case 'review':
                    await setRepositoryNumberOfReviews(result[2], parseInt(result[3]));
                    await say({
                        text: `Set number of review required for *${result[2]}* to ${await getRepositoryNumberOfReviews(result[2])}`,
                        thread_ts: thread_ts ?? ts,
                    });
                    break;
                case 'approval':
                    await setRepositoryNumberOfApprovals(result[2], parseInt(result[3]));
                    await say({
                        text: `Set number of approval required for *${result[2]}* to ${await getRepositoryNumberOfApprovals(result[2])}`,
                        thread_ts: thread_ts ?? ts,
                    });
                    break;
                case 'notify':
                    {
                        const match = /^<?(.+?)>?$/.exec(result[2]);

                        if (match && match[1]) {
                            await setGroupToMentionInChannel(channel, match[1]);
                            await say({
                                text: `Set notify to *${await getGroupToMentionInChannel(channel)}*`,
                                thread_ts: thread_ts ?? ts,
                            });
                        }
                    }
                    break;
                case 'jira-ticket-regex':
                    await setJiraTicketRegEx(result[2]);
                    await say({
                        text: `Set Jira Ticket Patterns to *${result[2]}*`,
                        thread_ts: thread_ts ?? ts,
                    });
                    break;
            }

        }
        /**
         * @TODO custom bot commands:
         *
         * @pmc_code_review_bot schedule set "0 12 * * 1-5" "America/Los_Angeles"
         * @pmc_code_review_bot schedule list
         * @pmc_code_review_bot schedule clear
         * @pmc_code_review_bot login
         *    https://api.slack.com/methods/chat.postEphemeral
         *
         * @pmc_code_review_bot set notify <@team>
         * @pmc_code_review_bot set review <repo-name> 2
         * @pmc_code_review_bot set approval <repo-name> 2
         * @pmc_code_review_bot load setting {json-string}
         */
    });
}
