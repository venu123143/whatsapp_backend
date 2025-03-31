import { Socket } from 'socket.io';
import { ExtendedError, Namespace } from 'socket.io/dist/namespace';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { redisClient } from "../utils/session"
import { Server } from "socket.io";
import { ConnectionType } from 'models/Connection';
import dbCalls from '../database/dbCalls';

// mongodb
import { Types } from 'mongoose';
import Connection from '../models/Connection';
import ChatModel from '../models/ChatModel';
import UserModel from '../models/UserModel';

export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
    user?: any;
}
export interface IO extends Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> { }
export interface ChatNamespace extends Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> { }

export const getAllMessages = async (socket: CustomSocket, callback: any) => {
    try {
        const currentUser = socket.user;
        const aggrigateQuery: any =

            [
                // Match connections for the user
                {
                    $match: {
                        users: new Types.ObjectId(currentUser._id),
                    }
                },
                // Lookup users to get their details
                {
                    $lookup: {
                        from: "users",
                        localField: "users",
                        foreignField: "_id",
                        as: "usersData"
                    }
                },
                // Lookup messages
                {
                    $lookup: {
                        from: "messages",
                        let: { roomId: "$room_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            { $toString: "$room_id" },
                                            "$$roomId"
                                        ]
                                    }
                                }
                            },
                            {
                                $addFields: {
                                    isMyMsg: {
                                        $eq: ["$sender.id", currentUser._id.toString()]
                                    },
                                    send: true,
                                }
                            },
                            {
                                $sort: { date: 1 }
                            },
                            {
                                $limit: 100
                            }
                        ],
                        as: "messages"
                    }
                },
                // Add lastMessage field from messages array
                {
                    $addFields: {
                        lastMessage: {
                            $arrayElemAt: ["$messages", -1]  // Get the last (most recent) message
                        }
                    }
                },
                // Add otherUser field for one-to-one chats
                {
                    $addFields: {
                        otherUser: {
                            $cond: {
                                if: { $eq: ["$conn_type", "onetoone"] },
                                then: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$usersData",
                                                cond: {
                                                    $ne: ["$$this._id", new Types.ObjectId(currentUser._id)]
                                                }
                                            }
                                        },
                                        0
                                    ]
                                },
                                else: null
                            }
                        }
                    }
                },
                // Calculate unreadCount for individual chats
                {
                    $addFields: {
                        unreadCount: {
                            $cond: {
                                if: { $eq: ["$conn_type", "onetoone"] },
                                then: {
                                    $size: {
                                        $filter: {
                                            input: "$messages",
                                            cond: {
                                                $and: [
                                                    { $eq: ["$$this.seen", false] },
                                                    { $ne: ["$$this.sender.id", currentUser._id.toString()] }
                                                ]
                                            }
                                        }
                                    }
                                },
                                else: "$unreadCount"  // Keep existing unreadCount for group chats
                            }
                        }
                    }
                },
                // Project fields with conditional display name, profile, and users
                {
                    $project: {
                        room_id: 1,
                        conn_type: 1,
                        messages: 1,
                        lastMessage: 1,
                        display_name: {
                            $cond: {
                                if: { $eq: ["$conn_type", "onetoone"] },
                                then: {
                                    $cond: {
                                        if: { $ifNull: ["$otherUser.name", false] },
                                        then: "$otherUser.name",
                                        else: "$otherUser.mobile"
                                    }
                                },
                                else: "$conn_name"
                            }
                        },
                        profile: {
                            $cond: {
                                if: { $eq: ["$conn_type", "onetoone"] },
                                then: "$otherUser.profile",
                                else: "$profile"
                            }
                        },
                        about: {
                            $cond: {
                                if: { $eq: ["$conn_type", "onetoone"] },
                                then: null,
                                else: "$about"
                            }
                        },
                        users: {
                            $map: {
                                input: "$usersData",
                                as: "user",
                                in: {
                                    _id: "$$user._id",
                                    name: "$$user.name",
                                    phoneNumber: "$$user.mobile",
                                    display_name: {
                                        $cond: {
                                            if: { $ifNull: ["$$user.name", false] },
                                            then: "$$user.name",
                                            else: "$$user.mobile"
                                        }
                                    }
                                }
                            }
                        },
                        admins: 1,
                        online_status: 1,
                        unreadCount: 1
                    }
                },
                // Sort by last message date
                {
                    $sort: { "lastMessage.date": -1 }
                },
                {
                    $limit: 100
                }
            ]
        const connections = await Connection.aggregate(aggrigateQuery)
        const roomIds = connections.map((conn) => conn.room_id)
        socket.join(roomIds)
        await redisClient.hSet(`userId${socket.user?._id}`, 'connected', 'true');
        callback({
            status: true,
            connections: connections
        });
    } catch (error) {
        console.error("Error fetching connections and messages:", error);
        callback({
            status: false,
            error: "Failed to fetch connections and messages"
        });
    }
};

