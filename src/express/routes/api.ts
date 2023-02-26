import {
    channelController,
    channelListController
} from '../controllers/channel';
import express from 'express';
import reviewsController from '../controllers/reviews';

const api = express.Router();

api.get('/reviews/:channel?/:status?', reviewsController);
api.get('/channel/:id', channelController);
api.get('/channels', channelListController);

export default api;
