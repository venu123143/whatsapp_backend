import cookieParser from "cookie-parser";
import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import morgan from "morgan";
import http from 'http'
import { Server } from "socket.io";


// Handle uncaught Exception
process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    console.log(`shutting down the server for handling uncaught Exception`);
});

// config env and database connection.
import "dotenv/config";
import "./config/db";

const app: Application = express();

import ErrorHandler from "./middleware/Errors"
import UserRouter from './routes/UserRoute'
import MsgRouter from './routes/MessageRoute'
import groupRoutes from './routes/GroupRoute'
import { socketMiddleware } from "./config/ConnectSession"

const server = http.createServer(app)

const io = new Server(server, { cors: { origin: "*", credentials: true } });

// cors, json and cookie-parser
const options: CorsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'https://whatsapp-chat-imbu.onrender.com'],
    credentials: true,
}

app.use(cors(options));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'))
// app.use(sessionMiddleware)
io.use(socketMiddleware)

// Middleware for socket authentication
const userMap: any = {}
console.log(userMap);
io.on("connect", (socket) => {
    console.log(`user connected with socket id:- ${socket.id}`);

    socket.on("user_login", (user: any) => {
        console.log(user)
        userMap[user] = socket.id
    })
    // console.log()
})

// controllers
app.get('/', (req, res) => {
    res.send('backend home route sucessful')
})

app.use("/api/users", UserRouter)
app.use("/api/msg", MsgRouter)
app.use('/api/groups', groupRoutes);





// Error handler and server port
app.use(ErrorHandler)

const port = process.env.PORT || 5000
let newServer = server.listen(port, () => {
    console.log(`server is running on port number ${port}`);
})


// unhandled promise rejection
process.on("unhandledRejection", (err: Error) => {
    console.log(`Shutting down the server for ${err.message}`);
    console.log(`Shutting down the server for unhandle promise rejection`);
    newServer.close(() => {
        process.exit(1)
    })

})
