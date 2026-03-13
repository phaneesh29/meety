import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";

export function requireApiAuth(req, res, next) {
    const auth = getAuth(req);
    console.log("mdwr",JSON.stringify(auth));
    
    if (!auth.userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            error: {
                message: "Authentication required.",
                statusCode: StatusCodes.UNAUTHORIZED,
            },
        });
    }

    req.authContext = {
        orgId: auth.orgId ?? null,
        sessionId: auth.sessionId ?? null,
        userId: auth.userId,
    };

    return next();
}

export async function requireDbUser(req, res, next) {
    try {
        const [user] = await db.select({
                clerkId: users.clerkId,
                createdAt: users.createdAt,
                email: users.email,
                id: users.id,
            }).from(users).where(eq(users.clerkId, req.authContext.userId)).limit(1);

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: {
                    message: "User not found.",
                    statusCode: StatusCodes.NOT_FOUND,
                },
            });
        }

        req.authContext.dbUser = user;
        return next();
    } catch (error) {
        return next(error);
    }
}
