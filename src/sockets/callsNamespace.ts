import { CustomSocket } from "../controllers/SocketController";
import { on } from "./socketHandlers";

/** Signalling relay: every event is forwarded to the peer named by `data.to`. */
export const registerCallHandlers = (socket: CustomSocket): void => {
    console.log(`Calls namespace connected with id: ${socket.id}`);

    on(socket, "join_room", (data: any, callback: any) => {
        socket.join(data);
        if (typeof callback === "function") callback({ message: "Room joined" });
    });

    const relay = (event: string, payload: (data: any) => Record<string, unknown>) => {
        on(socket, event, (data: any) => {
            socket.to(data.to).emit(event, { ...payload(data), from: data.to });
        });
    };

    relay("ice-candidate-offer", (data) => ({ candidate: data.candidate }));
    relay("ice-candidate-answer", (data) => ({ candidate: data.candidate }));
    relay("call-offer", (data) => ({ offer: data.offer }));
    relay("call-answer", (data) => ({ answer: data.answer }));
    relay("stop-call", () => ({}));
};
