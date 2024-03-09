"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPhoto = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const currentDirName = (0, path_1.dirname)(__filename);
const path_2 = __importDefault(require("path"));
const FancyError_1 = __importDefault(require("../utils/FancyError"));
const destinationFolder = path_2.default.join(currentDirName, '../public/images');
if (!fs_1.default.existsSync(destinationFolder)) {
    fs_1.default.mkdirSync(destinationFolder, { recursive: true });
}
const multerStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, destinationFolder);
    },
    filename: function (req, file, cb) {
        const uniqueSufix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSufix + ".jpeg");
    }
});
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    }
    else {
        cb(new FancyError_1.default("Unsupported file format", 400));
    }
};
exports.uploadPhoto = (0, multer_1.default)({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: { fieldSize: 8 * 1000 * 1000 }
});
