import channelController from '../controllers/channel';
import express from 'express';
import reviewsController from '../controllers/reviews';

const api = express.Router();

api.get('/reviews/:channel?/:status?', reviewsController);
api.get('/channel/:id', channelController);

export default api;
