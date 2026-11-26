// Juniper Air Service — start-up, the frame loop and the mode switches between
// the job board, a sortie, the pause card and the debrief.

import { VIEW, PALETTES } from './config.js';
import { MISSIONS } from './missions.js';
import { createCamera } from './camera.js';
import { createViewpoint, aimCamera } from './flightCamera.js';
import { paintWorld } from './worldPainter.js';
import { drawHud } from './hud.js';
import { drawJobBoard, drawBriefing, drawPauseCard, drawDebrief, drawCrashReport } from './screens.js';
import { listenForInput, readFlightControls, wasPressed, anyKeyPressed, clearPresses, centreStick } from './input.js';
import { beginSortie, stepSortie, loadBestScores, describeSortie } from './sortie.js';
import { stageShot } from './shotScenes.js';
import * as audio from './audio.js';

const STEP = 1 / 60;
const canvas = document.getElementById('flight-view');
const ctx = canvas.getContext('2d');
const query = new URLSearchParams(window.location.search);

const game = {
  mode: 'board', selected: 0, seed: Number(query.get('seed')) || 1,
  run: null, aircraft: null, effects: null, pilot: null, navTarget: null,
  camera: createCamera(), viewpoint: createViewpoint(), palette: PALETTES.day,
  time: 0, attract: true, attractOver: false, frozen: false, rate: 1,
  bestScores: loadBestScores(),
};

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}

function openJobBoard() {
  game.mode = 'board';
  game.attract = true;
  game.attractOver = false;
  game.viewpoint.mode = 'chase';
  beginSortie(game, 0, true);
}

function flyMission(index, automated) {
  game.selected = index;
  game.mode = 'flying';
  game.attract = false;
  game.viewpoint.mode = 'chase';
  centreStick();
  beginSortie(game, index, automated);
}

function handleBoardKeys() {
  const count = MISSIONS.length;
  if (wasPressed('ArrowDown') || wasPressed('KeyS')) { game.selected = (game.selected + 1) % count; audio.playMenuTick(); }
  if (wasPressed('ArrowUp') || wasPressed('KeyW')) { game.selected = (game.selected + count - 1) % count; audio.playMenuTick(); }
  for (let i = 0; i < count; i++) if (wasPressed(`Digit${i + 1}`)) { game.selected = i; audio.playMenuTick(); }
  if (wasPressed('Enter') || wasPressed('Space')) flyMission(game.selected, false);
}

function handleSortieKeys() {
  if (wasPressed('KeyC')) game.viewpoint.mode = game.viewpoint.mode === 'chase' ? 'cockpit' : 'chase';
  if (wasPressed('KeyP') && (game.mode === 'flying' || game.mode === 'paused')) game.mode = game.mode === 'paused' ? 'flying' : 'paused';
  if (wasPressed('KeyR')) flyMission(game.selected, false);
  if (wasPressed('Escape')) openJobBoard();
  if (game.mode === 'debrief' && wasPressed('Enter')) flyMission((game.selected + 1) % MISSIONS.length, false);
}

function update(frameSeconds) {
  if (anyKeyPressed()) audio.wakeAudio();
  if (wasPressed('KeyM')) audio.toggleMute();
  if (game.frozen) return clearPresses();
  if (game.mode === 'board') handleBoardKeys(); else handleSortieKeys();
  if (game.mode !== 'paused') {
    const controls = readFlightControls(frameSeconds);
    const steps = Math.max(1, Math.round(frameSeconds / STEP)) * game.rate;
    for (let i = 0; i < steps; i++) {
      stepSortie(game, controls, STEP);
      controls.release = false; controls.toggleFlaps = false;
      game.time += STEP;
    }
    if (game.mode === 'board' && game.attractOver) openJobBoard();
  }
  clearPresses();
}

function render() {
  aimCamera(game.camera, game.viewpoint, game.aircraft);
  paintWorld(ctx, game);
  drawHud(ctx, game.camera, game.aircraft, game.run, game.navTarget, game.time);
  if (game.mode === 'board') drawJobBoard(ctx, game.selected, game.bestScores, game.time);
  else if (game.mode === 'paused') drawPauseCard(ctx);
  else if (game.mode === 'debrief') drawDebrief(ctx, game.run);
  else if (game.mode === 'crashed') drawCrashReport(ctx, game.run, game.aircraft);
  else if (game.aircraft.grounded && game.run.clock < 30 && game.aircraft.speed < 4 && game.run.phase === 'targets' && !game.pilot) drawBriefing(ctx, game.run.mission);
}

let lastStamp = 0;
function frame(stamp) {
  const elapsed = Math.min(0.1, (stamp - lastStamp) / 1000 || STEP);
  lastStamp = stamp;
  update(elapsed);
  render();
  window.requestAnimationFrame(frame);
}

function start() {
  listenForInput(canvas);
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  openJobBoard();
  const shot = query.get('shot'), autoplay = query.get('autoplay');
  if (shot) stageShot(game, shot);
  else if (autoplay) {
    flyMission(Math.max(0, MISSIONS.findIndex(mission => mission.id === autoplay)), true);
    game.rate = Number(query.get('rate')) || 1;
  } else if (query.get('mission')) flyMission(Math.max(0, MISSIONS.findIndex(mission => mission.id === query.get('mission'))), false);
  // A read-only view of the sortie for the play-test script.
  window.juniperProbe = () => describeSortie(game);
  render();
  document.documentElement.dataset.ready = shot || 'game';
  window.requestAnimationFrame(frame);
}

start();
