import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { redisClient } from "../index"
export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
    user?: any; // Replace YourUserType with the actual type of your user object
}
export const authorizeUser = async (socket: CustomSocket, next: (err?: ExtendedError | undefined) => void) => {

    // Your authorization logic here
    if (!socket.user) {
        next(new Error("Not Authorized"));
    } else {
        // await redisClient.hSet(`userId${socket.user._id}`, "userId", socket.user._id)
        // await redisClient.hSet(`userId${socket.user._id}`, "connected", "true")
        next();
    }
};

export const userConnected = async (socket: CustomSocket) => {
    console.log("calling this function");
    
    await redisClient.hSet(`userId${socket.user._id}`, "userId", socket.user._id)
    await redisClient.hSet(`userId${socket.user._id}`, "connected", "true")
    socket.join(socket.user._id)
}

export const sendMessage = (socket: CustomSocket, data: any) => {
    console.log(socket.id);
    socket.to(data.room).emit("recieve_message", data)
    console.log("send message called", data);
}

export const onDisconnect = async (socket: CustomSocket) => {
    redisClient.hSet(`userId${socket.user._id}`, "connected", "false")

}
