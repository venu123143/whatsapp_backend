import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
export declare const createIfNoExist: (dirPath: string) => Promise<unknown>;
export declare const multerMiddleWare: (err: Error, req: Request, res: Response, next: NextFunction) => void;
export declare const chatUpload: multer.Multer;
