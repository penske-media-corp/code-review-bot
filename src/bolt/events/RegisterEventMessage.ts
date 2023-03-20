import Review, {findCodeReviewRecord} from '../../service/Review';
import type {App} from '@slack/bolt';
import type {GenericMessageEvent} from '@slack/bolt';
import type {SayArguments} from '@slack/bolt';
import {getGithubBotEventData} from '../utils';
import {logDebug} from '../../lib/log';

export default function registerEventMessage (app: App): void {
    app.event('message', async ({event, say}) => {
        logDebug('DEBUG message', event);

        const data = getGithubBotEventData(event as GenericMessageEvent);

        if (!data) {
            return;
        }

        const {pullRequestLink, action} = data;

        const codeReview = await findCodeReviewRecord({pullRequestLink});

        if (codeReview) {
            switch (action) {
                case 'close':
                    {
                        const result = await Review.close(codeReview);

                        if (codeReview.status === 'closed') {
                            await say(result.slackNotifyMessage as SayArguments);
                        }
                    }
                    break;
            }
        }
    });
}
