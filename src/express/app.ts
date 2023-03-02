import {APP_CLIENT_BUILD} from '../lib/env';
import type {
    Express,
} from 'express';
import api from './routes/api';
import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'path';

const app: Express = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(APP_CLIENT_BUILD));

app.use('/api', api);

app.get( '/health-check', (req, res) => {
    res.json({
        status: 'ok',
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.resolve(APP_CLIENT_BUILD, 'index.html'));
});

export default app;
