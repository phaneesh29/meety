import { Server } from "socket.io";

import { env } from "../config/env.js";
import { authenticate } from "./middleware.js";
import { registerHandlers } from "./handlers.js";

export function createSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",").map((o) => o.trim()),
            credentials: true,
        },
    });

    io.use(authenticate);

    io.on("connection", (socket) => {
        registerHandlers(io, socket);
    });

    return io;
}
