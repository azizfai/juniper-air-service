// The head-up display: big SPD, ALT and HDG readouts, the compass tape, the
// mission card, the target marker, warnings, the gauge row and the map.

import { VIEW, UNITS, AIRCRAFT } from './config.js';
import { clamp, headingDegrees, formatClock } from './mathTools.js';
import { toCameraSpace } from './camera.js';
import { drawInstrumentRow, drawBarGauge } from './instruments.js';
import { heightAboveGround, enginePower } from './flightModel.js';
import { AIRFIELDS, runwayPoint } from './airfields.js';

const FONT = '"Trebuchet MS", "DejaVu Sans", sans-serif';
const PANEL = 'rgba(8,18,24,0.72)', EDGE = 'rgba(127,240,216,0.85)', LIT = '#7ff0d8', WHITE = '#f4f8f6', AMBER = '#ffc04a', RED = '#ff5a48';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = EDGE; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function text(ctx, value, x, y, size, colour, align, weight) {
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  ctx.fillStyle = colour; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

export function flightReadings(aircraft) {
  return {
    knots: aircraft.speed * UNITS.knotsPerMetreSecond,
    stallKnots: (aircraft.flaps ? AIRCRAFT.flapStallSpeed : AIRCRAFT.stallSpeed) * UNITS.knotsPerMetreSecond,
    feet: aircraft.y * UNITS.feetPerMetre,
    feetAboveGround: Math.max(0, heightAboveGround(aircraft)) * UNITS.feetPerMetre,
    feetPerMinute: aircraft.verticalSpeed * UNITS.feetPerMetre * 60,
    heading: aircraft.heading, pitch: aircraft.pitch, bank: aircraft.bank,
    degrees: headingDegrees(aircraft.heading),
  };
}

function drawBigReadout(ctx, x, y, label, value, unit, note) {
  panel(ctx, x, y, 176, 92);
  text(ctx, label, x + 12, y + 28, 22, LIT);
  text(ctx, unit, x + 164, y + 28, 18, LIT, 'right');
  text(ctx, value, x + 164, y + 70, 46, WHITE, 'right', 800);
  if (note) text(ctx, note, x + 12, y + 86, 13, AMBER);
}

function drawCompassTape(ctx, readings) {
  const x = VIEW.width / 2, y = 12, half = 220;
  panel(ctx, x - half, y, half * 2, 40);
  ctx.save();
  ctx.beginPath(); ctx.rect(x - half + 3, y, half * 2 - 6, 40); ctx.clip();
  const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let mark = -70; mark <= 70; mark += 5) {
    const degrees = Math.round((readings.degrees + mark) / 5) * 5;
    const offset = (degrees - readings.degrees) * 3.4;
    const wrapped = ((degrees % 360) + 360) % 360;
    ctx.fillStyle = WHITE;
    ctx.fillRect(x + offset - 1, y + 30, 2, wrapped % 15 === 0 ? 10 : 5);
    if (wrapped % 15 === 0) text(ctx, names[wrapped] || String(wrapped).padStart(3, '0'), x + offset, y + 24, names[wrapped] ? 19 : 15, names[wrapped] ? AMBER : WHITE, 'center');
  }
  ctx.restore();
  ctx.fillStyle = AMBER;
  ctx.beginPath(); ctx.moveTo(x, y + 44); ctx.lineTo(x - 8, y + 56); ctx.lineTo(x + 8, y + 56); ctx.fill();
  panel(ctx, x - 92, y + 56, 184, 48);
  text(ctx, 'HDG', x - 80, y + 90, 22, LIT);
  text(ctx, `${String(Math.round(readings.degrees) % 360).padStart(3, '0')}\u00b0`, x + 82, y + 94, 38, WHITE, 'right', 800);
}

function drawMissionCard(ctx, run, aircraft) {
  const mission = run.mission;
  panel(ctx, 14, 12, 392, 92);
  text(ctx, mission.title.toUpperCase(), 26, 36, 17, LIT);
  const progress = `${mission.goal} ${run.doneCount}/${run.targets.length}`;
  text(ctx, progress, 26, 70, 30, WHITE, 'left', 800);
  let line = run.phase === 'land' ? `Land at ${run.landField.name}` : mission.hint;
  if (mission.id === 'fireLine' && run.phase === 'targets') line = aircraft.water ? 'Release over a fire: SPACE' : 'Skim the bay below 50 ft to scoop';
  text(ctx, line, 26, 92, 14, AMBER, 'left', 600);
  panel(ctx, VIEW.width - 266, 12, 252, 92);
  text(ctx, 'TIME', VIEW.width - 254, 40, 18, LIT);
  const left = mission.timeLimit ? mission.timeLimit - run.clock : run.clock;
  text(ctx, formatClock(left), VIEW.width - 26, 46, 34, mission.timeLimit && left < 40 ? RED : WHITE, 'right', 800);
  text(ctx, 'SCORE', VIEW.width - 254, 86, 18, LIT);
  text(ctx, String(run.score), VIEW.width - 26, 90, 30, WHITE, 'right', 800);
}

