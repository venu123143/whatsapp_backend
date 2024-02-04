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
exports.socketMiddleware = void 0;
const UserModel_1 = __importDefault(require("../models/UserModel"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socketMiddleware = (socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    const loginToken = socket.handshake.auth.token;
    try {
        const decode = jsonwebtoken_1.default.verify(loginToken, process.env.SECRET_KEY);
        const user = yield UserModel_1.default.findById(decode._id);
        socket.user = user;
        next();
    }
    catch (error) {
        next(new Error("Socket Connection Failed, Try again."));
    }
});
exports.socketMiddleware = socketMiddleware;
