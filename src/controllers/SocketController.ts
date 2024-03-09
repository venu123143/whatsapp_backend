import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { redisClient } from "../index"
import { Server } from "socket.io";

export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
    user?: any;
}
export interface IO extends Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> { }


export const getAllMessages = async (socket: CustomSocket) => {
    const currFrndList = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
    const friendList = currFrndList?.map((each) => JSON.parse(each));

    const res = await Promise.all(friendList.map(async (friend: any) => {
        const senderKey = `sender:${socket.user.socket_id}-reciever:${friend.socket_id}`;
        const userChat = await redisClient.lRange(senderKey, 0, -1);
        if (friend.users && friend.users.length > 0) {  // for group
            socket.join(friend.socket_id)
        }
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

export const authorizeUser = async (socket: CustomSocket, next: (err?: ExtendedError | undefined) => void) => {
    if (!socket.user || socket.user === null) {
        next(new Error("Not Authorized"));
    } else {
        await redisClient.hSet(`userId${socket?.user?.socket_id}`, { "userId": socket?.user?.socket_id.toString(), "connected": "true" });
        const userRooms = Array.from(socket.rooms);
        if (!userRooms.includes(socket.user.socket_id)) {

            socket.join(socket.user.socket_id);
        }
        await getAllMessages(socket)
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
    // const JsonFriend = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
    // const friendList = JsonFriend?.map((each) => JSON.parse(each));
    socket.emit("get_friends", user)
}
export const getFriends = async (socket: CustomSocket, io: IO, user: any) => {
    const currFrndList = await redisClient.lRange(`friends:${user?.socket_id}`, 0, -1)
    const friendList = currFrndList?.map((each) => JSON.parse(each));
    socket.emit("get_friends", friendList)
}

export const sendMessage = async (io: IO, socket: CustomSocket, data: any) => {
    const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
    let recieverKey = `sender:${data.recieverId}-reciever:${data.senderId}`;
    const { users, ...dataWithoutUsers } = data;
    const senderMsg = JSON.stringify(dataWithoutUsers);
    const recieverMsg = JSON.stringify({ ...dataWithoutUsers, right: false });

    try {
        // const receiverSocket = await io.to(data.recieverId).fetchSockets();
        socket.to(data.recieverId).emit("recieve_message", data);

        await redisClient.LPUSH(senderKey, senderMsg);
        if (data.conn_type === 'group') {
            for (const user of data.users) {
                if (user.socket_id !== socket.user.socket_id) {
                    recieverKey = `sender:${user.socket_id}-reciever:${data.recieverId}`
                    await redisClient.LPUSH(recieverKey, recieverMsg);
                }
            }
        } else {
            await redisClient.LPUSH(recieverKey, recieverMsg);
        }

    } catch (error) {
        console.error("Error sending message:", error);
    }
}
export const createGroup = async (io: IO, socket: CustomSocket, group: any) => {
    const jsonStrngGrp = JSON.stringify(group);
    const users = group.users;

    const grpCreateAck = {
        message: `${socket.user.name ? socket.user.name : socket.user.mobile} was created group ${group.name}`,
        msgType: "notification",
        conn_type: "group",
        recieverId: group.socket_id,
        date: new Date().toISOString(),
        seen: false,
        right: false,
    }
    const createAck = JSON.stringify(grpCreateAck);

    await Promise.all(users.map(async (user: any) => {
        const senderKey = `sender:${user.socket_id}-reciever:${group.socket_id}`;
        await redisClient.LPUSH(`friends:${user.socket_id}`, jsonStrngGrp);
        await redisClient.LPUSH(senderKey, createAck);
    }));
    io.to(socket.user.socket_id).emit("get_friends", group)
    for (const user of group.users) {
        try {
            const userSocketId = user.socket_id;
            const isUserInRoom = io.sockets.adapter.rooms.has(userSocketId);
            console.log(isUserInRoom, user?.name);

            const msgObj = {
                message: `${socket.user.name ? socket.user.name : socket.user.mobile} added ${user.name ? user.name : user.mobile} to the group`,
                msgType: "notification",
                conn_type: "group",
                recieverId: group.socket_id,
                date: new Date().toISOString(),
                right: false,
                seen: false,
            }
            if (isUserInRoom) {
                let userSocket = await io.to(userSocketId).fetchSockets();
                if (userSocket.length !== 0) {
                    userSocket[0].join(group.socket_id);
                    socket.to(user.socket_id).emit("get_friends", group)
                    socket.to(group.socket_id).emit("recieve_message", msgObj)
                }
                const senderKey = `sender:${user.socket_id}-reciever:${group.socket_id}`;
                await redisClient.LPUSH(senderKey, JSON.stringify(msgObj));


                console.log(`User ${userSocketId} joined group room ${group.socket_id}`);

                // else {
                //     console.warn(`User with ID ${userSocketId} is not connected.`);
                // }
            } else {
                console.error(`User with ID ${userSocketId} is not a Socket.`);
            }
        } catch (error) {
            console.error("Error handling user:", error);
        }
    }
    socket.to(group.socket_id).emit("recieve_message", grpCreateAck)


    // const createdGroups = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    // const groupList = createdGroups?.map((each) => JSON.parse(each));

};

export const deleteMessage = async (io: IO, socket: CustomSocket, data: any) => {
    const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
    // const res = await redisClient.del(senderKey);
    const messageToRemove = JSON.stringify(data)
    redisClient.LREM(senderKey, 0, messageToRemove)
    // console.log(res);

}
export const editMessage = async (io: IO, socket: CustomSocket, data: any) => {
    if (data.right === true) {
        const { users, ...withOutIndex } = data;
        const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
        let recieverKey = `sender:${data.recieverId}-reciever:${data.senderId}`;
        const currentChat = await redisClient.lRange(senderKey, 0, -1)
        const msgIndex = currentChat.findIndex(each => JSON.parse(each).date === data.date);

        await redisClient.LSET(senderKey, msgIndex, JSON.stringify(withOutIndex));
        if (data.conn_type === 'group') {
            for (const user of users) {
                if (user.socket_id !== socket.user.socket_id) {
                    recieverKey = `sender:${user.socket_id}-reciever:${data.recieverId}`
                    const currentChat = await redisClient.lRange(recieverKey, 0, -1)
                    const recMsgIndex = currentChat.findIndex(each => JSON.parse(each).date === data.date);

                    await redisClient.LSET(recieverKey, recMsgIndex, JSON.stringify({ ...withOutIndex, right: false }));
                }
            }
        } else {
            const currentChat = await redisClient.lRange(recieverKey, 0, -1)
            const recMsgIndex = currentChat.findIndex(each => JSON.parse(each).date === data.date);
            await redisClient.LSET(recieverKey, recMsgIndex, JSON.stringify({ ...withOutIndex, right: false }));
        }
        const updatedChatSender = await redisClient.lRange(senderKey, 0, -1)
        const updatedChatReciever = await redisClient.lRange(recieverKey, 0, -1)

        const recChat = updatedChatReciever.map(each => JSON.parse(each)).reverse()
        socket.to(data.recieverId).emit("update_msg", recChat)

        const sendChat = updatedChatSender.map(each => JSON.parse(each)).reverse()
        io.to(data.senderId).emit("update_msg", sendChat)


    }
}
export const onlineStatus = async (io: any, socket: CustomSocket, data: any) => {
    const userStatus = await redisClient.hGet(`userId${data.recieverId}`, 'connected')
    const status = { recieverId: data.recieverId, status: userStatus }
    io.to(data.senderId).emit('user_status', status)
}
export const onDisconnect = async (socket: CustomSocket) => {
    console.log("disconnecting.");
    await redisClient.hSet(`userId${socket.user.socket_id}`, { "userId": socket.user.socket_id.toString(), "connected": "false" })
    socket.user = null;
    socket.disconnect(true);
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
    }
    // const recieverKey = `sender:${msg.recieverId}-reciever:${msg.senderId}`;
}
