
// let ip = process.env.IP as any
// const newServer = server.listen(port, ip, () => {
//     console.log(`server is running on port http://${ip}:${port}`);
// });
import fs from "fs"
import { createClient } from "redis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import express, { Application } from "express";
import http from "http";
import "dotenv/config";
import session from "./utils/session";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import morgan from "morgan";
import "./config/db";
import ErrorHandler from "./middleware/Errors";
import UserRouter from "./routes/UserRoute";
import MsgRouter from "./routes/MessageRoute";
import groupRoutes from "./routes/GroupRoute";
import CallsRouter from "./routes/CallsRoute";
import {
    authorizeUser, CustomSocket, flushAllData,
    sendMessage, createGroup, updateSeen, getFriends,
    addFriend, onDisconnect, onlineStatus, getAllMessages, editMessage,
    JoinUserToOwnRoom,
    createConnection,
    deleteMessage
} from "./controllers/SocketController";
import { socketMiddleware } from "./config/ConnectSession"

import { instrument } from "@socket.io/admin-ui";
import { ConnectionType } from "models/Connection";

// Handle uncaught Exception
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    console.log(`shutting down the server for handling uncaught Exception`);
    process.exit(1);
});

const app: Application = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", 'https://admin.socket.io', 'https://whatsapp-chat-imbu.onrender.com'],
        credentials: true,
    }
});
const callsNamespace = io.of("/calls");
const chatNamespace = io.of("/chat");

// CORS, JSON, and cookie-parser
const options: CorsOptions = {
    origin: ['http://localhost:5173', 'http://192.168.0.175:5173', 'http://192.168.1.37:5173', 'https://whatsapp-chat-imbu.onrender.com'],
    credentials: true,
    exposedHeaders: ["sessionID", "sessionId", "sessionid"]
};
app.use(cors(options));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(session);
chatNamespace.use(socketMiddleware);
chatNamespace.use(authorizeUser);
callsNamespace.use(socketMiddleware);
callsNamespace.use(JoinUserToOwnRoom);

app.get('/', (req, res) => {
    res.send('backend home route successful');
});

app.use("/api/users", UserRouter);
app.use("/api/msg", MsgRouter);
app.use('/api/groups', groupRoutes);
app.use('/api/calls', CallsRouter);

app.use(ErrorHandler);

const port = process.env.PORT || 5000;
const newServer = server.listen(port, () => {
    console.log(`Server is running on port number ${port}`);
});

instrument(io, { auth: false });

// Unhandled promise rejection
process.on("unhandledRejection", (err: Error) => {
    console.error("Unhandled Rejection:", err);
    newServer.close(() => {
        process.exit(1);
    });
});

// // Redis client and adapter
// const pubClient = createClient({ url: process.env.REDIS_ADAPTOR });
// const subClient = pubClient.duplicate();

// let redisConnected = false;

// async function connectRedis() {
//     if (redisConnected) return;
//     try {
//         await pubClient.connect();
//         await subClient.connect();
//         redisConnected = true;
//         console.log("Redis adapter connected");

//         io.adapter(createAdapter(pubClient, subClient));
//         const info = await pubClient.info('memory');
//         const usedMemory = parseInt(info.split('\r\n').find(line => line.startsWith('used_memory:'))?.split(':')[1] || '0');
//         console.log(`Redis memory usage: ${usedMemory} bytes`);
//     } catch (err) {
//         console.error("Redis adapter error:", err);
//     }
// }

// connectRedis();

chatNamespace.on("connect", async (socket: CustomSocket) => {
    console.log(`user ${socket?.user?.name} with UUID:- ${socket?.user?.socket_id} is connected`);

    socket.on('create_connection', (userIds: string[], connType: ConnectionType, ConnectionInfo: any, callback: any) => {
        createConnection(socket, userIds, connType, ConnectionInfo, callback);
    });

    // socket.on('get_frnds_on_reload', (user) => {
    //     getFriends(socket, chatNamespace, user);
    // });

    socket.on('online_status', (data: any, callback: any) => {
        onlineStatus(data, callback);
    });

    socket.on("send_message", (data: any, callback: any) => {
        sendMessage(chatNamespace, socket, data, callback);
    });

    socket.on("edit_message", (data: any, callback) => {
        editMessage(chatNamespace, socket, data, callback);
    });
    socket.on("delete_message", (data: any, callback) => {
        deleteMessage(chatNamespace, socket, data, callback);
    });

    socket.on("get_all_messages", async (input: any, callback: any) => {
        if (typeof callback === 'function') {
            await getAllMessages(socket, callback);
        } else {
            console.error("Callback is not a function");
        }
    });



    socket.on("create_group", (group: any) => {
        createGroup(chatNamespace, socket, group);
    });

    socket.on("update_seen", (msg) => {
        updateSeen(socket, msg);
    });

    socket.on("disconnecting", () => onDisconnect(socket));
});

callsNamespace.on("connect", async (socket: CustomSocket) => {
    console.log(`calls namespace is connected with id: ${socket.id}`);

    socket.on('ice-candidate-offer', (data) => {
        socket.to(data.to).emit("ice-candidate-offer", { candidate: data.candidate, from: socket.user.socket_id });
    });

    socket.on('ice-candidate-answer', (data) => {
        socket.to(data.to).emit("ice-candidate-answer", { candidate: data.candidate, from: socket.user.socket_id });
    });

    socket.on("call-offer", (data) => {
        socket.to(data.to).emit("call-offer", { offer: data.offer, from: socket.user._id });
    });

    socket.on("call-answer", (data) => {
        socket.to(data.to).emit("call-answer", { answer: data.answer, from: socket.user.socket_id });
    });

    socket.on("stop-call", (data) => {
        socket.to(data.to).emit("stop-call", { from: socket.user.socket_id });
    });
});

