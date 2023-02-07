export const slackActions = {
    approved: ['approved', 'white_check_mark', 'heavy_check_mark'],
    change: ['memo', 'request-changes'],
    claim: ['eyes'],
    remove: ['trash'],
    request: ['review'],
};

export const channelNotify: {[key: string] : string} = {
    default: '!here|here',
    // @see https://api.slack.com/reference/surfaces/formatting#mentioning-groups
    'C04HT9SUN2H': '!here|here',
}
