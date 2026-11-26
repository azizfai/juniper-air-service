// The sky behind everything: a gradient that tilts with the camera, the sun,
// drifting clouds, far blue ridges on the horizon and the hazy ground base.

import { VIEW } from './config.js';
import { colorString, wrapAngle } from './mathTools.js';
import { valueNoise, hashCell } from './seededRandom.js';

const CLOUDS = [];
for (let i = 0; i < 26; i++) {
  CLOUDS.push({
    azimuth: hashCell(i, 3) * Math.PI * 2,
    elevation: 0.06 + hashCell(i, 8) * 0.42,
    size: 60 + hashCell(i, 5) * 120,
    puffs: 3 + ((hashCell(i, 2) * 3) | 0),
  });
}

function drawSun(ctx, camera, palette, horizonY) {
  const relative = wrapAngle(palette.sunAzimuth - camera.heading);
  if (Math.abs(relative) > 1.25) return;
  const x = VIEW.focal * Math.tan(relative);
  const y = horizonY - VIEW.focal * Math.tan(palette.sunElevation);
  const sun = palette.sunColor;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 230);
  glow.addColorStop(0, colorString(sun[0], sun[1], sun[2], 0.95));
  glow.addColorStop(0.12, colorString(sun[0], sun[1], sun[2], 0.55));
  glow.addColorStop(1, colorString(sun[0], sun[1], sun[2], 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - 240, y - 240, 480, 480);
  ctx.fillStyle = colorString(255, 252, 236);
  ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
}

function drawClouds(ctx, camera, palette, horizonY, time) {
  const dusk = palette.name === 'dusk';
  for (const cloud of CLOUDS) {
    const relative = wrapAngle(cloud.azimuth + time * 0.004 - camera.heading);
    if (Math.abs(relative) > 1.2) continue;
    const x = VIEW.focal * Math.tan(relative);
    const y = horizonY - VIEW.focal * Math.tan(cloud.elevation);
    for (let p = 0; p < cloud.puffs; p++) {
      const px = x + (p - cloud.puffs / 2) * cloud.size * 0.55;
      const py = y - Math.sin(p * 1.7) * cloud.size * 0.1;
      ctx.fillStyle = dusk ? 'rgba(92,60,96,0.55)' : 'rgba(255,255,255,0.78)';
      ctx.beginPath(); ctx.ellipse(px, py, cloud.size * 0.5, cloud.size * 0.17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dusk ? 'rgba(255,170,120,0.5)' : 'rgba(214,226,240,0.6)';
      ctx.beginPath(); ctx.ellipse(px, py + cloud.size * 0.07, cloud.size * 0.46, cloud.size * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawFarRidges(ctx, camera, palette, horizonY) {
  const ridge = palette.ridge, haze = palette.haze;
  for (let layer = 0; layer < 2; layer++) {
    const blend = layer === 0 ? 0.55 : 0.25;
    ctx.fillStyle = colorString(ridge[0] + (haze[0] - ridge[0]) * blend, ridge[1] + (haze[1] - ridge[1]) * blend, ridge[2] + (haze[2] - ridge[2]) * blend);
    ctx.beginPath();
    ctx.moveTo(-1100, horizonY + 4);
    for (let x = -1100; x <= 1100; x += 22) {
      const azimuth = camera.heading + Math.atan(x / VIEW.focal);
      const rise = valueNoise(azimuth * (5 + layer * 4) + layer * 40, 2.5) * 0.7 + valueNoise(azimuth * 17 + layer * 9, 6.5) * 0.3;
      ctx.lineTo(x, horizonY - (layer === 0 ? 58 : 34) * rise - 6);
    }
    ctx.lineTo(1100, horizonY + 4);
    ctx.fill();
  }
}

export function drawSky(ctx, camera, palette, time) {
  const W = VIEW.width, H = VIEW.height;
  const horizonY = VIEW.focal * Math.tan(camera.pitch);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-camera.roll);
  const top = palette.skyTop, low = palette.skyLow, haze = palette.haze;
  const gradient = ctx.createLinearGradient(0, horizonY - 620, 0, horizonY);
  gradient.addColorStop(0, colorString(top[0], top[1], top[2]));
  gradient.addColorStop(0.72, colorString((top[0] + low[0] * 2) / 3, (top[1] + low[1] * 2) / 3, (top[2] + low[2] * 2) / 3));
  gradient.addColorStop(1, colorString(low[0], low[1], low[2]));
  ctx.fillStyle = gradient;
  ctx.fillRect(-1500, -1500, 3000, 1500 + horizonY + 2);
  drawSun(ctx, camera, palette, horizonY);
  drawClouds(ctx, camera, palette, horizonY, time);
  drawFarRidges(ctx, camera, palette, horizonY);
  ctx.fillStyle = colorString(haze[0], haze[1], haze[2]);
  ctx.fillRect(-1500, horizonY, 3000, 1500);
  ctx.restore();
}
