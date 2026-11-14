import { db } from "@/db";
import { blockEdits, players, rooms } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#e67e22", "#1abc9c", "#ff6fb5", "#ecf0f1"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const name = String(body.name ?? "").trim().slice(0, 14) || "Ученик";
  if (code.length < 3) return Response.json({ error: "Код комнаты: минимум 3 символа" }, { status: 400 });

  const now = Date.now();
  let [room] = await db.select().from(rooms).where(eq(rooms.code, code));
  if (!room) {
    const seed = Math.floor(Math.random() * 1_000_000) + 1;
    await db
      .insert(rooms)
      .values({ code, seed, baldiUpdated: now, createdAt: now })
      .onConflictDoNothing();
    [room] = await db.select().from(rooms).where(eq(rooms.code, code));
  }

  const existing = await db.select().from(players).where(eq(players.roomCode, code));
  const active = existing.filter((p) => now - p.lastSeen < 6000);
  if (active.length >= 8) return Response.json({ error: "Комната заполнена (макс. 8)" }, { status: 400 });
  const used = new Set(active.map((p) => p.color));
  const color = COLORS.find((c) => !used.has(c)) ?? COLORS[existing.length % COLORS.length];

  // if the room is empty, restart Baldi's timer so he doesn't teleport
  if (active.length === 0) {
    await db.update(rooms).set({ baldiUpdated: now }).where(eq(rooms.code, code));
  }

  const [me] = await db
    .insert(players)
    .values({ roomCode: code, name, color, x: 32.5, y: 30, z: 32.5, lastSeen: now })
    .returning();

  const edits = await db
    .select({ id: blockEdits.id, x: blockEdits.x, y: blockEdits.y, z: blockEdits.z, t: blockEdits.t })
    .from(blockEdits)
    .where(eq(blockEdits.roomCode, code))
    .orderBy(asc(blockEdits.id));

  return Response.json({
    code,
    seed: room.seed,
    playerId: me.id,
    color,
    name,
    edits,
    lastEditId: edits.length ? edits[edits.length - 1].id : 0,
  });
}
