import type {Prisma} from '@prisma/client';
import {prisma} from './config';

const GLOBAL_OPTION = 'global';

export const get = async (slackChannelId: string, name: string): Promise<Prisma.JsonValue> => {
    const result = await prisma.option.findFirst({
        where: {
            slackChannelId,
            name,
        }
    });

    return result?.value ?? null;
};

export const set = async (slackChannelId: string, name: string, value: Prisma.InputJsonValue): Promise<void> => {
    await prisma.option.upsert({
        where: {
            slackChannelId_name: {
                name,
                slackChannelId,
            },
        },
        update: {
            value,
        },
        create: {
            name,
            slackChannelId,
            value,
        },
    });
};

export const global = {
    get: async (name: string): Promise<Prisma.JsonValue> => {
        return get(GLOBAL_OPTION, name);
    },
    set: async (name: string, value: Prisma.InputJsonValue): Promise<void> => {
        return set(GLOBAL_OPTION, name, value);
    },
};

export default {
    get,
    set,
    global,
};
