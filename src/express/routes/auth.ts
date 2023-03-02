import express from 'express';

const authRouter = express.Router();

authRouter.get('/auth/slack/:token?', (req, res) => {
    // @TODO
    res.redirect('/');
});

export default authRouter;
