import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
    message: string;
    date: Date;
    right: boolean;
    msgType: string;
    senderId: string;
    image: any;
    conn_type: string;
    seen:boolean;
    receiverId: string;
}
// Define enum for connection types
enum ConnectionType {
    Group = "group",
    OneToOne = "onetoone"
}   
// Define enum for message types
enum MessageType {
    Text = "text",
    Image = "image",
    Video = "video",
    Notification = "notification"
}
const chatMessageSchema: Schema = new mongoose.Schema({
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

export default mongoose.model<IChatMessage>("ChatMessage", chatMessageSchema);
