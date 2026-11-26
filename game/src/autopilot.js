// A demonstration pilot that flies the same controls as the player. It runs
// the title screen's attract flight and the automated play-test: take off,
// chase each target with terrain clearance, then fly a pattern and land.

import { AIRCRAFT } from './config.js';
import { clamp, wrapAngle, bearingTo } from './mathTools.js';
import { surfaceHeight } from './terrainHeight.js';
import { runwayCoordinates, runwayPoint } from './airfields.js';
import { heightAboveGround } from './flightModel.js';

function steerToHeading(aircraft, heading, maxBank) {
  const error = wrapAngle(heading - aircraft.heading);
  const wantedBank = clamp(error * 1.5, -maxBank, maxBank);
  return clamp((wantedBank - aircraft.bank) * 3.2, -1, 1);
}

function holdPitch(aircraft, wantedPitch) {
  const turnHelp = (1 - Math.cos(aircraft.bank)) * 0.5;
  return clamp((wantedPitch - aircraft.pitch) * 4.5 + turnHelp, -1, 1);
}

function holdSpeed(aircraft, wantedSpeed) {
  const wantedThrottle = clamp(0.55 + (wantedSpeed - aircraft.speed) * 0.09, 0, 1);
  return clamp((wantedThrottle - aircraft.throttle) * 4, -1, 1);
}

// Never aim below the ground that lies ahead on the present heading.
function safeAltitude(aircraft, wantedY, margin) {
  let floor = wantedY;
  for (const ahead of [120, 250, 550, 900, 1300]) {
    const x = aircraft.x + Math.sin(aircraft.heading) * ahead, z = aircraft.z + Math.cos(aircraft.heading) * ahead;
    floor = Math.max(floor, surfaceHeight(x, z) + margin);
  }
  return floor;
}

function flyToward(aircraft, x, y, z, speed, margin) {
  const distance = Math.hypot(x - aircraft.x, z - aircraft.z);
  const wantedY = margin ? safeAltitude(aircraft, y, margin) : y;
  const climbing = wantedY > aircraft.y + 25;
  const climb = clamp(Math.atan2(wantedY - aircraft.y, Math.max(distance, 250)) * 1.6, -0.2, 0.26);
  return {
    pitch: holdPitch(aircraft, climbing ? Math.max(climb, 0.2) : climb),
    roll: steerToHeading(aircraft, bearingTo(aircraft.x, aircraft.z, x, z), 0.85),
    throttle: climbing ? 1 : holdSpeed(aircraft, speed),
    brake: false, release: false, toggleFlaps: false,
  };
}

function landingControls(pilot, aircraft, field) {
  const reversed = pilot.landReversed;
  const runwayHeading = field.heading + (reversed ? Math.PI : 0);
  const sign = reversed ? -1 : 1;
  const place = runwayCoordinates(field, aircraft.x, aircraft.z);
  const along = place.along * sign, across = place.across * sign;
  const threshold = -field.length / 2 + 120;
  if (aircraft.grounded) {
    return { pitch: 0, roll: clamp(wrapAngle(runwayHeading - aircraft.heading) * 3 - across * 0.02, -1, 1), throttle: -1, brake: true, release: false, toggleFlaps: false };
  }
  if (pilot.landStage === 'join') {
    const gate = runwayPoint(field, sign * (threshold - 2300), 0);
    const controls = flyToward(aircraft, gate.x, field.elevation + 170, gate.z, 44, 70);
    const lined = Math.abs(wrapAngle(runwayHeading - aircraft.heading)) < 1.2;
    const onGlide = Math.abs(across) < 70 && lined && along < threshold - 250 && aircraft.y - field.elevation < (threshold - along) * 0.062 + 40;
    if (Math.hypot(gate.x - aircraft.x, gate.z - aircraft.z) < 420 || (along < threshold - 1500 && Math.abs(across) < 260 && lined) || onGlide) pilot.landStage = 'final';
    return controls;
  }
  const toThreshold = threshold - along;
  const height = heightAboveGround(aircraft);
  const intercept = clamp(-across / 170, -0.6, 0.6);
  const roll = steerToHeading(aircraft, runwayHeading + intercept, 0.5);
  const glideY = field.elevation + AIRCRAFT.gearHeight + Math.max(0, toThreshold) * 0.062 + 3;
  let wantedPitch = clamp((glideY - aircraft.y) * 0.012 - 0.05, -0.16, 0.12);
  let wantedSpeed = 35;
  if (height < 6) { wantedPitch = -0.028; wantedSpeed = 20; }
  const controls = { pitch: holdPitch(aircraft, wantedPitch), roll, throttle: holdSpeed(aircraft, wantedSpeed), brake: false, release: false, toggleFlaps: !aircraft.flaps };
  if (height < 6) controls.throttle = -1;
  // Too high or too far off the centreline close in: go around and rejoin.
  if (toThreshold < 250 && (height > 60 || Math.abs(across) > 40)) { pilot.landStage = 'join'; pilot.goArounds += 1; }
  return controls;
}

