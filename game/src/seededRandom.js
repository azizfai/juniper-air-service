// Deterministic randomness: a seeded generator for effects, and position hashes
// and value noise for the terrain, so the valley is the same on every visit.

export function createRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashCell(ix, iz) {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hashCell(ix, iz), b = hashCell(ix + 1, iz);
  const c = hashCell(ix, iz + 1), d = hashCell(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function fractalNoise(x, z, octaves) {
  let sum = 0, weight = 0.5, total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, z) * weight;
    total += weight;
    x = x * 2.03 + 17.1;
    z = z * 2.03 + 9.7;
    weight *= 0.5;
  }
  return sum / total;
}
