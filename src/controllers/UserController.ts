import { Request, Response } from "express";
import User from "../models/UserModel";
import { v4 as uuidv4 } from 'uuid';
import FancyError from "../utils/FancyError";
import { signUpSchema, loginSchema } from "../middleware/JoiSchemas"
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  issueTokenPair,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  setAuthCookies,
} from "../utils/jwtToken";
import asyncHandler from "express-async-handler"
import { uploadImage } from "../utils/Cloudinary";
import fs from "fs"
import moment from "moment"
import axios from "axios";
import userHelper from "../helpers/user.helper";

// const client = Twilio(process.env.ACCOUNT_SID, process.env.ACCOUNT_TOKEN);
import { getSession, setSession, removeSession, saveSession } from "../utils/session"
import { MemoryStore, SessionData, Session } from "express-session";
import { deleteFileFromS3, getFileUrlFromS3, uploadFileToS3 } from "../utils/S3Storage";
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

const OTP_PROVIDER_URL = "https://api.oncemore.io/auth";
// without a timeout a stalled provider holds the request (and a connection) open forever.
const OTP_REQUEST_TIMEOUT_MS = 10_000;

/** A provider that is unreachable is a 503, not a rejected OTP. */
const providerUnavailable = (error: any) =>
  new FancyError(
    "Verification service is temporarily unavailable, please try again",
    503,
    "OTP_PROVIDER_UNAVAILABLE"
  );

const sendOtpToMobile = async (mobile: string) => {
  try {
    return await axios.post(`${OTP_PROVIDER_URL}/mobile-signin`, {
      mobileNumber: userHelper.formatMobileNumber(mobile)
    }, { timeout: OTP_REQUEST_TIMEOUT_MS })
  } catch (error: any) {
    console.error(`[otp] send failed: ${error?.message}`);
    if (!error?.response) throw providerUnavailable(error);
    return null;
  }
};

const verifyOtpFromMobile = async (mobile: string, otp: string) => {
  try {
    return await axios.post(`${OTP_PROVIDER_URL}/verify-otp`, {
      otp: otp,
      mobileNumber: userHelper.formatMobileNumber(mobile),
      name: mobile
    }, { timeout: OTP_REQUEST_TIMEOUT_MS })
  } catch (error: any) {
    console.error(`[otp] verification failed: ${error?.message}`);
    // a 4xx means the code was wrong; anything else means the provider is down.
    if (!error?.response) throw providerUnavailable(error);
    return null;
  }
};

export const SendOtpViaSms = asyncHandler(async (req: Request, res: Response) => {
  try {
    const mobile = req.body?.mobile;

    // Validate the request body
    await signUpSchema.validateAsync(req.body);

    // Generate the OTP and timestamp
    // const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpCreatedAt = moment().unix();
    req.session.userDetails = { sentAt: otpCreatedAt, mobile: mobile };

    // store the session first: an OTP we cannot verify later is worse than no OTP,
    // and this turns a session store outage into an honest 503.
    await saveSession(req);

    // Send the SMS (await if it's an async operation)
    await sendOtpToMobile(mobile);

    // Set the session ID in the response headers
    res.setHeader('sessionId', req.sessionID);
    res.status(200).json({
      success: true,
      message: `Verification code sent to ${mobile}. Valid for the next 10 mins.`,
    });
  } catch (error: any) {
    if (error instanceof FancyError) throw error;
    // a bad mobile number is the caller's fault, not a server failure.
    throw new FancyError(error.message, error?.isJoi ? 400 : 500);
  }
})

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const curOTP = req.body?.otp;
  await loginSchema.validateAsync(req.body)
  const enterOtp = curOTP.toString().replaceAll(",", "");

  const session = await getSession(req.headers.sessionid as string);
  if (!session?.userDetails) {
    throw new FancyError("OTP incorrect or timeout, Try Again,", 403)
  }
  const otpResult = await verifyOtpFromMobile(session.userDetails.mobile, enterOtp) as any;
  if (!otpResult?.data) {
    throw new FancyError("OTP incorrect or timeout, Try Again.", 403)
  }

  let user = await User.findOne({ mobile: session.userDetails.mobile });
  if (!user) {
    user = await User.create({ mobile: session.userDetails.mobile, socket_id: uuidv4() });
  }

  // a fresh login starts a new refresh token family for this device.
  const tokens = await issueTokenPair(user, req);
  await removeSession(req.headers.sessionid as string);

  setAuthCookies(res, tokens);
  res.status(200).json({
    user,
    success: true,
    message: "user logged in sucessfully"
  })
})

/**
 * Exchanges the 45 day refresh cookie for a new access token.
 * The presented refresh token is single use: it is burned here and replaced,
 * and replaying it revokes every token issued from the same login.
 */
export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.cookies?.[REFRESH_COOKIE];
  try {
    const { user, accessToken, refreshToken } = await rotateRefreshToken(presented, req);
    setAuthCookies(res, { accessToken, refreshToken });
    res.status(200).json({ user, success: true, message: "session refreshed" });
  } catch (error) {
    // the cookie is worthless now, do not leave it in the browser.
    clearAuthCookies(res);
    throw error;
  }
})

/** Current user for the session, used by the client to rehydrate on page load. */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ user: req.user, success: true });
})

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  // idempotent: a stale or missing cookie still ends up logged out.
  await revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.status(200).json({ message: 'User logged out successfully', success: true });
})

/** Ends every session of the logged in user, on all devices. */
export const logoutAllDevices = asyncHandler(async (req: Request, res: Response) => {
  await revokeAllRefreshTokens(String(req.user?._id));
  clearAuthCookies(res);
  res.status(200).json({ message: 'Logged out from all devices', success: true });
})

export const UpdateUser = asyncHandler(async (req: Request, res: Response) => {
  const _id = req.params.id;
  if (String(req.user?._id) !== _id) {
    throw new FancyError("You can only update your own profile", 403)
  }
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

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id
  if (String(req.user?._id) !== id) {
    throw new FancyError("You can only update your own profile", 403)
  }
  try {
    const uploader = (path: string) => uploadImage(path);
    const files = req.files as Express.Multer.File[];
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
    throw new FancyError(error?.message || "Unable to update the profile picture", 400);
  }
})

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUserId = req.user?._id
  try {
    const users = await User.find({ _id: { $ne: loggedInUserId } });
    res.status(200).json(users);
  } catch (error: any) {
    throw new FancyError("Unable to Fetch the Users, Try again", 400)
  }
})


export const uploadImagesToS3 = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new FancyError("No files were uploaded", 400);
  }
  try {
    const uploadPromises = files.map(async (file) => {
      const filename = await uploadFileToS3(file); // Upload each file
      const fileUrl = await getFileUrlFromS3(filename); // Get the public URL for the uploaded file
      return {
        filename,
        url: fileUrl,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises)
    res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      data: uploadedFiles,
    });
  } catch (error: any) {
    console.log(error);

    throw new FancyError("Unable to Fetch the Users, Try again", 400)
  }
})

export const deleteFromS3 = asyncHandler(async (req: Request, res: Response) => {
  const filename = req.params.key as string

  try {
    const result = await deleteFileFromS3(filename)

    res.status(200).json({
      success: true,
      message: "Files deleted successfully",
      data: result,
    });
  } catch (error: any) {
    console.log(error);

    throw new FancyError("Unable to Fetch the Users, Try again", 400)
  }
})

