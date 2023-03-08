import {config} from 'dotenv';
import {resolve} from 'path';

const pathToConfig = '../../.env';
config({path: resolve(__dirname, pathToConfig)});

export const DB_HOST = process.env.DB_HOST ?? 'localhost';
export const DB_NAME = process.env.DB_NAME ?? 'code_review_bot';
export const DB_PASSWORD = process.env.DB_PASSWORD ?? 'password';
export const DB_USER = process.env.DB_USER ?? 'root';

export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? '';
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? '';

export const DNS_NAME = process.env.DNS_NAME ?? 'localhost';
export const PORT = parseInt(process.env.PORT ?? '80' );
export const APP_BASE_URL = process.env.APP_BASE_URL ?? `${DNS_NAME === 'localhost' ? 'http' : 'https'}://${DNS_NAME}${PORT === 80 || DNS_NAME !== 'localhost' ? '' : ':' + PORT.toString() }`;

export const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN ?? '';
export const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? '';
export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? '';
export const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID ?? '';
export const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET ?? '';

export const APP_ROOT_DIR = resolve(__dirname, '../..');
export const APP_CLIENT_BUILD = resolve(APP_ROOT_DIR, 'client', 'build');

export const LOG_DEBUG = ['true', 'yes'].includes(process.env.LOG_DEBUG ?? '');
export const LOG_ERROR = ['true', 'yes'].includes(process.env.LOG_ERROR ?? 'true');
export const PRISMA_DEBUG = ['true', 'yes'].includes(process.env.PRISMA_DEBUG ?? 'true');

// prisma use this info
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = `mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:3306/${DB_NAME}`;
}
