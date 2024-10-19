import mongoose, { Document } from "mongoose";
export interface IUser extends Document {
    name?: string;
    socket_id: string;
    about?: string;
    mobile: string;
    profile?: string;
    unreadCount: number;
    refreshToken?: string;
    lastMessage: any;
    loginType: string;
    status: string;
    online_status: string;
    createdAt?: Date;
    updatedAt?: Date;
    chat: Array<any>;
    generateAuthToken: () => string;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser> & IUser & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
