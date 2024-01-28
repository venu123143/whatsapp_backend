import mongoose, { Schema, Document } from "mongoose";
import jwt from "jsonwebtoken"

export interface IUser extends Document {
  name?: string;
  socket_id?: string;
  about?: string;
  mobile: string;
  otp?: string;
  profile?: string;
  refreshToken?: string;
  lastMessage: string;
  loginType: string;
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
    otp: {
      type: String,
    },
    profile: {
      type: String,
    },
    loginType: {
      type: String,
    },
    online_status: {
      type: String,
    },
    lastMessage: {
      type: String,
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
