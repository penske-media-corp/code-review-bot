import type {RequestHandler} from 'express';
import User from '../../../service/User';

const userController: RequestHandler = (req, res) => {
    const user =  req.user as Partial<{id: number}> | null;
    if (!user?.id) {
        res.json(null);
        return;
    }

    User.load({id: user.id})
        .then((result) => {
            res.json(result);
        }).catch(() => {
            res.json(null);
        });
};

export default userController;
