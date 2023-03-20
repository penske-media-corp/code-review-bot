import {
    channelController,
    channelListController
} from '../controllers/api/channel';
import actionController from '../controllers/api/action';
import express from 'express';
import reviewsController from '../controllers/api/reviews';
import saveController from '../controllers/api/save';
import userController from '../controllers/api/user';

const apiRouter = express.Router();

apiRouter.get('/action/:action/:value', actionController);
apiRouter.post('/action/save/:value', saveController);
apiRouter.get('/reviews/:channel?/:status?', reviewsController);
apiRouter.get('/channel/:id', channelController);
apiRouter.get('/channels', channelListController);
apiRouter.get('/user', userController);
export default apiRouter;
