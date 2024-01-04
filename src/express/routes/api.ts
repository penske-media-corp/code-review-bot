import {
    channelController,
    channelListController
} from '../controllers/api/channel';
import actionController from '../controllers/api/action';
import archiveController from '../controllers/api/archive';
import {enforceAuthentication} from '../middlewares/auth';
import express from 'express';
import {handleWebhooks} from '../middlewares/webhooks';
import reportController from '../controllers/api/report';
import reviewsController from '../controllers/api/reviews';
import saveController from '../controllers/api/save';
import sessionController from '../controllers/api/session';

const apiRouter = express.Router();

apiRouter.use('/', handleWebhooks);
apiRouter.get('/session', sessionController);

apiRouter.use('/', enforceAuthentication);
apiRouter.get('/action/:action/:value', actionController);
apiRouter.post('/action/save/:value', saveController);
apiRouter.get('/archive', archiveController);
apiRouter.get('/reviews/:channel?/:status?', reviewsController);
apiRouter.get('/channel/:id', channelController);
apiRouter.get('/channels', channelListController);
apiRouter.get('/report', reportController);

export default apiRouter;
