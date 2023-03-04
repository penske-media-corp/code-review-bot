import Review, {findCodeReviewRecord} from '../../../service/Review';
import type {ChatPostMessageArguments} from '@slack/web-api';
import type {RequestHandler} from 'express';
import type {User} from '@prisma/client';
import {formatApiCodeReviewRecord} from './reviews';
import {postSlackMessage} from '../../../bolt/utils';

export const actionController: RequestHandler = (req, res) => {
    const action = req.params.action;
    const value = req.params.value;
    const {userPromise} = req as Partial<{userPromise: Promise<User>}>;

    if (!userPromise) {
        res.json({});
        return;
    }

    userPromise.then((user) => {
        if (['approve', 'claim', 'close', 'request-change', 'remove'].includes(action)) {
            void findCodeReviewRecord({id: parseInt(value)}).then((codeReview) => {
                if (!codeReview) {
                    res.json({error: 'Cannot find code review.'});
                    return;
                }
                switch (action) {
                    case 'claim':
                        void Review.claim(codeReview, user.slackUserId).then((result) => {
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
                }
            });
        }
    }).catch((error: unknown) => res.json({error}));
};

export default actionController;
