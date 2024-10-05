"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectionSchema = new mongoose_1.default.Schema({
    room_id: {
        type: String,
        required: true,
        unique: true
    },
    conn_type: {
        type: String,
        enum: ['onetoone', 'group'],
        required: true,
    },
    conn_name: {
        type: String,
        required: false
    },
    about: {
        type: String
    },
    online_status: {
        type: String,
    },
    unreadCount: {
        type: Number,
        default: 0
    },
    lastMessage: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    users: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" }],
    profile: {
        type: String,
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User"
    },
    messages: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "Message",
        },
    ]
}, { collection: "connections", timestamps: true, versionKey: false });
exports.default = mongoose_1.default.model('Connection', connectionSchema);
