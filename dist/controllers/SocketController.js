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
exports.getAllMessages = exports.updateSeen = exports.onDisconnect = exports.onlineStatus = exports.createGroup = exports.sendMessage = exports.getFriends = exports.addFriend = exports.flushAllData = exports.authorizeUser = void 0;
const index_1 = require("../index");
const authorizeUser = (socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    if (!socket.user) {
        next(new Error("Not Authorized"));
    }
    else {
        yield index_1.redisClient.hSet(`userId${(_a = socket === null || socket === void 0 ? void 0 : socket.user) === null || _a === void 0 ? void 0 : _a.socket_id}`, { "userId": (_b = socket === null || socket === void 0 ? void 0 : socket.user) === null || _b === void 0 ? void 0 : _b.socket_id.toString(), "connected": "true" });
        const JsonFriend = yield index_1.redisClient.lRange(`friends:${(_c = socket === null || socket === void 0 ? void 0 : socket.user) === null || _c === void 0 ? void 0 : _c.socket_id}`, 0, -1);
        const friendList = JsonFriend === null || JsonFriend === void 0 ? void 0 : JsonFriend.map((each) => {
            const parseUser = JSON.parse(each);
            return parseUser;
        });
        socket.emit("get_friends", friendList);
        socket.join((_d = socket === null || socket === void 0 ? void 0 : socket.user) === null || _d === void 0 ? void 0 : _d.socket_id);
        next();
    }
});
exports.authorizeUser = authorizeUser;
const flushAllData = (io, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield index_1.redisClient.flushAll();
        console.log("All data flushed successfully.");
    }
    catch (error) {
        console.error("Error flushing data:", error);
    }
});
exports.flushAllData = flushAllData;
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
    const currFrndList = yield index_1.redisClient.lRange(`friends:${user === null || user === void 0 ? void 0 : user.socket_id}`, 0, -1);
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
const updateSeen = (socket, unread) => __awaiter(void 0, void 0, void 0, function* () {
    for (let i = 0; i < unread.length; i++) {
        let msg = unread[i];
        msg.seen = true;
        socket.to(msg.senderId).emit("update_view", msg);
        const senderKey = `sender:${msg.senderId}-reciever:${msg.recieverId}`;
        const senderKeyList = yield index_1.redisClient.lRange(senderKey, 0, -1);
        const messageIndex = senderKeyList.findIndex(each => JSON.parse(each).senderId === msg.senderId);
        console.log(JSON.parse(senderKeyList[messageIndex]));
        if (messageIndex !== -1) {
            const updatedMsg = JSON.parse(senderKeyList[messageIndex]);
            updatedMsg.seen = true;
            const jsonStrngMsg = JSON.stringify(updatedMsg);
            yield index_1.redisClient.LSET(senderKey, messageIndex, jsonStrngMsg);
        }
        const doneKey = yield index_1.redisClient.lRange(senderKey, 0, -1);
        console.log(JSON.parse(doneKey[messageIndex]));
    }
});
exports.updateSeen = updateSeen;
const getAllMessages = (io, socket) => __awaiter(void 0, void 0, void 0, function* () {
    const currFrndList = yield index_1.redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    const friendList = currFrndList === null || currFrndList === void 0 ? void 0 : currFrndList.map((each) => JSON.parse(each));
    const res = yield Promise.all(friendList.map((friend) => __awaiter(void 0, void 0, void 0, function* () {
        const senderKey = `sender:${socket.user.socket_id}-reciever:${friend.socket_id}`;
        const userChat = yield index_1.redisClient.lRange(senderKey, 0, -1);
        const curr_chat = userChat === null || userChat === void 0 ? void 0 : userChat.map((each) => JSON.parse(each)).reverse();
        const lastMessageIndex = curr_chat.length - 1;
        const lastMessage = lastMessageIndex >= 0 ? curr_chat[lastMessageIndex] : null;
        return Object.assign(Object.assign({}, friend), { chat: curr_chat, lastMessage: lastMessage });
    })));
    const sortedRes = res.sort((a, b) => {
        const lastMessageA = a.lastMessage;
        const lastMessageB = b.lastMessage;
        if (!lastMessageA && !lastMessageB) {
            return 0;
        }
        else if (!lastMessageA) {
            return 1;
        }
        else if (!lastMessageB) {
            return -1;
        }
        else {
            return new Date(lastMessageB.date).getTime() - new Date(lastMessageA.date).getTime();
        }
    });
    socket.emit("get_all_messages_on_reload", sortedRes);
});
exports.getAllMessages = getAllMessages;
