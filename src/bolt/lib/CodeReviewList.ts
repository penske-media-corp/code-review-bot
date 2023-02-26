import type {
    Block,
    KnownBlock
} from '@slack/bolt';
import type {
    CodeReview,
    CodeReviewRelation,
    User
} from '@prisma/client';
import pluralize from 'pluralize';
import {prisma} from '../../lib/config';

const formatCodeReview = (codeReview: CodeReview & {user: User; reviewers: (CodeReviewRelation & {reviewer: User})[]}): (Block | KnownBlock)[] => {
    const reviewerCount = codeReview.reviewers.length;
    const approvalCount = codeReview.reviewers.filter((r) => r.status === 'approved').length;

    const extractDisplayName = ({reviewer}: {reviewer: User}): string => reviewer.displayName;
    const reviewers: string[] = codeReview.reviewers.map(extractDisplayName);
    const approvers: string[] = codeReview.reviewers.filter((r) => r.status === 'approved').map(extractDisplayName);
    const mrkdwnPrLink = `<${codeReview.pullRequestLink}|:review: ${codeReview.pullRequestLink.replace(/.*penske-media-corp\//, '')}>`;
    const mrkdwnSlackLink = codeReview.slackPermalink && codeReview.slackThreadTs && `<${codeReview.slackPermalink}|:slack: ${codeReview.slackThreadTs}>`;

    const buttonApprove = {
        type: 'button',
        text: {
            type: 'plain_text',
            text: ':approved: Approve',
            emoji: true
        },
        value: `approve`,
        action_id: `approve-${codeReview.id}`
    };
    const buttonClaim = {
        type: 'button',
        text: {
            type: 'plain_text',
            text: ':eyes: Claim',
            emoji: true
        },
        value: 'claim',
        action_id: `claim-${codeReview.id}`,
        url: codeReview.pullRequestLink,
    };
    const buttonClose = {
        type: 'button',
        text: {
            type: 'plain_text',
            text: ':done: Close',
            emoji: true
        },
        value: 'close',
        action_id: `close-${codeReview.id}`,
        url: codeReview.pullRequestLink,
    };
    const buttonRemove = {
        type: 'button',
        text: {
            type: 'plain_text',
            text: ':trash: Remove',
            emoji: true
        },
        value: 'remove',
        action_id: `remove-${codeReview.id}`,
        confirm: {
            title: {
                type: 'plain_text',
                text: 'Are you sure?',
            },
            text: {
                type: 'plain_text',
                text: 'This will remove all related historical data for this request.',
            },
            confirm: {
                type: 'plain_text',
                text: 'Yes',
            },
            deny: {
                type: 'plain_text',
                text: 'No',
            },
        },
    };
    const stats = [];

    let text = `${mrkdwnPrLink} (${mrkdwnSlackLink ?? ''})\n`;


    if (reviewerCount) {
        stats.push(`:eyes: ${reviewerCount} ${pluralize('review', reviewerCount)}`);
    }
    if (approvalCount) {
        stats.push(`:approved: ${approvalCount} ${pluralize('approval', approvalCount)}`);
    }
    if (stats.length) {
        text = `${text}${stats.join(', ')}, `;
    }
    text = `${text}\nRequested by *${codeReview.user.displayName}*`;

    if (reviewers.length) {
        text = `${text}, Claimed by ${reviewers.join(', ')}`;
    }
    if (approvers.length) {
        text = `${text}, Approved by ${approvers.join(', ')}`;
    }

    if (codeReview.note) {
        text = `${text}\n${codeReview.note}\n`;
    }

    return [
        {
            'type': 'divider'
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: text,
            }
        },
        {
            type: 'actions',
            elements: [buttonClaim, buttonApprove, buttonClose, buttonRemove],
        }
    ] as (Block | KnownBlock)[];
};

const getCodeReviewList = async ({codeReviewStatus, slackChannelId, userId}: {codeReviewStatus?: string; slackChannelId?: string; userId?: string}): Promise<(Block | KnownBlock)[]> => {
    const where: {[index: string]: unknown} = {};

    if (slackChannelId) {
        where.slackChannelId = slackChannelId;
    }
    if (codeReviewStatus && codeReviewStatus !== 'all') {
        if (codeReviewStatus === 'mine') {
            where.status = {
                in: ['pending', 'inprogress'],
            };
            where.OR = [
                {
                    userId,
                },
                {
                    reviewers: {
                        some: {
                            userId,
                        }
                    }
                }
            ];
        } else {
            where.status = codeReviewStatus;
        }
    }

    const reviews = await prisma.codeReview.findMany({
        where,
        include: {
            user: true,
            reviewers: {
                include: {
                    reviewer: true,
                }
            },
        }
    });

    let blocks: (Block | KnownBlock)[] = [];

    reviews.forEach((review) => {
        blocks = blocks.concat(formatCodeReview(review));
    });

    return blocks;
};

export default getCodeReviewList;
