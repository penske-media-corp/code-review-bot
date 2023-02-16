import express, {
    Express,
} from 'express';
import {APP_CLIENT_BUILD} from '../utils/env';
import api from './routes/api';
import cookieParser from 'cookie-parser';
import path from 'path';

const app: Express = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(APP_CLIENT_BUILD));

app.use('/api', api);

app.get( '/health-check', (req, res) => {
    res.json({
        status: 'ok',
    })
});

app.get('*', (req,res) => {
    res.sendFile(path.resolve(APP_CLIENT_BUILD, 'index.html'));
});

export default app;
