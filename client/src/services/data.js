import {logDebug} from './log';

const states = {};

/**
 * Fetch the list of code review.
 *
 * @param {string} channel
 * @param {number} limit
 * @param {number} page
 * @param {string} status
 * @returns {Promise<T|null>}
 */
export const fetchReviews = async ({channel, limit, page, status}) => {
    const key = `fetchReviews-${channel}-${limit}-${page}-${status}`;

    if (states[key]) {
        return null;
    }

    logDebug('fetchData', key)
    states[key] = true;

    return fetch(`/api/reviews/${channel}/${status}?limit=${limit}&page=${page}`, {
        credentials: 'same-origin',
    })
        .then((res) => res.json())
        .then((result) => {
            delete states[key];
            return result;
        });
};

/**
 * Fetch the list of channel data.
 *
 * @returns {Promise<T|null>}
 */
export const fetchChannel = async () => {
    const key = `fetchChannel`;
    logDebug('fetchChannel', states[key]);
    if (states[key]) {
        return states[key];
    }

    states[key] = [];

    return fetch(`/api/channels`)
        .then((res) => res.json())
        .then((result) => {
            states[key] = result;
            return result;
        });
};
