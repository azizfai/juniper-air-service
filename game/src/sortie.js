// One sortie from brakes-off to debrief: wires the flight model, the mission
// rules, the effects and the sounds together and tracks the game's mode.

import { PALETTES, AIRCRAFT } from './config.js';
import { MISSIONS } from './missions.js';
import { createAircraft, placeOnRunway, stepFlight, enginePower } from './flightModel.js';
import { startMissionRun, advanceMission, navigationTarget, failRun, postNotice } from './missionRules.js';
import { createEffects, emit, stepEffects } from './effects.js';
import { createAutopilot, autopilotControls } from './autopilot.js';
import { snapViewpoint, followAircraft } from './flightCamera.js';
import * as audio from './audio.js';

const STORE_KEY = 'juniper-air-service-best';

export function loadBestScores() {
  try { return JSON.parse(window.localStorage.getItem(STORE_KEY)) || {}; } catch (error) { return {}; }
}

function saveBestScore(game, missionId, total) {
  const previous = game.bestScores[missionId] || 0;
  if (total <= previous) return false;
  game.bestScores[missionId] = total;
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(game.bestScores)); } catch (error) { /* private mode */ }
  return true;
}

export function beginSortie(game, missionIndex, automated) {
  const mission = MISSIONS[missionIndex];
  game.run = startMissionRun(mission);
  game.aircraft = createAircraft();
  placeOnRunway(game.aircraft, game.run.startField, mission.startAlong, mission.startReversed);
  game.aircraft.fuel = mission.startFuel;
  game.effects = createEffects(game.seed + missionIndex);
  game.palette = PALETTES[mission.palette];
  game.pilot = automated ? createAutopilot() : null;
  game.navTarget = navigationTarget(game.run, game.aircraft);
  game.wreckSmoke = 0;
  snapViewpoint(game.viewpoint, game.aircraft);
}

function showFlightEvents(game, events) {
  const aircraft = game.aircraft, effects = game.effects;
  for (const event of events) {
    if (event.type === 'touchdown' || event.type === 'roughLanding') {
      emit(effects, 'dust', aircraft.x, aircraft.y - 1.4, aircraft.z, 14, 5, [0, 1.5, 0]);
      if (!game.attract) audio.playTouchdownThump(event.sinkRate > 2.4);
    }
    if (event.type === 'crash') {
      emit(effects, 'fire', aircraft.x, aircraft.y, aircraft.z, 26, 16, [0, 6, 0]);
      emit(effects, 'smoke', aircraft.x, aircraft.y, aircraft.z, 22, 9, [0, 5, 0]);
      emit(effects, 'debris', aircraft.x, aircraft.y, aircraft.z, 18, 30, [0, 12, 0]);
      aircraft.bank = 0.5; aircraft.pitch = -0.3; aircraft.speed = 0;
      failRun(game.run, event.cause, event.detail);
      if (!game.attract) audio.playCrashCrunch();
      game.mode = game.attract ? game.mode : 'crashed';
      game.attractOver = true;
    }
  }
}

function showMissionHappenings(game, happenings) {
  const aircraft = game.aircraft, effects = game.effects, quiet = game.attract;
  const drift = [Math.sin(aircraft.heading) * aircraft.speed * 0.5, -4, Math.cos(aircraft.heading) * aircraft.speed * 0.5];
  for (const happening of happenings) {
    if (happening.type === 'targetDone' && !quiet) audio.playTargetChime();
    if (happening.type === 'missedDrop' && !quiet) audio.playMissChime();
    if (happening.type === 'waterDrop') {
      emit(effects, 'water', aircraft.x, aircraft.y - 1.5, aircraft.z, 70, 13, drift);
      if (!quiet) audio.playWaterRelease();
    }
    if (happening.type === 'targetDone' && happening.target.kind === 'fire') {
      emit(effects, 'steam', happening.target.x, happening.target.y - happening.target.agl + 6, happening.target.z, 16, 14, [0, 6, 0]);
    }
    if (happening.type === 'scooping') emit(effects, 'spray', aircraft.x, 1, aircraft.z, 3, 7, [0, 5, 0]);
    if (happening.type === 'heat' && effects.random() < 0.3) emit(effects, 'fire', aircraft.x, aircraft.y - 2, aircraft.z, 1, 4, drift);
    if (happening.type === 'parcelDrop') emit(effects, 'parcel', aircraft.x, aircraft.y - 2, aircraft.z, 1, 0, [drift[0] * 0.4, -3, drift[2] * 0.4]);
    if (happening.type === 'missionComplete') {
      game.run.result.newBest = !quiet && saveBestScore(game, game.run.mission.id, game.run.result.total);
      if (!quiet) { audio.playMissionFanfare(); game.mode = 'debrief'; }
      game.attractOver = true;
    }
    if (happening.type === 'missionFailed') {
      if (!quiet) { audio.playMissChime(); game.mode = 'crashed'; }
      game.attractOver = true;
    }
  }
}

// Advances the sortie by dt. playerControls is ignored while the autopilot flies.
export function stepSortie(game, playerControls, dt) {
  const aircraft = game.aircraft, run = game.run;
  const controls = game.pilot ? autopilotControls(game.pilot, aircraft, run, game.navTarget, dt) : playerControls;
  const wasFlying = !aircraft.crashed && !run.result;
  if (wasFlying) {
    const events = stepFlight(aircraft, controls, dt);
    showFlightEvents(game, events);
    showMissionHappenings(game, advanceMission(run, aircraft, controls, dt, events));
    if (aircraft.fuel <= 0 && aircraft.grounded && aircraft.speed < 0.5 && !run.result && aircraft.field !== run.landField) {
      failRun(run, 'Out of fuel, short of the strip', 'The tank ran dry and there is no pump out here.');
      game.mode = game.attract ? game.mode : 'crashed';
      game.attractOver = true;
    }
  } else if (aircraft.crashed) {
    game.wreckSmoke += dt;
    if (game.wreckSmoke > 0.12) { game.wreckSmoke = 0; emit(game.effects, 'smoke', aircraft.x, aircraft.y + 1, aircraft.z, 1, 3, [2, 5, 0]); }
  }
  stepEffects(game.effects, dt);
  game.navTarget = run.result ? null : navigationTarget(run, aircraft);
  followAircraft(game.viewpoint, aircraft, dt, Boolean(aircraft.crashed || run.result));
  if (!game.attract) audio.tuneFlightSound(enginePower(aircraft), aircraft.speed, aircraft.stalled && !aircraft.grounded, game.mode === 'flying');
}

export function describeSortie(game) {
  const a = game.aircraft, run = game.run;
  return {
    mode: game.mode, mission: run.mission.id, phase: run.phase, done: run.doneCount, of: run.targets.length,
    clock: +run.clock.toFixed(1), grounded: a.grounded, speed: +a.speed.toFixed(1), fuel: +a.fuel.toFixed(1),
    damage: +a.damage.toFixed(1), water: a.water, x: Math.round(a.x), y: Math.round(a.y), z: Math.round(a.z),
    crashed: a.crashed ? a.crashed.cause : null, result: run.result, goArounds: game.pilot ? game.pilot.goArounds : 0,
    stallSpeed: AIRCRAFT.stallSpeed, notice: run.notices[0] ? run.notices[0].text : '',
  };
}

export { postNotice };
