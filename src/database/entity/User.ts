import {
    Column,
    Entity,
    OneToOne,
} from 'typeorm'
import Base from './Base';
import Reviewer from './Reviewer';

@Entity()
export default class User extends Base {
    @Column() displayName?: string = '';

    @Column() slackUserId?: string = '';

    @Column() email?: string = '';

    @OneToOne(
        () => Reviewer,
        (reviewer) => reviewer.user
    ) reviewer?: Reviewer;
}
