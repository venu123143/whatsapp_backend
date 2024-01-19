import mongoose, { Types, Schema, Document } from "mongoose";
type ConnectionType = 'onetoone' | 'group';
export interface IConnection extends Document {
    room_id: string;
    users: Types.ObjectId[];
    messages: Types.ObjectId[];
    conn_type: ConnectionType;
}

const connectionSchema: Schema = new mongoose.Schema({
    room_id: {
        type: String,
        required: true
    },
    conn_type: {
        type: String,
        enum: ['onetoone', 'group'],
        required: true,
    },
    users: [{ type: mongoose.Schema.Types.ObjectId }],
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
    ]

}, { collection: "connections", timestamps: true, versionKey: false, })



export default mongoose.model<IConnection>("Connection", connectionSchema);