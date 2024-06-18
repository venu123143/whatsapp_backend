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
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
process.on("uncaughtException", (err) => {
    console.log(err);
    console.log(`Error: ${err.message}`);
    console.log(`shutting down the server for handling uncaught Exception`);
});
require("dotenv/config");
require("./config/db");
const app = (0, express_1.default)();
const Errors_1 = __importDefault(require("./middleware/Errors"));
const UserRoute_1 = __importDefault(require("./routes/UserRoute"));
const MessageRoute_1 = __importDefault(require("./routes/MessageRoute"));
const GroupRoute_1 = __importDefault(require("./routes/GroupRoute"));
const CallsRoute_1 = __importDefault(require("./routes/CallsRoute"));
const ConnectSession_1 = require("./config/ConnectSession");
const SocketController_1 = require("./controllers/SocketController");
const admin_ui_1 = require("@socket.io/admin-ui");
const session_1 = __importDefault(require("./utils/session"));
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
io.on("connect", (socket) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(`user ${socket === null || socket === void 0 ? void 0 : socket.user.name} with UUID:- ${(_a = socket === null || socket === void 0 ? void 0 : socket.user) === null || _a === void 0 ? void 0 : _a.socket_id} is connected`);
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
    console.log(`calls name space is connected with id: ${socket.id}`);
    socket.on('ice-candidate-offer', (data) => {
        socket.to(data.to).emit("ice-candiate-offer", { candidate: data.candidate, from: socket.user.socket_id });
    });
    socket.on('ice-candidate-answer', (data) => {
        socket.to(data.to).emit("ice-candiate-answer", { candidate: data.candidate, from: socket.user.socket_id });
    });
    socket.on("call-offer", (data) => {
        socket.to(data.to).emit("call-offer", { offer: data.offer, from: socket.user._id });
    });
    socket.on("call-answer", (data) => {
        socket.to(data.to).emit("call-answer", { answer: data.answer, from: socket.user.socket_id });
    });
}));
app.get('/', (req, res) => {
    res.send('backend home route sucessful');
});
app.use("/api/users", UserRoute_1.default);
app.use("/api/msg", MessageRoute_1.default);
app.use('/api/groups', GroupRoute_1.default);
app.use('/api/calls', CallsRoute_1.default);
app.use(Errors_1.default);
const port = process.env.PORT || 5000;
let newServer = server.listen(port, () => {
    console.log(`server is running on port number ${port}`);
});
(0, admin_ui_1.instrument)(io, { auth: false });
process.on("unhandledRejection", (err) => {
    console.log(err.stack);
    console.log(`Shutting down the server for ${err.message}`);
    console.log(`Shutting down the server for unhandle promise rejection`);
    newServer.close(() => {
        process.exit(1);
    });
});
