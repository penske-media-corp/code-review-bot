import type {RequestHandler} from 'express';
import {channelList} from '../../bolt/utils';

const channelController: RequestHandler = (req, res) => {
    const id = req.params.id;

    res.json(channelList[id]);
};

export default channelController;
