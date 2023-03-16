import {
    Webhooks,
    createNodeMiddleware,
} from '@octokit/webhooks';
import {GITHUB_WEBHOOKS_SECRET} from '../../lib/env';
import type {RequestHandler} from 'express';
import {logError} from '../../lib/log';

export default function (): RequestHandler {
    const webhooks = new Webhooks({
        secret: GITHUB_WEBHOOKS_SECRET,
    });

    const middleWare = createNodeMiddleware(webhooks, {
        path: '/api/github/webhooks'
    });

    return (req, res, next): void => {
        middleWare(req, res, next).catch(logError);
    };
}
