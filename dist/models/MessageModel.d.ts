import mongoose, { Document } from "mongoose";
export interface IChatMessage extends Document {
    message: string;
    date: Date;
    right: boolean;
    msgType: string;
    senderId: string;
    image: any;
    conn_type: string;
    seen: boolean;
    receiverId: string;
}
declare const _default: mongoose.Model<IChatMessage, {}, {}, {}, mongoose.Document<unknown, {}, IChatMessage> & IChatMessage & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
