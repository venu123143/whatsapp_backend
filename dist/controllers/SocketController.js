"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSeen = exports.onDisconnect = exports.onlineStatus = exports.deleteMessage = exports.editMessage = exports.createGroup = exports.removeMessage = exports.sendMessage = exports.getFriends = exports.createConnection = exports.addFriend = exports.flushAllData = exports.JoinUserToOwnRoom = exports.authorizeUser = exports.getAllMessages = void 0;
const session_1 = require("../utils/session");
const dbCalls_1 = __importDefault(require("../database/dbCalls"));
const mongoose_1 = require("mongoose");
const Connection_1 = __importDefault(require("../models/Connection"));
const ChatModel_1 = __importDefault(require("../models/ChatModel"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
const getAllMessages = (socket, callback) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const currentUser = socket.user;
        const aggrigateQuery = [
            {
                $match: {
                    users: new mongoose_1.Types.ObjectId(currentUser._id),
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "users",
                    foreignField: "_id",
                    as: "usersData"
                }
            },
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
            {
                $addFields: {
                    lastMessage: {
                        $arrayElemAt: ["$messages", -1]
                    }
                }
            },
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
                                                $ne: ["$$this._id", new mongoose_1.Types.ObjectId(currentUser._id)]
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
                                                { $ne: ["$$this.sender.id", currentUser._id] }
                                            ]
                                        }
                                    }
                                }
                            },
                            else: "$unreadCount"
                        }
                    }
                }
            },
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
            {
                $sort: { "lastMessage.date": -1 }
            },
            {
                $limit: 100
            }
        ];
        const connections = yield Connection_1.default.aggregate(aggrigateQuery);
        const roomIds = connections.map((conn) => conn.room_id);
        socket.join(roomIds);
        yield session_1.redisClient.hSet(`userId${(_a = socket.user) === null || _a === void 0 ? void 0 : _a._id}`, 'connected', 'true');
        callback({
            status: true,
            connections: connections
        });
    }
    catch (error) {
        console.error("Error fetching connections and messages:", error);
        callback({
            status: false,
            error: "Failed to fetch connections and messages"
        });
    }
});
exports.getAllMessages = getAllMessages;
const authorizeUser = (socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    if (!socket.user || socket.user === null) {
        next(new Error("Not Authorized"));
    }
    else {
        yield session_1.redisClient.hSet(`userId${(_b = socket === null || socket === void 0 ? void 0 : socket.user) === null || _b === void 0 ? void 0 : _b.socket_id}`, { "userId": (_c = socket === null || socket === void 0 ? void 0 : socket.user) === null || _c === void 0 ? void 0 : _c.socket_id.toString(), "connected": "true" });
        const userRooms = Array.from(socket.rooms);
        if (!userRooms.includes(socket.user.socket_id)) {
            socket.join(socket.user.socket_id);
        }
        next();
    }
});
exports.authorizeUser = authorizeUser;
const JoinUserToOwnRoom = (socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!socket.user || socket.user === null) {
        next(new Error("Not Authorized"));
    }
    else {
        const userRooms = Array.from(socket.rooms);
        if (!userRooms.includes(socket.user.socket_id)) {
            socket.join(socket.user.socket_id);
            console.log('user joined the call server');
        }
        next();
    }
});
exports.JoinUserToOwnRoom = JoinUserToOwnRoom;
const flushAllData = (io, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield session_1.redisClient.flushAll();
        console.log("All data flushed successfully.");
    }
    catch (error) {
        console.error("Error flushing data:", error);
    }
});
exports.flushAllData = flushAllData;
const addFriend = (socket, user) => __awaiter(void 0, void 0, void 0, function* () {
    const friendListKey = `friends:${socket.user.socket_id}`;
    const currFrndList = yield session_1.redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    const existingUserIndex = currFrndList.findIndex(each => {
        const parsedUser = JSON.parse(each);
        return parsedUser.socket_id === user.socket_id;
    });
    const jsonStrngUser = JSON.stringify(user);
    if (existingUserIndex !== -1) {
        yield session_1.redisClient.LSET(friendListKey, existingUserIndex, jsonStrngUser);
    }
    else {
        yield session_1.redisClient.LPUSH(friendListKey, jsonStrngUser);
    }
    console.log(user);
    socket.emit("get_friends", user);
});
exports.addFriend = addFriend;
const createConnection = (socket, userIds, connType, ConnectionInfo, callback) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let newConnection;
        switch (connType) {
            case "onetoone":
                const friend = yield UserModel_1.default.findOne({ _id: userIds[0] });
                if (!friend) {
                    callback({ error: `No user exists ` });
                    return;
                }
                newConnection = new Connection_1.default({
                    room_id: new mongoose_1.Types.ObjectId().toString(),
                    conn_type: 'onetoone',
                    users: [userIds[0], socket.user._id],
                    admins: [socket.user._id],
                    createdBy: socket.user._id
                });
                yield newConnection.save();
                break;
            case "group":
                newConnection = new Connection_1.default({
                    room_id: new mongoose_1.Types.ObjectId().toString(),
                    conn_type: 'group',
                    users: [...userIds, socket.user._id],
                    admins: [socket.user._id],
                    conn_name: ConnectionInfo.conn_name,
                    about: ConnectionInfo.about,
                    createdBy: socket.user._id
                });
                yield newConnection.save();
                callback({ success: `${connType} created successfully` });
                break;
            default:
                break;
        }
        socket.to(userIds).emit("new_connection", newConnection);
    }
    catch (error) {
        callback({ error: `error while creating the ${connType}` });
    }
});
exports.createConnection = createConnection;
const getFriends = (socket, io, user) => __awaiter(void 0, void 0, void 0, function* () {
    const currFrndList = yield session_1.redisClient.lRange(`friends:${user === null || user === void 0 ? void 0 : user.socket_id}`, 0, -1);
    const friendList = currFrndList === null || currFrndList === void 0 ? void 0 : currFrndList.map((each) => JSON.parse(each));
    socket.emit("get_friends", friendList);
});
exports.getFriends = getFriends;
const sendMessage = (io, socket, data, callback) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = yield dbCalls_1.default.createMessage(data);
        callback(Object.assign(Object.assign({}, message.toJSON()), { send: true, isMyMsg: true }));
        socket.to(data.room_id).emit("recieve_message", Object.assign(Object.assign({}, message.toJSON()), { send: true, isMyMsg: false }));
    }
    catch (error) {
        callback({ error: "Error while sending message." });
        console.error("Error sending message:", error);
    }
});
exports.sendMessage = sendMessage;
const removeMessage = (io, socket, data) => __awaiter(void 0, void 0, void 0, function* () {
    const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
    let recieverKey = `sender:${data.recieverId}-reciever:${data.senderId}`;
    const { users } = data, dataWithoutUsers = __rest(data, ["users"]);
    const senderMsg = JSON.stringify(dataWithoutUsers);
    const recieverMsg = JSON.stringify(Object.assign(Object.assign({}, dataWithoutUsers), { right: false }));
    try {
        socket.to(data.recieverId).emit("recieve_message", data);
        yield session_1.redisClient.LREM(senderKey, 1, senderMsg);
        yield session_1.redisClient.LREM(recieverKey, 1, recieverMsg);
    }
    catch (error) {
        console.error("Error removing message:", error);
    }
});
exports.removeMessage = removeMessage;
const createGroup = (io, socket, group) => __awaiter(void 0, void 0, void 0, function* () {
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
    };
    const createAck = JSON.stringify(grpCreateAck);
    yield Promise.all(users.map((user) => __awaiter(void 0, void 0, void 0, function* () {
        const senderKey = `sender:${user.socket_id}-reciever:${group.socket_id}`;
        yield session_1.redisClient.LPUSH(`friends:${user.socket_id}`, jsonStrngGrp);
        yield session_1.redisClient.LPUSH(senderKey, createAck);
    })));
    io.to(socket.user.socket_id).emit("get_friends", group);
    for (const user of group.users) {
        try {
            const userSocketId = user.socket_id;
            const msgObj = {
                message: `${socket.user.name ? socket.user.name : socket.user.mobile} added ${user.name ? user.name : user.mobile} to the group`,
                msgType: "notification",
                conn_type: "group",
                recieverId: group.socket_id,
                date: new Date().toISOString(),
                right: false,
                seen: false,
            };
            let userSocket = yield io.to(userSocketId).fetchSockets();
            if (userSocket.length !== 0) {
                userSocket[0].join(group.socket_id);
                socket.to(user.socket_id).emit("get_friends", group);
                socket.to(group.socket_id).emit("recieve_message", msgObj);
            }
            const senderKey = `sender:${user.socket_id}-reciever:${group.socket_id}`;
            yield session_1.redisClient.LPUSH(senderKey, JSON.stringify(msgObj));
            console.log(`User ${userSocketId} joined group room ${group.socket_id}`);
        }
        catch (error) {
            console.error("Error handling user:", error);
        }
    }
    socket.to(group.socket_id).emit("recieve_message", grpCreateAck);
});
exports.createGroup = createGroup;
const editMessage = (io, socket, data, callback) => __awaiter(void 0, void 0, void 0, function* () {
    if (data.isMyMsg === true) {
        const updatedMessage = yield ChatModel_1.default.findByIdAndUpdate(data._id, {
            message: data.message,
            date: new Date().toISOString()
        }, { new: true });
        callback(Object.assign(Object.assign({}, updatedMessage === null || updatedMessage === void 0 ? void 0 : updatedMessage.toJSON()), { send: true, isMyMsg: true }));
        socket.broadcast.to(data.room_id).emit("update_msg", Object.assign(Object.assign({}, updatedMessage === null || updatedMessage === void 0 ? void 0 : updatedMessage.toJSON()), { send: true, isMyMsg: false }));
    }
});
exports.editMessage = editMessage;
const deleteMessage = (io, socket, data, callback) => __awaiter(void 0, void 0, void 0, function* () {
    if (data.isMyMsg === true) {
        const updatedMessage = yield ChatModel_1.default.findByIdAndUpdate(data._id, {
            message: 'This message is deleted.',
            date: new Date().toISOString(),
        }, { new: true });
        callback(Object.assign(Object.assign({}, updatedMessage === null || updatedMessage === void 0 ? void 0 : updatedMessage.toJSON()), { send: true, isMyMsg: true }));
        socket.broadcast.to(data.room_id).emit("delete_msg", Object.assign(Object.assign({}, updatedMessage === null || updatedMessage === void 0 ? void 0 : updatedMessage.toJSON()), { send: true, isMyMsg: false }));
    }
});
exports.deleteMessage = deleteMessage;
const onlineStatus = (data, callback) => __awaiter(void 0, void 0, void 0, function* () {
    const userStatus = yield session_1.redisClient.hGet(`userId${data.user_id._id}`, 'connected');
    if (data.user_id) {
        yield ChatModel_1.default.updateMany({ "sender.id": data.user_id._id, room_id: new mongoose_1.Types.ObjectId(data.room_id) }, { seen: true });
    }
    callback(Object.assign(Object.assign({}, data), { online_status: userStatus === 'true' ? true : false }));
});
exports.onlineStatus = onlineStatus;
const onDisconnect = (socket) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    console.log("disconnecting.", socket.user.name);
    yield session_1.redisClient.hSet(`userId${(_d = socket.user) === null || _d === void 0 ? void 0 : _d._id}`, 'connected', 'false');
    socket.user = null;
    socket.disconnect(true);
});
exports.onDisconnect = onDisconnect;
const updateSeen = (socket, unread) => __awaiter(void 0, void 0, void 0, function* () {
    for (let i = 0; i < unread.length; i++) {
        let msg = unread[i];
        msg.seen = true;
        msg.right = true;
        socket.to(msg.senderId).emit("update_view", msg);
        const senderKey = `sender:${msg.senderId}-reciever:${msg.recieverId}`;
        const senderKeyList = yield session_1.redisClient.lRange(senderKey, 0, -1);
        const messageIndex = senderKeyList.findIndex(each => JSON.parse(each).date === msg.date);
        if (messageIndex !== -1) {
            const updatedMsg = JSON.parse(senderKeyList[messageIndex]);
            updatedMsg.seen = true;
            updatedMsg.right = true;
            const jsonStrngMsg = JSON.stringify(updatedMsg);
            yield session_1.redisClient.LSET(senderKey, messageIndex, jsonStrngMsg);
        }
    }
});
exports.updateSeen = updateSeen;
