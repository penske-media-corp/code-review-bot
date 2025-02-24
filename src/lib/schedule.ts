import {
    defaultMonthlySchedule,
    defaultScheduleReminder,
    getDataRetentionInMonth,
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

    date.setMonth(currentDate.getMonth() - await getDataRetentionInMonth());

    await prisma.archive.deleteMany({
        where: {
            createdAt: {
                lt: date,
            },
        },
    });

    await prisma.codeReview.deleteMany({
        where: {
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
