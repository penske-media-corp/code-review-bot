export const slackActions = {
    approved: ['approved', 'white_check_mark', 'heavy_check_mark'],
    change: ['memo', 'request-changes'],
    claim: ['eyes'],
    remove: ['trash'],
    request: ['review'],
};

export const teamToMentionInChannelAlert: {[key: string] : string} = {
    // @see https://api.slack.com/reference/surfaces/formatting#mentioning-groups
    default: '!here',
}

export const scheduledReminders = [
    '0 0 14 * * 1-5' // Mon-Fri @14:00
]
