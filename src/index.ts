import { createClient } from "redis";
import { Server, Namespace } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import cookieParser from "cookie-parser";
import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import morgan from "morgan";
import http from "http";
import fs from "fs";

import "dotenv/config";
import session from "./utils/session";
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
import { socketMiddleware } from "./config/ConnectSession";
import { instrument } from "@socket.io/admin-ui";
import { ConnectionType } from "models/Connection";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

class App {
    public app: Application;
    public server: http.Server;
    public io: Server;
    public port: string | number;
    public chatNamespace: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
    public callsNamespace: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
    private redisConnected: boolean = false;
    private pubClient: ReturnType<typeof createClient> | undefined;
    private subClient: ReturnType<typeof createClient> | undefined;

    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = process.env.PORT || 5000;
        this.io = new Server(this.server, {
            cors: {
                origin: ["http://localhost:5173", 'https://whatsapp-mongo.onrender.com', 'https://admin.socket.io', 'https://whatsapp-chat-imbu.onrender.com'],
                credentials: true,
            }
        });
        this.chatNamespace = this.io.of("/chat");
        this.callsNamespace = this.io.of("/calls");
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.handleError();
        this.initializeSockets();
        this.listen();
    }

    private initializeMiddlewares() {
        const corsOptions: CorsOptions = {
            origin: ['http://localhost:5173', 'https://whatsapp-mongo.onrender.com', 'https://whatsapp-chat-imbu.onrender.com'],
            credentials: true,
            exposedHeaders: ["sessionID", "sessionId", "sessionid"]
        };
        this.app.use(cors(corsOptions));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.use(morgan('dev'));
        this.app.use(session);
        this.chatNamespace.use(socketMiddleware);
        this.chatNamespace.use(authorizeUser);
        this.callsNamespace.use(socketMiddleware);
        this.callsNamespace.use(JoinUserToOwnRoom);
    }

    private initializeRoutes() {
        this.app.get('/', (req, res) => {
            res.send('Backend home route successful');
        });
        this.app.use("/api/users", UserRouter);
        this.app.use("/api/msg", MsgRouter);
        this.app.use('/api/groups', groupRoutes);
        this.app.use('/api/calls', CallsRouter);
    }

    private handleError() {
        this.app.use(ErrorHandler);
        process.on("uncaughtException", (err) => {
            console.error("Uncaught Exception:", err);
            process.exit(1);
        });
        process.on("unhandledRejection", (err: Error) => {
            console.error("Unhandled Rejection:", err);
            this.server.close(() => process.exit(1));
        });
    }

    private async connectRedis() {
        if (this.redisConnected) return;
        try {
            this.pubClient = createClient({ url: process.env.REDIS_ADAPTOR });
            this.subClient = this.pubClient.duplicate();
            await this.pubClient.connect();
            await this.subClient.connect();
            this.redisConnected = true;
            this.io.adapter(createAdapter(this.pubClient, this.subClient));
            const info = await this.pubClient.info('memory');
            const usedMemory = parseInt(info.split('\r\n').find(line => line.startsWith('used_memory:'))?.split(':')[1] || '0');
            console.log(`Redis memory usage: ${usedMemory} bytes`);
        } catch (err) {
            console.error("Redis adapter error:", err);
        }
    }

    private initializeSockets() {
        this.chatNamespace.on("connect", async (socket: CustomSocket) => {
            console.log(`User ${socket?.user?.name} with UUID ${socket?.user?.socket_id} connected`);

            socket.on('create_connection', (userIds: string[], connType: ConnectionType, ConnectionInfo: any, callback: any) => {
                createConnection(socket, userIds, connType, ConnectionInfo, callback);
            });

            socket.on('online_status', (data: any, callback: any) => {
                onlineStatus(data, callback);
            });

            socket.on("send_message", (data: any, callback: any) => {
                sendMessage(this.chatNamespace, socket, data, callback);
            });

            socket.on("edit_message", (data: any, callback: any) => {
                editMessage(this.chatNamespace, socket, data, callback);
            });

            socket.on("delete_message", (data: any, callback: any) => {
                deleteMessage(this.chatNamespace, socket, data, callback);
            });

            socket.on("get_all_messages", async (input: any, callback: any) => {
                if (typeof callback === 'function') {
                    await getAllMessages(socket, callback);
                } else {
                    console.error("Callback is not a function");
                }
            });

            socket.on("create_group", (group: any) => {
                createGroup(this.chatNamespace, socket, group);
            });

            socket.on("update_seen", (msg) => {
                updateSeen(socket, msg);
            });

            socket.on("disconnecting", () => onDisconnect(socket));
        });

        this.callsNamespace.on("connect", async (socket: CustomSocket) => {
            console.log(`Calls namespace connected with id: ${socket.id}`);

            socket.on('join_room', (data, callback) => {
                socket.join(data);
                callback({ message: "Room joined" });
            });

            socket.on('ice-candidate-offer', (data) => {
                socket.to(data.to).emit("ice-candidate-offer", { candidate: data.candidate, from: data.to });
            });

            socket.on('ice-candidate-answer', (data) => {
                socket.to(data.to).emit("ice-candidate-answer", { candidate: data.candidate, from: data.to });
            });

            socket.on("call-offer", (data) => {
                socket.to(data.to).emit("call-offer", { offer: data.offer, from: data.to });
            });

            socket.on("call-answer", (data) => {
                socket.to(data.to).emit("call-answer", { answer: data.answer, from: data.to });
            });

            socket.on("stop-call", (data) => {
                socket.to(data.to).emit("stop-call", { from: data.to });
            });
        });
    }

    public listen() {
        this.server.listen(this.port, () => {
            console.log(`Server is running on port number ${this.port}`);
        });
        instrument(this.io, { auth: false });
    }
}

const app = new App();
export default app
