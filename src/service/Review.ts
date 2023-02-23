import type {
    CodeReview,
    CodeReviewRelation, User,
} from '@prisma/client';
import type {ReactionData} from '../bolt/types';
import {getUserInfo} from '../bolt/utils';
import {prisma} from '../utils/config';

export interface ReviewActionResult {
    codeReview?: CodeReview;
    message: string;
    slackNotifyMessage?: {
        channel?: string | null;
        text?: string | null;
        thread_ts?: string | null;
    };
}

async function findOrCreateUser (slackUserId: string): Promise<User> {
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

async function setCodeReviewerStatus (codeReview: CodeReview & {reviewers: CodeReviewRelation[]}, slackUserId: string, status: string): Promise<User> {
    const user = await findOrCreateUser(slackUserId);

    if (status === 'removed') {
        codeReview.status = 'removed';
        await prisma.codeReview.update({
            where: {
                id: codeReview.id,
            },
            data: {
                status: codeReview.status,
            }
        });
        return user;
    }

    let relation = await prisma.codeReviewRelation.findFirst({
        where: {
            codeReviewId: codeReview.id,
            userId: user.id,
        }
    });

    if (!relation) {
        relation = await prisma.codeReviewRelation.create({
            data: {
                status: status,
                codeReviewId: codeReview.id,
                userId: user.id,
            }
        });
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
        // We already have the read from the data.
        // Instead of refresh the records again from the db,
        // We just do an in memory search and update the single records we had
        // to match the db update statement above. Avoiding another round if db read.
        codeReview.reviewers.forEach((rel) => {
            if (rel.userId === user.id) {
                rel.status = status;
            }
        });
    }

    return user;
}

async function calculateReviewStats (codeReview: CodeReview & {reviewers: CodeReviewRelation[]}): Promise<{approvalCount: number; reviewerCount: number}> {
    let approvalCount = 0;
    let reviewerCount = 0;
    codeReview.reviewers.forEach((reviewer) => {

        if (reviewer.status === 'approved') {
            approvalCount += 1;
        } else if (['pending', 'change'].includes(reviewer.status)) {
            reviewerCount += 1;
        }
    });

    if (approvalCount + reviewerCount >= 2) {
        codeReview.status = approvalCount >= 2 ? 'ready' : 'inprogress';

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
    };
}

const add = async ({pullRequestLink, slackChannelId, slackMsgId, slackPermalink, slackMsgUserId, slackThreadTs}: ReactionData): Promise<ReviewActionResult> => {
    if (!pullRequestLink) {
        return {
            message: 'Cannot determine the github code review pull request link.',
        };
    }

    let codeReview = await prisma.codeReview.findFirst({
        where: {
            pullRequestLink,
        }
    });

    const user = await findOrCreateUser(slackMsgUserId);

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
    } else {
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
        });
    }

    const userDisplayName = user.displayName;

    return {
        message: `*${userDisplayName}* has request a code review! 2 reviewers :review: are needed.`,
        codeReview,
    };
};

const approve = async (codeReview: CodeReview & {user: User; reviewers: CodeReviewRelation[]}, slackUserId: string): Promise<ReviewActionResult> => {

    const requestSlackUserId = codeReview.user.slackUserId;
    const user = await setCodeReviewerStatus(codeReview, slackUserId, 'approved');
    const userDisplayName = user.displayName;
    const stats = await calculateReviewStats(codeReview);
    let message = stats.approvalCount === 1
        ? 'One more approval :approved: is needed.'
        : `Code has ${stats.approvalCount} approvals, ready to merge.`;

    message = `*${userDisplayName}* approved the code. ${message}`;

    return {
        codeReview,
        message,
        slackNotifyMessage: {
            channel: codeReview.slackChannelId,
            text: `<@${requestSlackUserId}>, ${message}`,
            thread_ts: codeReview.slackThreadTs,
        },
    };
};

