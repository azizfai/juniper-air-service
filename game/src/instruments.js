// The lit panel instruments: attitude indicator, airspeed and altimeter dials,
// vertical speed, heading rose, and the fuel, damage, throttle and water bars.

import { clamp } from './mathTools.js';

const FACE = '#0c1418', RIM = '#2c3a40', LIT = '#7ff0d8', AMBER = '#ffc04a', RED = '#ff5a48', WHITE = '#f2f6f4';

function drawBezel(ctx, x, y, r) {
  ctx.fillStyle = RIM;
  ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = FACE;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function drawGlass(ctx, x, y, r) {
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r - 4, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
}

function drawTicks(ctx, x, y, r, count, startAngle, sweep, majorEvery, colour) {
  ctx.strokeStyle = colour;
  for (let i = 0; i <= count; i++) {
    const angle = startAngle + (sweep * i) / count, major = i % majorEvery === 0;
    ctx.lineWidth = major ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * (r - 3), y + Math.sin(angle) * (r - 3));
    ctx.lineTo(x + Math.cos(angle) * (r - (major ? 12 : 7)), y + Math.sin(angle) * (r - (major ? 12 : 7)));
    ctx.stroke();
  }
}

function drawNeedle(ctx, x, y, angle, length, colour, width) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(angle) * 6, y - Math.sin(angle) * 6);
  ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
  ctx.stroke();
  ctx.fillStyle = '#d8dedc';
  ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
}

