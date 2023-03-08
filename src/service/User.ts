import type {User} from '@prisma/client';
import crypto from 'crypto';
import {logDebug} from '../lib/log';
import {prisma} from '../lib/config';

export const load = async ({slackUserId, userId, id}: {slackUserId?: string; userId?: string; id?: number}): Promise<User | null> => {
    let where;
    let user: User | null = null;

    if (id) {
        where = {id};
    } else if (userId) {
        where = {
            id: parseInt(userId),
        };
    } else if (slackUserId) {
        where = {slackUserId};
    }

    if (where) {
        user = await prisma.user.findFirst({where});
    }

    logDebug('User.load', {slackUserId, userId, id, where, user});
    return user;
};

export const session = (user: User, name: string): unknown => {
    const value = user.session as Partial<{[index: string]: unknown} | null>;

    if (!value || typeof value !== 'object') {
        return null;
    }

    return value[name];
};

export default {
    load,
    session,
};
