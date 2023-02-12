import {
    CodeReview,
    CodeReviewRelation,
} from '@prisma/client';
import {PrismaClient} from '@prisma/client';
import {ReactionData} from '../bolt/types';
import {getUserInfo} from '../bolt/utils';

async function findOrCreateUser(slackUserId: string) {
    const prisma = new PrismaClient();

    let user = await prisma.user.findFirst({
        where: {
            slackUserId,
        }
    });

    if (!user) {
        const userInfo = await getUserInfo(slackUserId);

        user = await prisma.user.create({
            data: {
                slackUserId,
                displayName: userInfo.displayName,
            }
        });
    }
    return user;
}

async function setCodeReviewerStatus(codeReview: CodeReview & {reviewers?: CodeReviewRelation[]}, slackUserId: string, status: string) {
    const user = await findOrCreateUser(slackUserId);
    const prisma = new PrismaClient();

    if (status === 'removed') {
        codeReview.status = 'removed';
        await prisma.codeReview.update({
            where: {
                id: codeReview.id,
            },
            data: {
                status: codeReview.status,
            }
        })
        return user;
    }

    let relation = await prisma.codeReviewRelation.findFirst({
        where: {
            codeReviewId: codeReview.id,
            userId: user.id,
        }
    })

    if (!codeReview.reviewers) {
        codeReview.reviewers = [];
    }

    if (!relation) {
        relation = await prisma.codeReviewRelation.create({
            data: {
                status: status,
                codeReviewId: codeReview.id,
                userId: user.id,
            }
        })
        codeReview.reviewers.push(relation);
    } else {
        await prisma.codeReviewRelation.update({
            where: {
                userId_codeReviewId: {
                    userId: user.id,
                    codeReviewId: codeReview.id,
                }
            },
            data: {
                status: status,
            },
        });
        codeReview.reviewers.forEach((relation) => {
            if (relation.userId === user.id) {
                relation.status = status;
            }
        });
    }

    return user;
}

async function calculateReviewStats(codeReview: CodeReview & {reviewers?: CodeReviewRelation[]}) {
    let approvalCount = 0;
    let reviewerCount = 0;
    codeReview.reviewers?.forEach((reviewer) => {

        if (reviewer.status === 'approved') {
            approvalCount += 1;
        }
        else if (['pending', 'change'].includes(reviewer.status)) {
            reviewerCount += 1;
        }
    });

    if (approvalCount + reviewerCount >= 2) {
        codeReview.status = approvalCount >= 2 ? 'ready' : 'inprogress';
        const prisma = new PrismaClient();

        await prisma.codeReview.update({
            where: {
                id: codeReview.id,
            },
            data: {
                status: codeReview.status,
            }
        });
    }

    return {
        approvalCount,
        reviewerCount,
    }
}

