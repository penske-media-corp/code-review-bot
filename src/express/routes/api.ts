import CodeReviewRequest from '../../database/entity/CodeReviewRequest';
import CodeReviewRequestReviewerRelation from '../../database/entity/CodeReviewRequestReviewerRelation';
import Connection from '../../database/connection';
import {FindManyOptions} from 'typeorm';
import express from 'express';
import {logError} from '../../utils/log';

const api = express.Router();

api.get('/reviews/:status?', (req, res, next) => {
    const repository = Connection.getRepository(CodeReviewRequest);
    const status = req.params.status;
    const findOptions : FindManyOptions<CodeReviewRequest> = {
        relations: {
            user: true,
            reviewers: {
                reviewer: {
                    user: true,
                }
            }
        },
    };

    if (status && status !== 'all') {
        findOptions.where = {
            status: status,
        };
        findOptions.order = {
            createAt: 'ASC',
        };
    }
    repository.find(findOptions).then((reviews) => {
        const extractUsers = (relation: CodeReviewRequestReviewerRelation) => relation.reviewer?.user?.displayName;
        const result = reviews.map((item) => {
            const reviewers = item.reviewers?.map(extractUsers);
            const approvers = item.reviewers?.filter((r) => r.status === 'approved').map(extractUsers);

            return {
                id: item.id,
                createdAt: item.createAt,
                updatedAt: item.updatedAt,
                status: item.status,
                owner: item.user?.displayName,
                jiraTicket: item.jiraTicket,
                pullRequestLink: item.pullRequestLink,
                slackMsgLinkUrl: item.slackMsgLinkUrl,
                slackMsgThreadTs: item.slackMsgThreadTs,
                note: item.note,
                reviewers,
                approvers,
            }
        })

        res.json(result);
    }).catch((error)=>{
        logError(error);
    });
});

export default api;
