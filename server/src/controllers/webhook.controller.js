import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { clerkEventSchema } from "../schemas/clerk-webhook.schema.js";

const HANDLED_TYPES = new Set(["user.created", "user.updated", "user.deleted"]);

export async function handleClerkWebhook(req, res) {
    const wh = new Webhook(env.clerkWebhookSecret);

    let rawEvent;
    try {
        rawEvent = wh.verify(req.body, {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        });
    } catch {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid webhook signature." });
    }

    if (!HANDLED_TYPES.has(rawEvent.type)) {
        return res.status(StatusCodes.OK).json({ received: true });
    }

    const parsed = clerkEventSchema.safeParse(rawEvent);
    if (!parsed.success) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid webhook payload." });
    }

    const event = parsed.data;

    if (event.type === "user.created" || event.type === "user.updated") {
        const { id, email_addresses, primary_email_address_id } = event.data;
        const email =
            email_addresses.find((e) => e.id === primary_email_address_id)?.email_address ??
            email_addresses[0]?.email_address ??
            `${id}@users.clerk.invalid`;

        await db
            .insert(users)
            .values({ clerkId: id, email })
            .onConflictDoUpdate({ target: users.clerkId, set: { email } });
    }

    if (event.type === "user.deleted") {
        await db.delete(users).where(eq(users.clerkId, event.data.id));
    }

    return res.status(StatusCodes.OK).json({ received: true });
}
