import { verifyToken, createClerkClient } from "@clerk/express";

import { env } from "../config/env.js";

const clerk = createClerkClient({ secretKey: env.clerkSecretKey });

export async function authenticate(socket, next) {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
        const payload = await verifyToken(token, { secretKey: env.clerkSecretKey });
        
        const user = await clerk.users.getUser(payload.sub);
        
        const displayName = user.username;

        socket.data.userId = payload.sub;
        socket.data.displayName = displayName;
    } catch (err) {
        console.error("Socket Auth Error:", err);
        return next(new Error("Unauthorized"));
    }

    next();
}
