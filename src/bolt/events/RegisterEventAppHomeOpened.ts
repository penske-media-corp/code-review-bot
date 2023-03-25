import type {App} from '@slack/bolt';
import {generateAuthToken} from '../../service/User';
import {logDebug} from '../../lib/log';
import {sentHomePageCodeReviewList} from '../utils';

export default function registerEventAppHomeOpened (app: App): void {
    app.event('app_home_opened', async ({event}) => {
        logDebug('app_home_opened', event);
        const authToken = await generateAuthToken({slackUserId: event.user});

        await sentHomePageCodeReviewList({slackUserId: event.user, authToken});
    });
}
