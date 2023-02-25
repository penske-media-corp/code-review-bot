import type {Prisma} from '@prisma/client';
import {prisma} from './config';

const get = async (slackChannelId: string, name: string): Promise<Prisma.JsonValue> => {
    const result = await prisma.option.findFirst({
        where: {
            slackChannelId,
            name,
        }
    });

    return result?.value ?? null;
};

const set = async (slackChannelId: string, name: string, value: Prisma.InputJsonValue): Promise<void> => {
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

export default {
    get,
    set,
};
