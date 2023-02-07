import {
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export default abstract class Base {
    @PrimaryGeneratedColumn() id = 0;

    @CreateDateColumn() createAt: Date = new Date();

    @UpdateDateColumn() updatedAt?: Date;
}
