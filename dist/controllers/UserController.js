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
exports.getAllUsers = exports.updateProfile = exports.UpdateUser = exports.logoutUser = exports.verifyOtp = exports.SendOtpViaSms = void 0;
const twilio_1 = __importDefault(require("twilio"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
const uuid_1 = require("uuid");
const FancyError_1 = __importDefault(require("../utils/FancyError"));
const JoiSchemas_1 = require("../middleware/JoiSchemas");
const jwtToken_1 = __importDefault(require("../utils/jwtToken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Cloudinary_1 = require("../utils/Cloudinary");
const fs_1 = __importDefault(require("fs"));
const client = (0, twilio_1.default)(process.env.ACCOUNT_SID, process.env.ACCOUNT_TOKEN);
const session_1 = require("../utils/session");
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
    const otpCreatedAt = new Date().getTime();
    req.session.userDetails = { sentAt: otpCreatedAt, mobile: mobile, otp: otp };
    res.setHeader('sessionId', req.sessionID);
    const data = Object.assign(Object.assign({}, req.session), { userDetails: Object.assign(Object.assign({}, req.session.userDetails), { sentAt: otpCreatedAt, mobile: mobile, otp: otp }) });
    yield (0, session_1.setSession)(req.headers.sessionid, data);
    res.status(200).json({
        success: true, message: `Verification code ${otp} sent to ${mobile}, Valid for next 10 mins. `,
    });
}));
exports.verifyOtp = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const curOTP = (_b = req.body) === null || _b === void 0 ? void 0 : _b.otp;
    yield JoiSchemas_1.loginSchema.validateAsync(req.body);
    const enterOtp = curOTP.toString().replaceAll(",", "");
    const session = yield (0, session_1.getSession)(req.headers.sessionid);
    console.log(session);
    if (!(session === null || session === void 0 ? void 0 : session.userDetails)) {
        throw new FancyError_1.default("OTP incorrect or timeout, Try Again", 403);
    }
    let user = yield UserModel_1.default.findOne({ mobile: session.userDetails.mobile });
    console.log(user);
    const time = session.userDetails.sentAt;
    const currentTime = new Date().getTime();
    const otpValidityDuration = 10 * 60 * 1000;
    const isValid = time ? currentTime - time : 13;
    const otp = session.userDetails.otp;
    try {
        if (user && otp == enterOtp && time && isValid <= otpValidityDuration) {
            if (!user) {
                user = yield UserModel_1.default.create({ mobile: session.userDetails.mobile, otp, socket_id: (0, uuid_1.v4)() });
            }
            return (0, jwtToken_1.default)(user, 201, res);
        }
        else {
            throw new FancyError_1.default("OTP incorrect or timeout, Try Again", 403);
        }
    }
    catch (error) {
        console.log(error);
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
    var _c, _d, _e;
    const _id = req.params.id;
    const name = (_c = req.body) === null || _c === void 0 ? void 0 : _c.name;
    const about = (_d = req.body) === null || _d === void 0 ? void 0 : _d.about;
    const profile = (_e = req.body) === null || _e === void 0 ? void 0 : _e.profile;
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
    var _f;
    const loggedInUserId = (_f = req.user) === null || _f === void 0 ? void 0 : _f._id;
    try {
        const users = yield UserModel_1.default.find({ _id: { $ne: loggedInUserId } });
        res.status(200).json(users);
    }
    catch (error) {
        throw new FancyError_1.default("Unable to Fetch the Users, Try again", 400);
    }
}));
