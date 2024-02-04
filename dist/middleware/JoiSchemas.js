"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.signUpSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.signUpSchema = joi_1.default.object({
    mobile: joi_1.default.string().trim().required().pattern(/^[6-9]\d{9}$/),
});
exports.loginSchema = joi_1.default.object({
    mobile: joi_1.default.string().trim().required().pattern(/^[6-9]\d{9}$/),
    otp: joi_1.default.array()
        .items(joi_1.default.number().integer().min(0).max(9))
        .length(6)
        .required(),
});
