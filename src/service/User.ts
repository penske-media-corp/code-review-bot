import type {
    Prisma,
    User
} from '@prisma/client';
import crypto from 'crypto';
import {getUserInfo} from '../bolt/utils';
import {logDebug} from '../lib/log';
import {prisma} from '../lib/config';

interface LoadParams {
    slackUserId?: string;
    userId?: string;
    id?: number;
    select?: Prisma.UserSelect;
}

export const load = async ({slackUserId, userId, id, select}: LoadParams): Promise<User | null> => {
    let where: Prisma.UserWhereInput | null = null;
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
        user = await prisma.user.findFirst({
            select: Object.assign(
                {
                    displayName: true,
                    email: true,
                    id: true,
                    slackUserId: true,
                    githubId: true,
                },
                select
            ),
            where
        }) as User;
    }

    logDebug('User.load', {slackUserId, userId, id, where, user});
    return user;
};

export const findOrCreate = async (slackUserId: string): Promise<User> => {
    let user = await load({
        slackUserId,
        select: {
            session: true,
        }
    });

    if (!user) {
        const userInfo = await getUserInfo(slackUserId);

        user = await prisma.user.create({
            data: {
                email: userInfo.email,
                displayName: userInfo.displayName,
                slackUserId,
            }
        });
    }
    return user;
};

export const sync = async ({displayName, email, slackUserId}: {displayName?: string; email?: string; slackUserId?: string}): Promise<User | null> => {

    if (!slackUserId) {
        return null;
    }

    let user = await prisma.user.findFirst({
        where: {
            slackUserId,
        }
    });

    let data: Prisma.UserUncheckedCreateInput;

    if (!displayName) {
        data = await getUserInfo(slackUserId);
    } else {
        data = {
            displayName,
            email,
            slackUserId,
        };
    }

    if (!user) {
        user = await prisma.user.create({
            data
        });
    } else if (user.displayName !== displayName || user.email !== email) {
        await prisma.user.update({
            where: {
                id: user.id,
            },
            data,
        });
    }

    return user;
};

export const getSessionValueByKey = (user: User, name: string): any => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = user.session as Partial<{[index: string]: any} | null>; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!session || typeof session !== 'object') {
        return null;
    }

    return session[name];
};

export const generateAuthToken = async ({id, slackUserId}: {id?: number; slackUserId?: string}): Promise<string> => {
    const token = crypto.randomUUID();
    let user;

    if (id) {
        user = await load({id, select: {session: true}});
    } else if (slackUserId) {
        user = await findOrCreate(slackUserId);
    }

    if (user) {
        const session = user.session ?? {};

        Object.assign(session, {token});
        await prisma.user.update({
            where: {id: user.id},
            data: {session},
        });
    }

    return token;
};

export const validateAuthToken = async ({id, token}: {id: number; token: string}): Promise<User | null> => {
    const user = await load({id, select: {session: true}});

    if (!user?.session) {
        return null;
    }

    if (token !== getSessionValueByKey(user, 'token')) {
        return null;
    }

    const session = user.session as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

    delete session.token;

    await prisma.user.update({
        where: {id},
        data: {session},
    });

    user.session = {};

    return user;
};

export default {
    generateAuthToken,
    getSessionValueByKey,
    findOrCreate,
    load,
    sync,
    validateAuthToken,
};
