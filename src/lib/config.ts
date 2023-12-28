import {PRISMA_DEBUG} from './env';
import {PrismaClient} from '@prisma/client';
import cache from './cache';
import option from './option';

const OPTION_NAME_REPO_NUMBER_REVIEW   = 'repository-number-review';
const OPTION_NAME_REPO_NUMBER_APPROVAL = 'repository-number-approval';
const OPTION_NAME_JIRA_TICKET_PATTERNS = 'jira-ticket-regex';
const OPTION_NAME_DEFAULT_CHANNEL = 'default-channel';
const OPTION_NAME_REPO_CHANNEL = 'repository-channel';

const DEFAULT_NUMBER_REVIEW   = 2;
const DEFAULT_NUMBER_APPROVAL = 2;

export const slackActions = {
    approved: ['approved', 'white_check_mark', 'heavy_check_mark'],
    change: ['memo', 'request-changes'],
    claim: ['eyes'],
    close: ['done'],
    delete: ['trash'],
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
    default: 'none',
};

/**
 * Return the group to mention in channel.
 *
 * @param slackChannelId
 */
export const getGroupToMentionInChannel = async (slackChannelId: string): Promise<string> => {
    let group: string | null = channelGroupMentionMappings[slackChannelId];

    if (!group) {
        group = await option.get(slackChannelId, 'group-to-alert') as string | null ?? channelGroupMentionMappings.default;
        channelGroupMentionMappings[slackChannelId] = group;
    }
    group = !group || group === 'default' ? channelGroupMentionMappings.default : group;
    return group;
};

export const setGroupToMentionInChannel = async (slackChannelId: string, notify: string): Promise<void> => {
    if (!notify) {
        return;
    }
    channelGroupMentionMappings[slackChannelId] = notify;
    await option.set(slackChannelId, 'group-to-alert', notify);
};

export const getRepositoryNumberOfReviews = async (repositoryName: string): Promise<number> => {
    const cacheKey = `repo-review-${repositoryName}`;
    const value = await cache.get(cacheKey) as number;

    if (!value) {
        const options = (await option.global.get(OPTION_NAME_REPO_NUMBER_REVIEW) ?? {}) as {[index: string]: number};

        return options[repositoryName] || DEFAULT_NUMBER_REVIEW;
    }

    return value || DEFAULT_NUMBER_REVIEW;
};

export const getRepositoryNumberOfApprovals = async (repositoryName: string): Promise<number> => {
    const cacheKey = `repo-approval-${repositoryName}`;
    const value = await cache.get(cacheKey) as number;

    if (!value) {
        const options = (await option.global.get(OPTION_NAME_REPO_NUMBER_APPROVAL) ?? {}) as {[index: string]: number};

        return options[repositoryName] || DEFAULT_NUMBER_APPROVAL;
    }

    return value || DEFAULT_NUMBER_APPROVAL;
};

export const setRepositoryNumberOfReviews = async (repositoryName: string, numberReviewRequired: number): Promise<void> => {
    if (!numberReviewRequired) {
        return;
    }

    await cache.set(`repo-review-${repositoryName}`, numberReviewRequired);
    const options = await option.global.get(OPTION_NAME_REPO_NUMBER_REVIEW) ?? {};

    Object.assign(options, {[repositoryName]: numberReviewRequired});
    await option.global.set(OPTION_NAME_REPO_NUMBER_REVIEW, options);
};

export const setRepositoryNumberOfApprovals = async (repositoryName: string, numberReviewRequired: number): Promise<void> => {
    if (!numberReviewRequired) {
        return;
    }

    await cache.set(`repo-approval-${repositoryName}`, numberReviewRequired);
    const options = await option.global.get(OPTION_NAME_REPO_NUMBER_APPROVAL) ?? {};

    Object.assign(options, {[repositoryName]: numberReviewRequired});
    await option.global.set(OPTION_NAME_REPO_NUMBER_APPROVAL, options);
};

export const getJiraTicketRegEx = async (): Promise<RegExp | null> => {
    // eg. (?:REV|PMC|WI|PASE|GUT)-\d+
    let patterns = await cache.get(OPTION_NAME_JIRA_TICKET_PATTERNS);

    if (!patterns) {
        patterns = await option.global.get(OPTION_NAME_JIRA_TICKET_PATTERNS) as string;
    }
    return patterns ? new RegExp(`\\b${patterns}\\b`) : null;
};

export const setJiraTicketRegEx = async (patterns: string): Promise<void> => {
    await cache.set(OPTION_NAME_JIRA_TICKET_PATTERNS, patterns);
    await option.global.set(OPTION_NAME_JIRA_TICKET_PATTERNS, patterns);
};

export const getDefaultReviewChannel = async (): Promise<string> => {
    let channel = await cache.get(OPTION_NAME_DEFAULT_CHANNEL) as string;

    if (!channel) {
        channel = await option.global.get(OPTION_NAME_DEFAULT_CHANNEL) as string;
    }
    return channel || '';
};

export const setDefaultReviewChannel = async (channelName: string): Promise<void> => {
    await cache.set(OPTION_NAME_DEFAULT_CHANNEL, channelName);
    await option.global.set(OPTION_NAME_DEFAULT_CHANNEL, channelName);
};

export const getReviewChannelForRepository = async (repositoryName: string): Promise<string> => {
    const cacheKey = `repo-channel-${repositoryName}`;
    let channel = await cache.get(cacheKey) as string;

    if (!channel) {
        const options = (await option.global.get(OPTION_NAME_REPO_CHANNEL) ?? {}) as Record<string, string>;

        channel = options[repositoryName] || await getDefaultReviewChannel();
    }

    return channel;
};

export const setReviewChannelForRepository = async (repositoryName: string, channelName: string): Promise<void> => {
    const options = (await option.global.get(OPTION_NAME_REPO_CHANNEL) ?? {}) as Record<string, string>;

    options[repositoryName] = channelName;
    await option.global.set(OPTION_NAME_REPO_CHANNEL, options);
};
