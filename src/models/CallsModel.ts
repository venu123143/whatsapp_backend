import mongoose, { Types, Schema, Document } from "mongoose";
type callType = 'video_call' | 'audio_call';
type callStatus = 'live' | 'completed';

export interface ICalls extends Document {
    socketId: string;
    createdBy: Types.ObjectId;
    joinedUsers: Types.ObjectId[];
    callType: callType;
    status: callStatus;
    callDuration: number;
    title?: string;
    pin?: string;
}


const callsSchema: Schema = new mongoose.Schema({
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
        type: Types.ObjectId,
        required: true,
        ref: 'User'
    },
    joinedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
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

export default mongoose.model<ICalls>("Calls", callsSchema);
