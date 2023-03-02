import {
    channelList,
    channelMaps
} from '../../bolt/utils';
import type {RequestHandler} from 'express';

export const channelController: RequestHandler = (req, res) => {
    res.json(channelMaps[req.params.id]);
};

export const channelListController: RequestHandler = (req, res) => {
    res.json(channelList);
};
