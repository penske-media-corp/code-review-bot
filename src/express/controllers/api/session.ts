import {
    SLACK_APP_ID,
    SLACK_BOT_CHANNEL_ID,
    SLACK_TEAM_ID,
} from '../../../lib/env';
import type {RequestHandler} from 'express';

const sessionController: RequestHandler = (req, res) => {
    const {id, fn: displayName} = req.user as {id: string; fn: string} || {};
    const user = id ? {id, displayName} : null;

    res.json({
        appId: SLACK_APP_ID,
        teamId: SLACK_TEAM_ID,
        botChannelId: SLACK_BOT_CHANNEL_ID,
        user,
    });
};

export default sessionController;
