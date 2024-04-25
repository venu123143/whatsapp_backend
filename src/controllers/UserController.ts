import { Request, Response } from "express";
import Twilio from "twilio";
import User, { IUser } from "../models/UserModel";
import { v4 as uuidv4 } from 'uuid';
import FancyError from "../utils/FancyError";
import { signUpSchema, loginSchema } from "../middleware/JoiSchemas"
import jwtToken from "../utils/jwtToken";
import asyncHandler from "express-async-handler"
import { uploadImage, deleteImage } from "../utils/Cloudinary";
import fs from "fs"
const client = Twilio(process.env.ACCOUNT_SID, process.env.ACCOUNT_TOKEN);
import { getSession, setSession, removeSession } from "../utils/session"
import { MemoryStore, SessionData, Session } from "express-session";
//joi validation
declare module 'express-serve-static-core' {
  interface Request {
    session: SessionData & Session & CookieOptions & MemoryStore & {
      userDetails?: {
        sentAt: number,
        mobile: number, otp?: string
      }
    };
  }

}
const sendTextMessage = async (mobile: string, otp: string) => {
  try {
    const msg = await client.messages.create({
      body: `Your Otp is ${otp} , valid for next 10-min.`,
      to: `+91${mobile}`,
      from: "+16562188441", // From a valid Twilio number
    });
    return msg;
  } catch (error) {
    return error;
  }
};
export const SendOtpViaSms = asyncHandler(async (req: Request, res: Response) => {
  const mobile = req.body?.mobile;
  await signUpSchema.validateAsync(req.body)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpCreatedAt = new Date().getTime();
  req.session.userDetails = { sentAt: otpCreatedAt, mobile: mobile, otp: otp }
  res.setHeader('sessionId', req.sessionID);
  const data = { ...req.session, userDetails: { ...req.session.userDetails, sentAt: otpCreatedAt, mobile: mobile, otp: otp } }
  await setSession(req.headers.sessionid as string, data);
  // const msg = sendTextMessage(mobile, otp)
  res.status(200).json({
    success: true, message: `Verification code ${otp} sent to ${mobile}, Valid for next 10 mins. `,
  });

})
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const curOTP = req.body?.otp;
  await loginSchema.validateAsync(req.body)
  const enterOtp = curOTP.toString().replaceAll(",", "");

  const session = await getSession(req.headers.sessionid as string);
  console.log(session);

  if (!session?.userDetails) {
    throw new FancyError("OTP incorrect or timeout, Try Again", 403)
  }

  let user = await User.findOne({ mobile: session.userDetails.mobile });
  console.log(user);

  const time = session.userDetails.sentAt
  const currentTime = new Date().getTime();
  const otpValidityDuration = 10 * 60 * 1000;
  const isValid = time ? currentTime - time : 13;
  const otp = session.userDetails.otp
  try {
    if (user && otp == enterOtp && time && isValid <= otpValidityDuration) {
      // CREATE ACCESS, REFRESH TOKENS AND SETUP COOKIES
      if (!user) {
        user = await User.create({ mobile: session.userDetails.mobile, otp, socket_id: uuidv4() });
      }
      return jwtToken(user, 201, res)

      // res.status(201).cookie("loginToken", token, options).json({ user, success: true, message: "user logged in sucessfully." });
    } else {
      throw new FancyError("OTP incorrect or timeout, Try Again", 403)
    }
  } catch (error: any) {
    console.log(error);

    throw new FancyError("OTP incorrect or timeout, Try Again", 403)

  }
})
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const cookies = req.cookies
  if (!cookies.loginToken) {
    throw new FancyError('No refresh token in cookies, Login again', 404)
  }

  await User.findOneAndUpdate({ refreshToken: cookies?.loginToken }, { refreshToken: "" })
  res.clearCookie('loginToken', { path: '/' }).json({ message: 'User logged out successfully', success: true });

})
export const UpdateUser = asyncHandler(async (req: Request, res: Response) => {
  const _id = req.params.id;
  const name = req.body?.name;
  const about = req.body?.about;
  const profile = req.body?.profile;
  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: _id },
      {
        name,
        profile,
        about,
      },
      { new: true }
    );
    res.json(updatedUser);
  } catch (error: any) {
    throw new FancyError("Unable to Update the User, Try again", 400)
  }
})

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const uploader = (path: string) => uploadImage(path);
    const files = req.files as Express.Multer.File[];
    const id = req.params.id
    let profile = ""
    for (const file of files) {
      const { path } = file;
      const newpath = await uploader(path);
      profile = newpath.url
      fs.unlinkSync(path);
    }
    const result = await User.findOneAndUpdate({ _id: id }, { profile }, { new: true });
    res.json(result)
  } catch (error: any) {
    throw new Error(error);
  }
};

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUserId = req.user?._id
  try {
    const users = await User.find({ _id: { $ne: loggedInUserId } });
    res.status(200).json(users);
  } catch (error: any) {
    throw new FancyError("Unable to Fetch the Users, Try again", 400)
  }
})

