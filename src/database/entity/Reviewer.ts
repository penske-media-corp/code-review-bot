import {
    Entity,
    OneToMany,
    OneToOne,
    JoinColumn,
} from 'typeorm'
import Base from './Base';
import CodeReviewRequestReviewerRelation from './CodeReviewRequestReviewerRelation';
import User from './User';

@Entity()
export default class Reviewer extends Base {
    @OneToOne(() => User, (user) => user.reviewer)
    @JoinColumn()
        user?: User;

    @OneToMany(() => CodeReviewRequestReviewerRelation, (relation) => relation.reviewer)
        requests?: CodeReviewRequestReviewerRelation[];
}
