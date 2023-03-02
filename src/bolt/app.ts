import {
    App,
    LogLevel,
} from '@slack/bolt';
import {
    SLACK_APP_TOKEN,
    SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET
} from '../lib/env';
import registerActionHomePage from './actions/RegisterActionHomePage';
import registerEventAppHomeOpened from './events/RegisterEventAppHomeOpened';
import registerEventAppMention from './events/RegisterEventAppMention';
import registerEventMemberJoinedChannel from './events/RegisterEventMemberJoinedChannel';
import registerEventMessage from './events/RegisterEventMessage';
import registerEventReactionAdd from './events/RegisterEventReactionAdd';
import registerEventReactionRemove from './events/RegisterEventReactionRemove';
import {registerSlackBotApp} from './utils';

const slackBotApp = new App({
    appToken: SLACK_APP_TOKEN,
    logLevel: LogLevel.ERROR,
    signingSecret: SLACK_SIGNING_SECRET,
    socketMode: true,
    token: SLACK_BOT_TOKEN,
});

slackBotApp.use(async ({next}) => {
    await next();
});

registerSlackBotApp(slackBotApp);
registerActionHomePage(slackBotApp);
registerEventAppHomeOpened(slackBotApp);
registerEventAppMention(slackBotApp);
registerEventMemberJoinedChannel(slackBotApp);
registerEventReactionAdd(slackBotApp);
registerEventReactionRemove(slackBotApp);
registerEventMessage(slackBotApp);
export default slackBotApp;
