// Composes one frame of the world: sky, then terrain with the airstrips,
// mission targets, effects and the aircraft slotted in by distance, then the
// cockpit frame when the pilot is looking out from the seat.

import { drawSky } from './renderSky.js';
import { drawTerrain } from './renderTerrain.js';
import { collectAirfieldDrawables } from './renderAirfield.js';
import { collectTargetDrawables } from './renderTargets.js';
import { drawAircraft, drawAircraftShadow } from './renderAircraft.js';
import { drawEffects } from './effects.js';
import { drawCockpitFrame } from './cockpitFrame.js';

export function paintWorld(ctx, scene) {
  const { camera, palette, aircraft, run, effects, viewpoint, time, navTarget } = scene;
  drawSky(ctx, camera, palette, time);
  const drawables = [];
  collectAirfieldDrawables(ctx, camera, palette, drawables);
  collectTargetDrawables(ctx, camera, run, navTarget ? navTarget.target : null, time, drawables);
  // The shadow and the aircraft come last: they sit on top of the runway they stand on.
  drawables.push({ distance: -5000, draw: () => drawAircraftShadow(ctx, camera, aircraft) });
  if (viewpoint.mode === 'chase') {
    drawables.push({ distance: -6000, draw: () => {
      drawEffects(ctx, camera, effects);
      drawAircraft(ctx, camera, aircraft, palette, time);
    } });
  } else drawables.push({ distance: -6000, draw: () => drawEffects(ctx, camera, effects) });
  drawTerrain(ctx, camera, palette, drawables);
  if (viewpoint.mode === 'cockpit') drawCockpitFrame(ctx, aircraft, palette, time);
}
