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
exports.chatUpload = exports.multerMiddleWare = exports.createIfNoExist = void 0;
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Response_1 = __importDefault(require("../utils/Response"));
const createIfNoExist = (dirPath) => {
    return new Promise((resolve, reject) => {
        if (!fs_1.default.existsSync(dirPath)) {
            fs_1.default.mkdir(dirPath, { recursive: true }, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve('resolve');
                }
            });
        }
        else {
            resolve('resolve');
        }
    });
};
exports.createIfNoExist = createIfNoExist;
const multerMiddleWare = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        console.log(err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            throw new Error('File/Files exceed 12 MB limit. Please reduce file size and retry.');
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            throw new Error('The maximum number of files allowed is 5.');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            throw new Error('The maximum number of files allowed is 5.');
        }
        Response_1.default.FailureResponse(res, 400, { message: err.message });
        return;
    }
    if (err) {
        Response_1.default.FailureResponse(res, 400, { message: err.message });
        return;
    }
    next();
};
exports.multerMiddleWare = multerMiddleWare;
const uploadDir = path_1.default.join(__dirname, '../../src/public/images');
const multerStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, exports.createIfNoExist)(uploadDir);
            cb(null, uploadDir);
        });
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + Math.round(Math.random() * 1E9);
        const fileExtension = path_1.default.extname(file.originalname);
        const basename = path_1.default.basename(file.originalname, fileExtension).replace(/ /g, '_');
        cb(null, basename + "_" + uniqueSuffix + fileExtension);
    }
});
exports.chatUpload = (0, multer_1.default)({
    storage: multerStorage,
    limits: { fileSize: 12 * 1000 * 1000 }
});
