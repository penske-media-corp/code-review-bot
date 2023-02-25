import {
    defaultScheduleReminder,
    prisma
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

let currentJob: Job;
export function registerSchedule (): void {
    currentJob = scheduleJob(defaultScheduleReminder, sendReminders);
}
