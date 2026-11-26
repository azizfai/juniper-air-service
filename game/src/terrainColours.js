// What each patch of ground looks like: water, shore sand, patchwork fields,
// forest, bare rock and snow, lit by the mission's sun.

import { TERRAIN } from './config.js';
import { gridHeight, apronWeight } from './terrainHeight.js';
import { hashCell } from './seededRandom.js';
import { clamp, mix } from './mathTools.js';

const FIELD_COLOURS = [[128, 172, 86], [152, 184, 92], [198, 188, 106], [110, 152, 80], [176, 166, 98], [142, 176, 110]];
const FOREST_COLOURS = [[50, 102, 62], [44, 92, 58], [60, 112, 66]];

let cache = new Map();
let cachedPalette = null;

function sunVector(palette) {
  const ce = Math.cos(palette.sunElevation);
  return [Math.sin(palette.sunAzimuth) * ce, Math.sin(palette.sunElevation), Math.cos(palette.sunAzimuth) * ce];
}

function describeCell(ix, iz, palette) {
  const S = TERRAIN.cell;
  const h00 = gridHeight(ix, iz, S), h10 = gridHeight(ix + 1, iz, S);
  const h01 = gridHeight(ix, iz + 1, S), h11 = gridHeight(ix + 1, iz + 1, S);
  const height = (h00 + h10 + h01 + h11) / 4;
  const slopeX = (h10 + h11 - h00 - h01) / (2 * S), slopeZ = (h01 + h11 - h00 - h10) / (2 * S);
  const slope = Math.hypot(slopeX, slopeZ);
  const speckle = hashCell(ix, iz), patch = hashCell(ix >> 1, (iz >> 1) + 91);
  let base, kind = 'field';
  if (height < 0) {
    kind = 'water';
    const deep = clamp(-height / 40, 0, 1);
    base = [mix(palette.water[0] + 40, palette.water[0], deep), mix(palette.water[1] + 44, palette.water[1], deep), mix(palette.water[2] + 26, palette.water[2], deep)];
  } else if (height < 7) { kind = 'sand'; base = [214, 200, 152]; }
  else if (apronWeight((ix + 0.5) * S, (iz + 0.5) * S) > 0.35) { kind = 'apron'; base = [118 + speckle * 14, 166 + speckle * 10, 86]; }
  else if (height > 520) { kind = 'snow'; base = [234, 238, 244]; }
  else if (height > 400 || slope > 0.62) { kind = 'rock'; base = [130 + speckle * 16, 124 + speckle * 12, 116]; }
  else if (slope > 0.13 || patch > 0.63) { kind = 'forest'; base = FOREST_COLOURS[(speckle * 3) | 0]; }
  else base = FIELD_COLOURS[((patch * 9.5) | 0) % FIELD_COLOURS.length];

  let light = 1;
  if (kind !== 'water') {
    const sun = sunVector(palette);
    const length = Math.hypot(slopeX, 1, slopeZ);
    const facing = (-slopeX * sun[0] + sun[1] - slopeZ * sun[2]) / length;
    light = palette.ambient + palette.diffuse * Math.max(0, facing);
  } else light = 0.92 + speckle * 0.12;
  const tint = palette.tint;
  const trees = [];
  if (kind === 'forest') {
    for (let k = 0; k < 3; k++) {
      const u = hashCell(ix * 3 + k, iz * 5 + 7), v = hashCell(ix * 7 + 3, iz * 3 + k);
      trees.push({ u, v, height: 15 + 11 * hashCell(ix + k * 13, iz - k * 5) });
    }
  }
  return {
    r: base[0] * light * tint[0], g: base[1] * light * tint[1], b: base[2] * light * tint[2],
    kind, trees, sparkle: speckle,
  };
}

export function cellAppearance(ix, iz, palette) {
  if (palette !== cachedPalette) { cache = new Map(); cachedPalette = palette; }
  const key = (ix + 32768) * 65536 + (iz + 32768);
  let cell = cache.get(key);
  if (!cell) {
    if (cache.size > 60000) cache = new Map();
    cell = describeCell(ix, iz, palette);
    cache.set(key, cell);
  }
  return cell;
}
