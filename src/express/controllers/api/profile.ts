import type {RequestHandler} from 'express';
import User from '../../../service/User';

const profileController: RequestHandler = (req, res) => {
    const {id} = req.user as {id: number};

    void User.load({id}).then((user) => {
        res.json({
            user,
        });
    });
};

export default profileController;
