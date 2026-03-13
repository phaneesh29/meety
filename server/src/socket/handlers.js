import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { rooms, users, roomSessions, roomMessages } from "../db/schema/index.js";

export function registerHandlers(io, socket) {
    const { userId, displayName } = socket.data;
    console.log(`socket connected: ${socket.id} (User: ${displayName})`);

    socket.on("join-room", async (roomCode, callback) => {
        try {
            const [room] = await db
                .select()
                .from(rooms)
                .where(eq(rooms.roomCode, roomCode))
                .limit(1);

            if (!room) {
                if (callback) callback({ success: false, error: "Room not found" });
                return;
            }

            // Find User DB id for tracking session
            const [dbUser] = await db
                .select()
                .from(users)
                .where(eq(users.clerkId, userId))
                .limit(1);

            if (dbUser) {
                const [session] = await db.insert(roomSessions).values({
                    roomId: room.id,
                    userId: dbUser.id,
                }).returning();

                if (!socket.data.sessions) socket.data.sessions = {};
                socket.data.sessions[roomCode] = session.id;
            }

            socket.join(roomCode);
            console.log(`User ${displayName} joined room: ${roomCode}`);

            socket.to(roomCode).emit("user-joined", { displayName });

            if (callback) callback({ success: true, room });
        } catch (error) {
            console.error("Join room error:", error);
            if (callback) callback({ success: false, error: "Server error" });
        }
    });

    socket.on("leave-room", async (roomCode) => {
        if (socket.data.sessions?.[roomCode]) {
            await db.update(roomSessions)
                .set({ leftAt: new Date() })
                .where(eq(roomSessions.id, socket.data.sessions[roomCode]));
            delete socket.data.sessions[roomCode];
        }

        socket.leave(roomCode);
        socket.to(roomCode).emit("user-left", { displayName });
        console.log(`User ${displayName} left room: ${roomCode}`);
    });

    socket.on("chat-message", async (roomCode, messageText) => {
        try {
            const [room] = await db
                .select()
                .from(rooms)
                .where(eq(rooms.roomCode, roomCode))
                .limit(1);

            if (!room) return;

            const [dbUser] = await db
                .select()
                .from(users)
                .where(eq(users.clerkId, userId))
                .limit(1);

            if (!dbUser) return;

            const [insertedMsg] = await db
                .insert(roomMessages)
                .values({
                    roomId: room.id,
                    userId: dbUser.id,
                    message: messageText,
                })
                .returning();

            // Broadcast to others
            socket.to(roomCode).emit("chat-received", {
                id: insertedMsg.id,
                message: messageText,
                sender: displayName,
                createdAt: insertedMsg.createdAt,
            });

            // Send back to sender
            socket.emit("chat-received", {
                id: insertedMsg.id,
                message: messageText,
                sender: displayName,
                createdAt: insertedMsg.createdAt,
                isSelf: true,
            });
        } catch (error) {
            console.error("Chat message error:", error);
        }
    });

    socket.on("typing-start", (roomCode) => {
        socket.to(roomCode).emit("user-typing", { displayName, isTyping: true });
    });

    socket.on("typing-stop", (roomCode) => {
        socket.to(roomCode).emit("user-typing", { displayName, isTyping: false });
    });

    socket.on("disconnecting", async () => {
        if (socket.data.sessions) {
            for (const [roomCode, sessionId] of Object.entries(socket.data.sessions)) {
                await db.update(roomSessions)
                    .set({ leftAt: new Date() })
                    .where(eq(roomSessions.id, sessionId));
                    
                if (roomCode !== socket.id) { 
                    socket.to(roomCode).emit("user-left", { displayName });
                }
            }
        } else {
            // fallback if no session tracking
            for (const roomCode of socket.rooms) {
                if (roomCode !== socket.id) { 
                    socket.to(roomCode).emit("user-left", { displayName });
                }
            }
        }
    });

    socket.on("disconnect", (reason) => {
        console.log(`socket disconnected: ${socket.id} — ${reason}`);
    });
}
