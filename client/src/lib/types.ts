export interface CodeReview {
    approvers?: string[];
    createdAt: string;
    id: number;
    jiraTicket?: string;
    jiraTicketLinkUrl?: string;
    note?: string;
    owner: string;
    pullRequestLink: string;
    requestChanges?: string[];
    reviewers?: string[];
    slackPermalink?: string;
    slackThreadTs?: string;
    status: string;
    updatedAt: string;
}

export interface User {
    displayName: string;
}
