"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const groupSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true,
    },
    status: {
        type: String,
    },
    socket_id: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
    },
    users: [{ type: mongoose_1.default.Schema.Types.ObjectId }],
    admins: [{ type: mongoose_1.default.Schema.Types.ObjectId }],
    maxUsers: {
        type: Number,
        default: 50,
    },
    profile: {
        type: String,
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User"
    },
    lastMessage: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Message"
    },
    chat: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "Message",
        },
    ],
}, { collection: "group", timestamps: true, versionKey: false, });
exports.default = mongoose_1.default.model("Group", groupSchema);
