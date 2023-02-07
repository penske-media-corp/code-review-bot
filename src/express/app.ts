import express, {
    Express,
} from 'express';
import {APP_STATIC_DIR} from '../utils/env';
import path from 'path';

const app: Express = express();

app.get('/', (req,res) => {
    console.log('path: ',req.path, req);
    const file = path.resolve(APP_STATIC_DIR, 'example.html');
    res.sendFile(file);
});

export default app;
