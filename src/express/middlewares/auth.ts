import type {RequestHandler} from 'express';

export const enforceAuthentication: RequestHandler = (req, res, next) => {
    const user = req.user as {sid: string; fn: string};

    if (!user?.sid) {
        res.json({
            error: 'Not authorized',
        });
        return;
    }

    next();
};
