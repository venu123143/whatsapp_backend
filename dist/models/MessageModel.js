"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
var ConnectionType;
(function (ConnectionType) {
    ConnectionType["Group"] = "group";
    ConnectionType["OneToOne"] = "onetoone";
})(ConnectionType || (ConnectionType = {}));
var MessageType;
(function (MessageType) {
    MessageType["Text"] = "text";
    MessageType["Image"] = "image";
    MessageType["Video"] = "video";
    MessageType["Notification"] = "notification";
})(MessageType || (MessageType = {}));
const chatMessageSchema = new mongoose_1.default.Schema({
    message: {
        type: String,
        required: true,
        default: ''
    },
    date: {
        type: Date,
        required: true
    },
    right: {
        type: Boolean,
        required: true
    },
    msgType: {
        type: String,
        required: true,
        enum: Object.values(MessageType),
    },
    senderId: {
        type: String,
        required: true
    },
    conn_type: {
        type: String,
        required: true,
        enum: Object.values(ConnectionType),
    },
    receiverId: {
        type: String,
        required: true
    },
    image: {
        type: String,
    },
    seen: {
        type: Boolean,
        required: true,
    }
});
exports.default = mongoose_1.default.model("ChatMessage", chatMessageSchema);
