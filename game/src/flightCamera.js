// Where the eye sits: a chase camera that trails the Wren and leans gently
// into its turns without fighting the pilot, or the pilot's own seat.

import { placeCamera } from './camera.js';
import { wrapAngle, clamp } from './mathTools.js';
import { surfaceHeight } from './terrainHeight.js';

export function createViewpoint() {
  return { mode: 'chase', heading: 0, pitch: 0, roll: 0, orbit: 0 };
}

export function snapViewpoint(viewpoint, aircraft) {
  viewpoint.heading = aircraft.heading;
  viewpoint.pitch = aircraft.pitch;
  viewpoint.roll = aircraft.bank;
  viewpoint.orbit = 0;
}

// Eases the trailing camera toward the aircraft's attitude.
export function followAircraft(viewpoint, aircraft, dt, orbiting) {
  const ease = Math.min(1, dt * 3.6);
  viewpoint.heading += wrapAngle(aircraft.heading - viewpoint.heading) * ease;
  viewpoint.pitch += (aircraft.pitch - viewpoint.pitch) * ease;
  viewpoint.roll += (aircraft.bank - viewpoint.roll) * Math.min(1, dt * 5);
  viewpoint.orbit = orbiting ? viewpoint.orbit + dt * 0.25 : viewpoint.orbit * (1 - Math.min(1, dt * 3));
}

export function aimCamera(camera, viewpoint, aircraft) {
  if (viewpoint.mode === 'cockpit') {
    placeCamera(camera, aircraft.x, aircraft.y + 0.75, aircraft.z, aircraft.heading, aircraft.pitch * 0.92 - 0.035, aircraft.bank);
    return;
  }
  const heading = viewpoint.heading + viewpoint.orbit;
  const back = 25, up = 7.2 - clamp(viewpoint.pitch, -0.5, 0.5) * 9;
  let x = aircraft.x - Math.sin(heading) * back, z = aircraft.z - Math.cos(heading) * back;
  let y = aircraft.y + up;
  y = Math.max(y, surfaceHeight(x, z) + 2.2);
  const pitch = Math.atan2(aircraft.y + 4.2 - y, back) + viewpoint.pitch * 0.45;
  placeCamera(camera, x, y, z, heading, pitch, viewpoint.roll * 0.32);
}
