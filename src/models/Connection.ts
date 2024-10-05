import mongoose, { Types, Schema, Document } from 'mongoose';

export type ConnectionType = 'onetoone' | 'group';

export interface IConnection extends Document {
    room_id: string;
    about: string;
    users: Types.ObjectId[];  // List of user ObjectIds
    conn_type: ConnectionType;   // Either 'onetoone' or 'group'
    conn_name?: string;  // Optional, only for groups
    profile: string;
    createdBy: Types.ObjectId;
    admins: Types.ObjectId[];
    online_status: string;
    unreadCount: number;
    messages: Types.ObjectId[];  // Associated messages
    lastMessage: any
}

const connectionSchema: Schema = new mongoose.Schema<IConnection>({
    room_id: {
        type: String,
        required: true,
        unique: true
    },
    conn_type: {
        type: String,
        enum: ['onetoone', 'group'],
        required: true,
    },
    conn_name: {
        type: String,
        required: false
    },
    about: {
        type: String
    },
    online_status: {
        type: String, 
    },
    unreadCount: {
        type: Number,
        default: 0
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    profile: {
        type: String,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
    ]

}, { collection: "connections", timestamps: true, versionKey: false });

export default mongoose.model<IConnection>('Connection', connectionSchema);
