import './utils/env';
import Connection from './database/connection';
import {PORT} from './utils/env';
import boltApp from './bolt/app';
import expressApp from './express/app';

(async () => {
    if (!Connection.isInitialized) {
        await Connection.initialize();
    }
    await boltApp.start();
    return expressApp.listen(PORT);
})().then(() => {
    console.log('⚡️ Bolt boltApp is running!');
}).catch((error) => {
    console.error(error);
});
