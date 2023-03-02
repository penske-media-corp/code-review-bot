import type {RequestHandler} from 'express';

export const authSlack: RequestHandler = (req, res) => {
    const token = req.params.token;

    if (token) {
        // @TODO:
    }
    res.redirect('/');
};

export default authSlack;
