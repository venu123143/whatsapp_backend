import cookieParser from "cookie-parser";
import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import morgan from "morgan";
import http from 'http'
import { Server } from "socket.io";
import { createClient } from "redis";

// Handle uncaught Exception
process.on("uncaughtException", (err) => {
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
import { socketMiddleware } from "./config/ConnectSession"
import {
    authorizeUser, CustomSocket, flushAllData,
    sendMessage, createGroup, updateSeen, getFriends,
    addFriend, onDisconnect, onlineStatus, getAllMessages
} from "./controllers/SocketController";
import { instrument } from "@socket.io/admin-ui"

const server = http.createServer(app)

export const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.connect().then(() => console.log("redis connected")).catch((err) => console.log(err))
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", 'https://whatsapp-chat-imbu.onrender.com', "https://admin.socket.io"],
        credentials: true,
    }
});

// cors, json and cookie-parser
const options: CorsOptions = {
    origin: ['http://localhost:5173', 'https://whatsapp-chat-imbu.onrender.com'],
    credentials: true,
}
app.use(cors(options));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(express.static('../node_modules/@socket.io/admin-ui/ui/dist'))
app.use(morgan('dev'))
// app.use(sessionMiddleware)
io.use(socketMiddleware)
io.use(authorizeUser)
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
    socket.on("get_all_messages", () => {
        getAllMessages(io, socket)
    })
    socket.on("create_group", (group: any) => {
        createGroup(io, socket, group)
    })
    socket.on("update_seen", (msg) => {
        updateSeen(socket, msg)
    })
    socket.on("disconnecting", () => onDisconnect(socket))
})

// controllers
app.get('/', (req, res) => {
    res.send('backend home route sucessful')
})

app.use("/api/users", UserRouter)
app.use("/api/msg", MsgRouter)
app.use('/api/groups', groupRoutes);


// Error handler and server port
app.use(ErrorHandler)
const port = process.env.PORT || 5000
let newServer = server.listen(port, () => {
    console.log(`server is running on port number ${port}`);
})
instrument(io, { auth: false });
// unhandled promise rejection
process.on("unhandledRejection", (err: Error) => {    
    console.log(`Shutting down the server for ${err.message}`);
    console.log(`Shutting down the server for unhandle promise rejection`);
    newServer.close(() => {
        process.exit(1)
    })

})
