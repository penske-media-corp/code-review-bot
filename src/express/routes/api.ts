import {CodeReviewRelation, PrismaClient, User} from '@prisma/client';
import express from 'express';
import {logError} from '../../utils/log';

const api = express.Router();

api.get('/reviews/:status?', (req, res, next) => {
    const prisma = new PrismaClient();

    const status = req.params.status;
    const where: {[index: string]: string} = {}

    if (status && status !== 'all') {
        where.status = status;
    }
    prisma.codeReview.findMany({
        where,
        include: {
            user: true,
            reviewers: {
                include: {
                    reviewer: true,
                }
            },
        }
    }).then((reviews) => {
        const extractUsers = ({reviewer}: {reviewer: User}) => reviewer.displayName;
        const result = reviews.map((item) => {
            const reviewers: string[] = item.reviewers.map(extractUsers);
            const approvers: string[] = item.reviewers.filter((r) => r.status === 'approved').map(extractUsers);

            return {
                id: item.id,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                status: item.status,
                owner: item.user.displayName,
                jiraTicket: item.jiraTicket,
                pullRequestLink: item.pullRequestLink,
                slackPermalink: item.slackPermalink,
                slackThreadTs: item.slackThreadTs,
                note: item.note,
                reviewers,
                approvers,
            }
        })
        res.json(result);
    }).catch((error) => {
        logError(error);
    });
});

export default api;