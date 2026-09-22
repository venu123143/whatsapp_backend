import { CustomSocket } from "../controllers/SocketController";

type AnyHandler = (...args: any[]) => any | Promise<any>;
type SocketMiddleware = (socket: CustomSocket, next: (err?: any) => void) => any | Promise<any>;

/**
 * Wraps a socket listener so a rejected handler is reported to the caller
 * instead of escaping as an unhandled rejection that takes the process down.
 */
export const safeHandler = (event: string, handler: AnyHandler): AnyHandler =>
    async (...args: any[]) => {
        try {
            await handler(...args);
        } catch (error: any) {
            console.error(`[socket:${event}] ${error?.message || error}`);
            const callback = args[args.length - 1];
            if (typeof callback === "function") {
                callback({ success: false, message: "Something went wrong, please try again" });
            }
        }
    };

/** Same idea for namespace middleware: a throw must reject the handshake, not the process. */
export const safeMiddleware = (name: string, middleware: SocketMiddleware): SocketMiddleware =>
    async (socket, next) => {
        try {
            await middleware(socket, next);
        } catch (error: any) {
            console.error(`[socket:${name}] ${error?.message || error}`);
            next(new Error("Connection failed, please try again"));
        }
    };

/** Registers `event` with the error boundary applied. */
export const on = (socket: CustomSocket, event: string, handler: AnyHandler): void => {
    socket.on(event, safeHandler(event, handler));
};
