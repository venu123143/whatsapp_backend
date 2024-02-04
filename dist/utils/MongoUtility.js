"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertStringToObjID = exports.validateMogodbId = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const mongoose_1 = __importDefault(require("mongoose"));
const FancyError_1 = __importDefault(require("../utils/FancyError"));
exports.validateMogodbId = (0, express_async_handler_1.default)((req, res) => {
    const { _id } = req.user;
    const id = req.params.id || _id;
    const isValid = mongoose_1.default.Types.ObjectId.isValid(id);
    if (!isValid) {
        throw new FancyError_1.default('This id is not valid or not found', 404);
    }
});
function convertStringToObjID(string) {
    return new mongoose_1.default.Types.ObjectId(string);
}
exports.convertStringToObjID = convertStringToObjID;
