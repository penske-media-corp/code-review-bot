import type {RequestHandler} from 'express';

export const authMiddleware: RequestHandler = (req, res, next) => {
    // @TODO
    next();
};

export default authMiddleware;
