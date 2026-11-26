// Paints the valley floor as a grid of lit quads, farthest first, fading into
// haze, with trees standing on the forest cells and every other world object
// (runways, rings, fires, the aircraft) slotted in at its own distance.

import { TERRAIN, VIEW } from './config.js';
import { gridHeight } from './terrainHeight.js';
import { cellAppearance } from './terrainColours.js';
import { clipAtNearPlane } from './camera.js';
import { smoothstep } from './mathTools.js';

const R = TERRAIN.radiusCells, S = TERRAIN.cell, N = 2 * R + 2;
const cellOrder = [];
for (let dj = -R; dj <= R; dj++) {
  for (let di = -R; di <= R; di++) {
    const distance = Math.hypot(di + 0.5, dj + 0.5) * S;
    if (distance <= R * S) cellOrder.push({ di, dj, distance });
  }
}
cellOrder.sort((a, b) => b.distance - a.distance);

const camX = new Float32Array(N * N), camY = new Float32Array(N * N), camZ = new Float32Array(N * N);
const scrX = new Float32Array(N * N), scrY = new Float32Array(N * N);

function projectGrid(camera, ci, cj) {
  const halfW = VIEW.width / 2, halfH = VIEW.height / 2, focal = VIEW.focal;
  const r = camera.r, u = camera.u, f = camera.f;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const ix = ci + i - R, iz = cj + j - R;
      const dx = ix * S - camera.x, dy = Math.max(0, gridHeight(ix, iz, S)) - camera.y, dz = iz * S - camera.z;
      const k = i + j * N;
      const cz = dx * f[0] + dy * f[1] + dz * f[2];
      camX[k] = dx * r[0] + dy * r[1] + dz * r[2];
      camY[k] = dx * u[0] + dy * u[1] + dz * u[2];
      camZ[k] = cz;
      if (cz >= VIEW.near) {
        const scale = focal / cz;
        scrX[k] = halfW + camX[k] * scale;
        scrY[k] = halfH - camY[k] * scale;
      }
    }
  }
}

function drawClippedCell(ctx, a, b, c, d) {
  const points = clipAtNearPlane([[camX[a], camY[a], camZ[a]], [camX[b], camY[b], camZ[b]], [camX[c], camY[c], camZ[c]], [camX[d], camY[d], camZ[d]]]);
  if (points.length < 3) return;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = points[i], scale = VIEW.focal / p[2];
    const sx = VIEW.width / 2 + p[0] * scale, sy = VIEW.height / 2 - p[1] * scale;
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.fill();
}

function drawTrees(ctx, camera, cell, ix, iz, fog, haze, palette) {
  const r = camera.r, u = camera.u, f = camera.f, focal = VIEW.focal;
  const tr = 30 * palette.tint[0], tg = 78 * palette.tint[1], tb = 46 * palette.tint[2];
  ctx.fillStyle = `rgb(${(tr + (haze[0] - tr) * fog) | 0},${(tg + (haze[1] - tg) * fog) | 0},${(tb + (haze[2] - tb) * fog) | 0})`;
  for (const tree of cell.trees) {
    const wx = (ix + tree.u) * S, wz = (iz + tree.v) * S;
    const h00 = gridHeight(ix, iz, S), h10 = gridHeight(ix + 1, iz, S), h01 = gridHeight(ix, iz + 1, S);
    const wy = h00 + (h10 - h00) * tree.u + (h01 - h00) * tree.v;
    const dx = wx - camera.x, dy = wy - camera.y, dz = wz - camera.z;
    const cz = dx * f[0] + dy * f[1] + dz * f[2];
    if (cz < 6) continue;
    const cx = dx * r[0] + dy * r[1] + dz * r[2], cy = dx * u[0] + dy * u[1] + dz * u[2];
    const scale = focal / cz;
    const sx = VIEW.width / 2 + cx * scale, sy = VIEW.height / 2 - cy * scale;
    if (sx < -40 || sx > VIEW.width + 40) continue;
    const tall = tree.height * scale, wide = tree.height * 0.26 * scale;
    // The trunk rises along the camera's own up vector, so trees lean with a banked view.
    const topX = sx + r[1] * tall, topY = sy - u[1] * tall;
    ctx.beginPath();
    ctx.moveTo(sx - wide * u[1], sy - wide * r[1]);
    ctx.lineTo(topX, topY);
    ctx.lineTo(sx + wide * u[1], sy + wide * r[1]);
    ctx.fill();
  }
}

// drawables: [{ distance, draw }] — painted between the cells at their distance.
export function drawTerrain(ctx, camera, palette, drawables) {
  const ci = Math.floor(camera.x / S), cj = Math.floor(camera.z / S);
  projectGrid(camera, ci, cj);
  drawables.sort((a, b) => b.distance - a.distance);
  const haze = palette.haze, near = VIEW.near, W = VIEW.width, H = VIEW.height;
  let next = 0;
  for (const cellPlace of cellOrder) {
    while (next < drawables.length && drawables[next].distance >= cellPlace.distance) drawables[next++].draw();
    const a = cellPlace.di + R + (cellPlace.dj + R) * N, b = a + 1, c = a + N + 1, d = a + N;
    const za = camZ[a], zb = camZ[b], zc = camZ[c], zd = camZ[d];
    if (za < near && zb < near && zc < near && zd < near) continue;
    const allInFront = za >= near && zb >= near && zc >= near && zd >= near;
    if (allInFront) {
      const xa = scrX[a], xb = scrX[b], xc = scrX[c], xd = scrX[d];
      if ((xa < 0 && xb < 0 && xc < 0 && xd < 0) || (xa > W && xb > W && xc > W && xd > W)) continue;
      const ya = scrY[a], yb = scrY[b], yc = scrY[c], yd = scrY[d];
      if ((ya < 0 && yb < 0 && yc < 0 && yd < 0) || (ya > H && yb > H && yc > H && yd > H)) continue;
    }
    const ix = ci + cellPlace.di, iz = cj + cellPlace.dj;
    const cell = cellAppearance(ix, iz, palette);
    const fog = smoothstep(palette.fogStart, palette.fogEnd, cellPlace.distance);
    ctx.fillStyle = `rgb(${(cell.r + (haze[0] - cell.r) * fog) | 0},${(cell.g + (haze[1] - cell.g) * fog) | 0},${(cell.b + (haze[2] - cell.b) * fog) | 0})`;
    if (allInFront) {
      ctx.beginPath();
      ctx.moveTo(scrX[a], scrY[a]); ctx.lineTo(scrX[b], scrY[b]); ctx.lineTo(scrX[c], scrY[c]); ctx.lineTo(scrX[d], scrY[d]);
      ctx.fill();
    } else drawClippedCell(ctx, a, b, c, d);
    if (cell.trees.length && cellPlace.distance < TERRAIN.treeRange) drawTrees(ctx, camera, cell, ix, iz, fog, haze, palette);
  }
  while (next < drawables.length) drawables[next++].draw();
}
