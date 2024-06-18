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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSeen = exports.onDisconnect = exports.onlineStatus = exports.editMessage = exports.deleteMessage = exports.createGroup = exports.sendMessage = exports.getFriends = exports.addFriend = exports.flushAllData = exports.JoinUserToOwnRoom = exports.authorizeUser = exports.getAllMessages = void 0;
const session_1 = require("../utils/session");
const getAllMessages = (socket) => __awaiter(void 0, void 0, void 0, function* () {
    const currFrndList = yield session_1.redisClient.lRange(`friends:${socket.user.socket_id}`, 0, -1);
    const friendList = currFrndList === null || currFrndList === void 0 ? void 0 : currFrndList.map((each) => JSON.parse(each));
    const res = yield Promise.all(friendList.map((friend) => __awaiter(void 0, void 0, void 0, function* () {
        const senderKey = `sender:${socket.user.socket_id}-reciever:${friend.socket_id}`;
        const userChat = yield session_1.redisClient.lRange(senderKey, 0, -1);
        if (friend.users && friend.users.length > 0) {
            socket.join(friend.socket_id);
        }
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
        yield session_1.redisClient.hSet(`userId${(_a = socket === null || socket === void 0 ? void 0 : socket.user) === null || _a === void 0 ? void 0 : _a.socket_id}`, { "userId": (_b = socket === null || socket === void 0 ? void 0 : socket.user) === null || _b === void 0 ? void 0 : _b.socket_id.toString(), "connected": "true" });
        const userRooms = Array.from(socket.rooms);
        if (!userRooms.includes(socket.user.socket_id)) {
            socket.join(socket.user.socket_id);
        }
        yield (0, exports.getAllMessages)(socket);
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
    socket.emit("get_friends", user);
});
exports.addFriend = addFriend;
const getFriends = (socket, io, user) => __awaiter(void 0, void 0, void 0, function* () {
    const currFrndList = yield session_1.redisClient.lRange(`friends:${user === null || user === void 0 ? void 0 : user.socket_id}`, 0, -1);
    const friendList = currFrndList === null || currFrndList === void 0 ? void 0 : currFrndList.map((each) => JSON.parse(each));
    socket.emit("get_friends", friendList);
});
exports.getFriends = getFriends;
const sendMessage = (io, socket, data) => __awaiter(void 0, void 0, void 0, function* () {
    const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
    let recieverKey = `sender:${data.recieverId}-reciever:${data.senderId}`;
    const { users } = data, dataWithoutUsers = __rest(data, ["users"]);
    const senderMsg = JSON.stringify(dataWithoutUsers);
    const recieverMsg = JSON.stringify(Object.assign(Object.assign({}, dataWithoutUsers), { right: false }));
    try {
        socket.to(data.recieverId).emit("recieve_message", data);
        yield session_1.redisClient.LPUSH(senderKey, senderMsg);
        if (data.conn_type === 'group') {
            for (const user of data.users) {
                if (user.socket_id !== socket.user.socket_id) {
                    recieverKey = `sender:${user.socket_id}-reciever:${data.recieverId}`;
                    yield session_1.redisClient.LPUSH(recieverKey, recieverMsg);
                }
            }
        }
        else {
            yield session_1.redisClient.LPUSH(recieverKey, recieverMsg);
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
        yield session_1.redisClient.LPUSH(`friends:${user.socket_id}`, jsonStrngGrp);
        yield session_1.redisClient.LPUSH(senderKey, createAck);
    })));
    io.to(socket.user.socket_id).emit("get_friends", group);
    for (const user of group.users) {
        try {
            const userSocketId = user.socket_id;
            const isUserInRoom = io.sockets.adapter.rooms.has(userSocketId);
            console.log(isUserInRoom, user === null || user === void 0 ? void 0 : user.name);
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
                    socket.to(group.socket_id).emit("recieve_message", msgObj);
                }
                const senderKey = `sender:${user.socket_id}-reciever:${group.socket_id}`;
                yield session_1.redisClient.LPUSH(senderKey, JSON.stringify(msgObj));
                console.log(`User ${userSocketId} joined group room ${group.socket_id}`);
            }
            else {
                console.error(`User with ID ${userSocketId} is not a Socket.`);
            }
        }
        catch (error) {
            console.error("Error handling user:", error);
        }
    }
    socket.to(group.socket_id).emit("recieve_message", grpCreateAck);
});
exports.createGroup = createGroup;
const deleteMessage = (io, socket, data) => __awaiter(void 0, void 0, void 0, function* () {
    const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
    const messageToRemove = JSON.stringify(data);
    session_1.redisClient.LREM(senderKey, 0, messageToRemove);
});
exports.deleteMessage = deleteMessage;
const editMessage = (io, socket, data) => __awaiter(void 0, void 0, void 0, function* () {
    if (data.right === true) {
        const { users } = data, withOutIndex = __rest(data, ["users"]);
        const senderKey = `sender:${data.senderId}-reciever:${data.recieverId}`;
        let recieverKey = `sender:${data.recieverId}-reciever:${data.senderId}`;
        const currentChat = yield session_1.redisClient.lRange(senderKey, 0, -1);
        const msgIndex = currentChat.findIndex(each => JSON.parse(each).date === data.date);
        yield session_1.redisClient.LSET(senderKey, msgIndex, JSON.stringify(withOutIndex));
        if (data.conn_type === 'group') {
            for (const user of users) {
                if (user.socket_id !== socket.user.socket_id) {
                    recieverKey = `sender:${user.socket_id}-reciever:${data.recieverId}`;
                    const currentChat = yield session_1.redisClient.lRange(recieverKey, 0, -1);
                    const recMsgIndex = currentChat.findIndex(each => JSON.parse(each).date === data.date);
                    yield session_1.redisClient.LSET(recieverKey, recMsgIndex, JSON.stringify(Object.assign(Object.assign({}, withOutIndex), { right: false })));
                }
            }
        }
        else {
            const currentChat = yield session_1.redisClient.lRange(recieverKey, 0, -1);
            const recMsgIndex = currentChat.findIndex(each => JSON.parse(each).date === data.date);
            yield session_1.redisClient.LSET(recieverKey, recMsgIndex, JSON.stringify(Object.assign(Object.assign({}, withOutIndex), { right: false })));
        }
        const updatedChatSender = yield session_1.redisClient.lRange(senderKey, 0, -1);
        const updatedChatReciever = yield session_1.redisClient.lRange(recieverKey, 0, -1);
        const recChat = updatedChatReciever.map(each => JSON.parse(each)).reverse();
        socket.to(data.recieverId).emit("update_msg", recChat);
        const sendChat = updatedChatSender.map(each => JSON.parse(each)).reverse();
        io.to(data.senderId).emit("update_msg", sendChat);
    }
});
exports.editMessage = editMessage;
const onlineStatus = (io, socket, data) => __awaiter(void 0, void 0, void 0, function* () {
    const userStatus = yield session_1.redisClient.hGet(`userId${data.recieverId}`, 'connected');
    const status = { recieverId: data.recieverId, status: userStatus };
    io.to(data.senderId).emit('user_status', status);
});
exports.onlineStatus = onlineStatus;
const onDisconnect = (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("disconnecting.", socket.user.name);
    yield session_1.redisClient.hSet(`userId${socket.user.socket_id}`, { "userId": socket.user.socket_id.toString(), "connected": "false" });
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
