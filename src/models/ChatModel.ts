import mongoose, { Schema, Document, Types } from 'mongoose';

interface ChatMessage extends Document {
  message: string;
  date: string;
  right: boolean;
  msgType: string;  // 'text', 'image', or 'audio'
  sender: {
    id: string;
    name: string;
  };
  conn_type: string; // 'group' or 'onetoone'
  file?: string;  // Only for image/audio messages
  seen: boolean;
  users?: any;    // Users involved in the conversation (for groups)
  replyFor?: {
    id: string;
    message: string;
    name: string;
  };
}

const ChatMessageSchema: Schema = new Schema({
  room_id: { type: Types.ObjectId, required: true },
  message: { type: String, required: true },
  date: { type: String, required: true },
  msgType: { type: String, enum: ['text', 'image', 'audio', 'file'], required: true },
  sender: {
    id: { type: String, required: true },
    name: { type: String, required: false },
    mobile: { type: String, required: true },
  },
  conn_type: { type: String, enum: ['group', 'onetoone'], required: true },
  file: { type: String, required: false },
  seen: { type: Boolean, required: true, default: false },
  replyFor: {
    id: { type: String, required: false },
    message: { type: String, required: false },
    name: { type: String, required: false }
  }
}, { versionKey: false});

// Create the model
const ChatMessageModel = mongoose.model<ChatMessage>('Message', ChatMessageSchema);

export default ChatMessageModel;
