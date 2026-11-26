// Paints the airstrips: asphalt, centreline, threshold bars, edge lamps that
// glow at dusk, and the hangar and tower beside each one.

import { AIRFIELDS, runwayPoint } from './airfields.js';
import { fillWorldPolygon, projectPoint, toCameraSpace, horizontalDistance } from './camera.js';
import { colorString, smoothstep } from './mathTools.js';

const SEGMENTS = 10;

function strip(field, alongFrom, alongTo, acrossFrom, acrossTo, lift) {
  const y = field.elevation + lift;
  const a = runwayPoint(field, alongFrom, acrossFrom), b = runwayPoint(field, alongFrom, acrossTo);
  const c = runwayPoint(field, alongTo, acrossTo), d = runwayPoint(field, alongTo, acrossFrom);
  return [[a.x, y, a.z], [b.x, y, b.z], [c.x, y, c.z], [d.x, y, d.z]];
}

function fogged(colour, palette, fog) {
  const t = palette.tint, h = palette.haze;
  const r = colour[0] * t[0], g = colour[1] * t[1], b = colour[2] * t[2];
  return colorString(r + (h[0] - r) * fog, g + (h[1] - g) * fog, b + (h[2] - b) * fog);
}

function drawLamp(ctx, camera, x, y, z, colour, palette) {
  const p = projectPoint(camera, x, y, z);
  if (!p) return;
  const size = Math.max(1.3, Math.min(5, 0.8 * p.scale)) * (0.7 + palette.lampGlow * 0.5);
  if (palette.lampGlow > 0.6) {
    ctx.fillStyle = colorString(colour[0], colour[1], colour[2], 0.22);
    ctx.beginPath(); ctx.arc(p.x, p.y, size * 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = colorString(colour[0], colour[1], colour[2]);
  ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
}

function drawRunwaySegment(ctx, camera, palette, field, index, fog) {
  const half = field.length / 2, wide = field.width / 2;
  const from = -half + (field.length * index) / SEGMENTS, to = from + field.length / SEGMENTS;
  fillWorldPolygon(ctx, camera, strip(field, from, to, -wide, wide, 0.35), fogged([70, 74, 82], palette, fog));
  const white = fogged([236, 236, 228], palette, fog);
  fillWorldPolygon(ctx, camera, strip(field, from, to, -wide, -wide + 1.6, 0.4), white);
  fillWorldPolygon(ctx, camera, strip(field, from, to, wide - 1.6, wide, 0.4), white);
  const length = to - from;
  fillWorldPolygon(ctx, camera, strip(field, from + length * 0.1, from + length * 0.42, -0.9, 0.9, 0.4), white);
  fillWorldPolygon(ctx, camera, strip(field, from + length * 0.6, from + length * 0.92, -0.9, 0.9, 0.4), white);
  if (index === 0 || index === SEGMENTS - 1) {
    const edge = index === 0 ? from + 8 : to - 8, inner = index === 0 ? from + 46 : to - 46;
    for (let bar = 0; bar < 8; bar++) {
      const across = -wide + 4 + bar * ((field.width - 8) / 8);
      fillWorldPolygon(ctx, camera, strip(field, edge, inner, across + 0.6, across + (field.width - 8) / 8 - 0.9, 0.42), white);
    }
    for (let lamp = -3; lamp <= 3; lamp++) {
      const p = runwayPoint(field, index === 0 ? -half - 3 : half + 3, lamp * wide / 3);
      drawLamp(ctx, camera, p.x, field.elevation + 0.8, p.z, [90, 255, 140], palette);
    }
  }
  for (const side of [-1, 1]) {
    for (const t of [0.25, 0.75]) {
      const p = runwayPoint(field, from + length * t, side * (wide + 2));
      drawLamp(ctx, camera, p.x, field.elevation + 0.8, p.z, [255, 226, 150], palette);
    }
  }
}

// A lit box: used for the hangar and the control tower.
function drawBuilding(ctx, camera, palette, centre, baseY, size, yaw, wall, roof, fog) {
  const s = Math.sin(yaw), c = Math.cos(yaw), hx = size[0] / 2, hz = size[2] / 2;
  const corner = (ex, ez, y) => [centre.x + ex * hx * c + ez * hz * s, y, centre.z - ex * hx * s + ez * hz * c];
  const top = baseY + size[1];
  const faces = [
    { points: [corner(-1, -1, baseY), corner(1, -1, baseY), corner(1, -1, top), corner(-1, -1, top)], shade: 0.78 },
    { points: [corner(1, -1, baseY), corner(1, 1, baseY), corner(1, 1, top), corner(1, -1, top)], shade: 0.94 },
    { points: [corner(1, 1, baseY), corner(-1, 1, baseY), corner(-1, 1, top), corner(1, 1, top)], shade: 0.7 },
    { points: [corner(-1, 1, baseY), corner(-1, -1, baseY), corner(-1, -1, top), corner(-1, 1, top)], shade: 0.86 },
  ];
  const scratch = [0, 0, 0];
  for (const face of faces) {
    const p = face.points;
    face.depth = toCameraSpace(camera, (p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2, (p[0][2] + p[2][2]) / 2, scratch)[2];
  }
  faces.sort((a, b) => b.depth - a.depth);
  for (const face of faces) fillWorldPolygon(ctx, camera, face.points, fogged([wall[0] * face.shade, wall[1] * face.shade, wall[2] * face.shade], palette, fog));
  fillWorldPolygon(ctx, camera, [corner(-1, -1, top), corner(1, -1, top), corner(1, 1, top), corner(-1, 1, top)], fogged(roof, palette, fog));
}

// Adds every visible piece of every airstrip to the frame's drawables.
export function collectAirfieldDrawables(ctx, camera, palette, drawables) {
  for (const field of AIRFIELDS) {
    if (horizontalDistance(camera, field.x, field.z) > 5200) continue;
    for (let index = 0; index < SEGMENTS; index++) {
      const middle = runwayPoint(field, -field.length / 2 + field.length * (index + 0.5) / SEGMENTS, 0);
      const distance = horizontalDistance(camera, middle.x, middle.z);
      const fog = smoothstep(palette.fogStart, palette.fogEnd, distance);
      drawables.push({ distance: distance - 130, draw: () => drawRunwaySegment(ctx, camera, palette, field, index, fog) });
    }
    const hangar = runwayPoint(field, -field.length * 0.2, field.width / 2 + 78);
    const tower = runwayPoint(field, field.length * 0.02, field.width / 2 + 70);
    const hangarDistance = horizontalDistance(camera, hangar.x, hangar.z);
    const fog = smoothstep(palette.fogStart, palette.fogEnd, hangarDistance);
    drawables.push({ distance: hangarDistance - 60, draw: () => {
      drawBuilding(ctx, camera, palette, hangar, field.elevation, [46, 15, 34], field.heading, [206, 196, 178], [168, 72, 58], fog);
      drawBuilding(ctx, camera, palette, tower, field.elevation, [9, 26, 9], field.heading, [222, 222, 214], [70, 110, 90], fog);
      const lampTop = { x: tower.x, z: tower.z };
      drawLamp(ctx, camera, lampTop.x, field.elevation + 28, lampTop.z, [255, 80, 70], palette);
    } });
  }
}
