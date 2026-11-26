// The cards laid over the flight: the job board on the title screen, the
// pre-flight briefing, the pause card, the landing debrief and the crash report.

import { VIEW, UNITS } from './config.js';
import { MISSIONS } from './missions.js';
import { formatClock } from './mathTools.js';

const FONT = '"Trebuchet MS", "DejaVu Sans", sans-serif';
const LIT = '#7ff0d8', WHITE = '#f4f8f6', AMBER = '#ffc04a', RED = '#ff5a48', GREEN = '#58d878';

function card(ctx, x, y, w, h, edge) {
  ctx.fillStyle = 'rgba(8,16,22,0.86)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge || LIT; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

function write(ctx, value, x, y, size, colour, align, weight) {
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  ctx.fillStyle = colour; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function row(ctx, x, y, w, label, value, colour) {
  write(ctx, label, x, y, 19, LIT, 'left', 600);
  write(ctx, value, x + w, y, 20, colour || WHITE, 'right', 800);
}

export function drawJobBoard(ctx, selected, bestScores, time) {
  const x = 40, y = 120, w = 590;
  card(ctx, x, y, w, 470);
  write(ctx, 'JUNIPER AIR SERVICE', x + 24, y + 50, 38, WHITE, 'left', 800);
  write(ctx, 'One bush plane, one valley, four jobs on the board.', x + 26, y + 78, 16, AMBER, 'left', 600);
  MISSIONS.forEach((mission, i) => {
    const top = y + 100 + i * 68, chosen = i === selected;
    ctx.fillStyle = chosen ? 'rgba(127,240,216,0.2)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(x + 20, top, w - 40, 60);
    if (chosen) { ctx.strokeStyle = AMBER; ctx.lineWidth = 2.5; ctx.strokeRect(x + 20, top, w - 40, 60); }
    write(ctx, `${i + 1}`, x + 34, top + 40, 30, chosen ? AMBER : LIT, 'left', 800);
    write(ctx, mission.title, x + 66, top + 27, 21, WHITE, 'left', 800);
    write(ctx, mission.tagline, x + 66, top + 48, 14, '#c8d4d0', 'left', 600);
    const best = bestScores[mission.id];
    if (best) write(ctx, `BEST ${best}`, x + w - 30, top + 27, 14, GREEN, 'right', 800);
  });
  const blink = (time % 1.1) < 0.7;
  write(ctx, blink ? 'ENTER  fly the job' : '', x + 26, y + 400, 22, AMBER, 'left', 800);
  write(ctx, 'UP / DOWN or 1-4  choose', x + 290, y + 400, 16, LIT, 'left', 700);
  write(ctx, 'Arrows or WASD fly (or hold the mouse)  \u00b7  SHIFT / CTRL throttle  \u00b7  B brakes', x + 26, y + 430, 13, WHITE, 'left', 600);
  write(ctx, 'F flaps  \u00b7  SPACE release water  \u00b7  C cockpit view  \u00b7  P pause  \u00b7  M sound', x + 26, y + 450, 13, WHITE, 'left', 600);
}

export function drawBriefing(ctx, mission) {
  const w = 700, x = VIEW.width / 2 - w / 2, y = 128;
  card(ctx, x, y, w, 150, AMBER);
  write(ctx, mission.title.toUpperCase(), x + 22, y + 36, 24, AMBER, 'left', 800);
  mission.briefing.forEach((line, i) => write(ctx, line, x + 22, y + 66 + i * 24, 17, WHITE, 'left', 600));
  write(ctx, 'Hold SHIFT for full throttle, pull back at 60 kt.', x + 22, y + 140, 15, LIT, 'left', 700);
}

export function drawPauseCard(ctx) {
  const w = 420, x = VIEW.width / 2 - w / 2, y = 250;
  card(ctx, x, y, w, 130);
  write(ctx, 'PAUSED', VIEW.width / 2, y + 56, 40, WHITE, 'center', 800);
  write(ctx, 'P resume  \u00b7  R restart  \u00b7  ESC job board', VIEW.width / 2, y + 98, 17, LIT, 'center', 700);
}

export function drawDebrief(ctx, run) {
  const result = run.result, w = 600, x = VIEW.width / 2 - w / 2, y = 122, pad = 26;
  card(ctx, x, y, w, 296, GREEN);
  write(ctx, 'JOB COMPLETE', x + pad, y + 44, 32, GREEN, 'left', 800);
  write(ctx, run.mission.title, x + pad, y + 68, 16, WHITE, 'left', 600);
  write(ctx, 'GRADE', x + w - 96, y + 34, 14, LIT, 'center', 700);
  write(ctx, result.grade, x + w - 96, y + 92, 60, AMBER, 'center', 800);
  const half = (w - pad * 3) / 2, left = x + pad, right = x + pad * 2 + half;
  const touch = result.touchdown;
  row(ctx, left, y + 110, half, `${run.mission.goal} ${run.doneCount}/${run.targets.length}`, `+${result.targets}`);
  row(ctx, left, y + 138, half, `Time ${formatClock(run.clock)}`, `+${result.timeBonus}`);
  row(ctx, left, y + 166, half, 'Fuel in the tank', `+${result.fuelBonus}`);
  row(ctx, left, y + 194, half, 'Airframe damage', `-${result.damagePenalty}`, result.damagePenalty ? RED : WHITE);
  row(ctx, right, y + 138, half, 'Landing', `+${result.landing}`);
  if (touch) {
    row(ctx, right, y + 166, half, 'Sink rate', `${Math.round(touch.sinkRate * UNITS.feetPerMetre * 60)} fpm`, touch.sinkRate > 2.4 ? RED : GREEN);
    row(ctx, right, y + 194, half, 'Off centreline', `${Math.abs(touch.across).toFixed(1)} m`, Math.abs(touch.across) > 8 ? AMBER : GREEN);
  }
  ctx.fillStyle = 'rgba(127,240,216,0.35)'; ctx.fillRect(left, y + 210, w - pad * 2, 2);
  write(ctx, 'TOTAL', left, y + 250, 26, LIT, 'left', 800);
  write(ctx, String(result.total), left + 230, y + 252, 36, WHITE, 'right', 800);
  write(ctx, result.newBest ? 'New best for this job' : '', x + w - pad, y + 248, 17, GREEN, 'right', 700);
  write(ctx, 'ENTER next job  \u00b7  R fly again  \u00b7  ESC job board', x + w / 2, y + 281, 15, AMBER, 'center', 700);
}

export function drawCrashReport(ctx, run, aircraft) {
  const result = run.result, w = 600, x = VIEW.width / 2 - w / 2, y = 122, pad = 26;
  card(ctx, x, y, w, 236, RED);
  write(ctx, 'FLIGHT OVER', x + pad, y + 44, 32, RED, 'left', 800);
  write(ctx, result.cause, x + pad, y + 80, 24, WHITE, 'left', 800);
  write(ctx, result.detail, x + pad, y + 106, 16, '#d4dcd8', 'left', 600);
  const half = (w - pad * 3) / 2;
  const crash = aircraft.crashed;
  if (crash) {
    row(ctx, x + pad, y + 142, half, 'Speed at impact', `${Math.round(crash.speed * UNITS.knotsPerMetreSecond)} kt`);
    row(ctx, x + pad * 2 + half, y + 142, half, 'Sink rate', `${Math.round(Math.max(0, crash.sinkRate) * UNITS.feetPerMetre * 60)} fpm`);
  }
  row(ctx, x + pad, y + 170, half, `${run.mission.goal} done`, `${run.doneCount}/${run.targets.length}`);
  row(ctx, x + pad * 2 + half, y + 170, half, 'Flight time', formatClock(run.clock));
  write(ctx, 'R fly again  \u00b7  ESC job board', x + w - pad, y + 212, 16, AMBER, 'right', 700);
}
