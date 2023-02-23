import type {App} from '@slack/bolt';
import {logDebug} from '../../utils/log';
import {sentHomePageCodeReviewList} from '../utils';

export default function registerEventAppHomeOpened (app: App): void {
    app.event('app_home_opened', async ({event}) => {
        logDebug('app_home_opened', event);
        await sentHomePageCodeReviewList(event.user);
    });
}
