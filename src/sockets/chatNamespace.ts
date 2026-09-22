import {
    ChatNamespace, CustomSocket,
    sendMessage, createGroup, updateSeen, onDisconnect, onlineStatus,
    getAllMessages, editMessage, createConnection, deleteMessage,
} from "../controllers/SocketController";
import { ConnectionType } from "../models/Connection";
import { on } from "./socketHandlers";

/** Every listener here is wrapped by `on`, so a failing event answers its callback. */
export const registerChatHandlers = (namespace: ChatNamespace, socket: CustomSocket): void => {
    console.log(`User ${socket?.user?.name} with UUID ${socket?.user?.socket_id} connected`);

    on(socket, "create_connection", (userIds: string[], connType: ConnectionType, connectionInfo: any, callback: any) =>
        createConnection(socket, userIds, connType, connectionInfo, callback));

    on(socket, "online_status", (data: any, callback: any) => onlineStatus(data, callback));

    on(socket, "send_message", (data: any, callback: any) => sendMessage(namespace, socket, data, callback));

    on(socket, "edit_message", (data: any, callback: any) => editMessage(namespace, socket, data, callback));

    on(socket, "delete_message", (data: any, callback: any) => deleteMessage(namespace, socket, data, callback));

    on(socket, "get_all_messages", (_input: any, callback: any) => {
        if (typeof callback !== "function") {
            console.error("get_all_messages called without a callback");
            return;
        }
        return getAllMessages(socket, callback);
    });

    on(socket, "create_group", (group: any) => createGroup(namespace, socket, group));

    on(socket, "update_seen", (msg: any) => updateSeen(socket, msg));

    on(socket, "disconnecting", () => onDisconnect(socket));
};
