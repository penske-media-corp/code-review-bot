import type {RequestHandler} from 'express';
import {findCodeReviewRecord} from '../../../service/Review';
import {formatApiCodeReviewRecord} from './reviews';
import {prisma} from '../../../lib/config';

export const saveController: RequestHandler = (req, res) => {
    const value = req.params.value;

    void findCodeReviewRecord({id: parseInt(value)}).then((codeReview) => {
        if (!codeReview) {
            res.json({error: 'Cannot find code review.'});
            return;
        }

        const {note = '', jiraTicket = ''} = req.body as {note: string; jiraTicket: string};

        void prisma.codeReview.update({
            where: {
                id: codeReview.id,
            },
            data: {
                note,
                jiraTicket,
            }
        }).then(() => {
            res.json({
                data: formatApiCodeReviewRecord({...codeReview, note, jiraTicket}),
            });
        });
    });
};
export default saveController;
