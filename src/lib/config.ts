import {PRISMA_DEBUG} from './env';
import {PrismaClient} from '@prisma/client';
import cache from './cache';
import option from './option';

const GLOBAL_OPTION_CHANNEL_ID         = 'global';
const OPTION_NAME_REPO_NUMBER_REVIEW   = 'repository-number-review';
const OPTION_NAME_REPO_NUMBER_APPROVAL = 'repository-number-approval';

const DEFAULT_NUMBER_REVIEW   = 2;
const DEFAULT_NUMBER_APPROVAL = 2;

export const slackActions = {
    approved: ['approved', 'white_check_mark', 'heavy_check_mark'],
    change: ['memo', 'request-changes'],
    claim: ['eyes'],
    close: ['done'],
    remove: ['trash'],
    request: ['review'],
};

export const defaultScheduleReminder = {
    rule: '0 12 * * 1-5', // Mon-Fri 12:00p PT, 3:00p ET, 20:00 UTC
    tz: 'America/Los_Angeles',
};

const prismaClientOptions = {};

if (PRISMA_DEBUG) {
    Object.assign(prismaClientOptions, {
        log: ['query', 'info', 'warn', 'error'],
    });
}

export const prisma = new PrismaClient(prismaClientOptions);

const channelGroupMentionMappings: {[key: string]: string} = {
    // @see https://api.slack.com/reference/surfaces/formatting#mentioning-groups
    default: '!here',
};

/**
 * Return the group to mention in channel.
 *
 * @param slackChannelId
 */
export const getGroupToMentionInChannel = async (slackChannelId: string): Promise<string> => {
    let group: string | null = channelGroupMentionMappings[slackChannelId];

    if (!group) {
        group = await option.get(slackChannelId, 'group-to-alert') as string | null;
        channelGroupMentionMappings[slackChannelId] = group ?? channelGroupMentionMappings.default;
    }
    group = group === 'default' ? channelGroupMentionMappings.default : group;
    return group as string;
};

export const setGroupToMentionInChannel = async (slackChannelId: string, notify: string): Promise<void> => {
    if (!notify) {
        return;
    }
    channelGroupMentionMappings[slackChannelId] = notify;
    await option.set(slackChannelId, 'group-to-alert', notify);
};

export const getRepositoryNumberOfReview = async (repositoryName: string): Promise<number> => {
    const cacheKey = `repo-review-${repositoryName}`;
    const value = await cache.get(cacheKey) as number;

    if (!value) {
        const options = (await option.get(GLOBAL_OPTION_CHANNEL_ID, OPTION_NAME_REPO_NUMBER_REVIEW) ?? {}) as {[index: string]: number};

        return options[repositoryName] || DEFAULT_NUMBER_REVIEW;
    }

    return value || DEFAULT_NUMBER_REVIEW;
};

export const getRepositoryNumberOfApproval = async (repositoryName: string): Promise<number> => {
    const cacheKey = `repo-approval-${repositoryName}`;
    const value = await cache.get(cacheKey) as number;

    if (!value) {
        const options = (await option.get(GLOBAL_OPTION_CHANNEL_ID, OPTION_NAME_REPO_NUMBER_APPROVAL) ?? {}) as {[index: string]: number};

        return options[repositoryName] || DEFAULT_NUMBER_APPROVAL;
    }

    return value || DEFAULT_NUMBER_APPROVAL;
};

export const setRepositoryNumberOfReview = async (repositoryName: string, numberReviewRequired: number): Promise<void> => {
    if (!numberReviewRequired) {
        return;
    }

    await cache.set(`repo-review-${repositoryName}`, numberReviewRequired);
    const options = await option.get(GLOBAL_OPTION_CHANNEL_ID, OPTION_NAME_REPO_NUMBER_REVIEW) ?? {};

    Object.assign(options, {[repositoryName]: numberReviewRequired});
    await option.set(GLOBAL_OPTION_CHANNEL_ID, OPTION_NAME_REPO_NUMBER_REVIEW, options);
};

export const setRepositoryNumberOfApproval = async (repositoryName: string, numberReviewRequired: number): Promise<void> => {
    if (!numberReviewRequired) {
        return;
    }

    await cache.set(`repo-approval-${repositoryName}`, numberReviewRequired);
    const options = await option.get(GLOBAL_OPTION_CHANNEL_ID, OPTION_NAME_REPO_NUMBER_APPROVAL) ?? {};

    Object.assign(options, {[repositoryName]: numberReviewRequired});
    await option.set(GLOBAL_OPTION_CHANNEL_ID, OPTION_NAME_REPO_NUMBER_APPROVAL, options);
};
