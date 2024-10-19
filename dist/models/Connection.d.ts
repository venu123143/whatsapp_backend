import mongoose, { Types, Document } from 'mongoose';
export type ConnectionType = 'onetoone' | 'group';
export interface IConnection extends Document {
    room_id: string;
    about: string;
    users: Types.ObjectId[];
    conn_type: ConnectionType;
    conn_name?: string;
    profile: string;
    createdBy: Types.ObjectId;
    admins: Types.ObjectId[];
    online_status: string;
    unreadCount: number;
    messages: Types.ObjectId[];
    lastMessage: any;
}
declare const _default: mongoose.Model<IConnection, {}, {}, {}, mongoose.Document<unknown, {}, IConnection> & IConnection & {
    _id: Types.ObjectId;
}, any>;
export default _default;
