// Short-lived things in the air: water falling from the tank, spray on the
// bay, dust at touchdown, parcels on parachutes, and smoke and debris in a crash.

import { projectPoint } from './camera.js';
import { colorString } from './mathTools.js';
import { surfaceHeight } from './terrainHeight.js';
import { createRandom } from './seededRandom.js';

const KINDS = {
  water: { colour: [120, 190, 255], size: 1.5, gravity: 9, life: 4.5, grow: 0.5 },
  spray: { colour: [235, 245, 255], size: 1.2, gravity: 6, life: 1.1, grow: 1.5 },
  dust: { colour: [196, 184, 160], size: 1.6, gravity: -0.6, life: 1.6, grow: 3 },
  smoke: { colour: [44, 42, 44], size: 3, gravity: -5, life: 4, grow: 5 },
  fire: { colour: [255, 150, 40], size: 2.4, gravity: -3, life: 1.1, grow: 3 },
  debris: { colour: [70, 72, 76], size: 0.6, gravity: 9.8, life: 3, grow: 0 },
  steam: { colour: [236, 240, 244], size: 6, gravity: -6, life: 3.5, grow: 9 },
  parcel: { colour: [226, 150, 70], size: 1.3, gravity: 2.2, life: 14, grow: 0 },
};

export function createEffects(seed) {
  return { particles: [], random: createRandom(seed || 7) };
}

export function emit(effects, kind, x, y, z, count, spread, velocity) {
  const random = effects.random, spec = KINDS[kind];
  for (let i = 0; i < count; i++) {
    effects.particles.push({
      kind, x, y, z,
      vx: (velocity ? velocity[0] : 0) + (random() - 0.5) * spread,
      vy: (velocity ? velocity[1] : 0) + (random() - 0.5) * spread,
      vz: (velocity ? velocity[2] : 0) + (random() - 0.5) * spread,
      age: 0, life: spec.life * (0.7 + random() * 0.6),
    });
  }
  if (effects.particles.length > 700) effects.particles.splice(0, effects.particles.length - 700);
}

export function stepEffects(effects, dt) {
  const kept = [];
  for (const p of effects.particles) {
    const spec = KINDS[p.kind];
    p.age += dt;
    p.vy -= spec.gravity * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const ground = surfaceHeight(p.x, p.z);
    if (p.y < ground) {
      if (p.kind === 'parcel' || p.kind === 'debris') { p.y = ground; p.vx = p.vy = p.vz = 0; }
      else if (p.kind === 'water') p.age = p.life;
    }
    if (p.age < p.life) kept.push(p);
  }
  effects.particles = kept;
}

export function drawEffects(ctx, camera, effects) {
  for (const p of effects.particles) {
    const point = projectPoint(camera, p.x, p.y, p.z);
    if (!point) continue;
    const spec = KINDS[p.kind], t = p.age / p.life;
    const radius = Math.max(1.2, (spec.size + spec.grow * t) * point.scale);
    ctx.fillStyle = colorString(spec.colour[0], spec.colour[1], spec.colour[2], p.kind === 'debris' || p.kind === 'parcel' ? 1 : 0.8 * (1 - t));
    if (p.kind === 'parcel') {
      ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
      if (p.vy !== 0) {
        ctx.fillStyle = 'rgba(250,250,244,0.92)';
        ctx.beginPath(); ctx.arc(point.x, point.y - radius * 4, radius * 3, Math.PI, 0); ctx.fill();
      }
      continue;
    }
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
  }
}
