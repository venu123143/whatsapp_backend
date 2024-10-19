import { CustomSocket } from "../controllers/SocketController";
export declare const socketMiddleware: (socket: CustomSocket, next: (err?: any | undefined) => void) => Promise<void>;
