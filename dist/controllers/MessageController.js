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
exports.updateMessage = exports.createMessage = void 0;
const MessageModel_1 = __importDefault(require("../models/MessageModel"));
const createMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const title = (_a = req.body) === null || _a === void 0 ? void 0 : _a.title;
    try {
        const msg = yield MessageModel_1.default.create({ title });
        res.json(msg);
    }
    catch (error) {
        throw new Error(error);
    }
});
exports.createMessage = createMessage;
const updateMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d;
    const id = (_b = req.body) === null || _b === void 0 ? void 0 : _b.id;
    const title = (_c = req.body) === null || _c === void 0 ? void 0 : _c.title;
    const seen = (_d = req.body) === null || _d === void 0 ? void 0 : _d.seen;
    try {
        const msg = yield MessageModel_1.default.findByIdAndUpdate(id, { title, seen }, { new: true });
        res.json(msg);
    }
    catch (error) {
        throw new Error(error);
    }
});
exports.updateMessage = updateMessage;
