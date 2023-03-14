import {
    PrismaClient,
    User,
} from '@prisma/client'
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient()
async function main() {
    const usersCount = 50;
    const codeReviewsCount = 100;

    let users = await prisma.user.findMany();

    if (users.length < usersCount) {
        for (let i = 0; i < usersCount - users.length; i++) {
            const firstName = faker.name.firstName()
            const lastName = faker.name.lastName()
            const data = {
                createdAt: faker.date.past(),
                updatedAt: faker.date.recent(),
                slackUserId: faker.random.alphaNumeric(20),
                displayName: `${firstName} ${lastName}`,
                email: faker.internet.email(firstName, lastName),
                session: '{}',
            };

            await prisma.user.create({data});
        }
    }

    users = await prisma.user.findMany({
        orderBy: {
            id: 'asc',
        },
        take: usersCount,
    });

    await prisma.codeReviewRelation.deleteMany({
        where: {
            codeReviewId: {
                gte: 6,
            }
        }
    })

    await prisma.codeReview.deleteMany({
        where: {
            id: {
                gte: 6,
            }
        }
    })

    let codeReviews = await prisma.codeReview.findMany();

    if (codeReviews.length < codeReviewsCount) {
        for (let i = 0; i < codeReviewsCount-codeReviews.length; i++) {
            const data = {
                createdAt: faker.date.past(),
                updatedAt: faker.date.recent(),
                userId: faker.helpers.arrayElement(users).id,
                pullRequestLink: `https://github.com/company/repo/pull/${faker.datatype.number({max: codeReviewsCount})}`,
                status: 'pending',
                slackThreadTs: faker.datatype.float().toString(),
                slackMsgId: faker.datatype.uuid(),
                note: faker.lorem.sentence(20),
                jiraTicket: `JIRA-${faker.datatype.number({max: 100})}`,
            };
            await prisma.codeReview.create({data});
        }
    }
    codeReviews = await prisma.codeReview.findMany();

    for (let i = 0; i < users.length; i++) {
        const reviewer = faker.helpers.arrayElement(users);
        const codeReview = faker.helpers.arrayElement(codeReviews);
        await prisma.codeReviewRelation.create({
            data: {
                userId: reviewer.id,
                codeReviewId: codeReview.id,
                status: faker.helpers.arrayElement(['pending', 'approve']),
            }
        })
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    });
