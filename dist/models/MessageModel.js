"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const messageSchema = new mongoose_1.default.Schema({
    message: {
        type: String,
        default: ""
    },
    msg_type: String,
    seen: {
        type: Boolean,
        default: false
    },
    senderId: {
        type: String,
        required: true
    },
    recieverId: {
        type: String,
        required: true
    },
}, { collection: "message", timestamps: true, versionKey: false, });
exports.default = mongoose_1.default.model("Message", messageSchema);
