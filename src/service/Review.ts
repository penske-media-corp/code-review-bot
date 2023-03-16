import type {
    CodeReview,
    CodeReviewRelation,
    Prisma,
    User,
} from '@prisma/client';
import {
    getRepositoryNumberOfApprovals,
    getRepositoryNumberOfReviews,
    prisma
} from '../lib/config';
import type {ReactionData} from '../bolt/types';
import {extractRepository} from '../lib/utils';
import {getUserInfo} from '../bolt/utils';
import pluralize from 'pluralize';

export interface ReviewerRecord extends CodeReviewRelation {
    reviewer: User;
}

export interface CodeReviewRecord extends CodeReview {
    user: User;
    reviewers: ReviewerRecord[];
}

export interface ReviewActionResult {
    codeReview?: CodeReviewRecord;
    message: string;
    slackNotifyMessage?: {
        channel?: string | null;
        text?: string | null;
        thread_ts?: string | null;
    };
}

export async function findCodeReviewRecord ({id, pullRequestLink}: {id?: number; pullRequestLink?: string}): Promise<CodeReviewRecord | null> {
    let where: Prisma.CodeReviewWhereInput | null = null;

    if (id) {
        where = {id};
    } else if (pullRequestLink) {
        where = {pullRequestLink};
    }

    if (!where) {
        return null;
    }

    const result = await prisma.codeReview.findFirst({
        where,
        include: {
            user: true,
            reviewers: {
                include: {
                    reviewer: true,
                },
            },
        },
    });

    if (!result) {
        return null;
    }

    return result;
}

/**
 * Archive an existing code review record.
 * @param {number} id
 */
const archive = async (id: number): Promise<void> => {
    const record = await findCodeReviewRecord({id});

    if (!record) {
        return;
    }

    await prisma.$transaction([
        prisma.archive.create({
            data: {
                data: JSON.stringify(record),
                jiraTicket: record.jiraTicket,
                note: record.note,
                pullRequestLink: record.pullRequestLink,
            }
        }),
        prisma.codeReviewRelation.deleteMany({
            where: {
                codeReviewId: id,
            }
        }),
        prisma.codeReview.delete({
            where: {
                id,
            }
        }),
    ]);

};

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
                email: userInfo.email,
                displayName: userInfo.displayName,
                slackUserId,
            }
        });
    }
    return user;
}

