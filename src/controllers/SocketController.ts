import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { redisClient } from "../index"
import { Server } from "socket.io";

export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
    user?: any;
}
export interface IO extends Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> { }

export const authorizeUser = async (socket: CustomSocket, next: (err?: ExtendedError | undefined) => void) => {
    if (!socket.user) {
        next(new Error("Not Authorized"));
    } else {
        await redisClient.hSet(`userId${socket?.user?.socket_id}`, { "userId": socket?.user?.socket_id.toString(), "connected": "true" });
        const JsonFriend = await redisClient.lRange(`friends:${socket?.user?.socket_id}`, 0, -1)
        const friendList = JsonFriend?.map((each) => {
            const parseUser = JSON.parse(each);
            return parseUser;
        });
        socket.emit("get_friends", friendList)
        socket.join(socket?.user?.socket_id)
        next();
    }
};

export const flushAllData = async (io: IO, socket: CustomSocket) => {
    // const rooms = io.sockets.adapter.rooms
    // console.log(rooms);
    try {
        await redisClient.flushAll()
        console.log("All data flushed successfully.");
    } catch (error) {
        console.error("Error flushing data:", error);
    }
}

export const addFriend = async (socket: CustomSocket, user: any) => {
    const friendListKey = `friends:${socket.user.socket_id}`;
    const currFrndList = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
    const existingUserIndex = currFrndList.findIndex(each => {
        const parsedUser = JSON.parse(each);
        return parsedUser.socket_id === user.socket_id;
    });
    const jsonStrngUser = JSON.stringify(user);

    if (existingUserIndex !== -1) {
        await redisClient.LSET(friendListKey, existingUserIndex, jsonStrngUser);
    } else {
        await redisClient.LPUSH(friendListKey, jsonStrngUser);
    }
    const JsonFriend = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
    const friendList = JsonFriend?.map((each) => JSON.parse(each));
    socket.emit("get_friends", friendList)
}
export const getFriends = async (socket: CustomSocket, io: IO, user: any) => {
    const currFrndList = await redisClient.lRange(`friends:${user?.socket_id}`, 0, -1)
    const friendList = currFrndList?.map((each) => JSON.parse(each));
    socket.emit("get_friends", friendList)
}

export const sendMessage = async (io: IO, socket: CustomSocket, data: any) => {
    const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
    const recieverKey = `sender:${data.recieverId}-reciever:${data.senderId}`;

    const senderMsg = JSON.stringify(data);
    const recieverMsg = JSON.stringify({ ...data, right: false });
    try {
        const receiverSocket = await io.to(data.recieverId).fetchSockets();
        const senderIdSocket = await io.to(data.senderId).fetchSockets();
        if (receiverSocket.length > 0 && senderIdSocket.length > 0) {
            await redisClient.LPUSH(senderKey, senderMsg);
            await redisClient.LPUSH(recieverKey, recieverMsg);
            socket.to(data.recieverId).emit("recieve_message", data);
        } else {
            console.error(`Receiver socket with ID ${data.recieverId} not found.`);
        }

    } catch (error) {
        console.error("Error sending message:", error);
    }
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
    socket.user = null;
    // socket.disconnect();
}
export const updateSeen = async (socket: CustomSocket, unread: any) => {
    for (let i = 0; i < unread.length; i++) {
        let msg = unread[i]
        msg.seen = true;
        msg.right = true;

        socket.to(msg.senderId).emit("update_view", msg)
        const senderKey = `sender:${msg.senderId}-reciever:${msg.recieverId}`;
        // const senderKey = `sender:${msg.recieverId}-reciever:${msg.senderId}`;
        const senderKeyList = await redisClient.lRange(senderKey, 0, -1);
        const messageIndex = senderKeyList.findIndex(each => JSON.parse(each).date === msg.date);
        if (messageIndex !== -1) {
            const updatedMsg = JSON.parse(senderKeyList[messageIndex]);
            updatedMsg.seen = true;
            updatedMsg.right = true;

            const jsonStrngMsg = JSON.stringify(updatedMsg);
            await redisClient.LSET(senderKey, messageIndex, jsonStrngMsg);
        }
        const doneKey = await redisClient.lRange(senderKey, 0, -1);
        const Response = doneKey.map((each) => {
            const { message, seen, right } = JSON.parse(each);
            return { message, seen, right };
        });



    }
    // const recieverKey = `sender:${msg.recieverId}-reciever:${msg.senderId}`;
}

export const getAllMessages = async (io: IO, socket: CustomSocket) => {
    const currFrndList = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
    const friendList = currFrndList?.map((each) => JSON.parse(each));

    const res = await Promise.all(friendList.map(async (friend: any) => {
        const senderKey = `sender:${socket.user.socket_id}-reciever:${friend.socket_id}`;
        const userChat = await redisClient.lRange(senderKey, 0, -1);

        const curr_chat = userChat?.map((each) => JSON.parse(each)).reverse()
        const lastMessageIndex = curr_chat.length - 1;
        const lastMessage = lastMessageIndex >= 0 ? curr_chat[lastMessageIndex] : null;
        return { ...friend, chat: curr_chat, lastMessage: lastMessage };
    }));
    // Sort the result by the date of the last message
    const sortedRes = res.sort((a, b) => {
        const lastMessageA = a.lastMessage;
        const lastMessageB = b.lastMessage;
        if (!lastMessageA && !lastMessageB) {
            return 0;
        } else if (!lastMessageA) {
            return 1;
        } else if (!lastMessageB) {
            return -1;
        } else {
            return new Date(lastMessageB.date).getTime() - new Date(lastMessageA.date).getTime();
        }
    });
    socket.emit("get_all_messages_on_reload", sortedRes);
}