export interface ReactionData {
    slackChannelId: string;
    slackMsgId?: string;
    slackPermalink?: string;
    slackMsgUserId: string;
    slackMsgText?: string;
    slackThreadTs: string;
    slackMsgTs: string;
    reaction: string;
    reactionUserId: string;
    pullRequestLink: string;
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
