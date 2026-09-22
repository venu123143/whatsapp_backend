import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name?: string;
  socket_id: string;
  about?: string;
  mobile: string;
  profile?: string;
  unreadCount: number;
  lastMessage: any;
  loginType: string;
  status: string;
  online_status: string;
  createdAt?: Date;
  updatedAt?: Date;
  chat: Array<any>;
}

// user schema.
const userSchema: Schema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    socket_id: {
      type: String,
      unique: true,
    },
    about: {
      type: String
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    profile: {
      type: String,
    },
    loginType: {
      type: String,
    },
    status: {
      type: String,
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
    chat: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
  },
  { collection: "users", timestamps: true, versionKey: false, }
);


export default mongoose.model<IUser>("User", userSchema);
