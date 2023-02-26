import type {RequestHandler} from 'express';
import {channelList, channelMaps} from '../../bolt/utils';

export const channelController: RequestHandler = (req, res) => {
    res.json(channelMaps[req.params.id]);
};

export const channelListController: RequestHandler = (req, res) => {
    res.json(channelList);
};
