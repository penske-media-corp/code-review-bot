import type {
    CodeReviewRecord,
    ReviewerRecord
} from '../../../service/Review';
import type {RequestHandler} from 'express';
import {channelMaps} from '../../../bolt/utils';
import {logError} from '../../../lib/log';
import {prisma} from '../../../lib/config';

const extractDisplayName = ({reviewer}: ReviewerRecord): string => reviewer.displayName;
export const formatApiCodeReviewRecord = (codeReview: CodeReviewRecord): unknown => {
    const reviewers: string[] = codeReview.reviewers.map(extractDisplayName);
    const approvers: string[] = codeReview.reviewers.filter((r) => r.status === 'approved').map(extractDisplayName);

    return {
        approvers,
        createdAt: codeReview.createdAt,
        id: codeReview.id,
        jiraTicket: codeReview.jiraTicket,
        note: codeReview.note,
        owner: codeReview.user.displayName,
        pullRequestLink: codeReview.pullRequestLink,
        reviewers,
        slackChannelId: codeReview.slackChannelId,
        slackChannelName: codeReview.slackChannelId ? channelMaps[codeReview.slackChannelId] : codeReview.slackChannelId,
        slackPermalink: codeReview.slackPermalink,
        slackThreadTs: codeReview.slackThreadTs,
        status: codeReview.status,
        updatedAt: codeReview.updatedAt,
    };
};

const reviewsController: RequestHandler = (req, res) => {
    const channel = req.params.channel;
    const status = req.params.status;
    let page = 1;
    let limit = 0;

    if (typeof req.query.page === 'string') {
        page = parseInt(req.query.page || '1') || 1;
    }
    if (typeof req.query.limit === 'string') {
        limit = parseInt(req.query.limit || '1') || 1;
    }

    const where: {status?: string; slackChannelId?: string} = {};

    if (channel && channel !== 'all') {
        where.slackChannelId = channelMaps[channel].id || channel;
    }
    if (status && status !== 'all') {
        where.status = status;
    }

    const findParams = {
        where,
        include: {
            user: true,
            reviewers: {
                include: {
                    reviewer: true,
                }
            },
        }
    };

    const countPromise = prisma.codeReview.count({where}).then((c) => ({total: c}));
    const findPromise = prisma.codeReview.findMany({
        ...findParams,
        ...page && limit && {
            skip: limit * (page - 1),
            take: limit
        },
    }).then((reviews) => {
        const result = reviews.map(formatApiCodeReviewRecord);
        return {
            page,
            limit,
            dataset: result,
        };
    });

    Promise.all([countPromise, findPromise]).then((values) => {
        res.json(values.reduce((acc, item) => Object.assign(acc, item), {}));
    }).catch((error) => {
        logError(error);
    });
};

export default reviewsController;
