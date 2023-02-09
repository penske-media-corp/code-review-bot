import CodeReviewRequest from '../../database/entity/CodeReviewRequest';
import Connection from '../../database/connection';
import express from 'express';
import {FindManyOptions} from 'typeorm';
import codeReview from '../../service/CodeReview';
import CodeReviewRequestReviewerRelation from '../../database/entity/CodeReviewRequestReviewerRelation';

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
        const extractReviewers = (relation: CodeReviewRequestReviewerRelation) => relation.reviewer?.user?.displayName;
        const result = reviews.map((item) => {
            const reviewers = item.reviewers?.map(extractReviewers);
            const approvers = item.reviewers?.filter((r) => r.status === 'approved').map(extractReviewers);

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
    }).catch(()=>{

    });
});

export default api;
