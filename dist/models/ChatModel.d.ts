import mongoose, { Document, Types } from 'mongoose';
interface ChatMessage extends Document {
    message: string;
    date: string;
    right: boolean;
    msgType: string;
    sender: {
        id: string;
        name: string;
    };
    conn_type: string;
    file?: string;
    seen: boolean;
    users?: any;
    replyFor?: {
        id: string;
        message: string;
        name: string;
    };
}
declare const ChatMessageModel: mongoose.Model<ChatMessage, {}, {}, {}, mongoose.Document<unknown, {}, ChatMessage> & ChatMessage & {
    _id: Types.ObjectId;
}, any>;
export default ChatMessageModel;