const claim = async (codeReview: CodeReview & {user: User; reviewers: CodeReviewRelation[]}, slackUserId: string): Promise<ReviewActionResult> => {

    const requestSlackUserId = codeReview.user.slackUserId;
    const user = await setCodeReviewerStatus(codeReview, slackUserId, 'pending');
    const userDisplayName = user.displayName;
    const stats = await calculateReviewStats(codeReview);
    const count = stats.reviewerCount + stats.approvalCount;
    let message = count === 1
        ? 'One more reviewer :review: is needed.'
        : `Code has ${count} reviewers.`;

    message = `*${userDisplayName}* claimed the code review. ${message}`;

    return {
        codeReview,
        message,
        slackNotifyMessage: {
            channel: codeReview.slackChannelId,
            text: `<@${requestSlackUserId}>, ${message}`,
            thread_ts: codeReview.slackThreadTs,
        },
    };
};

const finish = async (codeReview: CodeReview & {user: User; reviewers: CodeReviewRelation[]}, slackUserId: string): Promise<ReviewActionResult> => {
    const requestSlackUserId = codeReview.user.slackUserId;
    const user = await setCodeReviewerStatus(codeReview, slackUserId, 'finish');
    const userDisplayName = user.displayName;
    const stats = await calculateReviewStats(codeReview);
    const count = stats.reviewerCount + stats.approvalCount;
    let message = count === 1
        ? 'One more reviewer :review: is needed.'
        : `Code has ${count} reviewers.`;

    message = `*${userDisplayName}* withdraw/finished reviewing the code without providing an approval.  ${message}`;

    return {
        codeReview,
        message,
        slackNotifyMessage: {
            channel: codeReview.slackChannelId,
            text: `<@${requestSlackUserId}>, ${message}`,
            thread_ts: codeReview.slackThreadTs,
        },
    };
};

const remove = async (codeReview: CodeReview & {user: User}, slackUserId: string): Promise<ReviewActionResult> => {
    const user = await findOrCreateUser(slackUserId);
    const userDisplayName = user.displayName;
    const requestSlackUserId = codeReview.user.slackUserId;
    const message = `*${userDisplayName}* removed the code review.`;

    codeReview.status = 'removed';

    await prisma.codeReview.update({
        where: {
            id: codeReview.id,
        },
        data: {
            status: codeReview.status,
        }
    });

    return {
        codeReview,
        message,
        slackNotifyMessage: {
            channel: codeReview.slackChannelId,
            text: requestSlackUserId === slackUserId ? message : `<@${requestSlackUserId}>, ${message}`,
            thread_ts: codeReview.slackThreadTs,
        },
    };
};

const requestChanges = async (codeReview: CodeReview & {user: User; reviewers: CodeReviewRelation[]}, slackUserId: string): Promise<ReviewActionResult> => {
    const user = await setCodeReviewerStatus(codeReview, slackUserId, 'change');
    const userDisplayName = user.displayName;
    const requestSlackUserId = codeReview.user.slackUserId;
    const message = `*${userDisplayName}* requested changes on the pull request.`;

    return {
        codeReview,
        message,
        slackNotifyMessage: {
            channel: codeReview.slackChannelId,
            text: `<@${requestSlackUserId}>, ${message}`,
            thread_ts: codeReview.slackThreadTs,
        },
    };
};

const withdraw = async (codeReview: CodeReview & {user: User}): Promise<ReviewActionResult> => {
    const userDisplayName = codeReview.user.displayName;
    const message = `*${userDisplayName}* withdraw the code review request`;

    codeReview.status = 'withdraw';
    await prisma.codeReview.update({
        where: {
            id: codeReview.id,
        },
        data: {
            status: codeReview.status,
        }
    });

    return {
        codeReview,
        message: message,
        slackNotifyMessage: {
            channel: codeReview.slackChannelId,
            text: message,
            thread_ts: codeReview.slackThreadTs,
        },
    };
};

export default {
    add,
    approve,
    claim,
    finish,
    remove,
    requestChanges,
    withdraw,
    setCodeReviewerStatus,
};
