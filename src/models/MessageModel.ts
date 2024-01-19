import { string } from "joi";
import mongoose, { Schema, Document } from "mongoose";

export interface IMessage {
    message: string;
    msg_type: string;
    seen: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    senderId: string;
    recieverId: string;
}

const messageSchema: Schema = new mongoose.Schema({
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

}, { collection: "message", timestamps: true, versionKey: false, })

export default mongoose.model<IMessage>("Message", messageSchema);
