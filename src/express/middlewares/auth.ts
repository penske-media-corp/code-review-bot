import type {RequestHandler} from 'express';

export const enforceAuthentication: RequestHandler = (req, res, next) => {
    const user = req.user as {id?: string; sid?: string; fn?: string} | null ?? null;

    if (!user || !user.id || !user.sid || !user.fn) {
        res.status(401)
            .json(null);
        return;
    }

    next();
};
