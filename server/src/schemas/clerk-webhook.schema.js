import * as z from "zod";

const userDataSchema = z.object({
    id: z.string(),
    email_addresses: z.array(z.object({ id: z.string(), email_address: z.email() })).default([]),
    primary_email_address_id: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
});

export const clerkEventSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("user.created"), data: userDataSchema }),
    z.object({ type: z.literal("user.updated"), data: userDataSchema }),
    z.object({ type: z.literal("user.deleted"), data: z.object({ id: z.string() }) }),
]);
