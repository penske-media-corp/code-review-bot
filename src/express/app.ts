import {APP_CLIENT_BUILD_PATH} from '../lib/env';
import type {
    Express,
} from 'express';
import apiRouter from './routes/api';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'path';
import registerAuthenticationService from './services/authentication';

const app: Express = express();

const corsOptions = {
    origin: true,
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.static(APP_CLIENT_BUILD_PATH));

app.use(cookieParser());

app.use((req, res, next) => {
    // @octokit/webhooks v12+ endpoint need to be excluded from json middleware.
    if (['/api/github/webhooks'].includes(req.path)) {
        next();
    } else {
        express.json()(req, res, next);
    }
});

app.get( '/health-check', (req, res) => {
    res.json({
        status: 'ok',
    });
});

// Need to register the authentication related service before protected routes.
registerAuthenticationService(app);
app.use('/api', apiRouter);

app.get('*', (req, res) => {
    res.sendFile(path.resolve(APP_CLIENT_BUILD_PATH, 'index.html'));
});

export default app;
