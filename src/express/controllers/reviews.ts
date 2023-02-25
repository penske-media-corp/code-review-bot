import type {RequestHandler} from 'express';
import type {User} from '@prisma/client';
import {logError} from '../../lib/log';
import {prisma} from '../../lib/config';

const reviewsController: RequestHandler = (req, res) => {
    const status = req.params.status;
    const channel = req.params.channel;
    const where: {status?: string; slackChannelId?: string} = {};

    if (channel && channel !== 'all') {
        where.slackChannelId = channel;
    }
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
};

export default reviewsController;
