import './utils/env';
import {APP_BASE_URL, PORT} from './utils/env';
import expressApp from './express/app';
import slackBotApp from './bolt/app';

(async (): Promise<void> => {
    await slackBotApp.start();
    expressApp.listen(PORT);
})().then(() => {

    console.log(`⚡️ Bolt boltApp is running as ${APP_BASE_URL}`);
}).catch((error) => {
    console.error(error);
});
