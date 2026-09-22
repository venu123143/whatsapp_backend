import User from "../models/UserModel";
import { verifyAccessToken, ACCESS_COOKIE } from "../utils/jwtToken";
import { CustomSocket } from "../controllers/SocketController"

/** Minimal cookie header parser; socket.io handshakes do not run cookie-parser. */
const parseCookies = (header?: string): Record<string, string> => {
    if (!header) return {};
    return header.split(";").reduce<Record<string, string>>((acc, part) => {
        const index = part.indexOf("=");
        if (index > -1) {
            acc[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
        }
        return acc;
    }, {});
};

export const SOCKET_AUTH_FAILED = "SOCKET_AUTH_FAILED";

/**
 * Handshake rejections are tagged so the client can tell "your token is stale,
 * refresh once" apart from a transport problem worth retrying. Without the tag it
 * reconnects forever against a rejection no amount of retrying can fix.
 */
const authError = (message: string) => {
    const error = new Error(message) as Error & { data?: Record<string, string> };
    error.data = { code: SOCKET_AUTH_FAILED };
    return error;
};

export const socketMiddleware = async (socket: CustomSocket, next: (err?: any | undefined) => void) => {
    // the httpOnly cookie is the source of truth; handshake.auth stays as a fallback
    // for clients that cannot send credentials (e.g. a native app).
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const accessToken: string = cookies[ACCESS_COOKIE] || socket.handshake.auth?.token;

    if (!accessToken) {
        return next(authError("Socket connection failed, no access token."));
    }

    try {
        const decoded = verifyAccessToken(accessToken);
        const user = await User.findById(decoded._id);
        if (!user) {
            return next(authError("Socket connection failed, user not found."));
        }
        socket.user = user;
        next();
    } catch (error) {
        next(authError("Socket connection failed, token expired. Try again."));
    }
}
