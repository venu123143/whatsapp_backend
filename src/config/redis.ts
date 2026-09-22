import { createClient } from "redis";
import { withTimeout } from "../utils/withTimeout";

export type RedisClient = ReturnType<typeof createClient>;

const INITIAL_RECONNECT_DELAY_MS = 100;
const MAX_RECONNECT_DELAY_MS = 10_000;
const CONNECT_TIMEOUT_MS = 10_000;
const QUIT_TIMEOUT_MS = 2_000;

export interface RedisClientOptions {
    /**
     * When true, commands issued while the connection is down reject immediately
     * instead of queueing until it returns. Use it for clients on the request path,
     * so a Redis outage fails fast rather than hanging the response.
     */
    failFastWhenOffline?: boolean;
}

/** Every client we create, so shutdown can close them all. */
const registry = new Map<string, RedisClient>();

/**
 * Builds a Redis client that treats a dropped connection as an outage to ride out
 * rather than a fatal error.
 *
 * Two things here keep the process alive:
 *  - the `error` listener: node-redis re-throws socket errors as uncaught
 *    exceptions when nothing is listening, which is what took the server down.
 *  - `reconnectStrategy`: returning a delay (never an Error) makes the client
 *    retry forever with capped exponential backoff instead of giving up.
 */
export const createRedisClient = (name: string, url?: string, options: RedisClientOptions = {}): RedisClient => {
    const existing = registry.get(name);
    if (existing) return existing;

    const client = createClient({
        url,
        disableOfflineQueue: options.failFastWhenOffline === true,
        socket: {
            keepAlive: true,
            connectTimeout: CONNECT_TIMEOUT_MS,
            reconnectStrategy: (retries: number) => {
                const backoff = Math.min(INITIAL_RECONNECT_DELAY_MS * 2 ** retries, MAX_RECONNECT_DELAY_MS);
                // jitter spreads reconnects out when several clients drop together.
                return backoff + Math.floor(Math.random() * 100);
            },
        },
    });

    client.on("error", (error: Error) => {
        // logged, never thrown: commands issued while down reject on their own.
        console.error(`[redis:${name}] ${error.message}`);
    });
    client.on("ready", () => console.log(`[redis:${name}] ready`));
    client.on("reconnecting", () => console.warn(`[redis:${name}] reconnecting...`));
    client.on("end", () => console.warn(`[redis:${name}] connection closed`));

    registry.set(name, client);
    return client;
};

/**
 * Connects without ever rejecting: a Redis outage at boot must not stop the API
 * from serving. The reconnect strategy keeps trying in the background.
 */
export const connectRedisClient = async (name: string, client: RedisClient): Promise<boolean> => {
    try {
        // connect() never settles while the reconnect strategy is still retrying,
        // so it is bounded here; the retry loop carries on in the background and
        // `ready` fires if the server comes back later.
        if (!client.isOpen) await withTimeout(client.connect(), CONNECT_TIMEOUT_MS);
    } catch (error: any) {
        console.error(`[redis:${name}] initial connection failed: ${error?.message}`);
    }

    if (!client.isReady) {
        console.warn(`[redis:${name}] not ready yet, continuing without it`);
    }
    // isReady, not the absence of a throw: connect() can resolve while the client
    // is still only retrying in the background.
    return client.isReady;
};

/** Runs `listener` the next time the client becomes usable. */
export const onRedisReady = (client: RedisClient, listener: () => void): void => {
    client.once("ready", listener);
};

/** Diagnostics only, so a failure here is logged and forgotten. */
export const logMemoryUsage = async (name: string, client: RedisClient): Promise<void> => {
    try {
        if (!client.isReady) return;
        const info = await client.info("memory");
        const usedMemory = info
            .split("\r\n")
            .find((line) => line.startsWith("used_memory:"))
            ?.split(":")[1];
        console.log(`[redis:${name}] memory usage: ${usedMemory || "unknown"} bytes`);
    } catch (error: any) {
        console.warn(`[redis:${name}] could not read memory usage: ${error?.message}`);
    }
};

export const isRedisHealthy = (name: string): boolean => Boolean(registry.get(name)?.isReady);

/** Best effort close on shutdown; a quit that never answers must not block the exit. */
export const closeRedisClients = async (): Promise<void> => {
    await Promise.all(
        Array.from(registry.entries()).map(async ([name, client]) => {
            try {
                // a disconnected client can never answer QUIT, so only ask a ready one.
                if (client.isReady) await withTimeout(client.quit(), QUIT_TIMEOUT_MS);
            } catch (error: any) {
                console.warn(`[redis:${name}] failed to close cleanly: ${error?.message}`);
            } finally {
                try {
                    client.destroy();
                } catch {
                    // already closed, nothing to release.
                }
            }
        })
    );
    registry.clear();
};
