import { bigint, doublePrecision, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
  code: text("code").primaryKey(),
  seed: integer("seed").notNull(),
  collected: text("collected").notNull().default(""),
  status: text("status").notNull().default("playing"),
  baldiX: doublePrecision("baldi_x").notNull().default(4),
  baldiZ: doublePrecision("baldi_z").notNull().default(4),
  baldiUpdated: bigint("baldi_updated", { mode: "number" }).notNull().default(0),
  caughtCount: integer("caught_count").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(0),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  x: doublePrecision("x").notNull().default(32),
  y: doublePrecision("y").notNull().default(20),
  z: doublePrecision("z").notNull().default(32),
  ry: doublePrecision("ry").notNull().default(0),
  lastSeen: bigint("last_seen", { mode: "number" }).notNull().default(0),
  notebooks: integer("notebooks").notNull().default(0),
});

export const blockEdits = pgTable("block_edits", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull(),
  playerId: integer("player_id").notNull().default(0),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  z: integer("z").notNull(),
  t: integer("t").notNull(),
});
