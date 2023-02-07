import CodeReviewRequest from '../database/entity/CodeReviewRequest';
import CodeReviewRequestReviewerRelation from '../database/entity/CodeReviewRequestReviewerRelation';
import Connection from '../database/connection';
import {ReactionData} from '../bolt/types';
import Reviewer from '../database/entity/Reviewer';
import User from '../database/entity/User';
import {getUserInfo} from '../bolt/utils';

async function findOrCreateUser({slackUserId} : User) {

    if (!slackUserId) {
        return;
    }

    let repository = Connection.getRepository(User);

    let user = await repository.findOne({
        relations: {
            reviewer: true,
        },
        where: [
            {slackUserId},
        ]
    });

    if (!user) {
        user = new User();
        user.slackUserId = slackUserId;

        const userInfo = await getUserInfo(slackUserId);
        if (userInfo) {
            user.displayName = userInfo.displayName;
        }
        await repository.save(user);
    }
    if (!user.reviewer) {
        const reviewer = new Reviewer();

        repository = Connection.getRepository(Reviewer);
        reviewer.user = user;
        await repository.save(reviewer);

        delete reviewer.user; // Prevent cyclic reference if we ever call repository.save(user) else where.
        user.reviewer = reviewer;
    }
    return user;
}

async function findCodeReviewRequest({pullRequestLink, slackMsgId}: CodeReviewRequest) {
    const repository = Connection.getRepository(CodeReviewRequest);

    return repository.findOne({
        relations: {
            user: true,
            reviewers: {
                reviewer: true,
            },
        },
        where: [
            {pullRequestLink},
            {slackMsgId},
        ]
    });
}


async function setCodeReviewerStatus(codeReviewRequest: CodeReviewRequest, slackUserId: string, status: string) {
    const user = await findOrCreateUser({slackUserId} as User);

    const repository = Connection.getRepository(CodeReviewRequestReviewerRelation);
    let relation = await repository.findOne({
        where: [
            {
                reviewer: {
                    id: user?.reviewer?.id,
                }
            },
            {
                requestInfo: {
                    id: codeReviewRequest.id,
                }
            },
        ]
    })

    if (!relation) {
        relation = new CodeReviewRequestReviewerRelation();
        relation.requestInfo = codeReviewRequest;
        relation.reviewer = user?.reviewer;
        relation.status = status;
        if (!codeReviewRequest.reviewers) {
            codeReviewRequest.reviewers = [];
        }
        codeReviewRequest.reviewers.push(relation);
    }
    else {
        relation.status = status;
        relation.updatedAt = new Date();
        codeReviewRequest.reviewers?.forEach((reviewer) => {
            if (reviewer.id === relation?.id) {
                reviewer.status = status;
            }
        })
    }
    await repository.save(relation);

    return user;
}

const add = async ({pullRequestLink, slackMsgId, slackMsgUserId, slackMsgThreadTs}: ReactionData) => {
    if (!pullRequestLink) {
        return {
            message: 'Cannot determine the github code review pull request link',
        };
    }

    let codeReviewRequest = await findCodeReviewRequest({pullRequestLink, slackMsgId} as CodeReviewRequest);
    let codeReviewRequestUser = codeReviewRequest?.user;

    if (!codeReviewRequest) {
        const repository = Connection.getRepository(CodeReviewRequest);

        codeReviewRequestUser = await findOrCreateUser({slackUserId: slackMsgUserId} as User)
        codeReviewRequest = new CodeReviewRequest();
        codeReviewRequest.slackMsgId = slackMsgId;
        codeReviewRequest.pullRequestLink = pullRequestLink;
        codeReviewRequest.user = codeReviewRequestUser;
        codeReviewRequest.slackMsgThreadTs = slackMsgThreadTs;
        await repository.save(codeReviewRequest);
    }

    console.log('DEBUG', codeReviewRequest);

    return {
        codeReviewRequestUser,
        message: '2 reviewers :review: are needed',
    };
}
const approve = async ({pullRequestLink, slackMsgId, reactionUserId}: ReactionData) => {
    const codeReviewRequest = await findCodeReviewRequest({
        pullRequestLink,
        slackMsgId,
    } as CodeReviewRequest);

    if (!codeReviewRequest) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const codeReviewApprovedUser = await setCodeReviewerStatus(codeReviewRequest, reactionUserId, 'approved');

    let approvalCount = 0;
    codeReviewRequest.reviewers?.forEach((reviewer) => {

        if (reviewer.status === 'approved') {
            approvalCount += 1;
        }
    });
    const message = approvalCount === 1
        ? 'One more approval :approved: is needed.'
        : `Code has ${approvalCount} approvals :approved:, ready to merge.`;

    return {
        codeReviewApprovedUser,
        message,
    }
}
const claim = async ({pullRequestLink, slackMsgId, reactionUserId}: ReactionData) => {

    const codeReviewRequest = await findCodeReviewRequest({
        pullRequestLink,
        slackMsgId,
    } as CodeReviewRequest);

    if (!codeReviewRequest) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const codeReviewClaimUser = await setCodeReviewerStatus(codeReviewRequest, reactionUserId, 'pending');

    const count = codeReviewRequest.reviewers?.length ?? 0;
    const message = count === 1
        ? 'One more reviewer :review: is needed.'
        : `Code has ${count} reviewers.`;

    return {
        codeReviewClaimUser,
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