function drawTargetMarker(ctx, camera, aircraft, target) {
  if (!target) return;
  const c = toCameraSpace(camera, target.x, target.y, target.z, [0, 0, 0]);
  const distance = Math.hypot(target.x - aircraft.x, target.z - aircraft.z);
  const label = `${target.label}  ${(distance / 1000).toFixed(1)} km`;
  const W = VIEW.width, H = VIEW.height;
  let sx = W / 2 + (c[0] / Math.max(c[2], 0.01)) * VIEW.focal, sy = H / 2 - (c[1] / Math.max(c[2], 0.01)) * VIEW.focal;
  const onScreen = c[2] > VIEW.near && sx > 60 && sx < W - 60 && sy > 120 && sy < H - 150;
  ctx.strokeStyle = AMBER; ctx.fillStyle = AMBER; ctx.lineWidth = 3;
  if (onScreen) {
    const size = clamp(46 * 760 / Math.max(c[2], 40), 20, 150);
    ctx.beginPath();
    for (const [ex, ey] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(sx + ex * size, sy + ey * size * 0.6); ctx.lineTo(sx + ex * size, sy + ey * size);
      ctx.lineTo(sx + ex * size * 0.6, sy + ey * size);
    }
    ctx.stroke();
    text(ctx, label, sx, sy - size - 10, 20, AMBER, 'center', 800);
    return;
  }
  const angle = Math.atan2(c[2] > 0 ? -c[1] : Math.abs(c[1]) + 1, c[0]);
  const ex = W / 2 + Math.cos(angle) * 420, ey = H / 2 + Math.sin(angle) * 190;
  ctx.save();
  ctx.translate(ex, ey); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-10, -16); ctx.lineTo(-10, 16); ctx.fill();
  ctx.restore();
  text(ctx, label, clamp(ex, 330, W - 330), ey + (ey > H / 2 ? -26 : 40), 20, AMBER, 'center', 800);
}

function drawWarnings(ctx, aircraft, run, time) {
  if (run && run.result) return;
  const warnings = [];
  const height = heightAboveGround(aircraft);
  if (aircraft.stalled && !aircraft.grounded) warnings.push(['STALL', RED]);
  if (!aircraft.grounded && aircraft.verticalSpeed < -7 && height < 110) warnings.push(['PULL UP', RED]);
  if (aircraft.fuel <= 0) warnings.push(['ENGINE OUT', RED]);
  else if (aircraft.fuel < 12) warnings.push(['LOW FUEL', AMBER]);
  if (aircraft.damage > 55) warnings.push(['AIRFRAME DAMAGE', AMBER]);
  if (run && run.mission.dropSpeedLimit && run.phase === 'targets' && aircraft.speed > run.mission.dropSpeedLimit && !aircraft.grounded) warnings.push(['SLOW TO 90 KT FOR DROP', AMBER]);
  if (aircraft.braking && aircraft.grounded && aircraft.speed > 1) warnings.push(['BRAKES', LIT]);
  if (!warnings.length || (time % 0.6) > 0.42) return;
  warnings.slice(0, 2).forEach((warning, i) => {
    ctx.font = `800 30px ${FONT}`;
    const width = ctx.measureText(warning[0]).width + 40;
    ctx.fillStyle = 'rgba(8,12,16,0.78)'; ctx.fillRect(VIEW.width / 2 - width / 2, 126 + i * 48, width, 42);
    ctx.strokeStyle = warning[1]; ctx.lineWidth = 2; ctx.strokeRect(VIEW.width / 2 - width / 2, 126 + i * 48, width, 42);
    text(ctx, warning[0], VIEW.width / 2, 157 + i * 48, 30, warning[1], 'center', 800);
  });
}

