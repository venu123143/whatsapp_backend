import mongoose from "mongoose"

const RETRY_DELAY_MS = 5_000;

mongoose.connection.on("error", (error: Error) => {
    // driver level errors are logged; mongoose keeps retrying on its own.
    console.error(`[mongo] ${error.message}`);
});
mongoose.connection.on("disconnected", () => console.warn("[mongo] disconnected"));
mongoose.connection.on("reconnected", () => console.log("[mongo] reconnected"));

/**
 * Connects in the background and keeps retrying. A database that is briefly
 * unreachable should delay requests, not kill the process.
 */
export const connectDatabase = async (): Promise<boolean> => {
    const uri = process.env.DATABASE;
    if (!uri) {
        console.error("[mongo] DATABASE is not configured, skipping connection");
        return false;
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10_000,
            maxPoolSize: 20,
        });
        console.log("[mongo] connection sucessful");
        return true;
    } catch (error: any) {
        console.error(`[mongo] connection failed: ${error?.message}, retrying in ${RETRY_DELAY_MS / 1000}s`);
        setTimeout(() => { void connectDatabase(); }, RETRY_DELAY_MS).unref();
        return false;
    }
};

export const isDatabaseHealthy = (): boolean => mongoose.connection.readyState === 1;

export default connectDatabase
