import type {Archive} from '@prisma/client';
import type {CodeReviewRecord} from '../../../service/Review';
import type {RequestHandler} from 'express';
import {logError} from '../../../lib/log';
import {prisma} from '../../../lib/config';

const formatRecord = (format: string, record: Archive): unknown => {
    if (format === 'raw') {
        return record;
    }

    const codeReview = JSON.parse(record.data as string) as CodeReviewRecord;
    const reviewers: string[] = codeReview.reviewers.map((r) => r.reviewer.displayName);

    return {
        createdAt: codeReview.createdAt,
        id: codeReview.id,
        jiraTicket: codeReview.jiraTicket,
        note: codeReview.note,
        owner: codeReview.user.displayName,
        pullRequestLink: codeReview.pullRequestLink,
        reviewers,
        status: codeReview.status,
        updatedAt: codeReview.updatedAt,
    };

};

const archiveController: RequestHandler = (req, res) => {
    let format = 'basic';
    let page = 1;
    let limit = 100;

    if (typeof req.query.page === 'string') {
        page = parseInt(req.query.page || '1') || 1;
    }
    if (typeof req.query.limit === 'string') {
        limit = parseInt(req.query.limit || '1') || 1;
    }
    if (typeof req.query.format === 'string') {
        format = req.query.format;
    }

    const countPromise = prisma.archive.count().then((c) => ({total: c}));
    const findPromise = prisma.archive.findMany({
        skip: limit * (page - 1),
        take: limit,
        orderBy: {
            createdAt: 'desc',
        }
    }).then((records) => {
        return {
            page,
            limit,
            dataset: records.map(formatRecord.bind(formatRecord, format)),
        };
    });

    Promise.all([countPromise, findPromise]).then((values) => {
        res.json(values.reduce((acc, item) => Object.assign(acc, item), {}));
    }).catch(logError);
};

export default archiveController;
