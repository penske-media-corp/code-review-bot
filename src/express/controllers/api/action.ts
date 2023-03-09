import Review, {findCodeReviewRecord} from '../../../service/Review';
import type {ChatPostMessageArguments} from '@slack/web-api';
import type {RequestHandler} from 'express';
import {formatApiCodeReviewRecord} from './reviews';
import {postSlackMessage} from '../../../bolt/utils';

export const actionController: RequestHandler = (req, res) => {
    const action = req.params.action;
    const value = req.params.value;

    if (!req.user) {
        res.json({});
        return;
    }

    const {sid: slackUserId, fn: displayName} = req.user as {sid: string; fn: string};

    if (!slackUserId) {
        res.json({
            error: 'Not authorized',
        });
        return;
    }

    if (['approve', 'claim', 'close', 'request-change', 'remove'].includes(action)) {
        void findCodeReviewRecord({id: parseInt(value)}).then((codeReview) => {
            if (!codeReview) {
                res.json({error: 'Cannot find code review.'});
                return;
            }
            switch (action) {
                case 'approve':
                    void Review.approve(codeReview, slackUserId).then((result) => {
                        if (!result.codeReview) {
                            res.json({error: result.message});
                            return;
                        }
                        res.json({
                            data: formatApiCodeReviewRecord(result.codeReview),
                        });
                        if (['inprogress', 'pending', 'ready'].includes(codeReview.status)) {
                            void postSlackMessage(result.slackNotifyMessage as ChatPostMessageArguments);
                        }
                    });
                    break;
                case 'claim':
                    void Review.claim(codeReview, slackUserId).then((result) => {
                        if (!result.codeReview) {
                            res.json({error: result.message});
                            return;
                        }
                        res.json({
                            data: formatApiCodeReviewRecord(result.codeReview),
                        });
                        if (['inprogress', 'pending'].includes(codeReview.status)) {
                            void postSlackMessage(result.slackNotifyMessage as ChatPostMessageArguments);
                        }
                    });
                    break;
                case 'close':
                    void Review.close(codeReview, `${displayName} closed the the code review.`).then((result) => {
                        if (!result.codeReview) {
                            res.json({error: result.message});
                            return;
                        }
                        res.json({
                            data: formatApiCodeReviewRecord(result.codeReview),
                        });
                        if (['closed'].includes(codeReview.status)) {
                            void postSlackMessage(result.slackNotifyMessage as ChatPostMessageArguments);
                        }
                    });
                    break;
                case 'request-change':
                    void Review.requestChanges(codeReview, slackUserId).then((result) => {
                        if (!result.codeReview) {
                            res.json({error: result.message});
                            return;
                        }
                        res.json({
                            data: formatApiCodeReviewRecord(result.codeReview),
                        });
                        if (['inprogress', 'pending', 'ready'].includes(codeReview.status)) {
                            void postSlackMessage(result.slackNotifyMessage as ChatPostMessageArguments);
                        }
                    });
                    break;
                case 'remove':
                    void Review.remove(codeReview, slackUserId).then((result) => {
                        if (!result.codeReview) {
                            res.json({error: result.message});
                            return;
                        }
                        res.json({
                            data: formatApiCodeReviewRecord(result.codeReview),
                        });
                        if (['removed'].includes(codeReview.status)) {
                            void postSlackMessage(result.slackNotifyMessage as ChatPostMessageArguments);
                        }
                    });
                    break;
            }
        });
        return;
    }

    res.json({error: `Invalid action: ${action}`});
};

export default actionController;