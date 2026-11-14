"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BLOCKS, HEIGHT, HOTBAR, NOTEBOOK_COUNT, SIZE, SPAWN, generateWorld, idx, notebookPositions, topY } from "@/lib/world";

type RemotePlayer = { id: number; name: string; color: string; x: number; y: number; z: number; ry: number; notebooks: number };
type Hud = {
  collected: number[];
  status: string;
  online: number;
  caught: number;
  players: { id: number; name: string; color: string; notebooks: number }[];
  myNotebooks: number;
  nearest: number | null;
};

const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");

function hash3(x: number, y: number, z: number) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], s: 0.8, k: "side" },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], s: 0.8, k: "side" },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1, k: "top" },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.5, k: "bottom" },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], s: 0.65, k: "side" },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], s: 0.65, k: "side" },
] as const;

function makeBaldiTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const g = c.getContext("2d")!;
  // legs
  g.fillStyle = "#2b3a67";
  g.fillRect(80, 360, 40, 120);
  g.fillRect(136, 360, 40, 120);
  g.fillStyle = "#111";
  g.fillRect(74, 478, 50, 30);
  g.fillRect(132, 478, 50, 30);
  // arms
  g.fillStyle = "#1f8a3a";
  g.fillRect(34, 235, 36, 110);
  g.fillRect(186, 235, 36, 110);
  g.fillStyle = "#f2c9a0";
  g.fillRect(34, 340, 36, 30);
  g.fillRect(186, 340, 36, 30);
  // ruler
  g.save();
  g.translate(204, 330);
  g.rotate(-0.25);
  g.fillStyle = "#e0b04a";
  g.fillRect(-6, -150, 14, 190);
  g.fillStyle = "#6b4a10";
  for (let i = 0; i < 12; i++) g.fillRect(-6, -150 + i * 15, i % 2 ? 6 : 10, 2);
  g.restore();
  // shirt
  g.fillStyle = "#2ea043";
  g.beginPath();
  g.moveTo(70, 230);
  g.lineTo(186, 230);
  g.lineTo(190, 370);
  g.lineTo(66, 370);
  g.closePath();
  g.fill();
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(100, 228);
  g.lineTo(128, 262);
  g.lineTo(156, 228);
  g.closePath();
  g.fill();
  g.fillStyle = "#d22";
  g.beginPath();
  g.moveTo(122, 258);
  g.lineTo(134, 258);
  g.lineTo(140, 340);
  g.lineTo(128, 354);
  g.lineTo(116, 340);
  g.closePath();
  g.fill();
  // neck + head
  g.fillStyle = "#e5b88a";
  g.fillRect(112, 205, 32, 30);
  g.fillStyle = "#f2c9a0";
  g.strokeStyle = "#b98a5e";
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(128, 120, 82, 98, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // ears
  g.beginPath();
  g.ellipse(46, 125, 14, 24, 0, 0, Math.PI * 2);
  g.ellipse(210, 125, 14, 24, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // eyes
  g.fillStyle = "#fff";
  g.beginPath();
  g.ellipse(94, 112, 24, 18, 0, 0, Math.PI * 2);
  g.ellipse(162, 112, 24, 18, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = "#000";
  g.beginPath();
  g.arc(98, 114, 5, 0, Math.PI * 2);
  g.arc(158, 114, 5, 0, Math.PI * 2);
  g.fill();
  // angry brows
  g.strokeStyle = "#222";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(66, 78);
  g.lineTo(116, 98);
  g.moveTo(190, 78);
  g.lineTo(140, 98);
  g.stroke();
  // nose
  g.strokeStyle = "#b98a5e";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(128, 118);
  g.lineTo(120, 150);
  g.lineTo(134, 152);
  g.stroke();
  // mouth
  g.fillStyle = "#5a0d0d";
  g.beginPath();
  g.ellipse(128, 182, 38, 16, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff";
  g.fillRect(100, 170, 56, 9);
  return new THREE.CanvasTexture(c);
}

function makeNotebookTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2a5fd6";
  g.fillRect(0, 0, 128, 160);
  g.fillStyle = "#1c43a0";
  g.fillRect(0, 0, 14, 160);
  g.fillStyle = "#fff";
  g.fillRect(28, 30, 86, 50);
  g.fillStyle = "#111";
  g.font = "bold 15px sans-serif";
  g.textAlign = "center";
  g.fillText("МАТЕМАТИКА", 71, 52);
  g.font = "bold 20px sans-serif";
  g.fillText("1+1=?", 71, 72);
  g.fillStyle = "#fff";
  g.font = "bold 40px sans-serif";
  g.fillText("📓", 71, 130);
  return new THREE.CanvasTexture(c);
}

function makeNameSprite(name: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(0, 8, 256, 48);
  g.fillStyle = color;
  g.font = "bold 30px sans-serif";
  g.textAlign = "center";
  g.fillText(name, 128, 44);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  s.scale.set(1.6, 0.4, 1);
  return s;
}

export default function Game({ code, name }: { code: string; name: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef(false);
  const slotRef = useRef(0);
  const [slot, setSlot] = useState(0);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [me, setMe] = useState<{ name: string; color: string } | null>(null);
  const [hud, setHud] = useState<Hud>({ collected: [], status: "playing", online: 1, caught: 0, players: [], myNotebooks: 0, nearest: null });

  useEffect(() => {
    const mount = mountRef.current!;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      let join: {
        seed: number;
        playerId: number;
        name: string;
        color: string;
        edits: { x: number; y: number; z: number; t: number }[];
        lastEditId: number;
        error?: string;
      };
      try {
        const res = await fetch("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, name }),
        });
        join = await res.json();
        if (!res.ok) throw new Error(join.error || "Не удалось войти");
      } catch (e) {
        setError((e as Error).message);
        return;
      }
      if (cancelled) return;
      setMe({ name: join.name, color: join.color });

      const playerId: number = join.playerId;
      const world = generateWorld(join.seed);
      for (const e of join.edits as { x: number; y: number; z: number; t: number }[]) world[idx(e.x, e.y, e.z)] = e.t;
      let cursor: number = join.lastEditId;

      // ---------- three setup
      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      mount.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const sky = new THREE.Color(0x9ad0f5);
      scene.background = sky;
      scene.fog = new THREE.Fog(sky, 30, 85);
      const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.05, 200);
      camera.rotation.order = "YXZ";

      // ---------- chunks
      const CH = 16;
      const NC = SIZE / CH;
      const chunkMat = new THREE.MeshBasicMaterial({ vertexColors: true });
      const chunks = new Map<number, THREE.Mesh>();
      const dirty = new Set<number>();
      const getB = (x: number, y: number, z: number) => {
        if (y < 0) return 1;
        if (y >= HEIGHT || x < 0 || z < 0 || x >= SIZE || z >= SIZE) return 0;
        return world[idx(x, y, z)];
      };
      const solid = (x: number, y: number, z: number) => {
        if (y < 0) return true;
        if (y >= HEIGHT) return false;
        if (x < 0 || z < 0 || x >= SIZE || z >= SIZE) return true;
        return world[idx(x, y, z)] !== 0;
      };
      const tmpColor = new THREE.Color();
      function buildChunk(cx: number, cz: number) {
        const pos: number[] = [];
        const col: number[] = [];
        const ind: number[] = [];
        for (let y = 0; y < HEIGHT; y++)
          for (let z = cz * CH; z < (cz + 1) * CH; z++)
            for (let x = cx * CH; x < (cx + 1) * CH; x++) {
              const t = world[idx(x, y, z)];
              if (!t) continue;
              const def = BLOCKS[t];
              const jit = 0.93 + hash3(x, y, z) * 0.14;
              for (const F of FACES) {
                if (getB(x + F.n[0], y + F.n[1], z + F.n[2])) continue;
                tmpColor.set(F.k === "top" ? def.top : F.k === "bottom" ? def.bottom : def.side);
                let m = F.s * jit;
                if (t === 6 && F.k === "top" && (x + z) % 2) m *= 0.8;
                const vi = pos.length / 3;
                for (const c of F.c) {
                  pos.push(x + c[0], y + c[1], z + c[2]);
                  col.push(tmpColor.r * m, tmpColor.g * m, tmpColor.b * m);
                }
                ind.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
              }
            }
        const key = cz * NC + cx;
        const old = chunks.get(key);
        if (old) {
          scene.remove(old);
          old.geometry.dispose();
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
        geo.setIndex(ind);
        const mesh = new THREE.Mesh(geo, chunkMat);
        scene.add(mesh);
        chunks.set(key, mesh);
      }
      for (let cz = 0; cz < NC; cz++) for (let cx = 0; cx < NC; cx++) buildChunk(cx, cz);

      const markDirty = (x: number, z: number) => {
        const cx = Math.floor(x / CH);
        const cz = Math.floor(z / CH);
        dirty.add(cz * NC + cx);
        const lx = x % CH;
        const lz = z % CH;
        if (lx === 0 && cx > 0) dirty.add(cz * NC + cx - 1);
        if (lx === CH - 1 && cx < NC - 1) dirty.add(cz * NC + cx + 1);
        if (lz === 0 && cz > 0) dirty.add((cz - 1) * NC + cx);
        if (lz === CH - 1 && cz < NC - 1) dirty.add((cz + 1) * NC + cx);
      };
      const pending: { x: number; y: number; z: number; t: number }[] = [];
      const setBlock = (x: number, y: number, z: number, t: number, local: boolean) => {
        if (x < 0 || z < 0 || x >= SIZE || z >= SIZE || y < 1 || y >= HEIGHT) return;
        world[idx(x, y, z)] = t;
        markDirty(x, z);
        if (local) pending.push({ x, y, z, t });
      };

      // ---------- highlight
      const hl = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
        new THREE.LineBasicMaterial({ color: 0x000000 }),
      );
      hl.visible = false;
      scene.add(hl);

      // ---------- notebooks
      const nbPos = notebookPositions(join.seed, world);
      const nbTex = makeNotebookTexture();
      const nbMeshes: THREE.Group[] = nbPos.map((p) => {
        const g = new THREE.Group();
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.7, 0.875),
          new THREE.MeshBasicMaterial({ map: nbTex, side: THREE.DoubleSide, fog: false }),
        );
        g.add(plane);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 40, 8, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.28, depthWrite: false }),
        );
        beam.position.y = 20;
        g.add(beam);
        g.position.set(p.x, p.y, p.z);
        scene.add(g);
        return g;
      });
      let collected: number[] = [];
      let pendingCollect: number | null = null;

      // ---------- Baldi
      const baldi = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeBaldiTexture(), transparent: true }));
      baldi.scale.set(1.3, 2.6, 1);
      scene.add(baldi);
      let bTarget = { x: 4, z: 4 };
      let bPos = { x: 4, z: 4 };

      // ---------- remote players
      const remotes = new Map<number, { group: THREE.Group; target: RemotePlayer }>();
      function makeRemote(p: RemotePlayer) {
        const g = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: p.color });
        const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshBasicMaterial({ color: 0x33415c }));
        legs.position.y = 0.35;
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), mat);
        torso.position.y = 1.1;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshBasicMaterial({ color: 0xf0c8a0 }));
        head.position.y = 1.72;
        const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        eyes.position.set(0, 1.76, -0.23);
        const label = makeNameSprite(p.name, p.color);
        label.position.y = 2.25;
        g.add(legs, torso, head, eyes, label);
        scene.add(g);
        g.position.set(p.x, p.y, p.z);
        return g;
      }

      // ---------- player
      const pos = new THREE.Vector3(SPAWN.x, topY(world, SPAWN.x, SPAWN.z) + 0.05, SPAWN.z);
      const vel = new THREE.Vector3();
      let yaw = 0;
      let pitch = 0;
      let onGround = false;
      const keys = new Set<string>();
      const R = 0.3;
      const collides = (x: number, y: number, z: number) => {
        const x0 = Math.floor(x - R), x1 = Math.floor(x + R);
        const y0 = Math.floor(y), y1 = Math.floor(y + 1.79);
        const z0 = Math.floor(z - R), z1 = Math.floor(z + R);
        for (let yy = y0; yy <= y1; yy++)
          for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) if (solid(xx, yy, zz)) return true;
        return false;
      };
      function moveAxis(dt: number) {
        // x
        let nx = pos.x + vel.x * dt;
        if (collides(nx, pos.y, pos.z)) { vel.x = 0; nx = pos.x; }
        pos.x = nx;
        let nz = pos.z + vel.z * dt;
        if (collides(pos.x, pos.y, nz)) { vel.z = 0; nz = pos.z; }
        pos.z = nz;
        let ny = pos.y + vel.y * dt;
        onGround = false;
        if (collides(pos.x, ny, pos.z)) {
          if (vel.y < 0) {
            ny = Math.floor(ny) + 1 + 0.0005;
            onGround = true;
          } else ny = pos.y;
          vel.y = 0;
        }
        pos.y = ny;
        if (pos.y < -10) { pos.set(SPAWN.x, topY(world, SPAWN.x, SPAWN.z) + 0.05, SPAWN.z); vel.set(0, 0, 0); }
      }

      // ---------- raycast
      const EYE = 1.62;
      function raycast(maxD: number) {
        const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
        const ox = pos.x, oy = pos.y + EYE, oz = pos.z;
        let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
        const sx = Math.sign(dir.x), sy = Math.sign(dir.y), sz = Math.sign(dir.z);
        const tDx = dir.x ? Math.abs(1 / dir.x) : Infinity;
        const tDy = dir.y ? Math.abs(1 / dir.y) : Infinity;
        const tDz = dir.z ? Math.abs(1 / dir.z) : Infinity;
        let tMx = dir.x ? ((sx > 0 ? x + 1 - ox : ox - x)) * tDx : Infinity;
        let tMy = dir.y ? ((sy > 0 ? y + 1 - oy : oy - y)) * tDy : Infinity;
        let tMz = dir.z ? ((sz > 0 ? z + 1 - oz : oz - z)) * tDz : Infinity;
        let px = x, py = y, pz = z;
        let t = 0;
        while (t <= maxD) {
          if (y >= 0 && y < HEIGHT && x >= 0 && x < SIZE && z >= 0 && z < SIZE && world[idx(x, y, z)]) {
            return { hit: [x, y, z] as const, prev: [px, py, pz] as const };
          }
          px = x; py = y; pz = z;
          if (tMx < tMy && tMx < tMz) { x += sx; t = tMx; tMx += tDx; }
          else if (tMy < tMz) { y += sy; t = tMy; tMy += tDy; }
          else { z += sz; t = tMz; tMz += tDz; }
        }
        return null;
      }

      // ---------- audio
      let actx: AudioContext | null = null;
      const tone = (f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "square", delay = 0) => {
        if (!actx) return;
        const t = actx.currentTime + delay;
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
        o.connect(g).connect(actx.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
      };

      // ---------- events
      const onKey = (e: KeyboardEvent, down: boolean) => {
        if (e.code.startsWith("Digit") && down) {
          const n = Number(e.code.slice(5)) - 1;
          if (n >= 0 && n < HOTBAR.length) { slotRef.current = n; setSlot(n); }
        }
        if (down) keys.add(e.code); else keys.delete(e.code);
        if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
      };
      const kd = (e: KeyboardEvent) => onKey(e, true);
      const ku = (e: KeyboardEvent) => onKey(e, false);
      const onMove = (e: MouseEvent) => {
        if (document.pointerLockElement !== renderer.domElement) return;
        yaw -= e.movementX * 0.0022;
        pitch = Math.max(-1.55, Math.min(1.55, pitch - e.movementY * 0.0022));
      };
      const onLockChange = () => setLocked(document.pointerLockElement === renderer.domElement);
      const onDown = (e: MouseEvent) => {
        if (document.pointerLockElement !== renderer.domElement) {
          renderer.domElement.requestPointerLock();
          if (!actx) actx = new AudioContext();
          if (actx.state === "suspended") actx.resume();
          return;
        }
        const r = raycast(6);
        if (!r) return;
        if (e.button === 0) {
          const [x, y, z] = r.hit;
          if (y === 0 || world[idx(x, y, z)] === 9) return;
          setBlock(x, y, z, 0, true);
        } else if (e.button === 2) {
          const [x, y, z] = r.prev;
          if (y < 1 || y >= HEIGHT || x < 0 || z < 0 || x >= SIZE || z >= SIZE) return;
          // don't place inside the player
          if (x + 1 > pos.x - R && x < pos.x + R && z + 1 > pos.z - R && z < pos.z + R && y + 1 > pos.y && y < pos.y + 1.8) return;
          setBlock(x, y, z, HOTBAR[slotRef.current], true);
        }
      };
      const onWheel = (e: WheelEvent) => {
        const n = (slotRef.current + (e.deltaY > 0 ? 1 : -1) + HOTBAR.length) % HOTBAR.length;
        slotRef.current = n;
        setSlot(n);
      };
      const onCtx = (e: Event) => e.preventDefault();
      const onResize = () => {
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("keydown", kd);
      window.addEventListener("keyup", ku);
      window.addEventListener("resize", onResize);
      document.addEventListener("mousemove", onMove);
      document.addEventListener("pointerlockchange", onLockChange);
      renderer.domElement.addEventListener("mousedown", onDown);
      renderer.domElement.addEventListener("wheel", onWheel);
      renderer.domElement.addEventListener("contextmenu", onCtx);

      // ---------- network sync
      let inflight = false;
      let msgTimer: ReturnType<typeof setTimeout> | undefined;
      const sync = async () => {
        if (inflight) return;
        inflight = true;
        const edits = pending.splice(0);
        const reset = resetRef.current;
        resetRef.current = false;
        try {
          const res = await fetch("/api/rooms/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code, playerId, x: pos.x, y: pos.y, z: pos.z, ry: yaw, edits, since: cursor, collect: pendingCollect, reset,
            }),
          });
          if (!res.ok) throw new Error("sync");
          const d = await res.json();
          cursor = d.cursor;
          for (const e of d.edits as { x: number; y: number; z: number; t: number }[]) setBlock(e.x, e.y, e.z, e.t, false);
          collected = d.room.collected;
          if (pendingCollect !== null && collected.includes(pendingCollect)) {
            tone(520, 1040, 0.15, 0.15, "square");
            tone(780, 1560, 0.2, 0.15, "square", 0.12);
            pendingCollect = null;
          }
          bTarget = { x: d.room.baldiX, z: d.room.baldiZ };
          const seen = new Set<number>();
          for (const p of d.players as RemotePlayer[]) {
            seen.add(p.id);
            const r = remotes.get(p.id);
            if (r) r.target = p;
            else remotes.set(p.id, { group: makeRemote(p), target: p });
          }
          for (const [id, r] of remotes) {
            if (!seen.has(id)) {
              scene.remove(r.group);
              remotes.delete(id);
            }
          }
          if (d.respawn) {
            pos.set(SPAWN.x, topY(world, SPAWN.x, SPAWN.z) + 0.05, SPAWN.z);
            vel.set(0, 0, 0);
            tone(200, 40, 0.5, 0.4, "sawtooth");
            setMsg("Балди поймал тебя! Ты вернулся на старт.");
            clearTimeout(msgTimer);
            msgTimer = setTimeout(() => setMsg(null), 3500);
          }
          let nearest: number | null = null;
          nbPos.forEach((p, i) => {
            if (collected.includes(i)) return;
            const dd = Math.hypot(p.x - pos.x, p.z - pos.z);
            if (nearest === null || dd < nearest) nearest = dd;
          });
          setHud({
            collected,
            status: d.room.status,
            online: d.room.online,
            caught: d.room.caught,
            myNotebooks: d.me.notebooks,
            nearest,
            players: [
              ...(d.players as RemotePlayer[]).map((p) => ({ id: p.id, name: p.name, color: p.color, notebooks: p.notebooks })),
              { id: playerId, name: join.name, color: join.color, notebooks: d.me.notebooks },
            ],
          });
          setReady(true);
        } catch {
          pending.unshift(...edits);
          if (reset) resetRef.current = true;
        } finally {
          inflight = false;
        }
      };
      const syncTimer = setInterval(sync, 100);
      sync();

      // ---------- main loop
      const clock = new THREE.Clock();
      let raf = 0;
      let slapT = 0;
      let time = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, clock.getDelta());
        time += dt;

        // movement
        const active = document.pointerLockElement === renderer.domElement;
        let fx = 0, fz = 0;
        if (active) {
          if (keys.has("KeyW")) fz += 1;
          if (keys.has("KeyS")) fz -= 1;
          if (keys.has("KeyD")) fx += 1;
          if (keys.has("KeyA")) fx -= 1;
        }
        const len = Math.hypot(fx, fz) || 1;
        const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 6.4 : 4.3;
        const sin = Math.sin(yaw), cos = Math.cos(yaw);
        vel.x = ((-sin * fz + cos * fx) / len) * speed;
        vel.z = ((-cos * fz - sin * fx) / len) * speed;
        vel.y -= 26 * dt;
        if (vel.y < -40) vel.y = -40;
        if (active && keys.has("Space") && onGround) vel.y = 8.6;
        moveAxis(dt);

        // camera
        camera.position.set(pos.x, pos.y + EYE, pos.z);
        camera.rotation.set(pitch, yaw, 0);

        // rebuild dirty chunks
        if (dirty.size) {
          for (const k of dirty) buildChunk(k % NC, Math.floor(k / NC));
          dirty.clear();
        }

        // highlight
        const r = active ? raycast(6) : null;
        if (r) {
          hl.visible = true;
          hl.position.set(r.hit[0] + 0.5, r.hit[1] + 0.5, r.hit[2] + 0.5);
        } else hl.visible = false;

        // notebooks
        nbMeshes.forEach((g, i) => {
          const got = collected.includes(i);
          g.visible = !got;
          if (got) return;
          g.children[0].rotation.y = time * 1.6;
          g.children[0].position.y = Math.sin(time * 2 + i) * 0.12;
          const p = nbPos[i];
          if (pendingCollect === null && Math.hypot(p.x - pos.x, p.y - (pos.y + 1), p.z - pos.z) < 2.6) pendingCollect = i;
        });

        // Baldi
        const k = 1 - Math.exp(-dt * 8);
        bPos.x += (bTarget.x - bPos.x) * k;
        bPos.z += (bTarget.z - bPos.z) * k;
        baldi.position.set(bPos.x, topY(world, bPos.x, bPos.z) + 1.3, bPos.z);
        const bd = Math.hypot(bPos.x - pos.x, bPos.z - pos.z);
        if (vignetteRef.current) vignetteRef.current.style.opacity = String(Math.max(0, Math.min(0.9, 1 - bd / 18)));
        slapT -= dt;
        if (slapT <= 0 && actx && bd < 40) {
          tone(150, 45, 0.14, Math.max(0.03, Math.min(0.5, 1.2 - bd / 25)), "square");
          slapT = Math.max(0.28, Math.min(1.8, bd / 14));
        }

        // remote players
        for (const [, rp] of remotes) {
          const t = rp.target;
          rp.group.position.x += (t.x - rp.group.position.x) * k;
          rp.group.position.y += (t.y - rp.group.position.y) * k;
          rp.group.position.z += (t.z - rp.group.position.z) * k;
          rp.group.rotation.y += (t.ry - rp.group.rotation.y) * k;
        }
        renderer.render(scene, camera);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        clearInterval(syncTimer);
        clearTimeout(msgTimer);
        window.removeEventListener("keydown", kd);
        window.removeEventListener("keyup", ku);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("pointerlockchange", onLockChange);
        if (document.pointerLockElement) document.exitPointerLock();
        renderer.dispose();
        actx?.close();
        mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [code, name]);

  const won = hud.status === "won";
  useEffect(() => {
    if (won && document.pointerLockElement) document.exitPointerLock();
  }, [won]);
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <div ref={mountRef} className="absolute inset-0" />
      <div
        ref={vignetteRef}
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(200,0,0,0.85) 100%)" }}
      />

      {/* crosshair */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/80 mix-blend-difference" />
        <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-white/80 mix-blend-difference" />
      </div>

      {/* top-left: objective */}
      <div className="pointer-events-none absolute left-3 top-3 w-64 rounded-xl bg-black/55 p-3 text-white backdrop-blur">
        <div className="text-xs uppercase tracking-wider text-yellow-300">Комната {code}</div>
        <div className="mt-1 text-lg font-bold">📓 Тетради: {hud.collected.length}/{NOTEBOOK_COUNT}</div>
        <div className="mt-1 flex gap-1">
          {Array.from({ length: NOTEBOOK_COUNT }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded ${hud.collected.includes(i) ? "bg-yellow-300" : "bg-white/25"}`} />
          ))}
        </div>
        <div className="mt-2 text-xs text-white/80">
          {hud.nearest !== null ? `Ближайшая тетрадь: ~${Math.round(hud.nearest)} м (жёлтый луч)` : "Все тетради собраны!"}
        </div>
        <div className="mt-1 text-xs text-red-300">Балди поймал команду: {hud.caught} раз</div>
      </div>

      {/* top-right: team */}
      <div className="pointer-events-none absolute right-3 top-3 w-52 rounded-xl bg-black/55 p-3 text-white backdrop-blur">
        <div className="text-xs uppercase tracking-wider text-sky-300">Команда · онлайн {hud.online}</div>
        <ul className="mt-1 space-y-1 text-sm">
          {hud.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 truncate">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: p.color }} />
                {p.name}
                {me && p.name === me.name && p.color === me.color ? " (ты)" : ""}
              </span>
              <span className="text-yellow-300">📓{p.notebooks}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* hotbar */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-xl bg-black/55 p-1.5">
        {HOTBAR.map((t, i) => (
          <div
            key={t}
            className={`relative h-12 w-12 rounded-md border-2 ${i === slot ? "border-white" : "border-transparent"}`}
            style={{ background: `linear-gradient(135deg, ${hex(BLOCKS[t].top)} 0 45%, ${hex(BLOCKS[t].side)} 45% 100%)` }}
            title={BLOCKS[t].name}
          >
            <span className="absolute left-1 top-0 text-[10px] font-bold text-white drop-shadow">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-[84px] left-1/2 -translate-x-1/2 text-sm font-semibold text-white drop-shadow">
        {BLOCKS[HOTBAR[slot]].name}
      </div>

      {msg && (
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-lg bg-red-700/90 px-5 py-2 text-lg font-bold text-white shadow-lg">
          {msg}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 text-white">
          <div className="rounded-2xl bg-slate-800 p-8 text-center">
            <p className="text-xl font-bold">{error}</p>
            <a href="/" className="mt-4 inline-block rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black">В лобби</a>
          </div>
        </div>
      )}

      {!error && !ready && (
        <div className="absolute inset-0 grid place-items-center bg-black text-xl text-white">Загрузка школы…</div>
      )}

      {ready && !locked && !won && !error && (
        <div className="absolute inset-0 grid cursor-pointer place-items-center bg-black/60 text-white">
          <div className="max-w-md rounded-2xl bg-slate-900/90 p-8 text-center shadow-2xl">
            <h2 className="text-2xl font-extrabold text-yellow-300">BaldiCraft</h2>
            <p className="mt-2 text-sm text-white/80">Кооператив: соберите все 7 тетрадей вместе и не дайте Балди себя поймать!</p>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-left text-sm">
              <span>WASD</span><span className="text-white/70">ходьба</span>
              <span>Shift</span><span className="text-white/70">бег</span>
              <span>Пробел</span><span className="text-white/70">прыжок</span>
              <span>ЛКМ / ПКМ</span><span className="text-white/70">сломать / поставить</span>
              <span>1–8 / колесо</span><span className="text-white/70">выбор блока</span>
              <span>Esc</span><span className="text-white/70">пауза</span>
            </div>
            <p className="mt-5 rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black">Нажми, чтобы играть</p>
            <p className="mt-3 text-xs text-white/60">Позови друзей: ввести код комнаты «{code}»</p>
          </div>
        </div>
      )}

      {won && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 text-white">
          <div className="max-w-md rounded-2xl bg-slate-900 p-8 text-center">
            <div className="text-5xl">🎉</div>
            <h2 className="mt-2 text-3xl font-extrabold text-yellow-300">Вы сбежали из школы!</h2>
            <p className="mt-2 text-white/80">Все 7 тетрадей собраны. Балди пойман {hud.caught} раз.</p>
            <ul className="mt-3 text-sm">
              {hud.players.map((p) => (
                <li key={p.id}><span style={{ color: p.color }}>{p.name}</span>: 📓{p.notebooks}</li>
              ))}
            </ul>
            <button
              className="mt-5 rounded-lg bg-yellow-400 px-5 py-2 font-bold text-black"
              onClick={() => { resetRef.current = true; }}
            >
              Играть снова
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
