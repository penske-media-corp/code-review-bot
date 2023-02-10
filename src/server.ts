import './utils/env';
import {PORT} from './utils/env';
import boltApp from './bolt/app';
import expressApp from './express/app';

(async () => {
    await boltApp.start();
    return expressApp.listen(PORT);
})().then(() => {
    console.log('⚡️ Bolt boltApp is running!');
}).catch((error) => {
    console.error(error);
});
