import {
    Column,
    Entity,
    JoinColumn,
    OneToMany,
    OneToOne,
} from 'typeorm'
import Base from './Base';
import CodeReviewRequestReviewerRelation from './CodeReviewRequestReviewerRelation';
import User from './User';

@Entity()
export default class CodeReviewRequest extends Base {
    @Column({length: 128}) jiraTicket?: string = '';

    @Column({length: 128}) pullRequestLink?: string = '';

    @Column({length: 40}) slackMsgId?: string = ''; // eg. b7a6d799-c32c-4d2d-989c-4f1b77e944fe

    @Column({length: 30}) slackMsgThreadTs?: string = ''; // eg. 1674872216.274939

    @Column({length: 10}) status?: string = ''; // approved | merged | deployed | pending

    @Column() note?: string = '';

    @OneToOne(() => User)
    @JoinColumn()
        user?: User;

    @OneToMany(
        () => CodeReviewRequestReviewerRelation,
        (relation) => relation.requestInfo
    ) reviewers?: CodeReviewRequestReviewerRelation[];
}
