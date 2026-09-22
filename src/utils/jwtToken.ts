import crypto from "crypto";
import jwt from "jsonwebtoken";
import { CookieOptions, Request, Response } from "express";
import RefreshToken from "../models/RefreshTokenModel";
import User, { IUser } from "../models/UserModel";
import FancyError from "./FancyError";

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";

export const ACCESS_TOKEN_TTL = "1d";
export const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;          // 1 day
export const REFRESH_TOKEN_TTL_MS = 45 * 24 * 60 * 60 * 1000;    // 45 days

export interface AccessTokenPayload {
    _id: string;
    type: "access";
    iat: number;
    exp: number;
}

export interface IssuedTokens {
    accessToken: string;
    refreshToken: string;
}

const isProduction = () => process.env.NODE_ENV === "production";

const secretKey = (): jwt.Secret => {
    const secret = process.env.SECRET_KEY;
    if (!secret) {
        throw new FancyError("SECRET_KEY is not configured on the server", 500);
    }
    return secret as jwt.Secret;
};

/** Refresh tokens are opaque random strings; only their hash reaches the database. */
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const signAccessToken = (user: IUser): string =>
    jwt.sign({ _id: String(user._id), type: "access" }, secretKey(), { expiresIn: ACCESS_TOKEN_TTL });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
    jwt.verify(token, secretKey()) as AccessTokenPayload;

/** Creates a brand new refresh token. Pass `family` to continue an existing login chain. */
export const issueRefreshToken = async (
    userId: string,
    context: { family?: string; userAgent?: string; ip?: string } = {}
): Promise<string> => {
    const token = crypto.randomBytes(64).toString("hex");
    await RefreshToken.create({
        user: userId,
        tokenHash: hashToken(token),
        family: context.family || crypto.randomUUID(),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        userAgent: context.userAgent,
        ip: context.ip,
    });
    return token;
};

export const issueTokenPair = async (user: IUser, req: Request): Promise<IssuedTokens> => ({
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(String(user._id), {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
    }),
});

/**
 * Single use rotation: the presented token is burned and a new one from the same
 * family takes its place. Replaying a burned token kills the entire family, since
 * that only happens when a token was stolen.
 */
export const rotateRefreshToken = async (
    rawToken: string,
    req: Request
): Promise<{ user: IUser } & IssuedTokens> => {
    if (!rawToken) {
        throw new FancyError("No refresh token provided, please login again", 401, "REFRESH_TOKEN_MISSING");
    }

    const stored = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
    if (!stored) {
        throw new FancyError("Invalid refresh token, please login again", 401, "REFRESH_TOKEN_INVALID");
    }

    if (stored.usedAt || stored.revokedAt) {
        // Replay of a token we already rotated away -> assume the chain is compromised.
        await RefreshToken.updateMany(
            { family: stored.family, revokedAt: null },
            { revokedAt: new Date() }
        );
        throw new FancyError("Refresh token already used, please login again", 401, "REFRESH_TOKEN_REUSED");
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
        throw new FancyError("Refresh token expired, please login again", 401, "REFRESH_TOKEN_EXPIRED");
    }

    const user = await User.findById(stored.user);
    if (!user) {
        await RefreshToken.updateMany({ family: stored.family, revokedAt: null }, { revokedAt: new Date() });
        throw new FancyError("User no longer exists, please login again", 401, "USER_NOT_FOUND");
    }

    const refreshToken = await issueRefreshToken(String(user._id), {
        family: stored.family,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
    });

    stored.usedAt = new Date();
    stored.replacedByHash = hashToken(refreshToken);
    await stored.save();

    return { user, accessToken: signAccessToken(user), refreshToken };
};

/** Logout of the current device. Idempotent, so a stale cookie is not an error. */
export const revokeRefreshToken = async (rawToken?: string): Promise<void> => {
    if (!rawToken) return;
    await RefreshToken.updateOne(
        { tokenHash: hashToken(rawToken), revokedAt: null },
        { revokedAt: new Date() }
    );
};

/** Logout everywhere. */
export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
    await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
};

const cookieOptions = (maxAge: number): CookieOptions => ({
    httpOnly: true,
    secure: isProduction(),
    // the SPA is served from another origin in production, which needs SameSite=None,
    // and browsers only accept that together with Secure.
    sameSite: isProduction() ? "none" : "lax",
    path: "/",
    maxAge,
});

export const setAuthCookies = (res: Response, tokens: IssuedTokens): void => {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ACCESS_TOKEN_TTL_MS));
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_TOKEN_TTL_MS));
};

export const clearAuthCookies = (res: Response): void => {
    const { maxAge, ...options } = cookieOptions(0);
    res.clearCookie(ACCESS_COOKIE, options);
    res.clearCookie(REFRESH_COOKIE, options);
};

/** Reads the access token from the cookie, falling back to an Authorization header. */
export const readAccessToken = (req: Request): string | undefined => {
    const fromCookie = req.cookies?.[ACCESS_COOKIE];
    if (fromCookie) return fromCookie;

    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);

    return undefined;
};

export default {
    signAccessToken,
    verifyAccessToken,
    issueTokenPair,
    issueRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllRefreshTokens,
    setAuthCookies,
    clearAuthCookies,
    readAccessToken,
};
