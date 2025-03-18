import {getJiraTicketRegEx} from './config';

const GITHUB_PR_REGEX = /https:\/\/github.com\/[^ ]+?\/([^ ]+?)\/pull\/(\d+)/;

interface PullRequest {
    url: string;
    repository: string;
    number: string;
}

export function extractPullRequest (data: string): PullRequest {
    const match = GITHUB_PR_REGEX.exec(data);

    return {
        url: match ? match[0] : '',
        repository: match ? match[1] : '',
        number: match ? match[2] : '',
    };
}
export function extractPullRequestLink (data: string): string {
    return extractPullRequest(data).url;
}

export function extractRepository (data: string): string {
    return extractPullRequest(data).repository;
}

export async function extractJiraTicket (data: string): Promise<string> {
    const regEx = await getJiraTicketRegEx();
    if (regEx) {
        const match = regEx.exec(data);
        return match ? match[0] : '';
    }
    return '';
}

export async function extractNote (data: string): Promise<string> {
    const regEx = await getJiraTicketRegEx();
    if (regEx) {
        // We want to remove the Jira ticket & any leading or trailing spaces and dashes.
        // Jira ticket is extracted and stored in a separate field so we don't need that info in the note field.
        return data.replace(regEx, '').replace(/^[\s:-]+|[\s:-]+$/g, '');
    }
    return data;
}

/**
 * Return the eclipsed string:
 *  Examples:
 *   - "First part of string...last part of string."
 *   - "Clipped string..."
 */
export function eclipse (data: string, first: number, last: number = 0): string {
    if (first + last >= data.length) {
        return data;
    }
    return data.substring(0, first).trim() + '...' + (first > data.length && last ? data.slice(-last) : '').trim();
}
