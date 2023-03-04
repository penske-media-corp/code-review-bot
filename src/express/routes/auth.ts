import {authSlackController} from '../controllers/auth/slack';
import express from 'express';

const authRouter = express.Router();

authRouter.get('/slack/:slackUserId/:token', authSlackController);

export default authRouter;
