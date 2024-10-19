import mongoose, { Schema, Document } from "mongoose";
export interface IGroup extends Document {
    name: string;
    socket_id: string;
    status: string;
    description: string;
    unreadCount: number;
    users: Schema.Types.ObjectId[];
    admins: Schema.Types.ObjectId[];
    maxUsers: number;
    profile: string;
    createdBy: Schema.Types.ObjectId;
    chat: string[];
}
declare const _default: mongoose.Model<IGroup, {}, {}, {}, mongoose.Document<unknown, {}, IGroup> & IGroup & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
