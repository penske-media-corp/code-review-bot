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

export interface User {
    displayName: string;
}

export interface ExpandedRowProps {
    onUpdate: CallableFunction;
    user: User;
}

export interface DataViewProps extends ExpandedRowProps {
    data: CodeReview;
    onError?: CallableFunction;
}

export type DataEditProps = DataViewProps;

export interface UpdateEventProps {
    data: CodeReview;
    action: string;
}

export interface ChannelFilterProps {
    onSelected: CallableFunction;
    selectedChannel: string;
}
