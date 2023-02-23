import {PrismaClient} from '@prisma/client';
import type {User} from '@prisma/client';
import express from 'express';
import {logError} from '../../utils/log';

const api = express.Router();

api.get('/reviews/:status?', (req, res) => {
    const prisma = new PrismaClient();

    const status = req.params.status;
    const where: {status?: string} = {};

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
        const extractDisplayName = ({reviewer}: {reviewer: User}): string => reviewer.displayName;
        const result = reviews.map((item) => {
            const reviewers: string[] = item.reviewers.map(extractDisplayName);
            const approvers: string[] = item.reviewers.filter((r) => r.status === 'approved').map(extractDisplayName);

            return {
                ...item,
                owner: item.user.displayName,
                reviewers,
                approvers,
            };
        });
        res.json(result);
    }).catch((error) => {
        logError(error);
    });
});

export default api;
