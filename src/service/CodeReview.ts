import CodeReviewRequest from '../database/entity/CodeReviewRequest';
import User from '../database/entity/User';
import Connection from '../database/connection';
import {getUserInfo} from '../bolt/utils';

async function findOrCreateUser({slackUserId} : User) {

    if (!slackUserId) {
        return;
    }

    const repository = Connection.getRepository(User);

    let user = await repository.findOneBy({slackUserId});
    if (!user) {
        user = new User();
        user.slackUserId = slackUserId;

        const userInfo = await getUserInfo(slackUserId);
        if (userInfo) {
            user.displayName = userInfo.displayName;
        }
        await repository.save(user);
    }
    return user;
}

async function findOrCreateCodeReviewRequest({jiraTicket, pullRequestLink, slackMsgId, user}: CodeReviewRequest) {
    const repository = Connection.getRepository(CodeReviewRequest);
    let codeReviewRequest = await repository.findOne({
        relations: {
            user: true,
        },
        where: [
            {pullRequestLink},
            {slackMsgId},
        ]
    });

    if (!codeReviewRequest) {
        codeReviewRequest = new CodeReviewRequest();
        codeReviewRequest.slackMsgId = slackMsgId ?? '';
        codeReviewRequest.pullRequestLink = pullRequestLink ?? '';
        codeReviewRequest.jiraTicket = jiraTicket ?? '';

        codeReviewRequest.user = await findOrCreateUser(user!);
        await repository.save(codeReviewRequest);
    }
    else {
        // @TODO: What to do with existing record?
    }

    return codeReviewRequest;
}

const add = async ({pullRequestLink, msgId, msgUser}: {pullRequestLink?: string, msgId?: string, msgUser?: string}) => {
    if (!pullRequestLink) {
        return {
            user: null,
            message: 'Cannot determine the github code review pull request link',
        };
    }

    const codeReviewRequest = await findOrCreateCodeReviewRequest({
        pullRequestLink,
        slackMsgId: msgId,
        user: {
            slackUserId: msgUser,
        }
    } as CodeReviewRequest);

    console.log('DEBUG', codeReviewRequest);

    return {
        user: codeReviewRequest.user,
        message: '2 reviewers :review: are needed',
    };
}
const approve = async (data: unknown) => {
    const message = [
        'Code has 2+ approvals, ready to merge.',
        'One more approval :approved: is needed.',
    ][Math.floor(Math.random()*2)];

    return {
        message,
    }
}
const claim = async (data: unknown) => {
    const message = [
        'Code has 2+ reviewers, removed from queue.',
        'One more reviewer :review: is needed.',
    ][Math.floor(Math.random()*2)];

    return {
        message,
    }
}
const finish = async (data: unknown) => {}
const remove = async (data: unknown) => {}
const requestChanges = async (data: unknown) => {}
const withdraw = async (data: unknown) => {}

export default {
    add,
    approve,
    claim,
    finish,
    remove,
    requestChanges,
    withdraw,
}
