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

        user.displayName = userInfo.displayName;
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

async function deleteReviewersFromRequest(codeRequestId: number) {
    const repository = Connection.getRepository(CodeReviewRequestReviewerRelation);

    await repository.delete({
        requestInfo: {
            id: codeRequestId,
        }
    })
}

async function calculateReviewStats(codeReviewRequest: CodeReviewRequest) {
    let approvalCount = 0;
    let reviewerCount = 0;
    codeReviewRequest.reviewers?.forEach((reviewer) => {

        if (reviewer.status === 'approved') {
            approvalCount += 1;
        }
        else if (['pending', 'change'].includes(reviewer.status as string)) {
            reviewerCount += 1;
        }
    });

    if (approvalCount + reviewerCount >= 2) {
        const repository = Connection.getRepository(CodeReviewRequest);

        codeReviewRequest.status = approvalCount >= 2 ? 'ready' : 'inprogress';
        await repository.save(codeReviewRequest);
    }

    return {
        approvalCount,
        reviewerCount,
    }
}

const add = async ({pullRequestLink, slackChannelId, slackMsgId, slackMsgLinkUrl, slackMsgUserId, slackMsgThreadTs}: ReactionData) => {
    if (!pullRequestLink) {
        return {
            message: 'Cannot determine the github code review pull request link.',
        };
    }

    const repository = Connection.getRepository(CodeReviewRequest);
    let codeReviewRequest = await findCodeReviewRequest({pullRequestLink, slackMsgId} as CodeReviewRequest);
    let user = codeReviewRequest?.user;

    if (!codeReviewRequest) {
        user = await findOrCreateUser({slackUserId: slackMsgUserId} as User)
        codeReviewRequest = new CodeReviewRequest();
    }
    else {
        await deleteReviewersFromRequest(codeReviewRequest.id);
    }
    codeReviewRequest.pullRequestLink = pullRequestLink;
    codeReviewRequest.slackChannelId = slackChannelId;
    codeReviewRequest.slackMsgId = slackMsgId;
    codeReviewRequest.slackMsgLinkUrl = slackMsgLinkUrl;
    codeReviewRequest.slackMsgThreadTs = slackMsgThreadTs;
    codeReviewRequest.status = 'pending';
    codeReviewRequest.user = user;

    await repository.save(codeReviewRequest);

    const userDisplayName = user?.displayName as string;

    return {
        user,
        message: `*${userDisplayName}* has request a code review! 2 reviewers :review: are needed.`,
        codeReviewRequest,
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

    const user = await setCodeReviewerStatus(codeReviewRequest, reactionUserId, 'approved');
    const userDisplayName = user?.displayName as string;
    const stats = await calculateReviewStats(codeReviewRequest);

    const message = stats.approvalCount === 1
        ? 'One more approval :approved: is needed.'
        : `Code has ${stats.approvalCount} approvals, ready to merge.`;

    return {
        user,
        message: `*${userDisplayName}* approved the code. ${message}`,
        codeReviewRequest,
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

    const user = await setCodeReviewerStatus(codeReviewRequest, reactionUserId, 'pending');
    const userDisplayName = user?.displayName as string;
    const stats = await calculateReviewStats(codeReviewRequest);

    const count = stats.reviewerCount + stats.approvalCount;
    const message = count === 1
        ? 'One more reviewer :review: is needed.'
        : `Code has ${count} reviewers.`;

    return {
        user,
        message: `*${userDisplayName}* claimed the code review. ${message}`,
        codeReviewRequest,
    }
}

const finish = async ({pullRequestLink, slackMsgId, reactionUserId}: ReactionData) => {
    const codeReviewRequest = await findCodeReviewRequest({
        pullRequestLink,
        slackMsgId,
    } as CodeReviewRequest);

    if (!codeReviewRequest) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await setCodeReviewerStatus(codeReviewRequest, reactionUserId, 'finish');
    const userDisplayName = user?.displayName as string;
    const stats = await calculateReviewStats(codeReviewRequest);
    const count = stats.reviewerCount + stats.approvalCount;
    const message = count === 1
        ? 'One more reviewer :review: is needed.'
        : `Code has ${count} reviewers.`;

    return {
        user,
        message: `*${userDisplayName}* withdraw/finished reviewing the code without providing an approval.  ${message}`,
        codeReviewRequest,
    }
}

const remove = async ({pullRequestLink, slackMsgId, reactionUserId}: ReactionData) => {
    const codeReviewRequest = await findCodeReviewRequest({
        pullRequestLink,
        slackMsgId,
    } as CodeReviewRequest);

    if (!codeReviewRequest) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await findOrCreateUser({slackUserId: reactionUserId} as User);
    const userDisplayName = user?.displayName as string;

    const repository = Connection.getRepository(CodeReviewRequest);

    codeReviewRequest.status = 'removed';
    await repository.save(codeReviewRequest);

    return {
        user,
        message: `*${userDisplayName}* removed the code review.`,
        codeReviewRequest,
    }
}

const requestChanges = async ({pullRequestLink, slackMsgId, reactionUserId}: ReactionData) => {
    const codeReviewRequest = await findCodeReviewRequest({
        pullRequestLink,
        slackMsgId,
    } as CodeReviewRequest);

    if (!codeReviewRequest) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await setCodeReviewerStatus(codeReviewRequest, reactionUserId, 'change');
    const userDisplayName = user?.displayName as string;

    return {
        user,
        message: `*${userDisplayName}* requested changes on the pull request.`,
        codeReviewRequest,
    }
}

const withdraw = async ({pullRequestLink, slackMsgId, reactionUserId}: ReactionData) => {
    const codeReviewRequest = await findCodeReviewRequest({
        pullRequestLink,
        slackMsgId,
    } as CodeReviewRequest);

    if (!codeReviewRequest) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await findOrCreateUser({slackUserId: reactionUserId} as User);
    const userDisplayName = user?.displayName as string;

    const repository = Connection.getRepository(CodeReviewRequest);

    codeReviewRequest.status = 'withdraw';
    await repository.save(codeReviewRequest);

    return {
        user,
        message: `*${userDisplayName}* withdraw the code review request`,
        codeReviewRequest,
    }
}

export default {
    add,
    approve,
    claim,
    finish,
    remove,
    requestChanges,
    withdraw,
}
