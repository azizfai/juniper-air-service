// Juniper Air Service — the numbers every other module reads.

export const VIEW = { width: 1280, height: 720, focal: 780, near: 2.5 };

export const TERRAIN = { cell: 110, radiusCells: 40, treeRange: 1650 };

export const UNITS = { feetPerMetre: 3.28084, knotsPerMetreSecond: 1.94384 };

// The Juniper J-4 "Wren": a high-wing bush plane.
export const AIRCRAFT = {
  stallSpeed: 27,
  flapStallSpeed: 22,
  rotateSpeed: 31,
  cruiseSpeed: 58,
  maxThrust: 9.4,
  dragFactor: 0.0014,
  flapDrag: 0.0011,
  rollRate: 1.55,
  pitchRate: 0.72,
  maxBank: 1.25,
  maxPitch: 1.05,
  gearHeight: 1.7,
  gravity: 9.81,
  idleFuelBurn: 0.05,
  powerFuelBurn: 0.15,
  waterLoads: 2,
};

export const LANDING = {
  crashSinkRate: 6.2,
  firmSinkRate: 2.4,
  maxBank: 0.36,
  minPitch: -0.13,
  roughFieldSinkRate: 3.2,
  roughFieldSpeed: 46,
};

export const PALETTES = {
  day: {
    name: 'day',
    skyTop: [52, 112, 198], skyLow: [178, 216, 240], haze: [182, 212, 232],
    sunColor: [255, 247, 214], sunAzimuth: 2.25, sunElevation: 0.82,
    ambient: 0.56, diffuse: 0.62, tint: [1, 1, 1], water: [46, 112, 172],
    fogStart: 1500, fogEnd: 4300, lampGlow: 0.3, ridge: [112, 142, 176],
  },
  dusk: {
    name: 'dusk',
    skyTop: [34, 34, 86], skyLow: [246, 154, 98], haze: [156, 116, 124],
    sunColor: [255, 176, 104], sunAzimuth: 0.35, sunElevation: 0.07,
    ambient: 0.44, diffuse: 0.5, tint: [1, 0.8, 0.74], water: [78, 74, 124],
    fogStart: 1300, fogEnd: 4300, lampGlow: 1, ridge: [86, 66, 104],
  },
};

export const SCORE = { ring: 150, delivery: 220, fire: 260, gate: 130, landing: 400, secondsPar: 1 };
