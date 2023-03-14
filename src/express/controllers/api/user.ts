import type {RequestHandler} from 'express';

const userController: RequestHandler = (req, res) => {
    const {id, fn: displayName} = req.user as {id: string; fn: string};

    if (!id) {
        res.status(404) .json(null);
        return;
    }

    res.json({
        id,
        displayName,
    });
};

export default userController;
