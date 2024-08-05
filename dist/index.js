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
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
require("dotenv/config");
const session_1 = __importDefault(require("./utils/session"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
require("./config/db");
const Errors_1 = __importDefault(require("./middleware/Errors"));
const UserRoute_1 = __importDefault(require("./routes/UserRoute"));
const MessageRoute_1 = __importDefault(require("./routes/MessageRoute"));
const GroupRoute_1 = __importDefault(require("./routes/GroupRoute"));
const CallsRoute_1 = __importDefault(require("./routes/CallsRoute"));
const SocketController_1 = require("./controllers/SocketController");
const ConnectSession_1 = require("./config/ConnectSession");
const admin_ui_1 = require("@socket.io/admin-ui");
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    console.log(`shutting down the server for handling uncaught Exception`);
    process.exit(1);
});
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ["http://localhost:5173", 'https://admin.socket.io', 'https://whatsapp-chat-imbu.onrender.com'],
        credentials: true,
    }
});
const callsNamespace = io.of("/calls");
const options = {
    origin: ['http://localhost:5173', 'http://192.168.0.175:5173', 'http://192.168.1.37:5173', 'https://whatsapp-chat-imbu.onrender.com'],
    credentials: true,
    exposedHeaders: ["sessionID", "sessionId", "sessionid"]
};
app.use((0, cors_1.default)(options));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(session_1.default);
io.use(ConnectSession_1.socketMiddleware);
io.use(SocketController_1.authorizeUser);
callsNamespace.use(ConnectSession_1.socketMiddleware);
callsNamespace.use(SocketController_1.JoinUserToOwnRoom);
app.get('/', (req, res) => {
    res.send('backend home route successful');
});
app.use("/api/users", UserRoute_1.default);
app.use("/api/msg", MessageRoute_1.default);
app.use('/api/groups', GroupRoute_1.default);
app.use('/api/calls', CallsRoute_1.default);
app.use(Errors_1.default);
const port = process.env.PORT || 5000;
const newServer = server.listen(port, () => {
    console.log(`Server is running on port number ${port}`);
});
(0, admin_ui_1.instrument)(io, { auth: false });
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
    newServer.close(() => {
        process.exit(1);
    });
});
const pubClient = (0, redis_1.createClient)({ url: process.env.REDIS_ADAPTOR });
const subClient = pubClient.duplicate();
let redisConnected = false;
function connectRedis() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (redisConnected)
            return;
        try {
            yield pubClient.connect();
            yield subClient.connect();
            redisConnected = true;
            console.log("Redis adapter connected");
            io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
            const info = yield pubClient.info('memory');
            const usedMemory = parseInt(((_a = info.split('\r\n').find(line => line.startsWith('used_memory:'))) === null || _a === void 0 ? void 0 : _a.split(':')[1]) || '0');
            console.log(`Redis memory usage: ${usedMemory} bytes`);
        }
        catch (err) {
            console.error("Redis adapter error:", err);
        }
    });
}
connectRedis();
io.on("connect", (socket) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log(`user ${(_a = socket === null || socket === void 0 ? void 0 : socket.user) === null || _a === void 0 ? void 0 : _a.name} with UUID:- ${(_b = socket === null || socket === void 0 ? void 0 : socket.user) === null || _b === void 0 ? void 0 : _b.socket_id} is connected`);
    socket.on('add_friend', (user) => {
        (0, SocketController_1.addFriend)(socket, user);
    });
    socket.on('get_frnds_on_reload', (user) => {
        (0, SocketController_1.getFriends)(socket, io, user);
    });
    socket.on('online_status', (data) => {
        (0, SocketController_1.onlineStatus)(io, socket, data);
    });
    socket.on("send_message", (data) => {
        (0, SocketController_1.sendMessage)(io, socket, data);
    });
    socket.on("edit_message", (data) => {
        (0, SocketController_1.editMessage)(io, socket, data);
    });
    socket.on("get_all_messages", () => {
        (0, SocketController_1.getAllMessages)(socket);
    });
    socket.on("create_group", (group) => {
        (0, SocketController_1.createGroup)(io, socket, group);
    });
    socket.on("update_seen", (msg) => {
        (0, SocketController_1.updateSeen)(socket, msg);
    });
    socket.on("disconnecting", () => (0, SocketController_1.onDisconnect)(socket));
}));
callsNamespace.on("connect", (socket) => __awaiter(void 0, void 0, void 0, function* () {
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
}));
