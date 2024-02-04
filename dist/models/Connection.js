"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectionSchema = new mongoose_1.default.Schema({
    room_id: {
        type: String,
        required: true
    },
    conn_type: {
        type: String,
        enum: ['onetoone', 'group'],
        required: true,
    },
    users: [{ type: mongoose_1.default.Schema.Types.ObjectId }],
    messages: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "Message",
        },
    ]
}, { collection: "connections", timestamps: true, versionKey: false, });
exports.default = mongoose_1.default.model("Connection", connectionSchema);
