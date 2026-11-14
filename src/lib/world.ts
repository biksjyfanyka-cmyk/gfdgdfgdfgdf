// Shared world constants + deterministic terrain generation (used by client).
export const SIZE = 64;
export const HEIGHT = 32;
export const NOTEBOOK_COUNT = 7;
export const SPAWN = { x: 32.5, z: 32.5 };

export const BLOCKS: Record<number, { name: string; top: number; side: number; bottom: number }> = {
  1: { name: "Трава", top: 0x5fb04a, side: 0x7a6a3c, bottom: 0x6b4a2b },
  2: { name: "Земля", top: 0x6b4a2b, side: 0x6b4a2b, bottom: 0x6b4a2b },
  3: { name: "Камень", top: 0x8a8a8a, side: 0x7d7d7d, bottom: 0x707070 },
  4: { name: "Дерево", top: 0xb08850, side: 0x8a6a3a, bottom: 0xb08850 },
  5: { name: "Кирпич", top: 0xa8483a, side: 0x9a3f32, bottom: 0x9a3f32 },
  6: { name: "Плитка", top: 0xe8e8d8, side: 0xd8d8c4, bottom: 0xd8d8c4 },
  7: { name: "Листва", top: 0x2f7d32, side: 0x2a6f2d, bottom: 0x2a6f2d },
  8: { name: "Жёлтая стена", top: 0xf2d24a, side: 0xe6c53c, bottom: 0xe6c53c },
  9: { name: "Бедрок", top: 0x2a2a2a, side: 0x222222, bottom: 0x1a1a1a },
};
export const HOTBAR = [1, 2, 3, 4, 5, 6, 7, 8];

function hash(ix: number, iz: number, seed: number) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function vnoise(x: number, z: number, seed: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash(ix, iz, seed);
  const b = hash(ix + 1, iz, seed);
  const c = hash(ix, iz + 1, seed);
  const d = hash(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const idx = (x: number, y: number, z: number) => (y * SIZE + z) * SIZE + x;

export function generateWorld(seed: number): Uint8Array {
  const data = new Uint8Array(SIZE * HEIGHT * SIZE);
  const heights = new Int32Array(SIZE * SIZE);
  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      const n = vnoise(x / 18, z / 18, seed) * 0.65 + vnoise(x / 7, z / 7, seed + 7) * 0.3 + vnoise(x / 3, z / 3, seed + 3) * 0.05;
      let h = Math.floor(7 + n * 11);
      // flatten near spawn
      const d = Math.hypot(x - SPAWN.x, z - SPAWN.z);
      if (d < 7) {
        const flat = 11;
        const k = Math.max(0, Math.min(1, (d - 3) / 4));
        h = Math.round(flat * (1 - k) + h * k);
      }
      h = Math.min(HEIGHT - 8, h);
      heights[z * SIZE + x] = h;
      for (let y = 0; y <= h; y++) {
        let t = 3;
        if (y === 0) t = 9;
        else if (y === h) t = 1;
        else if (y >= h - 2) t = 2;
        data[idx(x, y, z)] = t;
      }
    }
  }
  const r = rng(seed + 99);
  // trees
  for (let i = 0; i < 28; i++) {
    const x = 3 + Math.floor(r() * (SIZE - 6));
    const z = 3 + Math.floor(r() * (SIZE - 6));
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 7) continue;
    if (x >= 38 && x <= 50 && z >= 24 && z <= 34) continue;
    const h = heights[z * SIZE + x];
    const th = 4 + Math.floor(r() * 2);
    for (let y = h + 1; y <= h + th; y++) data[idx(x, y, z)] = 4;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let dy = th - 1; dy <= th + 1; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + (dy - th + 1) > 4) continue;
          const px = x + dx;
          const pz = z + dz;
          const py = h + dy;
          if (px < 0 || pz < 0 || px >= SIZE || pz >= SIZE || py >= HEIGHT) continue;
          if (data[idx(px, py, pz)] === 0) data[idx(px, py, pz)] = 7;
        }
  }
  // little schoolhouse
  const sx = 41;
  const sz = 26;
  let base = 0;
  for (let dx = 0; dx < 9; dx++) for (let dz = 0; dz < 7; dz++) base = Math.max(base, heights[(sz + dz) * SIZE + sx + dx]);
  for (let dx = 0; dx < 9; dx++)
    for (let dz = 0; dz < 7; dz++) {
      const px = sx + dx;
      const pz = sz + dz;
      for (let y = 1; y <= base + 5; y++) {
        const wall = dx === 0 || dz === 0 || dx === 8 || dz === 6;
        const door = dz === 6 && dx === 4 && y > base && y <= base + 2;
        const win = wall && y === base + 2 && (dx % 3 === 1 || dz === 3) && !(dx === 4 && dz === 6);
        if (y < base) {
          if (!data[idx(px, y, pz)]) data[idx(px, y, pz)] = 3;
        } else if (y === base) {
          data[idx(px, y, pz)] = 6;
        } else if (y === base + 5) {
          data[idx(px, y, pz)] = 5;
        } else if (wall && !door && !win) {
          data[idx(px, y, pz)] = 8;
        } else {
          data[idx(px, y, pz)] = 0;
        }
      }
    }
  return data;
}

export function topY(data: Uint8Array, x: number, z: number) {
  const ix = Math.max(0, Math.min(SIZE - 1, Math.floor(x)));
  const iz = Math.max(0, Math.min(SIZE - 1, Math.floor(z)));
  for (let y = HEIGHT - 1; y >= 0; y--) if (data[idx(ix, y, iz)]) return y + 1;
  return 1;
}

export function notebookPositions(seed: number, data: Uint8Array) {
  const r = rng(seed + 12345);
  const out: { x: number; y: number; z: number }[] = [];
  let guard = 0;
  while (out.length < NOTEBOOK_COUNT && guard++ < 1000) {
    const x = 4 + r() * (SIZE - 8);
    const z = 4 + r() * (SIZE - 8);
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 10) continue;
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 11)) continue;
    // keep notebooks out of tree canopies: use ground height of solid non-leaf
    let y = HEIGHT - 1;
    while (y > 0 && (data[idx(Math.floor(x), y, Math.floor(z))] === 0 || data[idx(Math.floor(x), y, Math.floor(z))] === 7)) y--;
    out.push({ x, y: y + 1.9, z });
  }
  return out;
}
