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
exports.updateCall = exports.getLiveCalls = exports.getCalls = exports.createCall = void 0;
const CallsModel_1 = __importDefault(require("../models/CallsModel"));
const uuid_1 = require("uuid");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const FancyError_1 = __importDefault(require("../utils/FancyError"));
const JoiSchemas_1 = require("../middleware/JoiSchemas");
exports.createCall = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            throw new FancyError_1.default("user not found, login again.", 403);
        }
        yield JoiSchemas_1.createCallSchema.validateAsync(req.body);
        const { title, callType, pin } = req.body;
        const create = yield CallsModel_1.default.create({ title, callType, pin, status: 'live', createdBy: user.id, socketId: (0, uuid_1.v4)() });
        res.status(200).json({ message: 'your call has started ', data: create });
    }
    catch (error) {
        const errorMessage = (error === null || error === void 0 ? void 0 : error.details) ? error.details[0].message.replace(/["\\]/g, '') : error.message;
        res.status(500).json({ message: errorMessage });
    }
}));
exports.getCalls = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.user;
        if (!user) {
            throw new FancyError_1.default("user not found, login again.", 403);
        }
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { page = 1, limit = 10 } = req.query;
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;
        const calls = yield CallsModel_1.default.find({
            $or: [
                { createdBy: userId },
                { joinedUsers: { $in: [userId] } },
            ],
            status: 'completed',
        }).sort({ createdAt: -1 }).skip(skip)
            .limit(limitNumber)
            .populate({
            path: 'createdBy',
            select: 'socket_id name profile mobile _id',
        }).populate({
            path: 'joinedUsers',
            select: 'socket_id name profile mobile _id',
        });
        res.status(200).json({ message: 'Your recent calls history fetched.', data: calls });
    }
    catch (error) {
        const errorMessage = (error === null || error === void 0 ? void 0 : error.details) ? error.details[0].message.replace(/["\\]/g, '') : error.message;
        res.status(500).json({ message: errorMessage });
    }
}));
exports.getLiveCalls = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, status = 'live' } = req.query;
        const user = req.user;
        if (!user) {
            throw new FancyError_1.default("user not found, login again.", 403);
        }
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const calls = yield CallsModel_1.default.find({
            status: status
        }).skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .populate({
            path: 'createdBy',
            select: 'socket_id name profile mobile _id',
        }).populate({
            path: 'joinedUsers',
            select: 'socket_id name profile mobile _id',
        });
        res.status(200).json({ message: 'live calls fetched successfully. ', data: calls });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
exports.updateCall = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const status = req.body.status;
        const userId = req.body.userId;
        const callDuration = req.body.callDuration;
        const updateObject = {};
        if (userId) {
            updateObject.$addToSet = { joinedUsers: userId };
        }
        if (status) {
            updateObject.status = status;
        }
        if (callDuration) {
            updateObject.callDuration = callDuration;
        }
        const updatedCall = yield CallsModel_1.default.findByIdAndUpdate(id, updateObject, { new: true });
        if (!updatedCall) {
            throw new FancyError_1.default("Call not found.", 404);
        }
        res.status(200).json({
            message: 'Call updated successfully.',
            data: updatedCall,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
