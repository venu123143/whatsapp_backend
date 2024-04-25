import mongoose, { Schema, Document } from "mongoose";
import jwt from "jsonwebtoken"

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
  generateAuthToken: () => string,
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
    refreshToken: String,
    chat: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
  },
  { collection: "users", timestamps: true, versionKey: false, }
);


userSchema.methods.generateAuthToken = async function () {
  try {
    let cur_token = jwt.sign({ _id: this._id }, process.env.SECRET_KEY as jwt.Secret, { expiresIn: '1d' });
    this.refreshToken = cur_token
    await this.save();
    return cur_token;
  } catch (error) {
    console.log(error);
  }
}


export default mongoose.model<IUser>("User", userSchema);
