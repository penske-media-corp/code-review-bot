import {
    Column,
    Entity,
    OneToOne,
} from 'typeorm'
import Base from './Base';
import Reviewer from './Reviewer';

@Entity()
export default class User extends Base {
    @Column({length: 40}) displayName?: string = '';

    @Column({length: 20}) slackUserId?: string = '';

    @Column({length: 128}) email?: string = '';

    @OneToOne(
        () => Reviewer,
        (reviewer) => reviewer.user
    ) reviewer?: Reviewer;
}
