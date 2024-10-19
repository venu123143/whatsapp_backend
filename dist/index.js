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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = __importDefault(require("http"));
require("dotenv/config");
const session_1 = __importDefault(require("./utils/session"));
require("./config/db");
const Errors_1 = __importDefault(require("./middleware/Errors"));
const UserRoute_1 = __importDefault(require("./routes/UserRoute"));
const MessageRoute_1 = __importDefault(require("./routes/MessageRoute"));
const GroupRoute_1 = __importDefault(require("./routes/GroupRoute"));
const CallsRoute_1 = __importDefault(require("./routes/CallsRoute"));
const SocketController_1 = require("./controllers/SocketController");
const ConnectSession_1 = require("./config/ConnectSession");
const admin_ui_1 = require("@socket.io/admin-ui");
class App {
    constructor() {
        this.redisConnected = false;
        this.app = (0, express_1.default)();
        this.server = http_1.default.createServer(this.app);
        this.port = process.env.PORT || 5000;
        this.io = new socket_io_1.Server(this.server, {
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
    initializeMiddlewares() {
        const corsOptions = {
            origin: ['http://localhost:5173', 'https://whatsapp-mongo.onrender.com', 'https://whatsapp-chat-imbu.onrender.com'],
            credentials: true,
            exposedHeaders: ["sessionID", "sessionId", "sessionid"]
        };
        this.app.use((0, cors_1.default)(corsOptions));
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((0, cookie_parser_1.default)());
        this.app.use((0, morgan_1.default)('dev'));
        this.app.use(session_1.default);
        this.chatNamespace.use(ConnectSession_1.socketMiddleware);
        this.chatNamespace.use(SocketController_1.authorizeUser);
        this.callsNamespace.use(ConnectSession_1.socketMiddleware);
        this.callsNamespace.use(SocketController_1.JoinUserToOwnRoom);
    }
    initializeRoutes() {
        this.app.get('/', (req, res) => {
            res.send('Backend home route successful');
        });
        this.app.use("/api/users", UserRoute_1.default);
        this.app.use("/api/msg", MessageRoute_1.default);
        this.app.use('/api/groups', GroupRoute_1.default);
        this.app.use('/api/calls', CallsRoute_1.default);
    }
    handleError() {
        this.app.use(Errors_1.default);
        process.on("uncaughtException", (err) => {
            console.error("Uncaught Exception:", err);
            process.exit(1);
        });
        process.on("unhandledRejection", (err) => {
            console.error("Unhandled Rejection:", err);
            this.server.close(() => process.exit(1));
        });
    }
    connectRedis() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.redisConnected)
                return;
            try {
                this.pubClient = (0, redis_1.createClient)({ url: process.env.REDIS_ADAPTOR });
                this.subClient = this.pubClient.duplicate();
                yield this.pubClient.connect();
                yield this.subClient.connect();
                this.redisConnected = true;
                this.io.adapter((0, redis_adapter_1.createAdapter)(this.pubClient, this.subClient));
                const info = yield this.pubClient.info('memory');
                const usedMemory = parseInt(((_a = info.split('\r\n').find(line => line.startsWith('used_memory:'))) === null || _a === void 0 ? void 0 : _a.split(':')[1]) || '0');
                console.log(`Redis memory usage: ${usedMemory} bytes`);
            }
            catch (err) {
                console.error("Redis adapter error:", err);
            }
        });
    }
    initializeSockets() {
        this.chatNamespace.on("connect", (socket) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            console.log(`User ${(_a = socket === null || socket === void 0 ? void 0 : socket.user) === null || _a === void 0 ? void 0 : _a.name} with UUID ${(_b = socket === null || socket === void 0 ? void 0 : socket.user) === null || _b === void 0 ? void 0 : _b.socket_id} connected`);
            socket.on('create_connection', (userIds, connType, ConnectionInfo, callback) => {
                (0, SocketController_1.createConnection)(socket, userIds, connType, ConnectionInfo, callback);
            });
            socket.on('online_status', (data, callback) => {
                (0, SocketController_1.onlineStatus)(data, callback);
            });
            socket.on("send_message", (data, callback) => {
                (0, SocketController_1.sendMessage)(this.chatNamespace, socket, data, callback);
            });
            socket.on("edit_message", (data, callback) => {
                (0, SocketController_1.editMessage)(this.chatNamespace, socket, data, callback);
            });
            socket.on("delete_message", (data, callback) => {
                (0, SocketController_1.deleteMessage)(this.chatNamespace, socket, data, callback);
            });
            socket.on("get_all_messages", (input, callback) => __awaiter(this, void 0, void 0, function* () {
                if (typeof callback === 'function') {
                    yield (0, SocketController_1.getAllMessages)(socket, callback);
                }
                else {
                    console.error("Callback is not a function");
                }
            }));
            socket.on("create_group", (group) => {
                (0, SocketController_1.createGroup)(this.chatNamespace, socket, group);
            });
            socket.on("update_seen", (msg) => {
                (0, SocketController_1.updateSeen)(socket, msg);
            });
            socket.on("disconnecting", () => (0, SocketController_1.onDisconnect)(socket));
        }));
        this.callsNamespace.on("connect", (socket) => __awaiter(this, void 0, void 0, function* () {
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
        }));
    }
    listen() {
        this.server.listen(this.port, () => {
            console.log(`Server is running on port number ${this.port}`);
        });
        (0, admin_ui_1.instrument)(this.io, { auth: false });
    }
}
new App();