export const authorizeUser = async (socket: CustomSocket, next: (err?: ExtendedError | undefined) => void) => {
    if (!socket.user || socket.user === null) {
        next(new Error("Not Authorized"));
    } else {
        // await redisClient.hSet(`userId${socket?.user?.socket_id}`, { "userId": socket?.user?.socket_id.toString(), "connected": "true" });
        const userRooms = Array.from(socket.rooms);
        if (!userRooms.includes(socket.user.socket_id)) {
            socket.join(socket.user.socket_id);
        }
        // const callback = null;
        // await getAllMessages(socket, callback)
        next();
    }
};

export const JoinUserToOwnRoom = async (socket: CustomSocket, next: (err?: ExtendedError | undefined) => void) => {
    if (!socket.user || socket.user === null) {
        next(new Error("Not Authorized"));
    } else {
        // const userRooms = Array.from(socket.rooms);
        // if (!userRooms.includes(socket.user.socket_id)) {
        //     socket.join(socket.user.socket_id);
        //     console.log('user joined the call server');
        // }
        next()
    }

}
export const flushAllData = async (io: ChatNamespace, socket: CustomSocket) => {
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
    console.log(user);

    // const JsonFriend = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1)
    // const friendList = JsonFriend?.map((each) => JSON.parse(each));
    socket.emit("get_friends", user)
}

export const createConnection = async (socket: CustomSocket, userIds: string[], connType: ConnectionType, ConnectionInfo: any, callback: any) => {
    try {
        let newConnection;

        switch (connType) {
            case "onetoone":
                const friend = await UserModel.findOne({ _id: userIds[0] });
                if (!friend) {
                    callback({ error: `No user exists ` })
                    return
                }
                const existingConnection = await Connection.findOne({
                    conn_type: "onetoone",
                    users: { $all: [userIds[0], socket.user._id?.toString()] } // Check both users exist in the same connection
                });

                if (existingConnection) {
                    callback({ error: "Connection already exists" });
                    return;
                }
                newConnection = new Connection({
                    room_id: new Types.ObjectId().toString(),
                    conn_type: 'onetoone',
                    users: [userIds[0], socket.user._id],
                    admins: [socket.user._id],
                    createdBy: socket.user._id
                });
                await newConnection.save();
                callback({ success: "Connection created success" });
                break;
            case "group":
                newConnection = new Connection({
                    room_id: new Types.ObjectId().toString(),
                    conn_type: 'group',
                    users: [...userIds, socket.user._id],
                    admins: [socket.user._id],
                    conn_name: ConnectionInfo.conn_name,
                    about: ConnectionInfo.about,
                    createdBy: socket.user._id

                });
                await newConnection.save();
                callback({ success: `${connType} created successfully` })
                break;
            default:
                break;
        }
        socket.to(userIds).emit("new_connection", newConnection)
    } catch (error: any) {
        callback({ error: `error while creating the ${connType}` })
    }
}
export const getFriends = async (socket: CustomSocket, io: ChatNamespace, user: any) => {
    const currFrndList = await redisClient.lRange(`friends:${user?.socket_id}`, 0, -1)
    const friendList = currFrndList?.map((each) => JSON.parse(each));
    socket.emit("get_friends", friendList)
}

