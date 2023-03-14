export const fetchData = async (url: string, options?: RequestInit): Promise<any> => {
    return fetch(url, {
        credentials: 'same-origin',
        ...options,
    }).then((response) => {
        if (response.status === 401) {
            throw (new Error('Permission denied'));
        }
        return response.json();
    });
};
