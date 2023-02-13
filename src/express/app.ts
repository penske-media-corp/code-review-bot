import express, {
    Express,
    Request,
    Response,
} from 'express';
import cookieParser from 'cookie-parser';

const expresApp: Express = express();

expresApp.use(express.json());
expresApp.use(cookieParser());

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const healthCheck = (req: Request, res: Response) => {
    res.json({
        status: 'ok',
    })
}

/**
 * Route GET: /health-check
 */
expresApp.get('/health-check', healthCheck);
expresApp.get('*', healthCheck);

export default expresApp;
