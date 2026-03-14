import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const feedback = pgTable("feedback", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
