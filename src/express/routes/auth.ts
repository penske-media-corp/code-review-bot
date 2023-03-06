import {authSlackTokenController} from '../controllers/auth/slack';
import express from 'express';

const authRouter = express.Router();

authRouter.get('/slack/token/:slackUserId/:token', authSlackTokenController);

export default authRouter;
