import session from "express-session";
import { RedisStore } from "connect-redis";
import { connectRedisClient, createRedisClient, logMemoryUsage } from "../config/redis";
import FancyError from "./FancyError";

export const SESSION_REDIS = "session";

// on the request path: better a fast 503 than a request that hangs until Redis returns.
export const redisClient = createRedisClient(SESSION_REDIS, process.env.REDIS_URL, { failFastWhenOffline: true });

/** Called from the app bootstrap so startup order is explicit, not a module side effect. */
export const connectSessionStore = async (): Promise<boolean> => {
    const connected = await connectRedisClient(SESSION_REDIS, redisClient);
    if (connected) await logMemoryUsage(SESSION_REDIS, redisClient);
    return connected;
};

const store = new RedisStore({ client: redisClient });

const ses = session({
    name: 'loginSession',
    store: store,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET as string,
    cookie: {
        // SameSite=None is only accepted together with Secure, so pair them per env.
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 10 * 60 * 1000 // 10 min
    }
})

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const storeUnavailable = (operation: string, error: unknown) => {
    console.error(`[session] ${operation} failed: ${errorMessage(error)}`);
    return new FancyError("Session store is temporarily unavailable, please try again", 503, "SESSION_STORE_UNAVAILABLE");
};

export function getSession(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!sessionId) return resolve(null);
        store.get(sessionId, (err, ses) => {
            // a store outage is reported as 503, not as a wrong OTP.
            if (err) return reject(storeUnavailable("read", err));
            resolve(ses);
        });
    });
}

export function setSession(sessionId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
        store.set(sessionId, data, (err) => {
            if (err) return reject(storeUnavailable("write", err));
            resolve();
        });
    });
}

/** Persists the current request's session, so a store outage surfaces before we answer. */
export function saveSession(req: { session: { save: (cb: (err?: any) => void) => void } }): Promise<void> {
    return new Promise((resolve, reject) => {
        req.session.save((err?: any) => {
            if (err) return reject(storeUnavailable("save", err));
            resolve();
        });
    });
}

/** Best effort cleanup: failing to drop a 10 minute OTP session must not fail the login. */
export function removeSession(sessionId: string): Promise<void> {
    return new Promise((resolve) => {
        if (!sessionId) return resolve();
        store.destroy(sessionId, (err) => {
            if (err) console.warn(`[session] could not destroy ${sessionId}: ${errorMessage(err)}`);
            resolve();
        });
    });
}

export default ses
