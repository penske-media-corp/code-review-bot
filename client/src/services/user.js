let isFetching = false;
let user;

export const fetchAuthUser = async () => {
    if (user || isFetching) {
        return user;
    }
    isFetching = true;
    user = await fetch(`/api/user`, {
        credentials: 'same-origin',
    }).then((res) => res.json());
    isFetching = false;

    return user;
};
