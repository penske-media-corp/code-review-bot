import {
    postSlackMessage,
    sentHomePageCodeReviewList
} from '../utils';
import type {App} from '@slack/bolt';
import type {ChatPostMessageArguments} from '@slack/web-api';
import Review from '../../service/Review';
import {logDebug} from '../../utils/log';
import {prisma} from '../../utils/config';

export default function registerActionHomePage (app: App): void {
    app.action({callback_id: 'home_page'}, async ({action, body}) => {
        logDebug('action', action);
        const actionUserId = body.user.id;

        const {action_id: actionId, value: actionValue} = action as {action_id: string; value: string};

        if (['approve', 'claim', 'close', 'remove'].includes(actionValue)) {
            const codeReview = await prisma.codeReview.findFirst({
                include: {
                    user: true,
                    reviewers: true,
                },
                where: {
                    id: parseInt(actionId.split('-')[1]),
                }
            });

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
                    case 'remove':
                        result = await Review.remove(codeReview, actionUserId);
                        break;
                }
                if (result) {
                    await postSlackMessage(result.slackNotifyMessage as ChatPostMessageArguments);
                }
            }
            await sentHomePageCodeReviewList(actionUserId);
        } else if (['pending', 'inprogress', 'mine'].includes(actionValue)) {
            await sentHomePageCodeReviewList(actionUserId, actionValue);
        }
    });
}
