import type {
    PullRequestClosedEvent,
    PullRequestOpenedEvent,
    PullRequestReviewSubmittedEvent
} from '@octokit/webhooks-types';
import Review, {findCodeReviewRecord} from './Review';
import {
    extractJiraTicket,
    extractRepository
} from '../lib/utils';
import {
    getRepositoryNumberOfApprovals,
    getReviewChannelForRepository,
    prisma
} from '../lib/config';
import {
    getSlackPermalink,
    postSlackMessage,
} from '../bolt/utils';
import {
    logDebug,
    logError
} from '../lib/log';
import type {ChatPostMessageArguments} from '@slack/web-api';
import {GITHUB_WEBHOOKS_SECRET} from '../lib/env';
import type {ReactionData} from '../bolt/types';
import {Webhooks} from '@octokit/webhooks';
import pluralize from 'pluralize';

let webhooks: Webhooks | null;

/**
 * Handle git hub webhook PR merged/close event.
 *
 * @param {PullRequestClosedEvent} payload
 */
const handlePullRequestClosed = async (payload: PullRequestClosedEvent): Promise<void> => {
    const pullRequestLink = payload.pull_request.html_url;

    void findCodeReviewRecord({pullRequestLink})
        .then((codeReview) => {
            if (!codeReview) {
                return;
            }
            void Review.close(codeReview)
                .then((result) => {
                    if (!result.codeReview) {
                        return;
                    }
                    if (['closed'].includes(codeReview.status)) {
                        void postSlackMessage(
                            result.slackNotifyMessage as ChatPostMessageArguments
                        );
                    }
                });
        });
};

const handlePullRequestOpened = async (payload: PullRequestOpenedEvent): Promise<void> => {
    const {html_url: pullRequestLink, title} = payload.pull_request;
    const githubId = payload.sender.login;

    const user = await prisma.user.findFirst({
        where: {
            githubId,
        }
    });

    if (!user) {
        logDebug(`Error: No slack user found for github user "${githubId}".`);
        return;
    }

    const repositoryName = extractRepository(pullRequestLink);

    if (!repositoryName) {
        logDebug(`Error: Cannot determine the repository for pull request link "${pullRequestLink}".`);
        return;
    }

    const channel = await getReviewChannelForRepository(repositoryName);

    if (!channel) {
        logDebug(`Error: No channel found for repository "${repositoryName}".`);
        return;
    }

    const numberApprovalRequired = await getRepositoryNumberOfApprovals(repositoryName);
    const text = `*${user.displayName}* has request a code review! ${numberApprovalRequired} ${pluralize('reviewer', numberApprovalRequired)} :eyes: ${pluralize('is', numberApprovalRequired)} needed.\n<${pullRequestLink}>`;

    logDebug(`Sending review request to channel "${channel}"`);
    const result = await postSlackMessage({
        mrkdwn: true,
        channel,
        text,
    });

    const data = {
        jiraTicket: await extractJiraTicket(title),
        pullRequestLink,
        slackChannelId: channel,
        slackMsgUserId: user.slackUserId,
        slackPermalink: result?.ts ? await getSlackPermalink(channel, result.ts) : null,
        slackThreadTs: result?.ts,
    } as ReactionData;

    await Review.add(data);
};

// https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=submitted#pull_request_review
const handlePullRequestReviewSubmitted = async (payload: PullRequestReviewSubmittedEvent): Promise<void> => {
    const pullRequestLink = payload.pull_request.html_url;
    const githubId = payload.sender.login;
    const state = payload.review.state;

    const user = await prisma.user.findFirst({
        where: {
            githubId,
        }
    });

    if (!user) {
        return;
    }

    const codeReview = await findCodeReviewRecord({pullRequestLink});

    if (!codeReview) {
        return;
    }

    if (state === 'approved') {
        const result = await Review.approve(codeReview, user.slackUserId).catch(logError);

        if (result) {
            await postSlackMessage({
                mrkdwn: true,
                ...(result.slackNotifyMessage as ChatPostMessageArguments),
            });
        }
    } else if (state === 'changes_requested') {
        const result = await Review.requestChanges(codeReview, user.slackUserId).catch(logError);

        if (result) {
            await postSlackMessage({
                mrkdwn: true,
                ...(result.slackNotifyMessage as ChatPostMessageArguments),
            });
        }
    } else if (state === 'commented') {
        // Submit comment on a PR, future improvement?
    }


};

/**
 * Register the webhook events.
 */
const register = (): Webhooks => {
    if (webhooks) {
        return webhooks;
    }

    webhooks = new Webhooks({
        secret: GITHUB_WEBHOOKS_SECRET,
    });

    webhooks.on('pull_request.closed', ({payload}) => {
        logDebug(payload);
        void handlePullRequestClosed(payload);
    });

    webhooks.on('pull_request.opened', ({payload}) => {
        logDebug(payload);
        void handlePullRequestOpened(payload);
    });

    webhooks.on('pull_request_review.submitted', ({payload}) => {
        logDebug(payload);
        void handlePullRequestReviewSubmitted(payload);
    });

    return webhooks;
};

export default {
    register,
};
