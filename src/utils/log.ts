import {LOG_DEBUG, LOG_ERROR} from './env';

/**
 * Log the debug message to the console.
 */
export function logDebug(...args: unknown[]) {
    if (LOG_DEBUG) {
        console.debug(...args);
    }
}

/**
 * Log the error message to the console.
 */
export function logError(...args: unknown[]) {
    if (LOG_ERROR) {
        console.error(...args);
    }
}
