import { Server, Namespace } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import cookieParser from "cookie-parser";
import express, { Application, Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import mongoose from "mongoose";
import morgan from "morgan";
import http from "http";

import "dotenv/config";
import session, { connectSessionStore } from "./utils/session";
import { connectDatabase, isDatabaseHealthy } from "./config/db";
import { closeRedisClients, connectRedisClient, createRedisClient, isRedisHealthy, onRedisReady, RedisClient } from "./config/redis";
import ErrorHandler from "./middleware/Errors";
import UserRouter from "./routes/UserRoute";
import MsgRouter from "./routes/MessageRoute";
import groupRoutes from "./routes/GroupRoute";
import CallsRouter from "./routes/CallsRoute";
import { authorizeUser, CustomSocket, JoinUserToOwnRoom } from "./controllers/SocketController";
import { socketMiddleware } from "./config/ConnectSession";
import { registerChatHandlers } from "./sockets/chatNamespace";
import { registerCallHandlers } from "./sockets/callsNamespace";
import { safeMiddleware } from "./sockets/socketHandlers";
import { registerProcessGuards } from "./utils/processGuards";
import { withTimeout } from "./utils/withTimeout";
import { instrument } from "@socket.io/admin-ui";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

const ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5052",
    "https://vchat.nerchuko.in",
    "https://whatsappapi.nerchuko.in",
];

const SESSION_HEADERS = ["sessionID", "sessionId", "sessionid"];

const CLOSE_TIMEOUT_MS = 3_000;

const ADAPTER_PUB = "adapter:pub";
const ADAPTER_SUB = "adapter:sub";

