import crypto from "node:crypto";

import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

import { db } from "../db/index.js";
import { rooms, roomSessions, users, roomMessages } from "../db/schema/index.js";

export async function createRoom(req, res, next) {
    try {
        const roomCode = crypto.randomUUID();

        const [room] = await db
            .insert(rooms)
            .values({ roomCode, createdBy: req.authContext.userId })
            .returning();

        return res.status(StatusCodes.CREATED).json({ room });
    } catch (error) {
        return next(error);
    }
}

export async function getMyRooms(req, res, next) {
    try {
        const myRooms = await db
            .select()
            .from(rooms)
            .where(eq(rooms.createdBy, req.authContext.userId));

        return res.status(StatusCodes.OK).json({ rooms: myRooms });
    } catch (error) {
        return next(error);
    }
}

export async function getRoomByCode(req, res, next) {
    try {
        const { roomCode } = req.params;

        const [room] = await db.select().from(rooms).where(eq(rooms.roomCode, roomCode)).limit(1);

        if (!room) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: { message: "Room not found.", statusCode: StatusCodes.NOT_FOUND },
            });
        }

        return res.status(StatusCodes.OK).json({ room });
    } catch (error) {
        return next(error);
    }
}

export async function deleteRoom(req, res, next) {
    try {
        const { roomCode } = req.params;

        const [room] = await db
            .select({ id: rooms.id, createdBy: rooms.createdBy })
            .from(rooms)
            .where(eq(rooms.roomCode, roomCode))
            .limit(1);

        if (!room) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: { message: "Room not found.", statusCode: StatusCodes.NOT_FOUND },
            });
        }

        if (room.createdBy !== req.authContext.userId) {
            return res.status(StatusCodes.FORBIDDEN).json({
                error: { message: "You can only delete your own rooms.", statusCode: StatusCodes.FORBIDDEN },
            });
        }

        await db.delete(rooms).where(eq(rooms.roomCode, roomCode));

        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
        return next(error);
    }
}

export async function getRoomAnalytics(req, res, next) {
    try {
        const { roomCode } = req.params;

        const [room] = await db.select().from(rooms).where(eq(rooms.roomCode, roomCode)).limit(1);

        if (!room) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: { message: "Room not found.", statusCode: StatusCodes.NOT_FOUND },
            });
        }

        if (room.createdBy !== req.authContext.userId) {
            return res.status(StatusCodes.FORBIDDEN).json({
                error: { message: "Not authorized to view analytics.", statusCode: StatusCodes.FORBIDDEN },
            });
        }

        const sessions = await db
            .select({
                id: roomSessions.id,
                joinedAt: roomSessions.joinedAt,
                leftAt: roomSessions.leftAt,
                username: users.clerkId, // We will map this via Clerk or just return it if we have username in DB
                email: users.email,
            })
            .from(roomSessions)
            .innerJoin(users, eq(users.id, roomSessions.userId))
            .where(eq(roomSessions.roomId, room.id))
            .orderBy(roomSessions.joinedAt);

        return res.status(StatusCodes.OK).json({ sessions });
    } catch (error) {
        return next(error);
    }
}

export async function getRoomMessages(req, res, next) {
    try {
        const { roomCode } = req.params;
        const [room] = await db
            .select()
            .from(rooms)
            .where(eq(rooms.roomCode, roomCode))
            .limit(1);

        if (!room) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: "Room not found.",
            });
        }

        const messages = await db
            .select({
                id: roomMessages.id,
                message: roomMessages.message,
                createdAt: roomMessages.createdAt,
                sender: users.username,
                clerkId: users.clerkId
            })
            .from(roomMessages)
            .innerJoin(users, eq(users.id, roomMessages.userId))
            .where(eq(roomMessages.roomId, room.id))
            .orderBy(roomMessages.createdAt);

        return res.status(StatusCodes.OK).json({ messages });
    } catch (error) {
        return next(error);
    }
}
