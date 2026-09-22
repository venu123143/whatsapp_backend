/** Network/infrastructure hiccups: recoverable, the process keeps serving. */
const OPERATIONAL_ERROR_CODES = new Set([
    "ECONNRESET", "ECONNREFUSED", "ECONNABORTED", "EPIPE", "ETIMEDOUT",
    "ENOTFOUND", "EAI_AGAIN", "EHOSTUNREACH", "ENETUNREACH", "ERR_STREAM_PREMATURE_CLOSE",
]);

const OPERATIONAL_ERROR_NAMES = new Set([
    "SocketClosedUnexpectedlyError", "ClientClosedError", "ClientOfflineError",
    "ConnectionTimeoutError", "ReconnectStrategyError", "DisconnectsClientError",
    "MongoNetworkError", "MongoNetworkTimeoutError", "MongoServerSelectionError",
    "MongoNotConnectedError", "AxiosError",
]);

export const isOperationalError = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { name?: string; code?: string; message?: string };
    return (
        OPERATIONAL_ERROR_NAMES.has(candidate.name || "") ||
        OPERATIONAL_ERROR_CODES.has(candidate.code || "") ||
        /socket closed|connection (closed|lost|reset)|ECONNRESET/i.test(candidate.message || "")
    );
};

export interface ProcessGuardOptions {
    /** Graceful shutdown, run for signals and for genuinely fatal errors. */
    shutdown: (reason: string) => Promise<void>;
    /** How long a graceful shutdown may take before the process is forced out. */
    forceExitAfterMs?: number;
}

/**
 * Keeps the server up through recoverable failures.
 *
 * An unhandled rejection is never fatal: a dropped Redis or Mongo socket rejects
 * whatever command was in flight, and killing the process over that turns a blip
 * into an outage. Only a non-operational uncaught exception, which leaves the
 * process in an undefined state, still shuts down.
 */
export const registerProcessGuards = ({ shutdown, forceExitAfterMs = 10_000 }: ProcessGuardOptions): void => {
    let shuttingDown = false;

    const gracefulExit = async (reason: string, exitCode: number) => {
        if (shuttingDown) return;
        shuttingDown = true;

        // deliberately not unref'd: this timer is the guarantee that we exit.
        const forceExit = setTimeout(() => {
            console.error(`[process] graceful shutdown timed out after ${forceExitAfterMs}ms, forcing exit`);
            process.exit(exitCode);
        }, forceExitAfterMs);

        try {
            await shutdown(reason);
        } catch (error) {
            console.error("[process] error during shutdown:", error);
        } finally {
            clearTimeout(forceExit);
            process.exit(exitCode);
        }
    };

    process.on("unhandledRejection", (reason: unknown) => {
        console.error("[process] Unhandled rejection:", reason);
    });

    process.on("uncaughtException", (error: Error) => {
        if (isOperationalError(error)) {
            console.error(`[process] Recovered from operational error: ${error.message}`);
            return;
        }
        console.error("[process] Uncaught exception, shutting down:", error);
        void gracefulExit("uncaughtException", 1);
    });

    (["SIGTERM", "SIGINT"] as const).forEach((signal) => {
        process.on(signal, () => {
            console.log(`[process] received ${signal}`);
            void gracefulExit(signal, 0);
        });
    });
};
