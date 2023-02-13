import './utils/env';
import {PORT} from './utils/env';
import expressApp from './express/app';
import {logError} from './utils/log';

(async () => {
    return expressApp.listen(PORT);
})().then(() => {
    console.log('⚡️ PMC Code Review Slack Bot is running!');
}).catch((error) => {
    logError(error)
});
