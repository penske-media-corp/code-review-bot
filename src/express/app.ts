import {APP_CLIENT_BUILD} from '../lib/env';
import type {
    Express,
} from 'express';
import apiRouter from './routes/api';
import authMiddleware from './middlewares/auth';
import authRouter from './routes/auth';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'path';

const app: Express = express();

const corsOptions = {
    origin: true,
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);
app.use(express.static(APP_CLIENT_BUILD));

app.use('/api', apiRouter);
app.use('/auth', authRouter);

app.get( '/health-check', (req, res) => {
    res.json({
        status: 'ok',
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.resolve(APP_CLIENT_BUILD, 'index.html'));
});

export default app;
