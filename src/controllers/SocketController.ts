import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { redisClient } from "../index"
export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
    user?: any; // Replace YourUserType with the actual type of your user object
}
export const authorizeUser = async (socket: CustomSocket, next: (err?: ExtendedError | undefined) => void) => {
    if (!socket.user) {
        next(new Error("Not Authorized"));
    } else {
        await redisClient.hSet(`userId${socket.user.socket_id}`, { "userId": socket.user.socket_id.toString(), "connected": "true" });
        const JsonFriend = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
        const friendList = JsonFriend?.map((each) => {
            const parseUser = JSON.parse(each);
            return parseUser;
        });
        socket.emit("get_friends", friendList)
        socket.join(socket.user.socket_id)
        next();
    }
};

export const userConnected = async (io: any, socket: CustomSocket) => {
    // console.log("calling this function login user");
    // const room = io.sockets.adapter.rooms.get(socket.user.socket_id);
    // if (room) {
    //     for (const clientId of room) {
    //         io.sockets.sockets.get(clientId).leave(socket.user.socket_id);
    //     }
    // }
    // Check if the user has joined the room
    const rooms = io.sockets.adapter.rooms;
    const userSocket = rooms.get(socket.user.socket_id)
    console.log(`${socket.user.name} `, userSocket);
}

export const addFriend = async (socket: CustomSocket, user: any) => {
    const currFrndList = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)

    const alreadExist = currFrndList?.filter((each) => JSON.parse(each).socket_id === user.socket_id)
    if (alreadExist.length === 0) {
        const jsonStrngUser = JSON.stringify(user);
        await redisClient.LPUSH(`friends:${socket.user.socket_id}`, jsonStrngUser);
    }
    const JsonFriend = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
    const friendList = JsonFriend?.map((each) => {
        const parseUser = JSON.parse(each);
        return parseUser;
    });
    socket.emit("get_friends", friendList)
}

export const getFriends = async (socket: CustomSocket) => {
    const JsonFriend = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
    const friendList = JsonFriend?.map((each) => {
        const parseUser = JSON.parse(each);
        return parseUser;
    });
    return friendList
}

export const sendMessage = (socket: CustomSocket, data: any) => {
    console.log("from ", data.senderId, "to ", data.recieverId);
    socket.to(data.recieverId).emit("recieve_message", data)
}

export const onDisconnect = async (socket: CustomSocket) => {
    console.log("disconnecting.");
    await redisClient.hSet(`userId${socket.user.socket_id}`, { "userId": socket.user.socket_id.toString(), "connected": "false" })

}
