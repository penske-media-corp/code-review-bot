const inMemoryCaches: {[index: string]: number | string} = {};
const get = async (name: string): Promise<number | string | null> => {
    return inMemoryCaches[name];
};

const set = async (name: string, value: number | string): Promise<void> => {
    inMemoryCaches[name] = value;
};

export default {
    get,
    set,
};
