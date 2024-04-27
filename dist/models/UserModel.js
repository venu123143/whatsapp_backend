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
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userSchema = new mongoose_1.default.Schema({
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
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    refreshToken: String,
    chat: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "Message",
        },
    ],
}, { collection: "users", timestamps: true, versionKey: false, });
userSchema.methods.generateAuthToken = function () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let cur_token = jsonwebtoken_1.default.sign({ _id: this._id }, process.env.SECRET_KEY, { expiresIn: '1d' });
            this.refreshToken = cur_token;
            yield this.save();
            return cur_token;
        }
        catch (error) {
            console.log(error);
        }
    });
};
exports.default = mongoose_1.default.model("User", userSchema);
