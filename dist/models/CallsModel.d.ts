import mongoose, { Types, Document } from "mongoose";
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
declare const _default: mongoose.Model<ICalls, {}, {}, {}, mongoose.Document<unknown, {}, ICalls> & ICalls & {
    _id: Types.ObjectId;
}, any>;
export default _default;