async function setCodeReviewerStatus (codeReview: CodeReviewRecord, slackUserId: string, status: string): Promise<User> {
    const user = await findOrCreateUser(slackUserId);

    if (status === 'deleted') {
        codeReview.status = 'deleted';
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
        codeReview.reviewers.push(Object.assign(relation, {reviewer: user}) as ReviewerRecord);
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

async function calculateReviewStats (codeReview: CodeReviewRecord): Promise<{approvalCount: number; reviewerCount: number}> {
    const numberReviewRequired = await getRepositoryNumberOfReviews(extractRepository(codeReview.pullRequestLink));
    let approvalCount = 0;
    let reviewerCount = 0;

    codeReview.reviewers.forEach((reviewer) => {
        if (reviewer.status === 'approved') {
            approvalCount += 1;
        } else if (['pending', 'change'].includes(reviewer.status)) {
            reviewerCount += 1;
        }
    });

    if (approvalCount + reviewerCount >= numberReviewRequired) {
        codeReview.status = approvalCount >= numberReviewRequired ? 'ready' : 'inprogress';

        await prisma.codeReview.update({
            where: {
                id: codeReview.id,
            },
            data: {
                status: codeReview.status,
            }
        });
    } else if (['ready', 'inprogress'].includes(codeReview.status)) {
        // For whatever reason, if request is un-claim, the request may be kick back into pending queue.
        codeReview.status = 'pending';
    }

    return {
        approvalCount,
        reviewerCount,
    };
}

const add = async ({jiraTicket, note, pullRequestLink, slackChannelId, slackMsgId, slackPermalink, slackMsgUserId, slackThreadTs}: ReactionData): Promise<ReviewActionResult> => {
    if (!pullRequestLink) {
        return {
            message: 'Cannot determine the github code review pull request link.',
        };
    }

    let codeReview = await findCodeReviewRecord({pullRequestLink});

    const user = await findOrCreateUser(slackMsgUserId);

    if (!codeReview) {
        codeReview = await prisma.codeReview.create({
            data: {
                jiraTicket,
                note,
                pullRequestLink,
                slackChannelId,
                slackMsgId,
                slackPermalink,
                slackThreadTs,
                status: 'pending',
                userId: user.id,
            }
        }) as CodeReviewRecord;
    } else {
        await prisma.codeReviewRelation.deleteMany({
            where: {
                codeReviewId: codeReview.id,
            }
        });
        Object.assign(codeReview, {
            jiraTicket,
            note: `${note && !codeReview.note?.includes(note) ? note : codeReview.note ?? ''}`.trim(),
            pullRequestLink,
            slackChannelId,
            slackMsgId,
            slackPermalink,
            slackThreadTs,
            status: 'pending',
            userId: user.id,
        });
        await prisma.codeReview.update({
            where: {
                id: codeReview.id,
            },
            // The PR might be re-added, let start from the new thread instead.
            data: {
                jiraTicket,
                note: codeReview.note,
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

    const userDisplayName = user.displayName;
    const numberApprovalRequired = await getRepositoryNumberOfApprovals(extractRepository(codeReview.pullRequestLink));

    return {
        message: `*${userDisplayName}* has request a code review! ${numberApprovalRequired} ${pluralize('reviewer', numberApprovalRequired)} :eyes: ${pluralize('is', numberApprovalRequired)} needed.`,
        codeReview,
    };
};

const approve = async (codeReview: CodeReviewRecord, slackUserId: string): Promise<ReviewActionResult> => {
    const numberApprovalRequired = await getRepositoryNumberOfApprovals(extractRepository(codeReview.pullRequestLink));
    const requestSlackUserId = codeReview.user.slackUserId;
    const user = await setCodeReviewerStatus(codeReview, slackUserId, 'approved');
    const userDisplayName = user.displayName;
    const stats = await calculateReviewStats(codeReview);
    let message = '';

    if (stats.approvalCount >= numberApprovalRequired) {
        message = `Code has ${stats.approvalCount} ${pluralize('approval', stats.approvalCount)}, ready to merge.`;
    } else {
        const numberNeeded = numberApprovalRequired - stats.approvalCount;
        message = `${numberNeeded} more ${pluralize('approval', numberNeeded)} :approved: ${pluralize('is', numberNeeded)} needed.`;
    }

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

const getNumberReviewMessage = (count: number, required: number): string => {
    if (count >= required) {
        return `Code has ${count} ${pluralize('reviewer', count)}.`;
    }
    const numberNeeded = required - count;

    return `${numberNeeded} more ${pluralize('reviewer', numberNeeded)} :eyes: ${pluralize('is', numberNeeded)} needed.`;
};

const claim = async (codeReview: CodeReviewRecord, slackUserId: string): Promise<ReviewActionResult> => {
    const numberReviewRequired = await getRepositoryNumberOfReviews(extractRepository(codeReview.pullRequestLink));
    const requestSlackUserId = codeReview.user.slackUserId;
    const user = await setCodeReviewerStatus(codeReview, slackUserId, 'pending');
    const userDisplayName = user.displayName;
    const stats = await calculateReviewStats(codeReview);
    const count = stats.reviewerCount + stats.approvalCount;
    let message = getNumberReviewMessage(count, numberReviewRequired);

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

const finish = async (codeReview: CodeReviewRecord, slackUserId: string): Promise<ReviewActionResult> => {
    const numberReviewRequired = await getRepositoryNumberOfReviews(extractRepository(codeReview.pullRequestLink));
    const requestSlackUserId = codeReview.user.slackUserId;
    const user = await setCodeReviewerStatus(codeReview, slackUserId, 'finish');
    const userDisplayName = user.displayName;
    const stats = await calculateReviewStats(codeReview);
    const count = stats.reviewerCount + stats.approvalCount;
    let message = getNumberReviewMessage(count, numberReviewRequired);

    message = `*${userDisplayName}* withdrew or finished reviewing the code without providing an approval.  ${message}`;

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

const deleteRecord = async (codeReview: CodeReviewRecord, slackUserId: string): Promise<ReviewActionResult> => {
    const user = await findOrCreateUser(slackUserId);
    const userDisplayName = user.displayName;
    const requestSlackUserId = codeReview.user.slackUserId;
    const message = `*${userDisplayName}* deleted the code review.`;

    codeReview.status = 'deleted';

    await prisma.codeReviewRelation.deleteMany({
        where: {
            codeReviewId: codeReview.id,
        }
    });
    await prisma.codeReview.delete({
        where: {
            id: codeReview.id,
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

const requestChanges = async (codeReview: CodeReviewRecord, slackUserId: string): Promise<ReviewActionResult> => {
    const numberReviewRequired = await getRepositoryNumberOfReviews(extractRepository(codeReview.pullRequestLink));
    const user = await setCodeReviewerStatus(codeReview, slackUserId, 'change');
    const userDisplayName = user.displayName;
    const requestSlackUserId = codeReview.user.slackUserId;
    const stats = await calculateReviewStats(codeReview);
    const count = stats.reviewerCount + stats.approvalCount;
    let message = getNumberReviewMessage(count, numberReviewRequired);

    message = `*${userDisplayName}* requested changes on the pull request. ${message}`;

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

const requestReview = async (codeReview: CodeReviewRecord): Promise<ReviewActionResult> => {
    codeReview.status = 'pending';

    // Reset all existing reviewer's status to pending.
    await prisma.codeReviewRelation.updateMany({
        where: {
            codeReviewId: codeReview.id,
        },
        data: {
            status: 'pending',
        }
    });

    await prisma.codeReview.update({
        where: {
            id: codeReview.id,
        },
        data: {
            status: codeReview.status,
        }
    });

    const userDisplayName = codeReview.user.displayName;
    const numberReviewRequired = await getRepositoryNumberOfReviews(extractRepository(codeReview.pullRequestLink));
    const stats = await calculateReviewStats(codeReview);
    const count = stats.reviewerCount + stats.approvalCount;
    const message = `*${userDisplayName}* has request another code review! ${getNumberReviewMessage(count, numberReviewRequired)}`;
    const notifyMessage: string[] = codeReview.reviewers
        .filter((r) => r.status !== 'pending')
        .map((r) => `<@${r.reviewer.slackUserId}>`);
    notifyMessage.push(message);

    return {
        codeReview,
        message,
        slackNotifyMessage: {
            channel: codeReview.slackChannelId,
            text: notifyMessage.join(', '),
            thread_ts: codeReview.slackThreadTs,
        },
    };
};

const withdraw = async (codeReview: CodeReviewRecord): Promise<ReviewActionResult> => {
    const userDisplayName = codeReview.user.displayName;
    const message = `*${userDisplayName}* withdrew the code review request`;

    codeReview.status = 'withdrew';
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

const close = async (codeReview: CodeReviewRecord, closeMessage?: string): Promise<ReviewActionResult> => {
    const message = closeMessage ?? 'Pull request has been closed.';

    codeReview.status = 'closed';
    await prisma.codeReview.update({
        where: {
            id: codeReview.id,
        },
        data: {
            status: codeReview.status,
        }
    });

    await archive(codeReview.id);

    return {
        codeReview,
        message,
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
    close,
    finish,
    deleteRecord,
    requestChanges,
    requestReview,
    withdraw,
};
