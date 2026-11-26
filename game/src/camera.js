// The eye: turns heading, pitch and bank into a camera frame, and world points
// into screen points. World axes: x east, y up, z north; heading 0 looks north.

import { VIEW } from './config.js';

export function attitudeBasis(heading, pitch, bank) {
  const sh = Math.sin(heading), ch = Math.cos(heading);
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  const sb = Math.sin(bank), cb = Math.cos(bank);
  const f = [sh * cp, sp, ch * cp];
  const levelRight = [ch, 0, -sh];
  const levelUp = [-sh * sp, cp, -ch * sp];
  const r = [levelRight[0] * cb - levelUp[0] * sb, -levelUp[1] * sb, levelRight[2] * cb - levelUp[2] * sb];
  const u = [levelUp[0] * cb + levelRight[0] * sb, levelUp[1] * cb, levelUp[2] * cb + levelRight[2] * sb];
  return { f, r, u };
}

export function createCamera() {
  return { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0, f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] };
}

export function placeCamera(camera, x, y, z, heading, pitch, roll) {
  camera.x = x; camera.y = y; camera.z = z;
  camera.heading = heading; camera.pitch = pitch; camera.roll = roll;
  const basis = attitudeBasis(heading, pitch, roll);
  camera.f = basis.f; camera.r = basis.r; camera.u = basis.u;
}

// Writes the camera-space position of a world point into out[0..2].
export function toCameraSpace(camera, x, y, z, out) {
  const dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
  out[0] = dx * camera.r[0] + dy * camera.r[1] + dz * camera.r[2];
  out[1] = dx * camera.u[0] + dy * camera.u[1] + dz * camera.u[2];
  out[2] = dx * camera.f[0] + dy * camera.f[1] + dz * camera.f[2];
  return out;
}

const scratch = [0, 0, 0];

// Screen position of a world point, or null when it is behind the eye.
export function projectPoint(camera, x, y, z) {
  toCameraSpace(camera, x, y, z, scratch);
  if (scratch[2] < VIEW.near) return null;
  const scale = VIEW.focal / scratch[2];
  return { x: VIEW.width / 2 + scratch[0] * scale, y: VIEW.height / 2 - scratch[1] * scale, depth: scratch[2], scale };
}

// Cuts a camera-space polygon at the near plane so nothing wraps behind the eye.
export function clipAtNearPlane(points) {
  const near = VIEW.near, result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const aIn = a[2] >= near, bIn = b[2] >= near;
    if (aIn) result.push(a);
    if (aIn !== bIn) {
      const t = (near - a[2]) / (b[2] - a[2]);
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]);
    }
  }
  return result;
}

// Lays a world polygon onto the canvas path; the caller fills or strokes it.
export function traceWorldPolygon(ctx, camera, worldPoints) {
  let cameraPoints = [], anyBehind = false;
  for (const p of worldPoints) {
    const c = toCameraSpace(camera, p[0], p[1], p[2], [0, 0, 0]);
    if (c[2] < VIEW.near) anyBehind = true;
    cameraPoints.push(c);
  }
  if (anyBehind) cameraPoints = clipAtNearPlane(cameraPoints);
  if (cameraPoints.length < 3) return false;
  ctx.beginPath();
  for (let i = 0; i < cameraPoints.length; i++) {
    const c = cameraPoints[i], scale = VIEW.focal / c[2];
    const sx = VIEW.width / 2 + c[0] * scale, sy = VIEW.height / 2 - c[1] * scale;
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  return true;
}

export function fillWorldPolygon(ctx, camera, worldPoints, fillStyle) {
  if (!traceWorldPolygon(ctx, camera, worldPoints)) return false;
  ctx.fillStyle = fillStyle;
  ctx.fill();
  return true;
}

export function horizontalDistance(camera, x, z) {
  return Math.hypot(x - camera.x, z - camera.z);
}
