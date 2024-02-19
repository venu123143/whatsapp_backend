import { JwtPayload } from '../middleware/authMiddleware';
import User, { IUser } from "../models/UserModel";
import jwt from "jsonwebtoken"
import { CustomSocket } from "../controllers/SocketController"
// import { ExtendedError } from 'socket.io/dist/namespace';
// custom-typings/socket.io.d.ts


// import MongoStore from "connect-mongo"
// const store = MongoStore.create({ mongoUrl: process.env.MONGO_URL })



export const socketMiddleware = async (socket: CustomSocket, next: (err?: any | undefined) => void) => {
    console.log("handshake token");
    const loginToken: string = socket.handshake.auth.token;
    try {
        const decode = jwt.verify(loginToken, process.env.SECRET_KEY as jwt.Secret) as JwtPayload;
        const user = await User.findById(decode._id);
        socket.user = user
        next();
    } catch (error) {
        next(new Error("Socket Connection Failed, Try again."));
    }

}

