// How the Wren flies: thrust against drag, bank that turns, a stall that drops
// the nose, fuel that runs out, damage that saps the engine, and a ground roll.

import { AIRCRAFT, LANDING } from './config.js';
import { clamp } from './mathTools.js';
import { surfaceHeight, isWater } from './terrainHeight.js';
import { airfieldUnder, runwayCoordinates, runwayPoint } from './airfields.js';

export function createAircraft() {
  return {
    x: 0, y: 0, z: 0, heading: 0, pitch: 0, bank: 0,
    speed: 0, verticalSpeed: 0, throttle: 0, flaps: false,
    fuel: 100, damage: 0, water: 0,
    grounded: true, stalled: false, braking: false, field: null,
    crashed: null, lastTouchdown: null, airTime: 0,
  };
}

export function placeOnRunway(aircraft, field, alongFromCentre, reversed) {
  const spot = runwayPoint(field, alongFromCentre, 0);
  aircraft.x = spot.x; aircraft.z = spot.z;
  aircraft.y = field.elevation + AIRCRAFT.gearHeight;
  aircraft.heading = field.heading + (reversed ? Math.PI : 0);
  aircraft.pitch = 0; aircraft.bank = 0; aircraft.speed = 0; aircraft.verticalSpeed = 0;
  aircraft.throttle = 0; aircraft.grounded = true; aircraft.field = field;
}

export function placeInFlight(aircraft, x, y, z, heading, speed) {
  aircraft.x = x; aircraft.y = y; aircraft.z = z;
  aircraft.heading = heading; aircraft.pitch = 0; aircraft.bank = 0;
  aircraft.speed = speed; aircraft.verticalSpeed = 0;
  aircraft.throttle = 0.6; aircraft.grounded = false; aircraft.field = null;
}

export function enginePower(aircraft) {
  if (aircraft.fuel <= 0) return 0;
  return aircraft.throttle * (1 - 0.55 * aircraft.damage / 100);
}

export function heightAboveGround(aircraft) {
  return aircraft.y - AIRCRAFT.gearHeight - surfaceHeight(aircraft.x, aircraft.z);
}

function addDamage(aircraft, amount, events, cause) {
  aircraft.damage = Math.min(100, aircraft.damage + amount);
  if (aircraft.damage >= 100 && !aircraft.crashed) crash(aircraft, events, cause, 'The airframe gave out.');
}

function crash(aircraft, events, cause, detail) {
  aircraft.crashed = { cause, detail, speed: aircraft.speed, sinkRate: -aircraft.verticalSpeed };
  aircraft.damage = 100;
  events.push({ type: 'crash', cause, detail });
}

export function applyDamage(aircraft, amount, events, cause) {
  addDamage(aircraft, amount, events, cause);
}

function flyAirborne(aircraft, controls, dt, events) {
  const A = AIRCRAFT;
  const authority = clamp(aircraft.speed / A.cruiseSpeed, 0.25, 1.15);
  aircraft.bank += controls.roll * A.rollRate * authority * dt;
  if (Math.abs(controls.roll) < 0.05) aircraft.bank -= aircraft.bank * 0.55 * dt;
  aircraft.bank = clamp(aircraft.bank, -A.maxBank, A.maxBank);

  aircraft.pitch += controls.pitch * A.pitchRate * authority * dt;
  // A banked wing lifts less: the nose sinks through a turn unless held up.
  aircraft.pitch -= (1 - Math.cos(aircraft.bank)) * 0.34 * dt;

  const stallSpeed = aircraft.flaps ? A.flapStallSpeed : A.stallSpeed;
  aircraft.stalled = aircraft.speed < stallSpeed;
  let stallSink = 0;
  if (aircraft.stalled) {
    const depth = 1 - aircraft.speed / stallSpeed;
    aircraft.pitch -= (0.35 + depth * 1.6) * dt;
    stallSink = 2.5 + depth * 22;
  }
  aircraft.pitch = clamp(aircraft.pitch, -A.maxPitch, A.maxPitch);
  aircraft.heading += A.gravity * Math.tan(aircraft.bank) / Math.max(aircraft.speed, 18) * dt;

  const drag = (A.dragFactor + (aircraft.flaps ? A.flapDrag : 0)) * aircraft.speed * aircraft.speed;
  const turnDrag = Math.abs(Math.sin(aircraft.bank)) * 1.5 + Math.max(0, controls.pitch) * 0.9;
  const acceleration = enginePower(aircraft) * A.maxThrust - drag - turnDrag - A.gravity * Math.sin(aircraft.pitch);
  aircraft.speed = Math.max(9, aircraft.speed + acceleration * dt);

  const cp = Math.cos(aircraft.pitch);
  aircraft.verticalSpeed = Math.sin(aircraft.pitch) * aircraft.speed - stallSink;
  aircraft.x += Math.sin(aircraft.heading) * cp * aircraft.speed * dt;
  aircraft.z += Math.cos(aircraft.heading) * cp * aircraft.speed * dt;
  aircraft.y += aircraft.verticalSpeed * dt;
  aircraft.airTime += dt;

  if (heightAboveGround(aircraft) <= 0) touchDown(aircraft, events);
}

