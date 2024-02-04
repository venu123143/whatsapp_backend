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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteImage = exports.uploadImage = void 0;
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});
const uploadImage = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    const upload = yield cloudinary_1.v2.uploader.upload(filePath);
    return { url: upload.secure_url, asset_id: upload.asset_id, public_id: upload.public_id };
});
exports.uploadImage = uploadImage;
const deleteImage = (public_id) => __awaiter(void 0, void 0, void 0, function* () {
    const deleted = yield cloudinary_1.v2.uploader.destroy(public_id);
    return { url: deleted.secure_url, asset_id: deleted.asset_id, public_id: deleted.public_id };
});
exports.deleteImage = deleteImage;
