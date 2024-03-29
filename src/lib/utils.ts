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
