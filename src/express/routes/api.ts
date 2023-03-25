import {
    channelController,
    channelListController
} from '../controllers/api/channel';
import actionController from '../controllers/api/action';
import {enforceAuthentication} from '../middlewares/auth';
import express from 'express';
import reviewsController from '../controllers/api/reviews';
import saveController from '../controllers/api/save';
import sessionController from '../controllers/api/session';

const apiRouter = express.Router();

apiRouter.get('/session', sessionController);

apiRouter.use('/', enforceAuthentication);
apiRouter.get('/action/:action/:value', actionController);
apiRouter.post('/action/save/:value', saveController);
apiRouter.get('/reviews/:channel?/:status?', reviewsController);
apiRouter.get('/channel/:id', channelController);
apiRouter.get('/channels', channelListController);

export default apiRouter;
