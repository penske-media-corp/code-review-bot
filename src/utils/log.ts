import {
    LOG_DEBUG,
    LOG_ERROR,
} from './env';

/**
 * Log the debug message to the console.
 */
export function logDebug (...args: readonly unknown[]): void {
    if (LOG_DEBUG) {
        console.debug(...args);
    }
}

/**
 * Log the error message to the console.
 */
export function logError (...args: readonly unknown[]): void {
    if (LOG_ERROR) {
        console.error(...args);
    }
}
