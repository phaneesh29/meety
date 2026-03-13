import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: varchar("clerk_id", { length: 191 }).notNull().unique(),
    username: varchar("username", { length: 191 }).notNull().unique(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
    id: uuid("id").defaultRandom().primaryKey(),
    roomCode: varchar("room_code", { length: 64 }).notNull().unique(),
    createdBy: varchar("created_by", { length: 191 }).notNull().references(() => users.clerkId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const roomSessions = pgTable("room_sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
});

export const roomMessages = pgTable("room_messages", {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
    createdRooms: many(rooms),
    roomSessions: many(roomSessions),
    roomMessages: many(roomMessages),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
    createdBy: one(users, {
        fields: [rooms.createdBy],
        references: [users.clerkId],
    }),
    sessions: many(roomSessions),
    messages: many(roomMessages),
}));

export const roomSessionsRelations = relations(roomSessions, ({ one }) => ({
    room: one(rooms, {
        fields: [roomSessions.roomId],
        references: [rooms.id],
    }),
    user: one(users, {
        fields: [roomSessions.userId],
        references: [users.id],
    }),
}));

export const roomMessagesRelations = relations(roomMessages, ({ one }) => ({
    room: one(rooms, {
        fields: [roomMessages.roomId],
        references: [rooms.id],
    }),
    user: one(users, {
        fields: [roomMessages.userId],
        references: [users.id],
    }),
}));