function touchDown(aircraft, events) {
  const L = LANDING;
  const sinkRate = Math.max(0, -aircraft.verticalSpeed);
  const ground = surfaceHeight(aircraft.x, aircraft.z);
  aircraft.y = ground + AIRCRAFT.gearHeight;
  if (isWater(aircraft.x, aircraft.z)) {
    return crash(aircraft, events, 'Ditched in the bay', 'Wheels dug into the water and the Wren went over.');
  }
  const field = airfieldUnder(aircraft.x, aircraft.z);
  if (!field) {
    if (sinkRate < L.roughFieldSinkRate && aircraft.speed < L.roughFieldSpeed && Math.abs(aircraft.bank) < L.maxBank) {
      aircraft.grounded = true; aircraft.field = null; aircraft.pitch = 0; aircraft.bank = 0;
      events.push({ type: 'roughLanding' });
      return addDamage(aircraft, 30, events, 'Broke up on rough ground');
    }
    return crash(aircraft, events, 'Flew into the hillside', `Hit terrain at ${Math.round(aircraft.speed * 1.944)} kt.`);
  }
  if (sinkRate > L.crashSinkRate) {
    return crash(aircraft, events, 'Landing gear collapsed', `Touched down at ${sinkRate.toFixed(1)} m/s of sink; the limit is ${L.crashSinkRate}.`);
  }
  if (Math.abs(aircraft.bank) > L.maxBank) {
    return crash(aircraft, events, 'Wingtip strike', 'Touched down banked and the low wing caught the runway.');
  }
  if (aircraft.pitch < L.minPitch) {
    return crash(aircraft, events, 'Nose-first arrival', 'The propeller met the runway before the wheels did.');
  }
  const centreline = runwayCoordinates(field, aircraft.x, aircraft.z);
  aircraft.grounded = true; aircraft.field = field; aircraft.bank = 0;
  aircraft.lastTouchdown = { sinkRate, across: centreline.across, speed: aircraft.speed, field };
  events.push({ type: 'touchdown', sinkRate, across: centreline.across, field });
  if (sinkRate > L.firmSinkRate) addDamage(aircraft, (sinkRate - L.firmSinkRate) * 9, events, 'Landing gear collapsed');
}

function rollOnGround(aircraft, controls, dt, events) {
  const A = AIRCRAFT;
  const field = airfieldUnder(aircraft.x, aircraft.z);
  aircraft.field = field;
  aircraft.stalled = false;
  aircraft.braking = controls.brake;
  aircraft.heading += controls.roll * 0.55 * clamp(aircraft.speed / 9, 0.15, 1) * dt;
  let acceleration = enginePower(aircraft) * A.maxThrust - A.dragFactor * aircraft.speed * aircraft.speed - 0.55;
  if (controls.brake) acceleration -= 7.5;
  if (!field) {
    acceleration -= 3.2;
    if (aircraft.speed > 20) addDamage(aircraft, 16 * dt, events, 'Broke up on rough ground');
  }
  aircraft.speed = Math.max(0, aircraft.speed + acceleration * dt);
  const liftSpeed = A.rotateSpeed * (aircraft.flaps ? 0.88 : 1);
  const noseTarget = controls.pitch > 0.2 && aircraft.speed > liftSpeed * 0.8 ? 0.17 : 0;
  aircraft.pitch += (noseTarget - aircraft.pitch) * 2.2 * dt;
  aircraft.bank *= 1 - Math.min(1, 6 * dt);
  aircraft.x += Math.sin(aircraft.heading) * aircraft.speed * dt;
  aircraft.z += Math.cos(aircraft.heading) * aircraft.speed * dt;
  if (isWater(aircraft.x, aircraft.z)) {
    return crash(aircraft, events, 'Rolled into the bay', 'Ran out of land before running out of speed.');
  }
  aircraft.y = surfaceHeight(aircraft.x, aircraft.z) + A.gearHeight;
  aircraft.verticalSpeed = 0;
  if (aircraft.pitch > 0.085 && aircraft.speed > liftSpeed) {
    aircraft.grounded = false; aircraft.airTime = 0;
    events.push({ type: 'liftoff' });
  }
  // Parked at idle on a strip after a landing, the ground crew tops up the tank.
  if (field && aircraft.lastTouchdown && aircraft.speed < 1 && aircraft.throttle < 0.08 && aircraft.fuel < 100) {
    aircraft.fuel = Math.min(100, aircraft.fuel + 9 * dt);
    events.push({ type: 'refuelling', field });
  }
}

// Advances the aircraft by dt seconds and returns what happened along the way.
export function stepFlight(aircraft, controls, dt) {
  const events = [];
  if (aircraft.crashed) return events;
  aircraft.throttle = clamp(aircraft.throttle + controls.throttle * 0.55 * dt, 0, 1);
  if (controls.toggleFlaps) aircraft.flaps = !aircraft.flaps;
  const power = enginePower(aircraft);
  if (aircraft.fuel > 0) {
    aircraft.fuel = Math.max(0, aircraft.fuel - (AIRCRAFT.idleFuelBurn + AIRCRAFT.powerFuelBurn * power) * dt);
    if (aircraft.fuel === 0) events.push({ type: 'fuelOut' });
  }
  if (aircraft.grounded) rollOnGround(aircraft, controls, dt, events);
  else flyAirborne(aircraft, controls, dt, events);
  return events;
}
