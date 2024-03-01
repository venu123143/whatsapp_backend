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
exports.uploadPhoto = exports.blogImgResize = exports.productImgResize = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const currentDirName = (0, path_1.dirname)(__filename);
const sharp_1 = __importDefault(require("sharp"));
const path_2 = __importDefault(require("path"));
const FancyError_1 = __importDefault(require("../utils/FancyError"));
const destinationFolder = path_2.default.join(currentDirName, '../public/images');
if (!fs_1.default.existsSync(destinationFolder)) {
    fs_1.default.mkdirSync(destinationFolder, { recursive: true });
}
console.log(destinationFolder);
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
const productImgResize = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.files)
        return next();
    const files = req.files;
    yield Promise.all(files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, sharp_1.default)(file === null || file === void 0 ? void 0 : file.path)
            .resize(300, 300)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`dist/public/images/products/${file === null || file === void 0 ? void 0 : file.filename}`);
        fs_1.default.unlinkSync(`dist/public/images/products/${file === null || file === void 0 ? void 0 : file.filename}`);
    })));
    next();
});
exports.productImgResize = productImgResize;
const blogImgResize = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.files)
        return next();
    const files = req.files;
    yield Promise.all(files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, sharp_1.default)(file === null || file === void 0 ? void 0 : file.path)
            .resize(300, 300)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`dist/public/images/blogs/${file === null || file === void 0 ? void 0 : file.filename}`);
        fs_1.default.unlinkSync(`dist/public/images/blogs/${file === null || file === void 0 ? void 0 : file.filename}`);
    })));
    next();
});
exports.blogImgResize = blogImgResize;
exports.uploadPhoto = (0, multer_1.default)({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: { fieldSize: 8 * 1000 * 1000 }
});