export function createAutopilot() {
  return { landStage: 'join', landReversed: false, goArounds: 0, releaseCooldown: 0 };
}

// Controls for this step, given the mission's current navigation target.
export function autopilotControls(pilot, aircraft, run, target, dt) {
  pilot.releaseCooldown = Math.max(0, pilot.releaseCooldown - dt);
  if (aircraft.grounded && run.phase !== 'land') {
    const lift = aircraft.speed > AIRCRAFT.rotateSpeed ? 1 : 0;
    const centre = aircraft.field ? runwayCoordinates(aircraft.field, aircraft.x, aircraft.z).across : 0;
    const facing = aircraft.field ? aircraft.field.heading + (Math.abs(wrapAngle(aircraft.heading - aircraft.field.heading)) > 1.6 ? Math.PI : 0) : aircraft.heading;
    return { pitch: lift, roll: clamp(wrapAngle(facing - aircraft.heading) * 3 - centre * 0.01, -1, 1), throttle: 1, brake: false, release: false, toggleFlaps: aircraft.flaps };
  }
  if (!target) return { pitch: holdPitch(aircraft, 0.05), roll: 0, throttle: 0, brake: false, release: false, toggleFlaps: false };
  if (run.phase === 'land') {
    if (pilot.landStage === 'join' && pilot.landChosen !== run.landField) {
      pilot.landChosen = run.landField;
      const place = runwayCoordinates(run.landField, aircraft.x, aircraft.z);
      pilot.landReversed = place.along > 0;
    }
    return landingControls(pilot, aircraft, run.landField);
  }
  if (aircraft.airTime < 7) {
    const controls = flyToward(aircraft, aircraft.x + Math.sin(aircraft.heading) * 900, aircraft.y + 120, aircraft.z + Math.cos(aircraft.heading) * 900, 50, 0);
    if (aircraft.flaps) controls.toggleFlaps = true;
    return controls;
  }
  if (target.kind === 'scoop') {
    const distance = Math.hypot(target.x - aircraft.x, target.z - aircraft.z);
    const low = distance < 900 && surfaceHeight(aircraft.x, aircraft.z) === 0;
    return flyToward(aircraft, target.x, low ? AIRCRAFT.gearHeight + 8 : 90, target.z, 42, low ? 0 : 60);
  }
  // One pass over the bay should fill both loads: stay on the water until the tank is full.
  const overBay = run.mission.scoop && surfaceHeight(aircraft.x, aircraft.z) === 0 && heightAboveGround(aircraft) < 45;
  if (overBay && aircraft.water < AIRCRAFT.waterLoads && target.kind === 'fire') {
    const ahead = 600;
    return flyToward(aircraft, aircraft.x + Math.sin(aircraft.heading) * ahead, AIRCRAFT.gearHeight + 8, aircraft.z + Math.cos(aircraft.heading) * ahead, 42, 0);
  }
  const far = Math.hypot(target.x - aircraft.x, target.z - aircraft.z) > 800;
  const speed = target.kind === 'delivery' ? (far ? 54 : 42) : target.kind === 'gate' ? 45 : 55;
  const controls = flyToward(aircraft, target.x, target.y, target.z, speed, target.kind === 'ring' || target.kind === 'gate' ? 30 : 45);
  if (target.kind === 'fire' && pilot.releaseCooldown === 0 && Math.hypot(target.x - aircraft.x, target.z - aircraft.z) < 120) {
    controls.release = true;
    pilot.releaseCooldown = 4;
  }
  return controls;
}
