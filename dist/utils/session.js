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
exports.removeSession = exports.setSession = exports.getSession = exports.redisClient = void 0;
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const redis_1 = require("redis");
exports.redisClient = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
exports.redisClient.connect().then(() => console.log("redis connected")).catch((err) => console.log(err));
const store = new connect_redis_1.default({ client: exports.redisClient });
const ses = (0, express_session_1.default)({
    name: 'loginSession',
    store: store,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    cookie: {
        sameSite: 'lax',
        secure: false,
        maxAge: 10 * 60 * 100
    }
});
function getSession(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            store.get(sessionId, (err, ses) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(ses);
                }
            });
        });
    });
}
exports.getSession = getSession;
function setSession(sessionId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            store.set(sessionId, data, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
exports.setSession = setSession;
function removeSession(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            store.destroy(sessionId, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
exports.removeSession = removeSession;
exports.default = ses;
