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
exports.updateSeen = exports.onDisconnect = exports.onlineStatus = exports.createGroup = exports.sendMessage = exports.getFriends = exports.addFriend = exports.flushAllData = exports.authorizeUser = exports.getAllMessages = void 0;
const index_1 = require("../index");
const getAllMessages = (socket) => __awaiter(void 0, void 0, void 0, function* () {
    const currFrndList = yield index_1.redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    const friendList = currFrndList === null || currFrndList === void 0 ? void 0 : currFrndList.map((each) => JSON.parse(each));
    console.log("calling getAAll Meags");
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
const authorizeUser = (socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!socket.user || socket.user === null) {
        next(new Error("Not Authorized"));
    }
    else {
        console.log("called socket.join() ");
        yield index_1.redisClient.hSet(`userId${(_a = socket === null || socket === void 0 ? void 0 : socket.user) === null || _a === void 0 ? void 0 : _a.socket_id}`, { "userId": (_b = socket === null || socket === void 0 ? void 0 : socket.user) === null || _b === void 0 ? void 0 : _b.socket_id.toString(), "connected": "true" });
        const userRooms = Array.from(socket.rooms);
        if (!userRooms.includes(socket.user.socket_id)) {
            console.log("inside calling join");
            socket.join(socket.user.socket_id);
        }
        yield (0, exports.getAllMessages)(socket);
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
    socket.emit("get_friends", user);
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
    console.log(data);
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
        yield index_1.redisClient.LPUSH(`friends:${user.socket_id}`, jsonStrngGrp);
        yield index_1.redisClient.LPUSH(senderKey, createAck);
    })));
    io.to(socket.user.socket_id).emit("get_friends", group);
    socket.to(group.socket_id).emit("recieve_message", grpCreateAck);
    for (const user of group.users) {
        try {
            const userSocketId = user.socket_id;
            const isUserInRoom = io.sockets.adapter.rooms.has(userSocketId);
            const msgObj = {
                message: `${socket.user.name ? socket.user.name : socket.user.mobile} added ${user.name ? user.name : user.mobile} to the group`,
                msgType: "notification",
                conn_type: "group",
                recieverId: group.socket_id,
                date: new Date().toISOString(),
                right: false,
                seen: false,
            };
            if (isUserInRoom) {
                let userSocket = yield io.to(userSocketId).fetchSockets();
                if (userSocket.length !== 0) {
                    userSocket[0].join(group.socket_id);
                    socket.to(user.socket_id).emit("get_friends", group);
                    const senderKey = `sender:${user.socket_id}-reciever:${group.socket_id}`;
                    yield index_1.redisClient.LPUSH(senderKey, JSON.stringify(msgObj));
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
        msg.right = true;
        socket.to(msg.senderId).emit("update_view", msg);
        const senderKey = `sender:${msg.senderId}-reciever:${msg.recieverId}`;
        const senderKeyList = yield index_1.redisClient.lRange(senderKey, 0, -1);
        const messageIndex = senderKeyList.findIndex(each => JSON.parse(each).date === msg.date);
        if (messageIndex !== -1) {
            const updatedMsg = JSON.parse(senderKeyList[messageIndex]);
            updatedMsg.seen = true;
            updatedMsg.right = true;
            const jsonStrngMsg = JSON.stringify(updatedMsg);
            yield index_1.redisClient.LSET(senderKey, messageIndex, jsonStrngMsg);
        }
    }
});
exports.updateSeen = updateSeen;
