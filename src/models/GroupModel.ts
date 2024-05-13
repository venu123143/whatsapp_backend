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

const groupSchema: Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
    },
    socket_id: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    users: [{ type: mongoose.Schema.Types.ObjectId }],
    admins: [{ type: mongoose.Schema.Types.ObjectId }],
    maxUsers: {
      type: Number,
      default: 50,
    },
    profile: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    unreadCount: {
      type: Number,
      default: 0
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
    },
    chat: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
  },
  { collection: "group", timestamps: true, versionKey: false, }
);

export default mongoose.model<IGroup>("Group", groupSchema);
