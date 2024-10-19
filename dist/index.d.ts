/// <reference types="node" />
import { Server, Namespace } from "socket.io";
import { Application } from "express";
import http from "http";
import "dotenv/config";
import "./config/db";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
declare class App {
    app: Application;
    server: http.Server;
    io: Server;
    port: string | number;
    chatNamespace: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
    callsNamespace: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
    private redisConnected;
    private pubClient;
    private subClient;
    constructor();
    private initializeMiddlewares;
    private initializeRoutes;
    private handleError;
    private connectRedis;
    private initializeSockets;
    listen(): void;
}
declare const app: App;
export default app;
