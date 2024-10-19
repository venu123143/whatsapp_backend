import { Socket } from 'socket.io';
import { ExtendedError, Namespace } from 'socket.io/dist/namespace';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Server } from "socket.io";
import { ConnectionType } from 'models/Connection';
export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
    user?: any;
}
export interface IO extends Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
}
export interface ChatNamespace extends Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
}
export declare const getAllMessages: (socket: CustomSocket, callback: any) => Promise<void>;
export declare const authorizeUser: (socket: CustomSocket, next: (err?: ExtendedError | undefined) => void) => Promise<void>;
export declare const JoinUserToOwnRoom: (socket: CustomSocket, next: (err?: ExtendedError | undefined) => void) => Promise<void>;
export declare const flushAllData: (io: ChatNamespace, socket: CustomSocket) => Promise<void>;
export declare const addFriend: (socket: CustomSocket, user: any) => Promise<void>;
export declare const createConnection: (socket: CustomSocket, userIds: string[], connType: ConnectionType, ConnectionInfo: any, callback: any) => Promise<void>;
export declare const getFriends: (socket: CustomSocket, io: ChatNamespace, user: any) => Promise<void>;
export declare const sendMessage: (io: ChatNamespace, socket: CustomSocket, data: any, callback: any) => Promise<void>;
export declare const removeMessage: (io: ChatNamespace, socket: CustomSocket, data: any) => Promise<void>;
export declare const createGroup: (io: ChatNamespace, socket: CustomSocket, group: any) => Promise<void>;
export declare const editMessage: (io: ChatNamespace, socket: CustomSocket, data: any, callback: any) => Promise<void>;
export declare const deleteMessage: (io: ChatNamespace, socket: CustomSocket, data: any, callback: any) => Promise<void>;
export declare const onlineStatus: (data: any, callback: any) => Promise<void>;
export declare const onDisconnect: (socket: CustomSocket) => Promise<void>;
export declare const updateSeen: (socket: CustomSocket, unread: any) => Promise<void>;
