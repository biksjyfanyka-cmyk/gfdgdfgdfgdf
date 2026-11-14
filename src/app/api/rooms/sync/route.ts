import { db } from "@/db";
import { blockEdits, players, rooms } from "@/db/schema";
import { and, asc, eq, gt, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

const NOTEBOOKS = 7;
const SPAWN = { x: 32.5, z: 32.5 };
const CORNERS = [
  [4, 4],
  [59, 4],
  [4, 59],
  [59, 59],
];

type Edit = { x: number; y: number; z: number; t: number };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "bad request" }, { status: 400 });
  const code = String(body.code ?? "");
  const playerId = Number(body.playerId);
  const now = Date.now();

  const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
  const [me] = await db.select().from(players).where(eq(players.id, playerId));
  if (!room || !me || me.roomCode !== code) return Response.json({ error: "no session" }, { status: 404 });

  // --- reset the game (after win)
  let collectedArr = room.collected ? room.collected.split(",").map(Number) : [];
  let status = room.status;
  let baldiX = room.baldiX;
  let baldiZ = room.baldiZ;
  let caughtCount = room.caughtCount;
  if (body.reset && status === "won") {
    collectedArr = [];
    status = "playing";
    baldiX = 4;
    baldiZ = 4;
    caughtCount = 0;
    await db.update(players).set({ notebooks: 0 }).where(eq(players.roomCode, code));
  }

  // --- player state
  const px = Number.isFinite(body.x) ? Number(body.x) : me.x;
  const py = Number.isFinite(body.y) ? Number(body.y) : me.y;
  const pz = Number.isFinite(body.z) ? Number(body.z) : me.z;
  const pry = Number.isFinite(body.ry) ? Number(body.ry) : me.ry;

  // --- notebook collection
  let notebooksMine = me.notebooks;
  if (status === "playing" && Number.isInteger(body.collect) && body.collect >= 0 && body.collect < NOTEBOOKS) {
    if (!collectedArr.includes(body.collect)) {
      collectedArr.push(body.collect);
      notebooksMine += 1;
      if (collectedArr.length >= NOTEBOOKS) status = "won";
    }
  }

  // --- block edits
  const edits: Edit[] = Array.isArray(body.edits) ? body.edits.slice(0, 40) : [];
  const valid = edits.filter(
    (e) =>
      Number.isInteger(e.x) && Number.isInteger(e.y) && Number.isInteger(e.z) && Number.isInteger(e.t) &&
      e.x >= 0 && e.x < 64 && e.z >= 0 && e.z < 64 && e.y >= 1 && e.y < 32 && e.t >= 0 && e.t <= 8,
  );
  if (valid.length) {
    await db.insert(blockEdits).values(valid.map((e) => ({ roomCode: code, playerId, x: e.x, y: e.y, z: e.z, t: e.t })));
  }

  // --- active players
  const all = await db.select().from(players).where(eq(players.roomCode, code));
  const active = all.filter((p) => p.id === playerId || now - p.lastSeen < 5000);

  // --- Baldi simulation (server-authoritative, shared for all players)
  const dt = Math.min(1, Math.max(0, (now - room.baldiUpdated) / 1000));
  let respawn = false;
  if (status === "playing") {
    const targets = active.map((p) => (p.id === playerId ? { ...p, x: px, z: pz } : p));
    if (targets.length) {
      let best = targets[0];
      let bd = Infinity;
      for (const t of targets) {
        const d = Math.hypot(t.x - baldiX, t.z - baldiZ);
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
      const speed = 2.1 + collectedArr.length * 0.55;
      const step = Math.min(bd, speed * dt);
      if (bd > 0.001) {
        baldiX += ((best.x - baldiX) / bd) * step;
        baldiZ += ((best.z - baldiZ) / bd) * step;
      }
      // caught?
      const myDist = Math.hypot(px - baldiX, pz - baldiZ);
      if (myDist < 1.6) {
        respawn = true;
        caughtCount += 1;
        const far = CORNERS.map(([cx, cz]) => ({ cx, cz, d: Math.hypot(cx - px, cz - pz) })).sort((a, b) => b.d - a.d)[0];
        baldiX = far.cx;
        baldiZ = far.cz;
      }
    }
  }

  await db.update(players).set({ x: respawn ? SPAWN.x : px, y: respawn ? 30 : py, z: respawn ? SPAWN.z : pz, ry: pry, lastSeen: now, notebooks: notebooksMine }).where(eq(players.id, playerId));
  await db
    .update(rooms)
    .set({ collected: collectedArr.join(","), status, baldiX, baldiZ, baldiUpdated: now, caughtCount })
    .where(eq(rooms.code, code));

  // --- new edits from others
  const since = Number(body.since) || 0;
  const newEdits = await db
    .select({ id: blockEdits.id, x: blockEdits.x, y: blockEdits.y, z: blockEdits.z, t: blockEdits.t })
    .from(blockEdits)
    .where(and(eq(blockEdits.roomCode, code), gt(blockEdits.id, since), ne(blockEdits.playerId, playerId)))
    .orderBy(asc(blockEdits.id));
  const maxId = newEdits.length ? newEdits[newEdits.length - 1].id : since;

  // include ids of own edits too so cursor can advance past them
  const ownMax = await db
    .select({ id: blockEdits.id })
    .from(blockEdits)
    .where(and(eq(blockEdits.roomCode, code), eq(blockEdits.playerId, playerId), gt(blockEdits.id, since)));
  const cursor = Math.max(maxId, ...ownMax.map((r) => r.id), since);

  return Response.json({
    players: active
      .filter((p) => p.id !== playerId)
      .map((p) => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, z: p.z, ry: p.ry, notebooks: p.notebooks })),
    me: { notebooks: notebooksMine },
    edits: newEdits,
    cursor,
    room: { collected: collectedArr, status, baldiX, baldiZ, caught: caughtCount, online: active.length },
    respawn,
  });
}