export const sendMessage = async (io: ChatNamespace, socket: CustomSocket, data: any, callback: any) => {
    try {
        // const receiverSocket = await io.to(data.recieverId).fetchSockets();
        const message = await dbCalls.createMessage(data)
        callback({ ...message.toJSON(), send: true, isMyMsg: true })
        socket.to(data.room_id).emit("recieve_message", { ...message.toJSON(), send: true, isMyMsg: false });
    } catch (error) {
        callback({ error: "Error while sending message." })
        console.error("Error sending message:", error);
    }
}
export const removeMessage = async (io: ChatNamespace, socket: CustomSocket, data: any) => {
    const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
    let recieverKey = `sender:${data.recieverId}-reciever:${data.senderId}`;
    const { users, ...dataWithoutUsers } = data;
    const senderMsg = JSON.stringify(dataWithoutUsers);
    const recieverMsg = JSON.stringify({ ...dataWithoutUsers, right: false });

    try {
        // Send message to receiver via socket
        socket.to(data.recieverId).emit("recieve_message", data);

        // Remove message from Redis after processing
        // LREM expects: key, count (number of occurrences to remove), element (message)
        await redisClient.LREM(senderKey, 1, senderMsg);  // Removes 1 occurrence of senderMsg
        await redisClient.LREM(recieverKey, 1, recieverMsg);  // Removes 1 occurrence of recieverMsg

    } catch (error) {
        console.error("Error removing message:", error);
    }
};


export const createGroup = async (io: ChatNamespace, socket: CustomSocket, group: any) => {
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
            // const isUserInRoom = io.sockets.adapter.rooms.has(userSocketId);
            // console.log(isUserInRoom, user?.name);

            const msgObj = {
                message: `${socket.user.name ? socket.user.name : socket.user.mobile} added ${user.name ? user.name : user.mobile} to the group`,
                msgType: "notification",
                conn_type: "group",
                recieverId: group.socket_id,
                date: new Date().toISOString(),
                right: false,
                seen: false,
            }
            // if (isUserInRoom) {
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
            // } else {
            //     console.error(`User with ID ${userSocketId} is not a Socket.`);
            // }
        } catch (error) {
            console.error("Error handling user:", error);
        }
    }
    socket.to(group.socket_id).emit("recieve_message", grpCreateAck)


    // const createdGroups = await redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    // const groupList = createdGroups?.map((each) => JSON.parse(each));

};

export const editMessage = async (io: ChatNamespace, socket: CustomSocket, data: any, callback: any) => {
    if (data.isMyMsg === true) {
        const updatedMessage = await ChatModel.findByIdAndUpdate(
            data._id,
            {
                message: data.message,
                date: new Date().toISOString()
            },
            { new: true }
        );
        callback({ ...updatedMessage?.toJSON(), send: true, isMyMsg: true })
        socket.broadcast.to(data.room_id).emit("update_msg", { ...updatedMessage?.toJSON(), send: true, isMyMsg: false })


    }
}
export const deleteMessage = async (io: ChatNamespace, socket: CustomSocket, data: any, callback: any) => {
    if (data.isMyMsg === true) {
        const updatedMessage = await ChatModel.findByIdAndUpdate(
            data._id,
            {
                message: 'This message is deleted.',
                date: new Date().toISOString(),
            },
            { new: true }
        );
        callback({ ...updatedMessage?.toJSON(), send: true, isMyMsg: true })
        socket.broadcast.to(data.room_id).emit("delete_msg", { ...updatedMessage?.toJSON(), send: true, isMyMsg: false })
    }
}
export const onlineStatus = async (data: any, callback: any) => {
    const userStatus = await redisClient.hGet(`userId${data.user_id}`, 'connected')

    if (data.user_id) {
        await ChatModel.updateMany(
            { "sender.id": data.user_id, room_id: new Types.ObjectId(data.room_id) },
            { seen: true },
        );
    }

    callback({ ...data, online_status: userStatus === 'true' ? true : false })
}
export const onDisconnect = async (socket: CustomSocket) => {
    console.log("disconnecting.", socket.user.name);
    await redisClient.hSet(`userId${socket.user?._id}`, 'connected', 'false');
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