function drawNotices(ctx, run) {
  if (run.result) return;
  let y = 196;
  for (const notice of run.notices) {
    if (notice.age > 5) continue;
    const alpha = clamp(5 - notice.age, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.font = `700 19px ${FONT}`;
    const width = ctx.measureText(notice.text).width + 28;
    ctx.fillStyle = PANEL; ctx.fillRect(14, y, width, 32);
    ctx.fillStyle = notice.tone === 'good' ? '#58d878' : notice.tone === 'bad' ? RED : LIT;
    ctx.fillRect(14, y, 5, 32);
    text(ctx, notice.text, 28, y + 23, 19, WHITE);
    ctx.globalAlpha = 1;
    y += 38;
  }
}

function drawMap(ctx, aircraft, run, target) {
  const cx = VIEW.width - 92, cy = VIEW.height - 92, radius = 78, range = 4200;
  ctx.fillStyle = 'rgba(8,18,24,0.8)';
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 2; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2); ctx.clip();
  const place = (x, z) => [cx + ((x - aircraft.x) / range) * radius, cy - ((z - aircraft.z) / range) * radius];
  ctx.strokeStyle = WHITE; ctx.lineWidth = 3;
  for (const field of AIRFIELDS) {
    const a = runwayPoint(field, -field.length / 2 - 120, 0), b = runwayPoint(field, field.length / 2 + 120, 0);
    const pa = place(a.x, a.z), pb = place(b.x, b.z);
    ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
  }
  if (run) {
    for (const t of run.targets) {
      if (t.done) continue;
      const p = place(t.x, t.z);
      ctx.fillStyle = t.kind === 'fire' ? RED : LIT;
      ctx.beginPath(); ctx.arc(p[0], p[1], 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (target) {
    const p = place(target.x, target.z);
    const d = Math.hypot(p[0] - cx, p[1] - cy), k = d > radius - 8 ? (radius - 8) / d : 1;
    ctx.strokeStyle = AMBER; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx + (p[0] - cx) * k, cy + (p[1] - cy) * k, 6.5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.translate(cx, cy); ctx.rotate(aircraft.heading);
  ctx.fillStyle = AMBER;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-7, 8); ctx.lineTo(0, 4); ctx.lineTo(7, 8); ctx.fill();
  ctx.restore();
  text(ctx, 'N', cx, cy - radius + 16, 14, WHITE, 'center');
}

function drawBars(ctx, aircraft, run) {
  const x = 16, width = 226;
  let y = VIEW.height - 114;
  if (run && run.mission.id === 'fireLine') {
    drawBarGauge(ctx, x, y - 30, width, 22, 'WATER', aircraft.water / AIRCRAFT.waterLoads, '#3aa0ff', false);
  }
  drawBarGauge(ctx, x, y, width, 22, 'FUEL', aircraft.fuel / 100, '#3fb86a', aircraft.fuel < 12);
  drawBarGauge(ctx, x, y + 30, width, 22, 'DAMAGE', aircraft.damage / 100, '#d88a2a', aircraft.damage > 55);
  drawBarGauge(ctx, x, y + 60, width, 22, 'THROTTLE', aircraft.throttle, '#6a8cff', false);
  text(ctx, `PWR ${Math.round(enginePower(aircraft) * 100)}%   FLAPS ${aircraft.flaps ? 'DOWN' : 'UP'}`, x, y + 104, 14, LIT, 'left', 700);
}

export function drawHud(ctx, camera, aircraft, run, target, time) {
  const readings = flightReadings(aircraft);
  drawCompassTape(ctx, readings);
  drawBigReadout(ctx, 16, 286, 'SPD', String(Math.round(readings.knots)), 'KT', aircraft.stalled && !aircraft.grounded ? 'BELOW STALL SPEED' : `STALL ${Math.round(readings.stallKnots)}`);
  drawBigReadout(ctx, VIEW.width - 192, 286, 'ALT', String(Math.round(readings.feet / 10) * 10), 'FT', `AGL ${Math.round(readings.feetAboveGround / 10) * 10} FT`);
  if (run) {
    drawMissionCard(ctx, run, aircraft);
    drawNotices(ctx, run);
  }
  drawTargetMarker(ctx, camera, aircraft, target);
  drawWarnings(ctx, aircraft, run, time);
  drawInstrumentRow(ctx, VIEW.width / 2, VIEW.height - 62, 46, readings);
  drawBars(ctx, aircraft, run);
  drawMap(ctx, aircraft, run, target);
}
