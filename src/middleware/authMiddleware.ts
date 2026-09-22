import jwt from "jsonwebtoken"
import asyncHandler from "express-async-handler"
import { Request, Response, NextFunction } from "express"
import User, { IUser } from "../models/UserModel";
import FancyError from "../utils/FancyError"
import { readAccessToken, verifyAccessToken } from "../utils/jwtToken"

export interface JwtPayload {
    _id: string;
    type?: string;
    iat: number;
    exp: number;
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: IUser;
    }
}

export const authMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const token = readAccessToken(req)
    if (!token) {
        throw new FancyError('No access token provided, please login again', 401, 'ACCESS_TOKEN_MISSING')
    }

    let decoded: JwtPayload
    try {
        decoded = verifyAccessToken(token)
    } catch (error) {
        // the client tells these two apart: only an expired token is worth refreshing.
        if (error instanceof jwt.TokenExpiredError) {
            throw new FancyError('Access token expired', 401, 'ACCESS_TOKEN_EXPIRED')
        }
        throw new FancyError('Not authorized, invalid token. Please login again', 401, 'ACCESS_TOKEN_INVALID')
    }

    const user = await User.findById(decoded._id)
    if (!user) {
        // previously this branch never called next(), so the request hung forever.
        throw new FancyError('User no longer exists, please login again', 401, 'USER_NOT_FOUND')
    }

    req.user = user
    next()
})
