import {
    Block,
    KnownBlock
} from '@slack/bolt';
import {
    CodeReview,
    CodeReviewRelation,
    PrismaClient,
    User
} from '@prisma/client';
import {logDebug} from './log';

const formatCodeReview = (codeReview:  CodeReview & {user: User, reviewers: (CodeReviewRelation & {reviewer: User})[]}) => {
    const reviewerCount = codeReview.reviewers.length;
    const approvalCount = codeReview.reviewers.filter((r) => r.status === 'approved').length;

    const extractUsers = ({reviewer}: {reviewer: User}) => reviewer.displayName;
    const reviewers: string[] = codeReview.reviewers.map(extractUsers);

    let text = `*<${codeReview.pullRequestLink}|${codeReview.pullRequestLink.replace(/.*penske-media-corp\//,'')}>*\n`;
    const stats = [];

    if (reviewerCount) {
        stats.push(`${':review:'.repeat(reviewerCount)} ${reviewerCount} review(s)`);
    }
    if (approvalCount) {
        stats.push(`${':approved:'.repeat(approvalCount)} ${approvalCount} approval(s)`);
    }
    if (stats.length) {
        text = `${text}${stats.join(', ')}, `;
    }
    text = `${text}\nRequested by *${codeReview.user.displayName}*`;

    if (reviewers.length) {
        text = `${text}, Claimed by ${reviewers.join(', ')}`;
    }

    if (codeReview.note) {
        text = `${text}\n${codeReview.note}\n`;
    }

    return [
        {
            "type": "divider"
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
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: ':eyes: Claim',
                        emoji: true
                    },
                    value: 'claim',
                    action_id: `claim-${codeReview.id}`,
                    url: codeReview.pullRequestLink,
                },
                {
                    type: "button",
                    text: {
                        type: 'plain_text',
                        text: ':approved: Approve',
                        emoji: true
                    },
                    value: `approve`,
                    action_id: `approve-${codeReview.id}`
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: ':trash: Remove',
                        emoji: true
                    },
                    value: 'remove',
                    action_id: `remove-${codeReview.id}`
                },
            ]
        }
    ] as (KnownBlock | Block)[];
}

const getCodeReviewList = async (status: string) => {

    const prisma = new PrismaClient();

    const where: { [index: string]: string } = {}

    if (status && status !== 'all') {
        where.status = status;
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

    let blocks: (KnownBlock | Block)[] = [];

    reviews.forEach((review) => {
        blocks = blocks.concat(formatCodeReview(review));
    });

    return blocks;
}

export default {
    getCodeReviewList,
}
