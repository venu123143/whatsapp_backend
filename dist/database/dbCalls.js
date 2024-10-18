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
const ChatModel_1 = __importDefault(require("../models/ChatModel"));
function createMessage(message) {
    return __awaiter(this, void 0, void 0, function* () {
        const newMessage = new ChatModel_1.default({
            room_id: message.room_id,
            message: message.message,
            file: message.file,
            date: message.date,
            msgType: message.msgType,
            sender: {
                id: message.sender.id,
                name: message.sender.name,
                mobile: message.sender.mobile
            },
            conn_type: message.conn_type,
            seen: message.seen,
            replyFor: message.replyFor ? {
                id: message.replyFor.id,
                message: message.replyFor.message,
                name: message.replyFor.name
            } : null
        });
        const savedMessage = yield newMessage.save();
        return savedMessage;
    });
}
exports.default = {
    createMessage
};
