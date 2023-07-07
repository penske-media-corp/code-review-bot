import Review, {findCodeReviewRecord} from './Review';
import type {ChatPostMessageArguments} from '@slack/web-api';
import {GITHUB_WEBHOOKS_SECRET} from '../lib/env';
import type {PullRequestClosedEvent} from '@octokit/webhooks-types';
import {Webhooks} from '@octokit/webhooks';
import {postSlackMessage} from '../bolt/utils';

let webhooks: Webhooks | null;

/**
 * Handle git hub webhook PR merged/close event.
 *
 * @param {PullRequestClosedEvent} payload
 */
const handlePullRequestClosed = (payload: PullRequestClosedEvent): void => {
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
        handlePullRequestClosed(payload);
    });

    return webhooks;
};

export default {
    register,
};
