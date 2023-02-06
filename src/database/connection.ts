import {
    DataSource,
    DataSourceOptions
} from 'typeorm';
import {
    DB_HOST,
    DB_NAME,
    DB_USER,
    DB_PASSWORD
} from '../utils/env';
import CodeReviewRequestReviewerRelation from './entity/CodeReviewRequestReviewerRelation';
import CodeReviewRequest from './entity/CodeReviewRequest';
import Reviewer from './entity/Reviewer';
import User from './entity/User';

const options: DataSourceOptions = {
    type: 'mysql',
    host: DB_HOST,
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    synchronize: true,
    entities: [
        User,
        Reviewer,
        CodeReviewRequest,
        CodeReviewRequestReviewerRelation,
    ],
    logging: false,
//    logger: 'file',
}

const Connection = new DataSource(options);

export default Connection;
