import {
    channelController,
    channelListController
} from '../controllers/api/channel';
import actionController from '../controllers/api/action';
import {enforceAuthentication} from '../middlewares/auth';
import express from 'express';
import {handleWebhooks} from '../middlewares/webhooks';
import profileController from '../controllers/api/profile';
import reviewsController from '../controllers/api/reviews';
import saveController from '../controllers/api/save';
import sessionController from '../controllers/api/session';

const apiRouter = express.Router();

apiRouter.use('/', handleWebhooks);

// All routes from here on are required to authenticate
apiRouter.use('/', enforceAuthentication);
apiRouter.get('/session', sessionController);
apiRouter.get('/profile', profileController);
apiRouter.get('/action/:action/:value', actionController);
apiRouter.post('/action/save/:value', saveController);
apiRouter.get('/reviews/:channel?/:status?', reviewsController);
apiRouter.get('/channel/:id', channelController);
apiRouter.get('/channels', channelListController);

export default apiRouter;
