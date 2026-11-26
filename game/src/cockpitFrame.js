// The cockpit view's frame: the Wren's cowling and spinning propeller ahead,
// the windscreen pillars and wing roots, and the panel the gauges sit in.

import { VIEW } from './config.js';
import { enginePower } from './flightModel.js';

export function drawCockpitFrame(ctx, aircraft, palette, time) {
  const W = VIEW.width, H = VIEW.height, dusk = palette.name === 'dusk';
  const power = enginePower(aircraft);
  // Propeller disc and blades, seen from behind through the windscreen.
  ctx.fillStyle = `rgba(210,220,226,${0.08 + power * 0.1})`;
  ctx.beginPath(); ctx.ellipse(W / 2, 512, 250, 236, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(30,32,36,0.28)'; ctx.lineWidth = 16;
  const spin = time * (5 + power * 26);
  ctx.beginPath();
  ctx.moveTo(W / 2 - Math.cos(spin) * 246, 512 - Math.sin(spin) * 232);
  ctx.lineTo(W / 2 + Math.cos(spin) * 246, 512 + Math.sin(spin) * 232);
  ctx.stroke();
  // Engine cowling.
  const cowl = ctx.createLinearGradient(0, 452, 0, 560);
  cowl.addColorStop(0, dusk ? '#2a5c4e' : '#3c8a6c');
  cowl.addColorStop(1, dusk ? '#16332c' : '#1f5a44');
  ctx.fillStyle = cowl;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 300, 566);
  ctx.quadraticCurveTo(W / 2 - 250, 462, W / 2, 452);
  ctx.quadraticCurveTo(W / 2 + 250, 462, W / 2 + 300, 566);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W / 2 - 150, 476); ctx.quadraticCurveTo(W / 2, 458, W / 2 + 150, 476); ctx.stroke();
  ctx.fillStyle = '#2a2e32';
  ctx.beginPath(); ctx.ellipse(W / 2, 470, 34, 20, 0, 0, Math.PI * 2); ctx.fill();
  // Wing roots across the top and the windscreen pillars.
  ctx.fillStyle = dusk ? '#191c22' : '#22272c';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 6); ctx.lineTo(W - 150, 2); ctx.lineTo(150, 2); ctx.lineTo(0, 6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(54, 0); ctx.lineTo(118, 560); ctx.lineTo(0, 600); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - 54, 0); ctx.lineTo(W - 118, 560); ctx.lineTo(W, 600); ctx.fill();
  // Instrument panel under a curved glareshield.
  const panel = ctx.createLinearGradient(0, 540, 0, H);
  panel.addColorStop(0, '#11161a');
  panel.addColorStop(1, '#232b30');
  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.moveTo(0, 590);
  ctx.quadraticCurveTo(W * 0.2, 548, W / 2, 544);
  ctx.quadraticCurveTo(W * 0.8, 548, W, 590);
  ctx.lineTo(W, H); ctx.lineTo(0, H);
  ctx.fill();
  ctx.strokeStyle = 'rgba(127,240,216,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 590); ctx.quadraticCurveTo(W * 0.2, 548, W / 2, 544); ctx.quadraticCurveTo(W * 0.8, 548, W, 590); ctx.stroke();
  ctx.fillStyle = '#8c9498';
  for (const x of [270, 330, 950, 1010]) { ctx.beginPath(); ctx.arc(x, 612, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7ff0d8';
  ctx.font = '700 13px "Trebuchet MS", "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('JUNIPER AIR SERVICE  \u00b7  J-4 WREN', W / 2, 590);
}
