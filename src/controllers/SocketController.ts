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
        await redisClient.hSet(`userId${socket.user.socket_id}`, { "userId": socket.user.socket_id.toString(), "connected": "true" });
        // const hashData = await redisClient.hGetAll(`userId${socket.user.socket_id}`);
        socket.join(socket.user.socket_id)
        next();
    }
};

export const userConnected = async (io: any, socket: CustomSocket) => {
    console.log("calling this function login user");
    // const room = io.sockets.adapter.rooms.get(socket.user.socket_id);
    // if (room) {
    //     for (const clientId of room) {
    //         io.sockets.sockets.get(clientId).leave(socket.user.socket_id);
    //     }
    // }
    // Check if the user has joined the room
    // const rooms = io.sockets.adapter.rooms;
    // const userSocket = rooms.get(socket.user.socket_id)
    // const isRecipientInRoom = rooms.has(socket.user.socket_id);

    // console.log(`Is user in room? ${isRecipientInRoom} `, userSocket);
}

export const sendMessage = (socket: CustomSocket, data: any) => {
    socket.to(data.room).emit("recieve_message", data)
}

export const onDisconnect = async (socket: CustomSocket) => {
    console.log("disconnecting.");

    redisClient.hSet(`userId${socket.user._id}`, "connected", "false")

}
