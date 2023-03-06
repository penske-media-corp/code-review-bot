import {
    authenticate,
    session
} from '../../../service/User';
import type {RequestHandler} from 'express';

export const authSlackTokenController: RequestHandler = (req, res) => {
    const slackUserId = req.params.slackUserId;
    const token = req.params.token;

    if (token) {
        authenticate({slackUserId, token})
            .then((user) => {
                if (!user) {
                    return;
                }
                const sessionToken = session(user, 'sessionToken');
                res.cookie('session', JSON.stringify({
                    u: user.id,
                    t: sessionToken,
                }));
            })
            .catch((e) => res.json(e))
            .finally(() => {
                res.redirect('/');
            });
    } else {
        res.redirect('/');
    }
};
