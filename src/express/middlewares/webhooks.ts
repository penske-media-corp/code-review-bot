import type {RequestHandler} from 'express';
import Webhooks from '../../service/Webhooks';
import {createNodeMiddleware} from '@octokit/webhooks';
import {logError} from '../../lib/log';

export default function (): RequestHandler {
    const middleWare = createNodeMiddleware(Webhooks.register(), {
        path: '/api/github/webhooks'
    });

    return (req, res, next): void => {
        middleWare(req, res, next).catch(logError);
    };
}
