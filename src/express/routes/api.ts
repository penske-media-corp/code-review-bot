import {
    channelController,
    channelListController
} from '../controllers/api/channel';
import actionController from '../controllers/api/action';
import authMiddleware from '../middlewares/auth';
import express from 'express';
import reviewsController from '../controllers/api/reviews';

const apiRouter = express.Router();
apiRouter.use(authMiddleware);

apiRouter.get('/action/:action/:value', actionController);
apiRouter.get('/reviews/:channel?/:status?', reviewsController);
apiRouter.get('/channel/:id', channelController);
apiRouter.get('/channels', channelListController);

export default apiRouter;
