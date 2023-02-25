import {LOG_DEBUG} from './env';
import {PrismaClient} from '@prisma/client';

export const slackActions = {
    approved: ['approved', 'white_check_mark', 'heavy_check_mark'],
    change: ['memo', 'request-changes'],
    claim: ['eyes'],
    close: ['done'],
    remove: ['trash'],
    request: ['review'],
};

export const teamToMentionInChannelAlert: {[key: string]: string} = {
    // @see https://api.slack.com/reference/surfaces/formatting#mentioning-groups
    default: '!here',
};

export const scheduledReminders = [
    '0 20 * * 1-5', // Mon-Fri 12:00p PT, 3:00p ET, 20:00 UTC
];

const prismaClientOptions = {};

if (LOG_DEBUG) {
    Object.assign(prismaClientOptions, {
        log: ['query', 'info', 'warn', 'error'],
    });
}

export const prisma = new PrismaClient(prismaClientOptions);
