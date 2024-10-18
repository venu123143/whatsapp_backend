"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromS3 = exports.uploadImagesToS3 = exports.getAllUsers = exports.updateProfile = exports.UpdateUser = exports.logoutUser = exports.verifyOtp = exports.SendOtpViaSms = void 0;
const twilio_1 = __importDefault(require("twilio"));
const ua_parser_js_1 = __importDefault(require("ua-parser-js"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
const uuid_1 = require("uuid");
const FancyError_1 = __importDefault(require("../utils/FancyError"));
const JoiSchemas_1 = require("../middleware/JoiSchemas");
const jwtToken_1 = __importDefault(require("../utils/jwtToken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Cloudinary_1 = require("../utils/Cloudinary");
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
const client = (0, twilio_1.default)(process.env.ACCOUNT_SID, process.env.ACCOUNT_TOKEN);
const session_1 = require("../utils/session");
const S3Storage_1 = require("../utils/S3Storage");
const sendTextMessage = (mobile, otp) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const msg = yield client.messages.create({
            body: `Your Otp is ${otp} , valid for next 10-min.`,
            to: `+91${mobile}`,
            from: "+16562188441",
        });
        return msg;
    }
    catch (error) {
        return error;
    }
});
exports.SendOtpViaSms = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const mobile = (_a = req.body) === null || _a === void 0 ? void 0 : _a.mobile;
    yield JoiSchemas_1.signUpSchema.validateAsync(req.body);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpCreatedAt = (0, moment_1.default)().unix();
    req.session.userDetails = { sentAt: otpCreatedAt, mobile: mobile, otp: otp };
    res.setHeader('sessionId', req.sessionID);
    res.status(200).json({
        success: true, message: `Verification code ${otp} sent to ${mobile}, Valid for next 10 mins. `,
    });
}));
exports.verifyOtp = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    const curOTP = (_b = req.body) === null || _b === void 0 ? void 0 : _b.otp;
    yield JoiSchemas_1.loginSchema.validateAsync(req.body);
    const enterOtp = curOTP.toString().replaceAll(",", "");
    const session = yield (0, session_1.getSession)(req.headers.sessionid);
    if (!(session === null || session === void 0 ? void 0 : session.userDetails)) {
        throw new FancyError_1.default("OTP incorrect or timeout, Try Again,", 403);
    }
    let user = yield UserModel_1.default.findOne({ mobile: session.userDetails.mobile });
    const time = session.userDetails.sentAt;
    const currentTime = (0, moment_1.default)().unix();
    const otpValidityDuration = 10 * 60 * 1000;
    const isValid = currentTime - time;
    const otp = session.userDetails.otp;
    try {
        if (otp == enterOtp && time && isValid <= otpValidityDuration) {
            if (!user) {
                user = yield UserModel_1.default.create({ mobile: session.userDetails.mobile, socket_id: (0, uuid_1.v4)() });
            }
            const deviceInfo = req.headers['user-agent'];
            const parser = new ua_parser_js_1.default(deviceInfo);
            const token = yield (0, jwtToken_1.default)(user);
            const safari = (_c = parser.getBrowser().name) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes('safari');
            console.log(safari, parser.getBrowser().name);
            let sameSite = 'none';
            if (safari) {
                sameSite = 'strict';
            }
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 3);
            const options = {
                expires: expirationDate,
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                sameSite: process.env.NODE_ENV === 'production' ? sameSite : 'strict',
            };
            res.status(200).cookie('loginToken', token, options).json({
                user,
                sucess: true,
                message: "user logged in sucessfully"
            });
        }
        else {
            throw new FancyError_1.default("OTP incorrect or timeout, Try Again", 403);
        }
    }
    catch (error) {
        throw new FancyError_1.default("OTP incorrect or timeout, Try Again", 403);
    }
}));
exports.logoutUser = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cookies = req.cookies;
    if (!cookies.loginToken) {
        throw new FancyError_1.default('No refresh token in cookies, Login again', 404);
    }
    yield UserModel_1.default.findOneAndUpdate({ refreshToken: cookies === null || cookies === void 0 ? void 0 : cookies.loginToken }, { refreshToken: "" });
    res.clearCookie('loginToken', { path: '/' }).json({ message: 'User logged out successfully', success: true });
}));
exports.UpdateUser = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e, _f;
    const _id = req.params.id;
    const name = (_d = req.body) === null || _d === void 0 ? void 0 : _d.name;
    const about = (_e = req.body) === null || _e === void 0 ? void 0 : _e.about;
    const profile = (_f = req.body) === null || _f === void 0 ? void 0 : _f.profile;
    try {
        const updatedUser = yield UserModel_1.default.findOneAndUpdate({ _id: _id }, {
            name,
            profile,
            about,
        }, { new: true });
        res.json(updatedUser);
    }
    catch (error) {
        throw new FancyError_1.default("Unable to Update the User, Try again", 400);
    }
}));
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uploader = (path) => (0, Cloudinary_1.uploadImage)(path);
        const files = req.files;
        const id = req.params.id;
        let profile = "";
        for (const file of files) {
            const { path } = file;
            const newpath = yield uploader(path);
            profile = newpath.url;
            fs_1.default.unlinkSync(path);
        }
        const result = yield UserModel_1.default.findOneAndUpdate({ _id: id }, { profile }, { new: true });
        res.json(result);
    }
    catch (error) {
        throw new Error(error);
    }
});
exports.updateProfile = updateProfile;
exports.getAllUsers = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g;
    const loggedInUserId = (_g = req.user) === null || _g === void 0 ? void 0 : _g._id;
    try {
        const users = yield UserModel_1.default.find({ _id: { $ne: loggedInUserId } });
        res.status(200).json(users);
    }
    catch (error) {
        throw new FancyError_1.default("Unable to Fetch the Users, Try again", 400);
    }
}));
exports.uploadImagesToS3 = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const files = req.files;
    if (!files || files.length === 0) {
        throw new FancyError_1.default("No files were uploaded", 400);
    }
    try {
        const uploadPromises = files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
            const filename = yield (0, S3Storage_1.uploadFileToS3)(file);
            const fileUrl = yield (0, S3Storage_1.getFileUrlFromS3)(filename);
            return {
                filename,
                url: fileUrl,
            };
        }));
        const uploadedFiles = yield Promise.all(uploadPromises);
        res.status(200).json({
            success: true,
            message: "Files uploaded successfully",
            data: uploadedFiles,
        });
    }
    catch (error) {
        console.log(error);
        throw new FancyError_1.default("Unable to Fetch the Users, Try again", 400);
    }
}));
exports.deleteFromS3 = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filename = req.params.key;
    try {
        const result = yield (0, S3Storage_1.deleteFileFromS3)(filename);
        res.status(200).json({
            success: true,
            message: "Files deleted successfully",
            data: result,
        });
    }
    catch (error) {
        console.log(error);
        throw new FancyError_1.default("Unable to Fetch the Users, Try again", 400);
    }
}));
