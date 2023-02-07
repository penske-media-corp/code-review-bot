import {
    Column,
    Entity,
    ManyToOne,
} from 'typeorm'
import Base from './Base';
import CodeReviewRequest from './CodeReviewRequest';
import Reviewer from './Reviewer';

@Entity()
export default class CodeReviewRequestReviewerRelation extends Base {
    @Column() status?: string = 'pending';

    @ManyToOne(
        () => Reviewer,
        (reviewer) => reviewer.requests
    ) reviewer?: Reviewer;

    @ManyToOne(
        () => CodeReviewRequest,
        (requestInfo) => requestInfo.reviewers
    ) requestInfo?: CodeReviewRequest;
}
