export interface ReactionData {
    slackMsgId: string;
    slackMsgUserId: string;
    slackMsgText: string;
    slackMsgThreadTs: string;
    reaction: string;
    reactionUserId: string;
    pullRequestLink: string;
}

export interface UserInfo {
    slackUserId: string;
    displayName: string;
}
