import {APP_CLIENT_BUILD} from '../lib/env';
import type {
    Express,
} from 'express';
import apiRouter from './routes/api';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import {enforceAuthentication} from './middlewares/auth';
import express from 'express';
import path from 'path';
import registerAuthenticationService from './services/authentication';

const app: Express = express();

const corsOptions = {
    origin: true,
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.static(APP_CLIENT_BUILD));
app.use(cookieParser());
app.use(express.json());

app.get( '/health-check', (req, res) => {
    res.json({
        status: 'ok',
    });
});

// Need to register the authentication related service before protected routes.
registerAuthenticationService(app);
app.use('/api', enforceAuthentication, apiRouter);

app.get('*', (req, res) => {
    res.sendFile(path.resolve(APP_CLIENT_BUILD, 'index.html'));
});

export default app;
