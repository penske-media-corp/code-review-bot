import Review, {findCodeReviewRecord} from '../../service/Review';
import {
    postSlackMessage,
    sentHomePageCodeReviewList
} from '../utils';
import type {App} from '@slack/bolt';
import type {ChatPostMessageArguments} from '@slack/web-api';
import {logDebug} from '../../lib/log';

export default function registerActionHomePage (app: App): void {
    app.action({callback_id: 'home_page'}, async ({action, body}) => {
        logDebug('action', action);
        const actionUserId = body.user.id;
        const {action_id: actionId, value: actionValue, selected_option: selectedOption} = (action as unknown) as {action_id: string; value?: string; selected_option?: {value: string}};
        const slackChannelId = selectedOption?.value;

        if (actionValue && ['approve', 'claim', 'close', 'delete'].includes(actionValue)) {
            const codeReview = await findCodeReviewRecord({id: parseInt(actionId.split('-')[1])});

            if (codeReview) {
                let result;
                switch (actionValue) {
                    case 'approve':
                        result = await Review.approve(codeReview, actionUserId);
                        break;
                    case 'claim':
                        result = await Review.claim(codeReview, actionUserId);
                        break;
                    case 'close':
                        result = await Review.close(codeReview);
                        break;
                    case 'delete':
                        result = await Review.deleteRecord(codeReview, actionUserId);
                        break;
                }
                if (result) {
                    await postSlackMessage(result.slackNotifyMessage as ChatPostMessageArguments);
                }
            }
            await sentHomePageCodeReviewList({slackUserId: actionUserId});
        } else if (actionValue && ['pending', 'inprogress', 'mine'].includes(actionValue)) {
            await sentHomePageCodeReviewList({slackUserId: actionUserId, codeReviewStatus: actionValue});
        } else if (actionId === 'channel') {
            await sentHomePageCodeReviewList({slackUserId: actionUserId, slackChannelId});
        } else if (actionId === 'weblogin') {
            await sentHomePageCodeReviewList({slackUserId: actionUserId});
        }
    });
}
