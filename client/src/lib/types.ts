export interface CodeReview {
    createdAt: string;
    id: number;
    approvers?: string[];
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
