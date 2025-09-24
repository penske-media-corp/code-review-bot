const inMemoryCaches = new Map<string, number | string>();
const get = async (name: string): Promise<number | string | null> => {
    return inMemoryCaches.get(name) ?? null;
};

const set = async (name: string, value: number | string): Promise<void> => {
    inMemoryCaches.set(name, value);
};

const clear = async (): Promise<void> => {
    inMemoryCaches.clear();
};

export default {
    get,
    set,
    clear,
};
