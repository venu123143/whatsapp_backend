import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";
export const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.connect().then(() => console.log("redis connected")).catch((err) => console.log(err))
const store = new RedisStore({ client: redisClient })

redisClient.info('memory').then((info) => {
    const usedMemory = parseInt(info.split('\r\n').find(line => line.startsWith('used_memory:'))?.split(':')[1] || '0');
    console.log(`socket memory usage: ${usedMemory} bytes`);
});

const ses = session({
    name: 'loginSession',
    store: store,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET as string,
    cookie: {
        sameSite: 'none',
        secure: false,
        httpOnly: true,
        maxAge: 10 * 60 * 1000 // 10 min
    }
})


export async function getSession(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
        store.get(sessionId, (err, ses) => {
            if (err) {
                reject(err);
            } else {
                resolve(ses);
            }
        });
    });
}

export async function setSession(sessionId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
        store.set(sessionId, data, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export async function removeSession(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        store.destroy(sessionId, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export default ses