class App {
    public readonly app: Application;
    public readonly server: http.Server;
    public readonly io: Server;
    public readonly port: string | number;
    public readonly chatNamespace: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
    public readonly callsNamespace: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
    private pubClient: RedisClient | undefined;
    private subClient: RedisClient | undefined;
    private adapterAttached = false;

    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = process.env.PORT || 5000;
        this.io = new Server(this.server, {
            cors: {
                origin: [...ALLOWED_ORIGINS, "https://admin.socket.io"],
                methods: ["GET", "POST", "OPTIONS"],
                allowedHeaders: ["Content-Type", "Authorization", ...SESSION_HEADERS],
                exposedHeaders: SESSION_HEADERS,
                credentials: true,
            },
            transports: ["websocket", "polling"],
            allowEIO3: true,
            pingTimeout: 60000,
            pingInterval: 25000,
        });
        this.chatNamespace = this.io.of("/chat");
        this.callsNamespace = this.io.of("/calls");

        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeSockets();
        // the error handler has to be registered after every route.
        this.app.use(ErrorHandler);
    }

    private initializeMiddlewares() {
        // behind a TLS terminating proxy express-session refuses to set a Secure
        // cookie unless it knows the original request was https.
        this.app.set("trust proxy", 1);

        const corsOptions: CorsOptions = {
            origin: ALLOWED_ORIGINS,
            credentials: true,
            exposedHeaders: SESSION_HEADERS,
        };
        this.app.use(cors(corsOptions));
        this.app.options(/.*/, cors(corsOptions));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.use(morgan("dev"));
        this.app.use(session);
    }

    private initializeRoutes() {
        this.app.get("/", (_req: Request, res: Response) => {
            res.send("Backend home route successful");
        });

        // lets a load balancer route around this instance while a dependency is down.
        this.app.get("/health", (_req: Request, res: Response) => {
            const dependencies = {
                mongo: isDatabaseHealthy(),
                sessionRedis: isRedisHealthy("session"),
                adapterRedis: isRedisHealthy(ADAPTER_PUB),
            };
            const healthy = Object.values(dependencies).every(Boolean);
            res.status(healthy ? 200 : 503).json({
                status: healthy ? "ok" : "degraded",
                uptime: Math.round(process.uptime()),
                dependencies,
            });
        });

        this.app.use("/api/users", UserRouter);
        this.app.use("/api/msg", MsgRouter);
        this.app.use("/api/groups", groupRoutes);
        this.app.use("/api/calls", CallsRouter);
    }

    private initializeSockets() {
        this.chatNamespace.use(safeMiddleware("auth", socketMiddleware));
        this.chatNamespace.use(safeMiddleware("authorizeUser", authorizeUser));
        this.callsNamespace.use(safeMiddleware("auth", socketMiddleware));
        this.callsNamespace.use(safeMiddleware("joinOwnRoom", JoinUserToOwnRoom));

        this.chatNamespace.on("connect", (socket: CustomSocket) => registerChatHandlers(this.chatNamespace, socket));
        this.callsNamespace.on("connect", (socket: CustomSocket) => registerCallHandlers(socket));

        // an admin UI without auth is not something to expose publicly.
        if (process.env.SOCKET_ADMIN_UI === "true") {
            instrument(this.io, { auth: false });
        }
    }

    /**
     * The Redis adapter is what lets several instances share socket rooms.
     * Without it the server still works, it is just single instance, so a failure
     * here is logged and the boot continues.
     */
    private async connectSocketAdapter(): Promise<void> {
        this.pubClient = createRedisClient(ADAPTER_PUB, process.env.REDIS_ADAPTOR);
        this.subClient = createRedisClient(ADAPTER_SUB, process.env.REDIS_ADAPTOR);

        const attachAdapter = () => {
            if (this.adapterAttached) return;
            if (!this.pubClient?.isReady || !this.subClient?.isReady) return;
            this.io.adapter(createAdapter(this.pubClient, this.subClient));
            this.adapterAttached = true;
            console.log("[socket] redis adapter attached");
        };

        await Promise.all([
            connectRedisClient(ADAPTER_PUB, this.pubClient),
            connectRedisClient(ADAPTER_SUB, this.subClient),
        ]);

        attachAdapter();

        if (!this.adapterAttached) {
            console.warn("[socket] running without the redis adapter, rooms are local to this instance");
            // attach late if Redis comes back, instead of staying single instance forever.
            onRedisReady(this.pubClient, attachAdapter);
            onRedisReady(this.subClient, attachAdapter);
        }
    }

    public async start(): Promise<void> {
        // listen first: an unreachable dependency must not delay readiness. Mongoose
        // buffers commands until it connects and the redis clients retry in the
        // background, so requests are served as soon as each one comes up.
        this.listen();

        await Promise.all([
            connectDatabase(),
            connectSessionStore(),
            this.connectSocketAdapter(),
        ]);
    }

    private listen() {
        this.server.on("error", (error: NodeJS.ErrnoException) => {
            if (error.code === "EADDRINUSE") {
                console.error(`[server] port ${this.port} is already in use`);
                process.exit(1);
            }
            console.error("[server] error:", error.message);
        });

        this.server.listen(this.port, () => {
            console.log(`Server is running on port number ${this.port}`);
        });
    }

    /** Drains connections, then releases every external handle. */
    public async shutdown(reason: string): Promise<void> {
        console.log(`[server] shutting down (${reason})`);

        // every step is bounded and timed: one handle that refuses to close must not
        // hold the shutdown open, and the log says which one misbehaved.
        const TIMED_OUT = Symbol("timed-out");
        const step = async (name: string, work: Promise<unknown>) => {
            const startedAt = Date.now();
            const result = await withTimeout<unknown>(work, CLOSE_TIMEOUT_MS, TIMED_OUT);
            if (result === TIMED_OUT) {
                console.warn(`[server] ${name} did not close within ${CLOSE_TIMEOUT_MS}ms, continuing`);
                return;
            }
            console.log(`[server] ${name} closed in ${Date.now() - startedAt}ms`);
        };

        // io.close() also closes the http server it was attached to.
        const httpClosed = new Promise<void>((resolve) => this.io.close(() => resolve()));
        // keep-alive sockets would otherwise hold the close open until they time out.
        this.server.closeAllConnections?.();

        await step("http/socket.io", httpClosed);
        await step("redis", closeRedisClients());

        if (mongoose.connection.readyState === 1) {
            await step("mongo", mongoose.disconnect());
        } else if (mongoose.connection.readyState !== 0) {
            // still selecting a server: disconnect() would wait for that to finish,
            // destroy() drops the connection immediately.
            await step("mongo", mongoose.connection.destroy());
        }
        console.log("[server] shutdown complete");
    }
}

const application = new App();

registerProcessGuards({ shutdown: (reason) => application.shutdown(reason) });

void application.start();

export default application;