function drawCaption(ctx, x, y, text, size, colour) {
  ctx.fillStyle = colour || LIT;
  ctx.font = `700 ${size}px "Trebuchet MS", "DejaVu Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function drawAttitudeIndicator(ctx, x, y, r, pitch, bank) {
  drawBezel(ctx, x, y, r);
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-bank);
  const shift = clamp(pitch * r * 1.9, -r * 1.5, r * 1.5);
  ctx.fillStyle = '#3d8fd6'; ctx.fillRect(-r * 2, -r * 3 + shift, r * 4, r * 3);
  ctx.fillStyle = '#8a5a32'; ctx.fillRect(-r * 2, shift, r * 4, r * 3);
  ctx.strokeStyle = WHITE; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-r * 2, shift); ctx.lineTo(r * 2, shift); ctx.stroke();
  ctx.lineWidth = 1.3;
  for (let step = -3; step <= 3; step++) {
    if (step === 0) continue;
    const ly = shift - step * r * 0.33, half = step % 2 ? r * 0.2 : r * 0.36;
    ctx.beginPath(); ctx.moveTo(-half, ly); ctx.lineTo(half, ly); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = AMBER; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.62, y); ctx.lineTo(x - r * 0.2, y); ctx.lineTo(x, y + r * 0.14); ctx.lineTo(x + r * 0.2, y); ctx.lineTo(x + r * 0.62, y);
  ctx.stroke();
  ctx.fillStyle = WHITE;
  ctx.beginPath(); ctx.moveTo(x, y - r + 2); ctx.lineTo(x - 6, y - r + 13); ctx.lineTo(x + 6, y - r + 13); ctx.fill();
  drawGlass(ctx, x, y, r);
}

export function drawAirspeedDial(ctx, x, y, r, knots, stallKnots) {
  drawBezel(ctx, x, y, r);
  const start = Math.PI * 0.75, sweep = Math.PI * 1.5, top = 180;
  const angleOf = value => start + sweep * clamp(value / top, 0, 1);
  ctx.lineWidth = 5;
  ctx.strokeStyle = RED; ctx.beginPath(); ctx.arc(x, y, r - 5, angleOf(0), angleOf(stallKnots)); ctx.stroke();
  ctx.strokeStyle = '#58d878'; ctx.beginPath(); ctx.arc(x, y, r - 5, angleOf(stallKnots), angleOf(130)); ctx.stroke();
  ctx.strokeStyle = AMBER; ctx.beginPath(); ctx.arc(x, y, r - 5, angleOf(130), angleOf(top)); ctx.stroke();
  drawTicks(ctx, x, y, r - 6, 18, start, sweep, 3, WHITE);
  drawCaption(ctx, x, y + r * 0.42, 'KT', r * 0.24);
  drawCaption(ctx, x, y - r * 0.36, String(Math.round(knots)), r * 0.42, WHITE);
  drawNeedle(ctx, x, y, angleOf(knots), r - 14, AMBER, 3.4);
  drawGlass(ctx, x, y, r);
}

export function drawAltimeter(ctx, x, y, r, feet) {
  drawBezel(ctx, x, y, r);
  drawTicks(ctx, x, y, r, 50, -Math.PI / 2, Math.PI * 2, 5, WHITE);
  drawCaption(ctx, x, y + r * 0.42, 'ALT FT', r * 0.2);
  drawCaption(ctx, x, y - r * 0.36, String(Math.round(feet / 10) * 10), r * 0.36, WHITE);
  drawNeedle(ctx, x, y, -Math.PI / 2 + ((feet % 10000) / 10000) * Math.PI * 2, r * 0.5, WHITE, 5);
  drawNeedle(ctx, x, y, -Math.PI / 2 + ((feet % 1000) / 1000) * Math.PI * 2, r - 12, LIT, 3);
  drawGlass(ctx, x, y, r);
}

export function drawVerticalSpeed(ctx, x, y, r, feetPerMinute) {
  drawBezel(ctx, x, y, r);
  drawTicks(ctx, x, y, r, 16, Math.PI * 0.25, Math.PI * 1.5, 4, WHITE);
  drawCaption(ctx, x + r * 0.3, y, 'VS', r * 0.26);
  const angle = Math.PI + clamp(feetPerMinute / 2000, -1, 1) * Math.PI * 0.75;
  drawNeedle(ctx, x, y, angle, r - 12, feetPerMinute < -900 ? RED : LIT, 3.2);
  drawGlass(ctx, x, y, r);
}

export function drawHeadingRose(ctx, x, y, r, heading) {
  drawBezel(ctx, x, y, r);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-heading);
  ctx.strokeStyle = WHITE;
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2 - Math.PI / 2, major = i % 3 === 0;
    ctx.lineWidth = major ? 2.2 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (r - 3), Math.sin(angle) * (r - 3));
    ctx.lineTo(Math.cos(angle) * (r - (major ? 11 : 6)), Math.sin(angle) * (r - (major ? 11 : 6)));
    ctx.stroke();
  }
  const letters = ['N', 'E', 'S', 'W'];
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);
    drawCaption(ctx, 0, -r + 21, letters[i], r * 0.3, i === 0 ? AMBER : WHITE);
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = AMBER;
  ctx.beginPath(); ctx.moveTo(x, y - r * 0.42); ctx.lineTo(x - r * 0.16, y + r * 0.3); ctx.lineTo(x, y + r * 0.16); ctx.lineTo(x + r * 0.16, y + r * 0.3); ctx.fill();
  drawGlass(ctx, x, y, r);
}

// A labelled bar that fills left to right; warn turns it red below the mark.
export function drawBarGauge(ctx, x, y, width, height, label, fraction, colour, warn) {
  ctx.fillStyle = RIM; ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
  ctx.fillStyle = FACE; ctx.fillRect(x, y, width, height);
  ctx.fillStyle = warn ? RED : colour;
  ctx.fillRect(x + 2, y + 2, (width - 4) * clamp(fraction, 0, 1), height - 4);
  ctx.fillStyle = WHITE;
  ctx.font = `700 ${Math.round(height * 0.7)}px "Trebuchet MS", "DejaVu Sans", sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 7, y + height / 2 + 1);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(clamp(fraction, 0, 1) * 100)}%`, x + width - 6, y + height / 2 + 1);
}

// The six-pack: every round instrument in one row, centred on (x, y).
export function drawInstrumentRow(ctx, x, y, r, readings) {
  const gap = r * 2 + 16, left = x - gap * 2;
  drawAirspeedDial(ctx, left, y, r, readings.knots, readings.stallKnots);
  drawAttitudeIndicator(ctx, left + gap, y, r, readings.pitch, readings.bank);
  drawAltimeter(ctx, left + gap * 2, y, r, readings.feet);
  drawVerticalSpeed(ctx, left + gap * 3, y, r, readings.feetPerMinute);
  drawHeadingRose(ctx, left + gap * 4, y, r, readings.heading);
}
