// Stages the four screenshots. `?shot=<name>&seed=1` freezes the game at a
// fixed moment of a real sortie so the same picture renders every time.

import { MISSIONS } from './missions.js';
import { beginSortie } from './sortie.js';
import { placeInFlight, placeOnRunway } from './flightModel.js';
import { advanceMission, navigationTarget, postNotice } from './missionRules.js';
import { emit, stepEffects } from './effects.js';
import { snapViewpoint } from './flightCamera.js';
import { bearingTo } from './mathTools.js';
import { SCORE } from './config.js';

function missionIndex(id) {
  return MISSIONS.findIndex(mission => mission.id === id);
}

function markDone(run, count, points) {
  for (let i = 0; i < count; i++) run.targets[i].done = true;
  run.doneCount = count;
  run.score = count * points;
  if (count === run.targets.length) run.phase = 'land';
}

// Puts the aircraft `back` metres short of a target, lined up with it.
function approachTarget(aircraft, target, back, above, speed, offsetAngle) {
  const heading = target.axis + (offsetAngle || 0);
  placeInFlight(aircraft, target.x - Math.sin(heading) * back, target.y + above, target.z - Math.cos(heading) * back, heading, speed);
}

const SCENES = {
  // Final approach to Juniper Field through the last ring of the circuit.
  approach(game) {
    beginSortie(game, missionIndex('ringCircuit'), false);
    const run = game.run, aircraft = game.aircraft;
    markDone(run, 7, SCORE.ring);
    approachTarget(aircraft, run.targets[7], 135, 8, 39, 0);
    aircraft.pitch = -0.055; aircraft.bank = 0.05; aircraft.throttle = 0.34; aircraft.flaps = true;
    aircraft.fuel = 31; aircraft.verticalSpeed = -2.3;
    run.clock = 214;
    postNotice(run, 'Ring 7 of 8.', 'good');
    game.viewpoint.mode = 'chase';
  },
  // The mail run from the pilot's seat, slowing for the Cedar Gap drop.
  cockpit(game) {
    beginSortie(game, missionIndex('mailRun'), false);
    const run = game.run, aircraft = game.aircraft;
    markDone(run, 1, SCORE.delivery);
    approachTarget(aircraft, run.targets[1], 300, 9, 44, -0.03);
    aircraft.pitch = -0.02; aircraft.bank = -0.07; aircraft.throttle = 0.42; aircraft.fuel = 17; aircraft.verticalSpeed = -0.9;
    run.clock = 96;
    postNotice(run, 'Parcel delivered to Alder Farm.', 'good');
    game.viewpoint.mode = 'cockpit';
  },
  // Banking in on the second fire with one load of water left.
  fireline(game) {
    beginSortie(game, missionIndex('fireLine'), false);
    const run = game.run, aircraft = game.aircraft;
    run.targets[0].done = true; run.doneCount = 1; run.score = SCORE.fire;
    const fire = run.targets[1];
    approachTarget(aircraft, fire, 340, 26, 50, 0.05);
    aircraft.pitch = -0.03; aircraft.bank = 0.2; aircraft.throttle = 0.7; aircraft.fuel = 49; aircraft.damage = 22;
    aircraft.water = 1; aircraft.verticalSpeed = -1.5;
    run.clock = 171;
    postNotice(run, 'Fire out. 3 still burning.', 'good');
    const first = run.targets[0];
    emit(game.effects, 'steam', first.x, first.y - first.agl + 20, first.z, 14, 30, [0, 3, 0]);
    stepEffects(game.effects, 1.2);
    game.viewpoint.mode = 'chase';
  },
  // Rolled out at Juniper after the dusk slalom, with the debrief on screen.
  debrief(game) {
    beginSortie(game, missionIndex('duskSlalom'), false);
    const run = game.run, aircraft = game.aircraft;
    markDone(run, run.targets.length, SCORE.gate);
    placeOnRunway(aircraft, run.landField, -80, true);
    aircraft.fuel = 21; aircraft.damage = 4; aircraft.flaps = true;
    aircraft.lastTouchdown = { sinkRate: 1.3, across: 2.4, speed: 31, field: run.landField };
    run.clock = 188;
    const idle = { pitch: 0, roll: 0, throttle: 0, brake: true, release: false, toggleFlaps: false };
    advanceMission(run, aircraft, idle, 0.016, []);
    run.result.newBest = true;
    game.mode = 'debrief';
    game.viewpoint.mode = 'chase';
  },
};

export function shotNames() {
  return Object.keys(SCENES);
}

// Returns true when the name was a known scene and the game is now frozen on it.
export function stageShot(game, name) {
  if (!SCENES[name]) return false;
  game.mode = 'flying';
  game.attract = false;
  SCENES[name](game);
  game.frozen = true;
  game.time = 3.3;
  game.navTarget = game.run.result ? null : navigationTarget(game.run, game.aircraft);
  snapViewpoint(game.viewpoint, game.aircraft);
  if (name === 'debrief') game.viewpoint.heading = game.aircraft.heading - 0.5;
  return true;
}

export function headingBetween(from, to) {
  return bearingTo(from.x, from.z, to.x, to.z);
}
