
// session and redis
// import session from 'express-session';
// import { createClient } from "redis";
// import RedisStore from "connect-redis";
import { JwtPayload, authMiddleware } from '../middleware/authMiddleware';
import User, { IUser } from "../models/UserModel";
import jwt from "jsonwebtoken"

import { Socket } from "socket.io"
// import MongoStore from "connect-mongo"
// const store = MongoStore.create({ mongoUrl: process.env.MONGO_URL })

// export const redisClient = createClient()
// redisClient.connect().then(() => console.log("redis connected")).catch((err) => console.log(err))


// const ses = session({
//     name: 'sessionId',
//     store: new RedisStore({ client: redisClient }),
//     resave: false,
//     saveUninitialized: false,
//     secret: process.env.SESSION_SECRET as string,
//     cookie: {
//         sameSite: 'lax',
//         secure: false,
//         httpOnly: true,
//         maxAge: 24 * 60 * 60 * 1000 * 2, // 2 days
//     }
// })

export const socketMiddleware = async (socket: any, next: any) => {
    const loginToken: string = socket.handshake.auth.token;
    console.log(loginToken);

    try {
        const decode = jwt.verify(loginToken, process.env.SECRET_KEY as jwt.Secret) as JwtPayload;
        const user = await User.findById(decode._id);
        console.log(user);

        socket.user = user
        next();
    } catch (error) {
        next(new Error("Socket Connection Failed, Try again."));
    }


}
