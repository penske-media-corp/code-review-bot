import type {RequestHandler} from 'express';
import {logError} from '../../lib/log';
import {validateSession} from '../../service/User';

export const authMiddleware: RequestHandler = (req, res, next) => {
    try {
        const {session} = req.cookies as {session: string};

        if (typeof session === 'string') {
            const sessionObject = JSON.parse(session) as {u: number; t: string} | null;
            if (sessionObject) {
                Object.assign(req, {
                    userPromise: validateSession({id: sessionObject.u, token: sessionObject.t}),
                });
            }
        }
    } catch (e) {
        logError(e);
    }
    next();
};

export default authMiddleware;
