// The shape of the land: a river valley running north from a southern bay,
// ridges on both sides, and flat aprons pressed into it for the airstrips.

import { AIRFIELDS, distanceToRunway } from './airfields.js';
import { fractalNoise } from './seededRandom.js';
import { smoothstep, mix } from './mathTools.js';

const heightCache = new Map();

function naturalHeight(x, z, calm) {
  const shore = z + 3400 + 1400 * (fractalNoise(x / 2600, 3.1, 2) - 0.5);
  const inland = smoothstep(-300, 2600, shore);
  const valleyAxis = 500 * Math.sin(z / 2300);
  const offAxis = (x - valleyAxis) / 1700;
  const valleySides = 1 - Math.exp(-offAxis * offAxis);
  const ridges = fractalNoise(x / 2100 + 11, z / 2100 + 5, 4);
  const detail = fractalNoise(x / 420, z / 420, 2) - 0.5;
  const peaks = valleySides * 660 * ridges * ridges * (1 - 0.72 * calm);
  return -40 + inland * (96 + peaks + 28 * detail);
}

// How strongly an airstrip quiets the hills around it (0 far away, 1 on it).
function airfieldCalm(x, z) {
  let calm = 0;
  for (const field of AIRFIELDS) {
    const d = Math.hypot(x - field.x, z - field.z);
    calm = Math.max(calm, smoothstep(2100, 700, d));
  }
  return calm;
}

for (const field of AIRFIELDS) {
  field.elevation = Math.max(9, Math.round(naturalHeight(field.x, field.z, 1)));
}

function shapedHeight(x, z) {
  let h = naturalHeight(x, z, airfieldCalm(x, z));
  for (const field of AIRFIELDS) {
    const d = distanceToRunway(field, x, z);
    if (d < 460) h = mix(h, field.elevation, smoothstep(460, 150, d));
  }
  return h;
}

// Height of the solid ground, which dips below zero under the bay.
export function groundHeight(x, z) {
  return shapedHeight(x, z);
}

// Height of whatever an aircraft would touch: land, or the water at sea level.
export function surfaceHeight(x, z) {
  return Math.max(0, shapedHeight(x, z));
}

export function isWater(x, z) {
  return shapedHeight(x, z) < 0;
}

// Grid-vertex heights are asked for every frame, so they are remembered.
export function gridHeight(ix, iz, cell) {
  const key = (ix + 32768) * 65536 + (iz + 32768);
  let h = heightCache.get(key);
  if (h === undefined) {
    if (heightCache.size > 90000) heightCache.clear();
    h = shapedHeight(ix * cell, iz * cell);
    heightCache.set(key, h);
  }
  return h;
}

export function apronWeight(x, z) {
  let weight = 0;
  for (const field of AIRFIELDS) {
    weight = Math.max(weight, smoothstep(520, 200, distanceToRunway(field, x, z)));
  }
  return weight;
}
