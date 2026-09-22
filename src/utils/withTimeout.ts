/**
 * Bounds a promise that may never settle, e.g. closing a handle whose remote end
 * is gone. Resolves with `fallback` instead of hanging the caller.
 */
export const withTimeout = async <T>(promise: Promise<T>, ms: number, fallback?: T): Promise<T | undefined> => {
    let timer: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T | undefined>((resolve) => {
                timer = setTimeout(() => resolve(fallback), ms);
                timer.unref();
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
};
