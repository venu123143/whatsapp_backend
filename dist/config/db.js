"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const db = process.env.DATABASE;
if (db !== undefined) {
    mongoose_1.default.connect(db)
        .then(() => console.log('connection sucessful'))
        .catch((err) => console.log(err, "conn failed"));
}
