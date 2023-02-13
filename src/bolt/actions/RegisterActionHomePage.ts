import {App, Block, KnownBlock} from '@slack/bolt';
import {PrismaClient} from '@prisma/client';
import Review from '../../service/Review';
import SlackActions from '../../utils/SlackActions';
import {logDebug} from '../../utils/log';
import {sentHomePageCodeReviewList} from '../utils';

export default function registerActionHomePage(app: App) {
    app.action({callback_id: 'home_page'}, async ({action, body}) => {
        logDebug('action', action);
        const actionUserId = body.user.id

        const {action_id: actionId, value: actionValue} = action as {action_id: string, value: string};

        const prisma = new PrismaClient();
        const codeReview = await prisma.codeReview.findFirst({
            where: {
                id: parseInt(actionId.split('-')[1]),
            }
        })

        if (codeReview) {
            const statusMap: {[index:string]: string} = {
                claim: 'pending',
                approve: 'approved',
                remove: 'removed',
            }
            const status = statusMap[actionValue];
            if (status) {
                await Review.setCodeReviewerStatus(codeReview, actionUserId, status);
            }
        }

        await sentHomePageCodeReviewList(actionUserId);
    });
}
