import './utils/env';
import {PORT} from './utils/env';
import expressApp from './express/app';
import slackBotApp from './bolt/app';

(async () => {
    await slackBotApp.start();
    return expressApp.listen(PORT);
})().then(() => {
    console.log('⚡️ Bolt boltApp is running!');
}).catch((error) => {
    console.error(error);
});
