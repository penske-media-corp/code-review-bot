export interface ReactionData {
    jiraTicket: string;
    note: string;
    pullRequestLink: string;
    reaction: string;
    reactionUserId: string;
    slackChannelId: string;
    slackMsgId?: string;
    slackMsgText?: string;
    slackMsgTs: string;
    slackMsgUserId: string;
    slackPermalink?: string;
    slackThreadTs: string;
}

export interface UserInfo {
    slackUserId: string;
    displayName: string;
}

export interface GithubBotEventData {
    action: string;
    message: string;
    pullRequestLink: string;
}

export interface ChannelInfo {
    id: string;
    name: string;
}
