import type {User} from '@prisma/client';
import crypto from 'crypto';
import {logDebug} from '../lib/log';
import {prisma} from '../lib/config';

export const load = async ({slackUserId, userId, id}: {slackUserId?: string; userId?: string; id?: number}): Promise<User | null> => {
    let where = {};
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

    if (!where) {
        user = await prisma.user.findFirst({where}) as User;
    }

    logDebug('User.load', {slackUserId, userId, id, user});
    return user;
};

export const generateAuthToken = async ({id, session}: Partial<User>): Promise<string | null> => {
    const token = crypto.randomUUID();

    await prisma.user.update({
        where: {
            id,
        },
        data: {
            session: Object.assign(session ?? {}, {authToken: token}),
        }
    });

    logDebug('generateAuthToken', {id, session, token});
    return token;
};

export const authenticate = async ({slackUserId, userId, id, token}: {slackUserId?: string; userId?: string; id?: number; token: string}): Promise<User | null> => {
    const user = await load({slackUserId, userId, id});

    logDebug('User.authenticate request', {slackUserId, userId, id, token});

    if (!user) {
        return null;
    }

    const session = user?.session as Partial<{authToken: string; sessionToken: string}>;

    if (!user || !session || typeof session !== 'object') {
        return null;
    }

    const {authToken} = session as {authToken?: string};

    // Invalid token?
    if (authToken !== token) {
        return null;
    }

    // Consume the token.
    delete session.authToken;

    // Generate a new session token.
    session.sessionToken = crypto.randomUUID();

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {session},
    });

    logDebug('User.authenticate success', user);

    return user;
};

export default {
    authenticate,
    load,
    generateAuthToken,
};
