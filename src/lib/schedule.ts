import {
    defaultMonthlySchedule,
    defaultScheduleReminder,
    getDataRetentionInYear,
    prisma,
} from './config';
import type {Job} from 'node-schedule';
import {scheduleJob} from 'node-schedule';
import {sendCodeReviewSummary} from '../bolt/utils';

// @TODO: Support different schedule for each channel
export async function sendReminders (): Promise<void> {
    const result = await prisma.codeReview.findMany({
        where: {
            status: {
                in: ['pending', 'inprogress'],
            },
        },
        distinct: ['slackChannelId'],
    });

    result.forEach((item) => {
        if (!item.slackChannelId) {
            return;
        }
        void sendCodeReviewSummary(item.slackChannelId);
    });
}

export async function monthlyCleanup (): Promise<void> {
    const currentDate = new Date();
    const date = new Date();

    date.setFullYear(currentDate.getFullYear() - await getDataRetentionInYear());

    await prisma.archive.deleteMany({
        where: {
            createdAt: {
                lt: date,
            },
        },
    });

    await prisma.codeReview.deleteMany({
        where: {
            status: {
                in: ['ready', 'withdrew'],
            },
            updatedAt: {
                lt: date,
            },
        },
    });
}

const scheduledJobs: Job[] = [];

export function registerSchedule (): void {
    scheduledJobs.push(scheduleJob(defaultScheduleReminder, sendReminders));
    scheduledJobs.push(scheduleJob(defaultMonthlySchedule, monthlyCleanup));
}
