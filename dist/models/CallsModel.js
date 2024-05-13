"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const callsSchema = new mongoose_1.default.Schema({
    title: {
        type: String,
    },
    socketId: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['live', 'completed'],
        required: true,
        default: 'live'
    },
    createdBy: {
        type: mongoose_1.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    joinedUsers: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User'
        },
    ],
    callType: {
        type: String,
        enum: ['video_call', 'audio_call'],
        required: true,
        default: 'video_call'
    },
    callDuration: {
        type: Number,
        default: 0,
    },
    pin: {
        type: String,
    },
}, { collection: "calls", timestamps: true, versionKey: false });
exports.default = mongoose_1.default.model("Calls", callsSchema);
