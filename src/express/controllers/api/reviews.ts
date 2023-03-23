import type {
    CodeReviewRecord,
    ReviewerRecord
} from '../../../service/Review';
import {JIRA_TICKET_BASE_URL} from '../../../lib/env';
import type {RequestHandler} from 'express';
import {channelMaps} from '../../../bolt/utils';
import {logError} from '../../../lib/log';
import {prisma} from '../../../lib/config';

const extractDisplayName = ({reviewer}: ReviewerRecord): string => reviewer.displayName;
export const formatApiCodeReviewRecord = (codeReview: CodeReviewRecord): unknown => {
    const reviewers: string[] = codeReview.reviewers.map(extractDisplayName);
    const approvers: string[] = codeReview.reviewers.filter((r) => r.status === 'approved').map(extractDisplayName);
    const requestChanges: string[] = codeReview.reviewers.filter((r) => r.status === 'change').map(extractDisplayName);

    return {
        approvers,
        requestChanges,
        createdAt: codeReview.createdAt,
        id: codeReview.id,
        jiraTicket: codeReview.jiraTicket,
        jiraTicketLinkUrl: codeReview.jiraTicket ? `${JIRA_TICKET_BASE_URL}/${codeReview.jiraTicket}` : null,
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

    const where: {[index: string]: unknown} = {};
    const {id: userId} = req.user as {id: number} || {};

    if (channel && channel !== 'all') {
        where.slackChannelId = channelMaps.channel?.id ?? channel;
    }
    if (status && status !== 'all') {
        if (status === 'mine') {
            where.status = {
                in: ['pending', 'inprogress', 'withdrew'],
            };
            where.OR = [
                {
                    userId,
                },
                {
                    reviewers: {
                        some: {
                            userId,
                            status: 'pending',
                        }
                    }
                }
            ];
        } else {
            where.status = status;
        }
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
