import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { redisClient } from "../index"
export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
    user?: any; // Replace YourUserType with the actual type of your user object
}
export const authorizeUser = (socket: CustomSocket, next: (err?: ExtendedError | undefined) => void) => {

    // Your authorization logic here
    if (!socket.user) {
        next(new Error("Not Authorized"));
    } else {
        redisClient.hSet(`userId${socket.user._id}`, "userId", socket.user.socket_id)
        next();
    }
};
