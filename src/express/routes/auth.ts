import express from 'express';

const authRouter = express.Router();

authRouter.get('/slack/:slackUserId/:token', (req, res) => {
    // @TODO
    res.redirect('/');
});

export default authRouter;
