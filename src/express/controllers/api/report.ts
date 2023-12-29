import type {CodeReviewRecord} from '../../../service/Review';
import type {RequestHandler} from 'express';
import {prisma} from '../../../lib/config';

const diffDateTime = (d1: string, d2: string): number => {
    return new Date(d1).getTime() - new Date(d2).getTime();
};

const reportController: RequestHandler = (req, res) => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;

    if (typeof req.query.year === 'string') {
        year = parseInt(req.query.year, 10);
        month = 0;
    }
    if (typeof req.query.month === 'string') {
        month = parseInt(req.query.month, 10);
    }

    const where: {[index: string]: unknown} = {};

    if (!month) {
        where.createdAt = {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
        };
    } else {
        where.createdAt = {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
        };
    }

    console.log(where);

    const generateReport = async (): Promise<unknown> => {
        const ownerTotalCount: Record<string, number> = {};
        const reviewerTotalCount: Record<string, number> = {};
        const limit = 1000;
        let page = 1;
        let stillHasData = true;
        let overallDuration = 0;
        let timeToFirstReview = 0;
        let reviewDuration = 0;
        let reviewerCount = 0;
        let requestCount = 0;

        while (stillHasData) {
            const records = await prisma.archive.findMany({
                where,
                skip: limit * (page - 1),
                take: limit,
            });

            stillHasData = records.length > 0;
            page += 1;

            if (!records.length) {
                break;
            }

            requestCount += records.length;

            for (const record of records) {
                const codeReview = JSON.parse(record.data as string) as CodeReviewRecord;
                overallDuration += diffDateTime(codeReview.updatedAt.toString(), codeReview.createdAt.toString());

                ownerTotalCount[codeReview.user.displayName] = (ownerTotalCount[codeReview.user.displayName] || 0) + 1;
                for (const r of codeReview.reviewers) {
                    reviewerCount += 1;
                    timeToFirstReview += diffDateTime(r.updatedAt.toString(), codeReview.createdAt.toString());
                    reviewDuration += diffDateTime(r.updatedAt.toString(), r.createdAt.toString());
                    reviewerTotalCount[r.reviewer.displayName] = (reviewerTotalCount[r.reviewer.displayName] || 0) + 1;
                }
            }

        }

        return {
            averageMinuteOveralDuration: requestCount ? overallDuration / requestCount / 1000 / 60 : 0,
            averageMinuteReviewDuration: reviewerCount ? reviewDuration / reviewerCount / 1000 / 60 : 0,
            averageMinuteTimeToFirstReview: reviewerCount ? timeToFirstReview / reviewerCount / 1000 / 60 : 0,
            ownerTotalCount,
            reviewerTotalCount,
        };

    };

    void generateReport().then((report) => res.json(report));

};

export default reportController;
