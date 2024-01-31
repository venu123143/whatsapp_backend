import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { redisClient } from "../index"
import { Server } from "socket.io";

export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
    user?: any; // Replace YourUserType with the actual type of your user object
}
export interface IO extends Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> { }

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

export const userConnected = async (io: IO, socket: CustomSocket) => {
    const rooms = io.sockets.adapter.rooms
    console.log(rooms);

    const userSocket = rooms.get(socket.user.socket_id)
    console.log(`${socket.user.name} `, userSocket);
}

export const addFriend = async (socket: CustomSocket, user: any) => {
    const currFrndList = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
    // console.log("currFrndList", currFrndList);

    const alreadExist = currFrndList?.filter((each) => JSON.parse(each).socket_id === user.socket_id)
    const jsonStrngUser = JSON.stringify(user);
    // console.log("user", jsonStrngUser);

    // console.log("alread exist ", alreadExist);

    if (alreadExist.length === 0) {
        await redisClient.LPUSH(`friends:${socket.user.socket_id}`, jsonStrngUser);
    }
    const JsonFriend = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)

    const friendList = JsonFriend?.map((each) => {
        const parseUser = JSON.parse(each);
        return parseUser;
    });
    // console.log("JsonFriend", friendList);
    socket.emit("get_friends", friendList)
}

// export const getFriends = async (socket: CustomSocket) => {
//     const JsonFriend = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
//     const friendList = JsonFriend?.map((each) => {
//         const parseUser = JSON.parse(each);
//         return parseUser;
//     });
//     return friendList
// }
export const sendMessage = async (socket: CustomSocket, data: any) => {
    console.log(data);
    socket.to(data.recieverId).emit("recieve_message", data)
}
export const createGroup = async (io: IO, socket: CustomSocket, group: any) => {
    const jsonStrngGrp = JSON.stringify(group);
    const users = group.users;
    // Add the group to each user's list
    await Promise.all(users.map(async (user: any) => {
        await redisClient.LPUSH(`friends:${user.socket_id}`, jsonStrngGrp);
    }));
   
    for (const user of group.users) {
        try {
            const userSocketId = user.socket_id;
            const isUserInRoom = io.sockets.adapter.rooms.has(userSocketId);
            // const isUserInRoom = await io.of('/').in(userSocketId).fetchSockets();
            const msgObj = {
                message: ` ${socket.user.name} added ${user.name} to the group`,
                msgType: "notification",
                conn_type: "group",
                recieverId: group.socket_id,
                date: new Date().toISOString(),
                right: false,
            }
            if (isUserInRoom) {
                let userSocket = await io.to(userSocketId).fetchSockets();
                if (userSocket.length !== 0) {
                    userSocket[0].join(group.socket_id);
                    socket.to(group.socket_id).emit("recieve_message", msgObj)

                    console.log(`User ${userSocketId} joined group room ${group.socket_id}`);
                } else {
                    console.warn(`User with ID ${userSocketId} is not connected.`);
                }
            } else {
                console.error(`User with ID ${userSocketId} is not a Socket.`);
            }
        } catch (error) {
            console.error("Error handling user:", error);
        }
    }

    const createdGroups = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    const groupList = createdGroups?.map((each) => JSON.parse(each));

    socket.emit("get_friends", groupList)

    const msgObj = {
        message: `${group.name} group was created by ${socket.user.name} `,
        msgType: "notification",
        conn_type: "group",
        recieverId: group.socket_id,
        date: new Date().toISOString(),
        right: false,
    }
    socket.to(group.socket_id).emit("recieve_message", msgObj)
    // Retrieve the list of groups for the current user


};

export const onlineStatus = async (io: any, socket: CustomSocket, data: any) => {
    const userStatus = await redisClient.hGet(`userId${data.recieverId}`, 'connected')
    const status = { recieverId: data.recieverId, status: userStatus }
    io.to(data.senderId).emit('user_status', status)
}
export const onDisconnect = async (socket: CustomSocket) => {
    console.log("disconnecting.");
    await redisClient.hSet(`userId${socket.user.socket_id}`, { "userId": socket.user.socket_id.toString(), "connected": "false" })

}
