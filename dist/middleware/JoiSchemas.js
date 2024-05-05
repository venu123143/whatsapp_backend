"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCallSchema = exports.loginSchema = exports.signUpSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.signUpSchema = joi_1.default.object({
    mobile: joi_1.default.string().trim().required().pattern(/^[6-9]\d{9}$/),
});
exports.loginSchema = joi_1.default.object({
    otp: joi_1.default.array()
        .items(joi_1.default.number().integer().min(0).max(9))
        .length(6)
        .required(),
});
exports.createCallSchema = joi_1.default.object({
    title: joi_1.default.string().trim().messages({
        'string.base': 'Title must be a string.',
    }),
    callType: joi_1.default.string().valid('audio_call', 'video_call').messages({
        'string.base': 'Call type must be a string.',
        'any.only': 'Call type must be either "audio_call" or "video_call".',
    }),
    pin: joi_1.default.string()
        .pattern(/^[0-9]{4}$/)
        .messages({
        'string.base': 'PIN must be a string of 4 digit number.',
        'string.pattern.base': 'PIN must be a 4-digit number.',
    }),
});
