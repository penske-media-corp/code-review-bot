import type {RequestHandler} from 'express';
import Webhooks from '../../service/Webhooks';
import {createNodeMiddleware} from '@octokit/webhooks';
import {logError} from '../../lib/log';

const middleWare = createNodeMiddleware(Webhooks.register(), {
    path: '/github/webhooks'
});

export const handleWebhooks: RequestHandler = (req, res, next): void => {
    middleWare(req, res, next).catch(logError);
};
