import {
    channelController,
    channelListController
} from '../controllers/channel';
import express from 'express';
import reviewsController from '../controllers/reviews';

const apiRouter = express.Router();

apiRouter.get('/reviews/:channel?/:status?', reviewsController);
apiRouter.get('/channel/:id', channelController);
apiRouter.get('/channels', channelListController);

export default apiRouter;
