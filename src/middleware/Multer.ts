import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from "path";
import RESPONSE from '../utils/Response';

export const createIfNoExist = (dirPath: string) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(dirPath)) {
            fs.mkdir(dirPath, { recursive: true }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve('resolve');
                }
            });
        } else {
            resolve('resolve');
        }
    });
};

// Middleware to handle Multer errors
export const multerMiddleWare = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        // Handle Multer specific errors
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
        RESPONSE.FailureResponse(res, 400, { message: err.message });
        return;
    }
    if (err) {
        // Handle any other errors
        RESPONSE.FailureResponse(res, 400, { message: err.message });
        return;
    }
    next();
};

const uploadDir = path.join(__dirname, '../../src/public/images');

const multerStorage = multer.diskStorage({
    destination: async function (req, file, cb) {
        await createIfNoExist(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const basename = path.basename(file.originalname, fileExtension).replace(/ /g, '_');
        cb(null, basename + "_" + uniqueSuffix + fileExtension);
    }
});

// // Filter to allow only specific image formats
// const multerFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//     const allowedMimeTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif'];
//     if (allowedMimeTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error("Unsupported file format"));
//     }
// };

export const chatUpload = multer({
    storage: multerStorage,
    limits: { fileSize: 12 * 1000 * 1000 }
});