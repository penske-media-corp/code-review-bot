import {GITHUB_WEBHOOKS_SECRET} from '../lib/env';
import {
    Webhooks,
} from '@octokit/webhooks';

const webhooks = new Webhooks({
    secret: GITHUB_WEBHOOKS_SECRET,
});

const register = (): Webhooks => {
    webhooks.on('pull_request', function (data) {
    });
    return webhooks;
};

export default {
    register,
};
