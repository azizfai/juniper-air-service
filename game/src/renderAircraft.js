// Paints the Wren in the chase view: shaded panels sorted back to front,
// struts, wheels, a spinning propeller, navigation lamps and a ground shadow.

import { VIEW } from './config.js';
import { attitudeBasis, toCameraSpace, projectPoint, fillWorldPolygon } from './camera.js';
import { WREN_PANELS, WREN_STRUTS, WREN_WHEELS, WREN_LAMPS, WREN_PROPELLER, WREN_SHADOW } from './aircraftModel.js';
import { colorString, clamp } from './mathTools.js';
import { surfaceHeight } from './terrainHeight.js';
import { enginePower } from './flightModel.js';

function bodyToWorld(aircraft, basis, p) {
  return [
    aircraft.x + p[0] * basis.r[0] + p[1] * basis.u[0] + p[2] * basis.f[0],
    aircraft.y + p[0] * basis.r[1] + p[1] * basis.u[1] + p[2] * basis.f[1],
    aircraft.z + p[0] * basis.r[2] + p[1] * basis.u[2] + p[2] * basis.f[2],
  ];
}

export function drawAircraftShadow(ctx, camera, aircraft) {
  const height = aircraft.y - surfaceHeight(aircraft.x, aircraft.z);
  if (height > 170) return;
  const basis = attitudeBasis(aircraft.heading, 0, 0);
  ctx.fillStyle = colorString(10, 16, 20, 0.34 * (1 - height / 170));
  for (const part of WREN_SHADOW) {
    const points = part.map(p => {
      const w = bodyToWorld(aircraft, basis, p);
      w[1] = surfaceHeight(w[0], w[2]) + 0.5;
      return w;
    });
    fillWorldPolygon(ctx, camera, points, ctx.fillStyle);
  }
}

function panelShade(world, camera, sun) {
  const a = world[0], b = world[1], c = world[2];
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;
  nx /= length; ny /= length; nz /= length;
  // Light the side of the panel that faces the eye.
  if (nx * (camera.x - a[0]) + ny * (camera.y - a[1]) + nz * (camera.z - a[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
  return 0.6 + 0.4 * Math.max(0, nx * sun[0] + ny * sun[1] + nz * sun[2]) + 0.08 * ny;
}

export function drawAircraft(ctx, camera, aircraft, palette, time) {
  const basis = attitudeBasis(aircraft.heading, aircraft.pitch, aircraft.bank);
  const ce = Math.cos(palette.sunElevation);
  const sun = [Math.sin(palette.sunAzimuth) * ce, Math.sin(palette.sunElevation), Math.cos(palette.sunAzimuth) * ce];
  const scratch = [0, 0, 0], tint = palette.tint;
  const panels = WREN_PANELS.map(panel => {
    const world = panel.points.map(p => bodyToWorld(aircraft, basis, p));
    let depth = 0;
    for (const w of world) depth += toCameraSpace(camera, w[0], w[1], w[2], scratch)[2];
    return { world, depth: depth / world.length, colour: panel.colour };
  });
  panels.sort((a, b) => b.depth - a.depth);
  for (const panel of panels) {
    const shade = panelShade(panel.world, camera, sun);
    const c = panel.colour;
    if (fillWorldPolygon(ctx, camera, panel.world, colorString(clamp(c[0] * shade * tint[0], 0, 255), clamp(c[1] * shade * tint[1], 0, 255), clamp(c[2] * shade * tint[2], 0, 255)))) {
      ctx.strokeStyle = 'rgba(20,30,34,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(52,56,60,0.95)';
  for (const strut of WREN_STRUTS) {
    const a = bodyToWorld(aircraft, basis, strut[0]), b = bodyToWorld(aircraft, basis, strut[1]);
    const pa = projectPoint(camera, a[0], a[1], a[2]), pb = projectPoint(camera, b[0], b[1], b[2]);
    if (!pa || !pb) continue;
    ctx.lineWidth = Math.max(1.5, 0.09 * pa.scale);
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
  }
  for (const wheel of WREN_WHEELS) {
    const w = bodyToWorld(aircraft, basis, wheel);
    const p = projectPoint(camera, w[0], w[1], w[2]);
    if (!p) continue;
    ctx.fillStyle = 'rgba(26,26,30,1)';
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, 0.3 * p.scale), 0, Math.PI * 2); ctx.fill();
  }
  const hub = bodyToWorld(aircraft, basis, WREN_PROPELLER.centre);
  const hubPoint = projectPoint(camera, hub[0], hub[1], hub[2]);
  if (hubPoint) {
    const power = enginePower(aircraft), radius = WREN_PROPELLER.radius * hubPoint.scale;
    const squash = clamp(Math.abs(basis.f[0] * camera.f[0] + basis.f[1] * camera.f[1] + basis.f[2] * camera.f[2]), 0.25, 1);
    ctx.fillStyle = colorString(220, 226, 230, 0.12 + 0.16 * power);
    ctx.beginPath(); ctx.ellipse(hubPoint.x, hubPoint.y, radius, radius * squash, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,34,0.5)';
    ctx.lineWidth = Math.max(1.5, radius * 0.1);
    const spin = time * (6 + power * 30);
    ctx.beginPath();
    ctx.moveTo(hubPoint.x - Math.cos(spin) * radius, hubPoint.y - Math.sin(spin) * radius * squash);
    ctx.lineTo(hubPoint.x + Math.cos(spin) * radius, hubPoint.y + Math.sin(spin) * radius * squash);
    ctx.stroke();
  }
  for (const lamp of WREN_LAMPS) {
    if (lamp.blink && (time % 1.2) > 0.18) continue;
    const w = bodyToWorld(aircraft, basis, lamp.at);
    const p = projectPoint(camera, w[0], w[1], w[2]);
    if (!p) continue;
    const size = Math.max(1.6, 0.13 * p.scale) * (0.8 + palette.lampGlow * 0.5);
    ctx.fillStyle = colorString(lamp.colour[0], lamp.colour[1], lamp.colour[2], 0.25);
    ctx.beginPath(); ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colorString(lamp.colour[0], lamp.colour[1], lamp.colour[2]);
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
  }
}

export const AIRCRAFT_DRAW_REACH = VIEW.near * 4;
