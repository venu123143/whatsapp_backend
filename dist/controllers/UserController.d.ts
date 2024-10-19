/// <reference types="qs" />
import { Request, Response } from "express";
import { MemoryStore, SessionData, Session } from "express-session";
declare module 'express-serve-static-core' {
    interface Request {
        session: SessionData & Session & CookieOptions & MemoryStore & {
            userDetails?: {
                sentAt: number;
                mobile: number;
                otp?: string;
            };
        };
    }
}
export declare const SendOtpViaSms: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const verifyOtp: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const logoutUser: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const UpdateUser: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const updateProfile: (req: Request, res: Response) => Promise<void>;
export declare const getAllUsers: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const uploadImagesToS3: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const deleteFromS3: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
