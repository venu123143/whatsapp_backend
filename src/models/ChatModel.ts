import mongoose, { Schema, Document } from "mongoose";

interface IChat extends Document {
  senderId: Schema.Types.ObjectId;
  recieverId: Schema.Types.ObjectId;
  messages: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema: Schema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    recieverId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
  },
  { collection: "chats", timestamps: true, versionKey: false, }
);

export default mongoose.model<IChat>("Chat", chatSchema);
