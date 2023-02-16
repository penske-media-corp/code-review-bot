import {App, Block, KnownBlock} from '@slack/bolt';
import {logDebug} from '../../utils/log';
import {sentHomePageCodeReviewList} from '../utils';

export default function registerEventAppHomeOpened(app: App) {
    app.event('app_home_opened', async ({event}) => {
        logDebug('app_home_opened', event);
        await sentHomePageCodeReviewList(event.user);
    });
}
