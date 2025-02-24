import {channelList, updateChannelInfo} from '../utils';
import {
    getDataRetentionInMonth,
    getDefaultReviewChannel,
    getGroupToMentionInChannel,
    getRepositoryNumberOfApprovals,
    getRepositoryNumberOfReviews,
    getReviewChannelForRepository,
    prisma,
    setDataRetentionInMonth,
    setDefaultReviewChannel,
    setGroupToMentionInChannel,
    setJiraTicketRegEx,
    setRepositoryNumberOfApprovals,
    setRepositoryNumberOfReviews,
    setReviewChannelForRepository,
} from '../../lib/config';
import {
    logDebug,
    logError
} from '../../lib/log';
import type {App} from '@slack/bolt';
import User from '../../service/User';

export default function registerEventAppMention (app: App): void {
    app.event('app_mention', async ({event, say}) => {
        logDebug('app_mention', event);

        const {text, ts, thread_ts, channel, user: slackUserId} = event;

        if (/What time is it\?/i.test(text)) {
            const dateString = new Date().toString();

            await say({
                text: `The current date and time is ${dateString}`,
                thread_ts: thread_ts ?? ts,
            });
        } else {
            const regExCmd = /\s+(set|update)\s+([^\s]+)(?:\s+([^\s]+)(?:\s+)?(\d+|[^\s]+)?)?/i;
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
                case 'default-channel': // @pmc_code_review_bot set default-channel <channel>
                    await setDefaultReviewChannel(result[2]);
                    await say({
                        text: `Set default review channel to *${await getDefaultReviewChannel()}*`,
                        thread_ts: thread_ts ?? ts,
                    });
                    break;
                case 'repository': // @pmc_code_review_bot set repository <repo-name>
                    await setReviewChannelForRepository(result[2], channel);
                    await say({
                        text: `Set repository *${result[2]}* review request to channel ${await getReviewChannelForRepository(result[2])}`,
                        thread_ts: thread_ts ?? ts,
                    });
                    break;
                case 'review': // @pmc_code_review_bot set review <repo-name> 2
                    await setRepositoryNumberOfReviews(result[2], parseInt(result[3]));
                    await say({
                        text: `Set number of review required for *${result[2]}* to ${await getRepositoryNumberOfReviews(result[2])}`,
                        thread_ts: thread_ts ?? ts,
                    });
                    break;
                case 'approval': // @pmc_code_review_bot set approval <repo-name> 2
                    await setRepositoryNumberOfApprovals(result[2], parseInt(result[3]));
                    await say({
                        text: `Set number of approval required for *${result[2]}* to ${await getRepositoryNumberOfApprovals(result[2])}`,
                        thread_ts: thread_ts ?? ts,
                    });
                    break;
                case 'notify': // @pmc_code_review_bot set notify <@team>
                    {
                        const match = /^<?(.+?)>?$/.exec(result[2]);

                        if (match?.[1]) {
                            await setGroupToMentionInChannel(channel, match[1]);
                            await say({
                                text: `Set notify to *${await getGroupToMentionInChannel(channel)}*`,
                                thread_ts: thread_ts ?? ts,
                            });
                        }
                    }
                    break;
                case 'jira-ticket-regex': // @pmc_code_review_bot set jira-ticket-regex <regex>
                    await setJiraTicketRegEx(result[2]);
                    await say({
                        text: `Set Jira Ticket Patterns to *${result[2]}*`,
                        thread_ts: thread_ts ?? ts,
                    });
                    break;
                case 'slack-github-id': // @pmc_code_review_bot set slack-github-id <slack-id> <github-id>
                    if (!result[2] || !result[3]) {
                        return;
                    }

                    await prisma.user.findFirst({
                        where: {
                            slackUserId: result[2],
                        }
                    }).then((user) => {
                        if (!user) {
                            return;
                        }

                        void prisma.user.update({
                            where: {
                                id: user.id,
                            },
                            data: {
                                githubId: result[3],
                            },
                        }).then((updatedUser) => {
                            console.log('updated', updatedUser);
                            void say({
                                text: `Set *${updatedUser.displayName}*'s github login to *${updatedUser.githubId ?? ''}*`,
                                thread_ts: thread_ts ?? ts,
                            });
                        }).catch(logError);
                    }).catch(logError);

                    break;
                case 'my-github-id': // @pmc_code_review_bot set my-github-id <github-id>
                    if (!slackUserId) {
                        return;
                    }

                    await prisma.user.update({
                        where: {
                            id: (await User.findOrCreate(slackUserId)).id
                        },
                        data: {
                            githubId: result[2],
                        },
                    }).then((updatedUser) => {
                        void say({
                            text: `*${updatedUser.displayName}*, your github login is set to *${updatedUser.githubId ?? ''}*`,
                            thread_ts: thread_ts ?? ts,
                        });
                    }).catch(logError);

                    break;
                case 'data-retention': // @pmc_code_review_bot set data-retention 15
                    await setDataRetentionInMonth(parseInt(result[2]));
                    await say({
                        text: `Set data retention to ${await getDataRetentionInMonth()} months.`,
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
         * @pmc_code_review_bot load setting {json-string}
         *
         */
    });
}
