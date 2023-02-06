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
    @Column()
    jiraTicket?: string = '';

    @Column()
    pullRequestLink?: string = '';

    @Column()
    slackMsgId?: string = '';

    @OneToOne(() => User)
    @JoinColumn()
    user?: User;

    @OneToMany(() => CodeReviewRequestReviewerRelation, (relation) => relation.requestInfo)
    reviewers?: CodeReviewRequestReviewerRelation[];
}
