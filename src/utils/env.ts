// for details see https://github.com/motdotla/dotenv/blob/master/examples/typescript/
import { resolve } from 'path';
import { config } from 'dotenv';

const pathToConfig = '../../.env';
config({ path: resolve(__dirname, pathToConfig) });

export const DB_HOST = process.env.DB_HOST ?? 'localhost';
export const DB_NAME = process.env.DB_NAME ?? 'code_review_bot';
export const DB_PASSWORD = process.env.DB_PASSWORD ?? 'password';
export const DB_USER = process.env.DB_USER ?? 'root';

export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? '';
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? '';

export const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost';
export const PORT = parseInt(process.env.PORT ?? '80' );

export const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN ?? '';
export const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? '';
export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? '';

export const APP_ROOT_DIR = resolve(__dirname, '../..');

export const APP_STATIC_DIR = resolve(APP_ROOT_DIR, 'static');
