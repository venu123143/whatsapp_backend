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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllMessages = exports.updateSeen = exports.onDisconnect = exports.onlineStatus = exports.createGroup = exports.sendMessage = exports.getFriends = exports.addFriend = exports.userConnected = exports.authorizeUser = void 0;
const index_1 = require("../index");
const authorizeUser = (socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!socket.user) {
        next(new Error("Not Authorized"));
    }
    else {
        yield index_1.redisClient.hSet(`userId${socket.user.socket_id}`, { "userId": socket.user.socket_id.toString(), "connected": "true" });
        const JsonFriend = yield index_1.redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
        const friendList = JsonFriend === null || JsonFriend === void 0 ? void 0 : JsonFriend.map((each) => {
            const parseUser = JSON.parse(each);
            return parseUser;
        });
        socket.emit("get_friends", friendList);
        socket.join(socket.user.socket_id);
        next();
    }
});
exports.authorizeUser = authorizeUser;
const userConnected = (io, socket) => __awaiter(void 0, void 0, void 0, function* () {
    const rooms = io.sockets.adapter.rooms;
    const userSocket = rooms.get(socket.user.socket_id);
    console.log(`${socket.user.name} `, userSocket);
});
exports.userConnected = userConnected;
const addFriend = (socket, user) => __awaiter(void 0, void 0, void 0, function* () {
    const friendListKey = `friends:${socket.user.socket_id}`;
    const currFrndList = yield index_1.redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    const existingUserIndex = currFrndList.findIndex(each => {
        const parsedUser = JSON.parse(each);
        return parsedUser.socket_id === user.socket_id;
    });
    const jsonStrngUser = JSON.stringify(user);
    if (existingUserIndex !== -1) {
        yield index_1.redisClient.LSET(friendListKey, existingUserIndex, jsonStrngUser);
    }
    else {
        yield index_1.redisClient.LPUSH(friendListKey, jsonStrngUser);
    }
    const JsonFriend = yield index_1.redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    const friendList = JsonFriend === null || JsonFriend === void 0 ? void 0 : JsonFriend.map((each) => JSON.parse(each));
    socket.emit("get_friends", friendList);
});
exports.addFriend = addFriend;
const getFriends = (socket, io, user) => __awaiter(void 0, void 0, void 0, function* () {
    const currFrndList = yield index_1.redisClient.lRange(`friends:${user.socket_id}`, 0, -1);
    const friendList = currFrndList === null || currFrndList === void 0 ? void 0 : currFrndList.map((each) => JSON.parse(each));
    socket.emit("get_friends", friendList);
});
exports.getFriends = getFriends;
const sendMessage = (io, socket, data) => __awaiter(void 0, void 0, void 0, function* () {
    const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
    const recieverKey = `sender:${data.recieverId}-reciever:${data.senderId}`;
    const senderMsg = JSON.stringify(data);
    const recieverMsg = JSON.stringify(Object.assign(Object.assign({}, data), { right: false }));
    try {
        const receiverSocket = yield io.to(data.recieverId).fetchSockets();
        const senderIdSocket = yield io.to(data.senderId).fetchSockets();
        if (receiverSocket.length > 0 && senderIdSocket.length > 0) {
            yield index_1.redisClient.LPUSH(senderKey, senderMsg);
            yield index_1.redisClient.LPUSH(recieverKey, recieverMsg);
            socket.to(data.recieverId).emit("recieve_message", data);
        }
        else {
            console.error(`Receiver socket with ID ${data.recieverId} not found.`);
        }
        const JsonFriend = yield index_1.redisClient.lRange(senderKey, 0, -1);
        console.log(JsonFriend);
    }
    catch (error) {
        console.error("Error sending message:", error);
    }
});
exports.sendMessage = sendMessage;
const createGroup = (io, socket, group) => __awaiter(void 0, void 0, void 0, function* () {
    const jsonStrngGrp = JSON.stringify(group);
    const users = group.users;
    yield Promise.all(users.map((user) => __awaiter(void 0, void 0, void 0, function* () {
        yield index_1.redisClient.LPUSH(`friends:${user.socket_id}`, jsonStrngGrp);
    })));
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
            };
            if (isUserInRoom) {
                let userSocket = yield io.to(userSocketId).fetchSockets();
                if (userSocket.length !== 0) {
                    userSocket[0].join(group.socket_id);
                    socket.to(group.socket_id).emit("recieve_message", msgObj);
                    console.log(`User ${userSocketId} joined group room ${group.socket_id}`);
                }
                else {
                    console.warn(`User with ID ${userSocketId} is not connected.`);
                }
            }
            else {
                console.error(`User with ID ${userSocketId} is not a Socket.`);
            }
        }
        catch (error) {
            console.error("Error handling user:", error);
        }
    }
    const createdGroups = yield index_1.redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    const groupList = createdGroups === null || createdGroups === void 0 ? void 0 : createdGroups.map((each) => JSON.parse(each));
    socket.emit("get_friends", groupList);
    const msgObj = {
        message: `${group.name} group was created by ${socket.user.name} `,
        msgType: "notification",
        conn_type: "group",
        recieverId: group.socket_id,
        date: new Date().toISOString(),
        right: false,
    };
    socket.to(group.socket_id).emit("recieve_message", msgObj);
});
exports.createGroup = createGroup;
const onlineStatus = (io, socket, data) => __awaiter(void 0, void 0, void 0, function* () {
    const userStatus = yield index_1.redisClient.hGet(`userId${data.recieverId}`, 'connected');
    const status = { recieverId: data.recieverId, status: userStatus };
    io.to(data.senderId).emit('user_status', status);
});
exports.onlineStatus = onlineStatus;
const onDisconnect = (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("disconnecting.");
    yield index_1.redisClient.hSet(`userId${socket.user.socket_id}`, { "userId": socket.user.socket_id.toString(), "connected": "false" });
    socket.user = null;
});
exports.onDisconnect = onDisconnect;
const updateSeen = (socket, user) => __awaiter(void 0, void 0, void 0, function* () {
    user.seen = true;
    socket.to(user.senderId).emit("update_view", user);
});
exports.updateSeen = updateSeen;
const getAllMessages = (io, socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("calling");
    const currFrndList = yield index_1.redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    console.log(currFrndList);
    const friendList = currFrndList === null || currFrndList === void 0 ? void 0 : currFrndList.map((each) => JSON.parse(each));
    console.log(friendList);
    const res = yield friendList.map((friend) => __awaiter(void 0, void 0, void 0, function* () {
        const senderKey = `sender:${socket.user.socket_id}-reciever:${friend.socket_id}`;
        const userChat = yield index_1.redisClient.lRange(senderKey, 0, -1);
        const curr_chat = userChat === null || userChat === void 0 ? void 0 : userChat.map((each) => JSON.parse(each));
        const lastMessageIndex = curr_chat.length - 1;
        const lastMessage = lastMessageIndex >= 0 ? curr_chat[lastMessageIndex] : null;
        console.log(userChat, curr_chat, lastMessage);
        return Object.assign(Object.assign({}, friend), { chat: curr_chat, last_message: lastMessage });
    }));
    console.log(res);
    socket.emit("get_all_messages_on_reload", res);
});
exports.getAllMessages = getAllMessages;
