// Paints the things a mission asks the pilot to reach: target rings on their
// poles, slalom gates, burning fires with smoke columns, parcel pads and the
// buoys that mark the scoop lane on the bay.

import { VIEW } from './config.js';
import { projectPoint, fillWorldPolygon, horizontalDistance } from './camera.js';
import { colorString } from './mathTools.js';
import { surfaceHeight } from './terrainHeight.js';

const RING_STEPS = 30;
const RING_STYLES = {
  ring: { next: [255, 206, 64], later: [98, 226, 214] },
  delivery: { next: [255, 150, 60], later: [240, 220, 200] },
  fire: { next: [255, 92, 48], later: [255, 92, 48] },
  gate: { next: [255, 110, 220], later: [120, 200, 255] },
};

function ringPoint(target, angle, radius) {
  const lateral = Math.cos(angle) * radius;
  return [target.x + lateral * Math.cos(target.axis), target.y + Math.sin(angle) * radius, target.z - lateral * Math.sin(target.axis)];
}

function strokeRing(ctx, camera, target, radius, width, style) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.beginPath();
  let previous = null;
  for (let i = 0; i <= RING_STEPS; i++) {
    const w = ringPoint(target, (i / RING_STEPS) * Math.PI * 2, radius);
    const p = projectPoint(camera, w[0], w[1], w[2]);
    if (p && previous) { ctx.moveTo(previous.x, previous.y); ctx.lineTo(p.x, p.y); }
    previous = p;
  }
  ctx.stroke();
}

function drawPole(ctx, camera, x, topY, z, width, style) {
  const top = projectPoint(camera, x, topY, z), foot = projectPoint(camera, x, surfaceHeight(x, z), z);
  if (!top || !foot) return;
  ctx.strokeStyle = style;
  ctx.lineWidth = Math.max(1.2, width * top.scale);
  ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(foot.x, foot.y); ctx.stroke();
}

function drawRing(ctx, camera, target, isNext, time) {
  const centre = projectPoint(camera, target.x, target.y, target.z);
  const scale = centre ? centre.scale : VIEW.focal / VIEW.near;
  const palette = RING_STYLES[target.kind] || RING_STYLES.ring;
  const colour = isNext ? palette.next : palette.later;
  const pulse = isNext ? 0.75 + 0.25 * Math.sin(time * 6) : 0.6;
  const tube = Math.max(2.2, Math.min(46, 3.4 * scale));
  ctx.lineCap = 'round';
  if (target.kind === 'gate') {
    const left = ringPoint(target, Math.PI, target.radius), right = ringPoint(target, 0, target.radius);
    drawPole(ctx, camera, left[0], left[1], left[2], 1.6, 'rgba(240,240,250,0.85)');
    drawPole(ctx, camera, right[0], right[1], right[2], 1.6, 'rgba(240,240,250,0.85)');
  } else drawPole(ctx, camera, target.x, target.y - target.radius, target.z, 1.3, 'rgba(250,250,240,0.8)');
  strokeRing(ctx, camera, target, target.radius, tube * 2.6, colorString(colour[0], colour[1], colour[2], 0.22 * pulse));
  strokeRing(ctx, camera, target, target.radius, tube, colorString(colour[0], colour[1], colour[2], 0.55 + 0.45 * pulse));
  strokeRing(ctx, camera, target, target.radius, Math.max(1, tube * 0.3), 'rgba(255,255,245,0.9)');
  if (isNext && centre) {
    ctx.fillStyle = colorString(colour[0], colour[1], colour[2], 0.1 * pulse);
    ctx.beginPath(); ctx.arc(centre.x, centre.y, target.radius * scale, 0, Math.PI * 2); ctx.fill();
  }
}

function drawFire(ctx, camera, target, time) {
  const groundY = target.y - target.agl;
  const foot = projectPoint(camera, target.x, groundY, target.z);
  if (!foot) return;
  const s = foot.scale;
  for (let puff = 9; puff >= 0; puff--) {
    const rise = ((time * 0.22 + puff / 10) % 1);
    const p = projectPoint(camera, target.x + rise * 90 + Math.sin(puff * 2.1) * 14, groundY + 12 + rise * 300, target.z + Math.cos(puff * 1.3) * 14);
    if (!p) continue;
    const grey = 60 + rise * 90;
    ctx.fillStyle = colorString(grey, grey * 0.96, grey * 0.94, 0.55 * (1 - rise * 0.75));
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, (16 + rise * 46) * p.scale), 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(40,30,26,0.7)';
  ctx.beginPath(); ctx.ellipse(foot.x, foot.y, 62 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill();
  for (let flame = 0; flame < 7; flame++) {
    const sway = Math.sin(time * 9 + flame * 1.9), offset = (flame - 3) * 13 * s;
    const tall = (26 + 16 * Math.sin(time * 7 + flame * 2.7)) * s;
    ctx.fillStyle = flame % 2 ? 'rgba(255,196,60,0.95)' : 'rgba(255,96,32,0.95)';
    ctx.beginPath();
    ctx.moveTo(foot.x + offset - 9 * s, foot.y);
    ctx.lineTo(foot.x + offset + sway * 5 * s, foot.y - tall);
    ctx.lineTo(foot.x + offset + 9 * s, foot.y);
    ctx.fill();
  }
}

function drawParcelPad(ctx, camera, target) {
  const y = surfaceHeight(target.x, target.z) + 0.5, half = 22;
  for (let q = 0; q < 4; q++) {
    const ex = q % 2 ? 1 : -1, ez = q < 2 ? 1 : -1;
    const points = [[target.x, y, target.z], [target.x + ex * half, y, target.z], [target.x + ex * half, y, target.z + ez * half], [target.x, y, target.z + ez * half]];
    fillWorldPolygon(ctx, camera, points, (q === 0 || q === 3) ? 'rgba(232,70,50,0.95)' : 'rgba(246,244,236,0.95)');
  }
}

function drawBuoys(ctx, camera, scoop, time) {
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1, along = (Math.floor(i / 2) - 2.5) * 190;
    const p = projectPoint(camera, scoop.x + side * 95, 1.5 + Math.sin(time * 2 + i) * 0.5, scoop.z + along);
    if (!p) continue;
    const size = Math.max(2, 3.2 * p.scale);
    ctx.fillStyle = 'rgba(255,120,40,1)';
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(p.x - size * 0.2, p.y - size * 2.4, size * 0.4, size * 1.6);
  }
}

// Adds the mission's visible targets to the frame's drawables.
export function collectTargetDrawables(ctx, camera, run, nextTarget, time, drawables) {
  if (!run) return;
  for (const target of run.targets) {
    const distance = horizontalDistance(camera, target.x, target.z);
    if (distance > 5600) continue;
    if (target.done) {
      if (target.flare <= 0) continue;
      drawables.push({ distance, draw: () => {
        const style = colorString(255, 255, 220, target.flare);
        strokeRing(ctx, camera, target, target.radius * (1 + (1 - target.flare) * 0.8), 5, style);
      } });
      continue;
    }
    const isNext = !run.mission.ordered ? true : nextTarget === target;
    drawables.push({ distance, draw: () => {
      if (target.kind === 'fire') drawFire(ctx, camera, target, time);
      if (target.kind === 'delivery') drawParcelPad(ctx, camera, target);
      drawRing(ctx, camera, target, isNext, time);
    } });
  }
  if (run.mission.scoop) {
    const scoop = run.mission.scoop;
    drawables.push({ distance: horizontalDistance(camera, scoop.x, scoop.z), draw: () => drawBuoys(ctx, camera, scoop, time) });
  }
}
