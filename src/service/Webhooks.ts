import type {
    User as GitHubUser,
    PullRequestAssignedEvent,
    PullRequestClosedEvent,
    PullRequestOpenedEvent,
    PullRequestReadyForReviewEvent,
    PullRequestReviewDismissedEvent,
    PullRequestReviewRequestedEvent,
    PullRequestReviewSubmittedEvent,
    PullRequestUnassignedEvent,
} from '@octokit/webhooks-types';
import Review, {
    type ReviewActionResult,
    findCodeReviewRecord,
} from './Review';
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
 * @see https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=closed#pull_request
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
                            result.slackNotifyMessage as ChatPostMessageArguments,
                            'done'
                        );
                    }
                });
        });
};

// https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=opened#pull_request
const handlePullRequestOpened = async (payload: PullRequestAssignedEvent | PullRequestOpenedEvent | PullRequestReadyForReviewEvent | PullRequestReviewRequestedEvent): Promise<ReviewActionResult | null> => {
    const {draft, html_url: pullRequestLink, title} = payload.pull_request;
    const githubId = payload.sender.login;

    if (draft) {
        logDebug('Ignore draft pull request.');
        return null;
    }

    const user = await prisma.user.findFirst({
        where: {
            githubId,
        }
    });

    if (!user) {
        logDebug(`Error: No slack user found for github user "${githubId}".`);
        return null;
    }

    const repositoryName = extractRepository(pullRequestLink);

    if (!repositoryName) {
        logDebug(`Error: Cannot determine the repository for pull request link "${pullRequestLink}".`);
        return null;
    }

    const channel = await getReviewChannelForRepository(repositoryName);

    if (!channel) {
        logDebug(`Error: No channel found for repository "${repositoryName}".`);
        return null;
    }

    const numberApprovalRequired = await getRepositoryNumberOfApprovals(repositoryName);
    const text = `*${user.displayName}* has requested a code review! ${numberApprovalRequired} ${pluralize('reviewer', numberApprovalRequired)} :eyes: ${pluralize('is', numberApprovalRequired)} needed.\n<${pullRequestLink}>`;

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

    return Review.add(data);
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

// https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=review_requested#pull_request
const handlePullRequestReviewRequested = async (payload: PullRequestReviewRequestedEvent): Promise<void> => {
    const pullRequestLink = payload.pull_request.html_url;

    const hasRequestedReviewer =
        (event: PullRequestReviewRequestedEvent): event is PullRequestReviewRequestedEvent & {requested_reviewer: GitHubUser} => {
            return 'requested_reviewer' in event;
        };

    if (!hasRequestedReviewer(payload) || !payload.requested_reviewer.login) {
        logDebug('Error: No reviewer found in payload.');

        return;
    }

    let codeReview = await findCodeReviewRecord({pullRequestLink});

    if (!codeReview) {
        const result = await handlePullRequestOpened(payload);

        if (result?.codeReview) {
            codeReview = result.codeReview;
        } else {
            logDebug('Error: No review record found.');

            return;
        }
    }

    const reviewer = await prisma.user.findFirst({
        where: {
            githubId: payload.requested_reviewer.login,
        }
    });

    if (!reviewer) {
        logDebug('Error: No reviewer record found.');

        return;
    }

    const result = await Review.assign(codeReview, reviewer.slackUserId).catch(logError);

    if (result) {
        await postSlackMessage({
            mrkdwn: true,
            ...(result.slackNotifyMessage as ChatPostMessageArguments),
        });
    }
};

// https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=assigned#pull_request
const handlePullRequestAssigned = async (payload: PullRequestAssignedEvent): Promise<void> => {
    const pullRequestLink = payload.pull_request.html_url;

    const hasAssignee =
        (event: PullRequestAssignedEvent): event is PullRequestAssignedEvent & {assignee: GitHubUser} => {
            return 'assignee' in event;
        };

    if (!hasAssignee(payload) || !payload.assignee.login) {
        logDebug('Error: No reviewer found in payload.');

        return;
    }

    let codeReview = await findCodeReviewRecord({pullRequestLink});

    if (!codeReview) {
        const result = await handlePullRequestOpened(payload);

        if (result?.codeReview) {
            codeReview = result.codeReview;
        } else {
            logDebug('Error: No review record found.');

            return;
        }
    }

    const reviewer = await prisma.user.findFirst({
        where: {
            githubId: payload.assignee.login,
        }
    });

    if (!reviewer) {
        logDebug('Error: No reviewer record found.');

        return;
    }

    const result = await Review.assign(codeReview, reviewer.slackUserId).catch(logError);

    if (result) {
        await postSlackMessage({
            mrkdwn: true,
            ...(result.slackNotifyMessage as ChatPostMessageArguments),
        });
    }
};

// https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=unassigned#pull_request
const handlePullRequestUnassigned = async (payload: PullRequestUnassignedEvent): Promise<void> => {
    const pullRequestLink = payload.pull_request.html_url;
    // @TODO, remove reviewer from review record.
};

// https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=dismissed#pull_request_review
const handlePullRequestReviewDismissed = async (payload: PullRequestReviewDismissedEvent): Promise<void> => {
    const pullRequestLink = payload.pull_request.html_url;
    // @TODO, request re review from approved reviewer?
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

    webhooks.on('pull_request.ready_for_review', ({payload}) => {
        logDebug(JSON.stringify(payload, null, 2));
        void handlePullRequestOpened(payload);
    });

    webhooks.on('pull_request.closed', ({payload}) => {
        logDebug(JSON.stringify(payload, null, 2));
        void handlePullRequestClosed(payload);
    });

    webhooks.on('pull_request.opened', ({payload}) => {
        logDebug(JSON.stringify(payload, null, 2));
        void handlePullRequestOpened(payload);
    });

    webhooks.on('pull_request_review.submitted', ({payload}) => {
        logDebug(JSON.stringify(payload, null, 2));
        void handlePullRequestReviewSubmitted(payload);
    });

    webhooks.on('pull_request_review.dismissed', ({payload}) => {
        logDebug(JSON.stringify(payload, null, 2));
        void handlePullRequestReviewDismissed(payload);
    });

    webhooks.on('pull_request.assigned', ({payload}) => {
        logDebug(JSON.stringify(payload, null, 2));
        void handlePullRequestAssigned(payload);
    });

    webhooks.on('pull_request.unassigned', ({payload}) => {
        logDebug(JSON.stringify(payload, null, 2));
        void handlePullRequestUnassigned(payload);
    });

    webhooks.on('pull_request.review_requested', ({payload}) => {
        logDebug(JSON.stringify(payload));
        void handlePullRequestReviewRequested(payload);
    });

    return webhooks;
};

export default {
    register,
};
