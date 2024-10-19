/// <reference types="qs" />
/// <reference types="express" />
import { IUser } from "../models/UserModel";
export interface JwtPayload {
    _id: string;
    iat: number;
}
declare module 'express-serve-static-core' {
    interface Request {
        user?: IUser;
    }
}
export declare const authMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