const add = async ({pullRequestLink, slackChannelId, slackMsgId, slackPermalink, slackMsgUserId, slackThreadTs}: ReactionData) => {
    if (!pullRequestLink) {
        return {
            message: 'Cannot determine the github code review pull request link.',
        };
    }

    const prisma = new PrismaClient();
    let codeReview = await prisma.codeReview.findFirst({
        where: {
            pullRequestLink,
        }
    })

    const user = await findOrCreateUser(slackMsgUserId)

    if (!codeReview) {
        codeReview = await prisma.codeReview.create({
            data: {
                pullRequestLink,
                slackChannelId,
                slackMsgId,
                slackPermalink,
                slackThreadTs,
                status: 'pending',
                userId: user.id,
            }
        });
    }
    else {
        await prisma.codeReviewRelation.deleteMany({
            where: {
                codeReviewId: codeReview.id,
            }
        });
        codeReview.status = 'pending';
        await prisma.codeReview.update({
            where: {
                id: codeReview.id,
            },
            data: {
                status: codeReview.status,
            }
        })
    }

    const userDisplayName = user.displayName;

    return {
        user,
        message: `*${userDisplayName}* has request a code review! 2 reviewers :review: are needed.`,
        codeReview,
    };
}
const approve = async ({pullRequestLink, reactionUserId}: ReactionData) => {
    const prisma = new PrismaClient();
    const codeReview = await prisma.codeReview.findFirst({
        where: {
            pullRequestLink,
        }
    })

    if (!codeReview) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await setCodeReviewerStatus(codeReview, reactionUserId, 'approved');
    const userDisplayName = user.displayName;
    const stats = await calculateReviewStats(codeReview);

    const message = stats.approvalCount === 1
        ? 'One more approval :approved: is needed.'
        : `Code has ${stats.approvalCount} approvals, ready to merge.`;

    return {
        user,
        message: `*${userDisplayName}* approved the code. ${message}`,
        codeReview,
    }
}
const claim = async ({pullRequestLink, reactionUserId}: ReactionData) => {
    const prisma = new PrismaClient();
    const codeReview = await prisma.codeReview.findFirst({
        where: {
            pullRequestLink,
        }
    })

    if (!codeReview) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await setCodeReviewerStatus(codeReview, reactionUserId, 'pending');
    const userDisplayName = user.displayName;
    const stats = await calculateReviewStats(codeReview);

    const count = stats.reviewerCount + stats.approvalCount;
    const message = count === 1
        ? 'One more reviewer :review: is needed.'
        : `Code has ${count} reviewers.`;

    return {
        user,
        message: `*${userDisplayName}* claimed the code review. ${message}`,
        codeReview,
    }
}

const finish = async ({pullRequestLink, reactionUserId}: ReactionData) => {
    const prisma = new PrismaClient();
    const codeReview = await prisma.codeReview.findFirst({
        where: {
            pullRequestLink,
        }
    })

    if (!codeReview) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await setCodeReviewerStatus(codeReview, reactionUserId, 'finish');
    const userDisplayName = user.displayName;
    const stats = await calculateReviewStats(codeReview);
    const count = stats.reviewerCount + stats.approvalCount;
    const message = count === 1
        ? 'One more reviewer :review: is needed.'
        : `Code has ${count} reviewers.`;

    return {
        user,
        message: `*${userDisplayName}* withdraw/finished reviewing the code without providing an approval.  ${message}`,
        codeReview,
    }
}

const remove = async ({pullRequestLink, reactionUserId}: ReactionData) => {
    const prisma = new PrismaClient();
    const codeReview = await prisma.codeReview.findFirst({
        where: {
            pullRequestLink,
        }
    })

    if (!codeReview) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await findOrCreateUser(reactionUserId);
    const userDisplayName = user.displayName;

    codeReview.status = 'removed';
    await prisma.codeReview.update({
        where: {
            id: codeReview.id,
        },
        data: {
            status: codeReview.status,
        }
    })

    return {
        user,
        message: `*${userDisplayName}* removed the code review.`,
        codeReview,
    }
}

const requestChanges = async ({pullRequestLink, reactionUserId}: ReactionData) => {
    const prisma = new PrismaClient();
    const codeReview = await prisma.codeReview.findFirst({
        where: {
            pullRequestLink,
        }
    })

    if (!codeReview) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await setCodeReviewerStatus(codeReview, reactionUserId, 'change');
    const userDisplayName = user.displayName;

    return {
        user,
        message: `*${userDisplayName}* requested changes on the pull request.`,
        codeReview,
    }
}

const withdraw = async ({pullRequestLink, reactionUserId}: ReactionData) => {
    const prisma = new PrismaClient();
    const codeReview = await prisma.codeReview.findFirst({
        where: {
            pullRequestLink,
        }
    })

    if (!codeReview) {
        return {
            message: 'Cannot locate existing code review request data.',
        };
    }

    const user = await findOrCreateUser(reactionUserId);
    const userDisplayName = user.displayName;

    codeReview.status = 'withdraw';
    await prisma.codeReview.update({
        where: {
            id: codeReview.id,
        },
        data: {
            status: codeReview.status,
        }
    })

    return {
        user,
        message: `*${userDisplayName}* withdraw the code review request`,
        codeReview,
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
    setCodeReviewerStatus,
}
