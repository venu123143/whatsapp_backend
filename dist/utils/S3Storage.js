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
exports.deleteMultipleFilesFromS3 = exports.deleteFileFromS3 = exports.getFileUrlFromS3 = exports.uploadFileToS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = __importDefault(require("fs"));
const s3 = new client_s3_1.S3Client({
    region: "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_TOKEN_ID,
        secretAccessKey: process.env.S3_SECRET_KEY,
        accountId: process.env.S3_ACCOUNT_ID
    }
});
const uploadFileToS3 = (file) => __awaiter(void 0, void 0, void 0, function* () {
    const readStream = fs_1.default.createReadStream(file.path);
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: file.filename,
        Body: readStream,
        ContentType: file.mimetype,
    };
    const command = new client_s3_1.PutObjectCommand(params);
    yield s3.send(command);
    return file.filename;
});
exports.uploadFileToS3 = uploadFileToS3;
const getFileUrlFromS3 = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const publicUrl = `https://pub-1dcaf054bca64dc586ed8817e6affbd4.r2.dev/${key}`;
    return publicUrl;
});
exports.getFileUrlFromS3 = getFileUrlFromS3;
const deleteFileFromS3 = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
    };
    const command = new client_s3_1.DeleteObjectCommand(params);
    try {
        const result = yield s3.send(command);
        return result;
    }
    catch (error) {
        throw new Error("Unable to delete file from S3");
    }
});
exports.deleteFileFromS3 = deleteFileFromS3;
const deleteMultipleFilesFromS3 = (keys) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Delete: {
            Objects: keys.map((key) => ({ Key: key })),
        },
    };
    const command = new client_s3_1.DeleteObjectsCommand(params);
    try {
        const response = yield s3.send(command);
        console.log(`Files deleted successfully: ${keys}`);
        return response.Deleted;
    }
    catch (error) {
        console.error(`Error deleting multiple files: ${keys}`, error);
        throw new Error("Unable to delete files from S3");
    }
});
exports.deleteMultipleFilesFromS3 = deleteMultipleFilesFromS3;
