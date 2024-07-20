import cookieParser from "cookie-parser";
import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import morgan from "morgan";
import http from 'http'
import { Server } from "socket.io";
import { createAdapter, } from '@socket.io/redis-adapter';


// Handle uncaught Exception
process.on("uncaughtException", (err) => {
    console.log(err);

    console.log(`Error: ${err.message}`);
    console.log(`shutting down the server for handling uncaught Exception`);
});

// config env and database connection.
import "dotenv/config";
import "./config/db";

const app: Application = express();

import ErrorHandler from "./middleware/Errors"
import UserRouter from './routes/UserRoute'
import MsgRouter from './routes/MessageRoute'
import groupRoutes from './routes/GroupRoute'
import CallsRouter from './routes/CallsRoute'
import { socketMiddleware } from "./config/ConnectSession"
import {
    authorizeUser, CustomSocket, flushAllData,
    sendMessage, createGroup, updateSeen, getFriends,
    addFriend, onDisconnect, onlineStatus, getAllMessages, editMessage,
    JoinUserToOwnRoom
} from "./controllers/SocketController";
import { instrument } from "@socket.io/admin-ui"
import session from "./utils/session"
import { createClient } from "redis";
const server = http.createServer(app)
const pubClient = createClient({ url: process.env.REDIS_ADAPTOR });
const subClient = pubClient.duplicate();

let redisConnected = false;

async function connectRedis() {
    if (redisConnected) return;
    try {
        await pubClient.connect();
        await subClient.connect();
        redisConnected = true;
        console.log("Redis adapter connected");

        io.adapter(createAdapter(pubClient, subClient));
        const info = await pubClient.info('memory');
        const usedMemory = parseInt(info.split('\r\n').find(line => line.startsWith('used_memory:'))?.split(':')[1] || '0');
        console.log(`Redis memory usage: ${usedMemory} bytes`);

    } catch (err) {
        console.error("Redis adapter error:", err);
    }
}

connectRedis();
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", 'https://admin.socket.io', 'https://whatsapp-chat-imbu.onrender.com'],
        credentials: true,

    }
});

const callsNamespace = io.of("/calls");
// cors, json and cookie-parser
const options: CorsOptions = {
    origin: ['http://localhost:5173', 'http://192.168.0.175:5173', 'http://192.168.1.37:5173', 'https://whatsapp-chat-imbu.onrender.com'],
    credentials: true,
    exposedHeaders: ["sessionID", "sessionId", "sessionid"]
}
app.use(cors(options));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(express.static('../node_modules/@socket.io/admin-ui/ui/dist'))
app.use(morgan('dev'))
app.use(session)
io.use(socketMiddleware)
io.use(authorizeUser)
callsNamespace.use(socketMiddleware);
callsNamespace.use(JoinUserToOwnRoom);
   
io.on("connect", async (socket: CustomSocket) => {
    console.log(`user ${socket?.user.name} with UUID:- ${socket?.user?.socket_id} is connected`);
    // flushAllData(io, socket)
    socket.on('add_friend', (user: any) => {
        addFriend(socket, user)
    });
    socket.on('get_frnds_on_reload', (user) => {
        getFriends(socket, io, user)
    })
    socket.on('online_status', (data: any) => {
        onlineStatus(io, socket, data)
    })
    socket.on("send_message", (data: any) => {
        sendMessage(io, socket, data)
    })
    socket.on("edit_message", (data: any) => {
        editMessage(io, socket, data)
    })
    socket.on("get_all_messages", () => {
        getAllMessages(socket)
    })
    socket.on("create_group", (group: any) => {
        createGroup(io, socket, group)
    })
    socket.on("update_seen", (msg) => {
        updateSeen(socket, msg)
    })
    socket.on("disconnecting", () => onDisconnect(socket))
})

callsNamespace.on("connect", async (socket: CustomSocket) => {
    console.log(`calls name space is connected with id: ${socket.id}`);
    socket.on('ice-candidate-offer', (data) => {
        socket.to(data.to).emit("ice-candiate-offer", { candidate: data.candidate, from: socket.user.socket_id })
    });
    socket.on('ice-candidate-answer', (data) => {
        socket.to(data.to).emit("ice-candiate-answer", { candidate: data.candidate, from: socket.user.socket_id })
    });
    socket.on("call-offer", (data) => {
        socket.to(data.to).emit("call-offer", { offer: data.offer, from: socket.user._id })
    })
    socket.on("call-answer", (data) => {
        socket.to(data.to).emit("call-answer", { answer: data.answer, from: socket.user.socket_id })
    })
    socket.on("stop-call", (data) => {
        socket.to(data.to).emit("stop-call", { from: socket.user.socket_id })
    })
})
// controllers
app.get('/', (req, res) => {
    res.send('backend home route sucessful')
})

app.use("/api/users", UserRouter)
app.use("/api/msg", MsgRouter)
app.use('/api/groups', groupRoutes);
app.use('/api/calls', CallsRouter);


// Error handler and server port
app.use(ErrorHandler)
const port = process.env.PORT || 5000
let newServer = server.listen(port, () => {
    console.log(`server is running on port number ${port}`);
})
// let ip = process.env.IP as any
// const newServer = server.listen(port, ip, () => {
//     console.log(`server is running on port http://${ip}:${port}`);
// });
instrument(io, { auth: false });
// unhandled promise rejection
process.on("unhandledRejection", (err: Error) => {
    console.log(err.stack);

    console.log(`Shutting down the server for ${err.message}`);
    console.log(`Shutting down the server for unhandle promise rejection`);
    newServer.close(() => {
        process.exit(1)
    })

})
