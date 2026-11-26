// The Juniper J-4 Wren, built from flat panels in its own axes
// (x toward the right wing, y up, z toward the nose; metres).

const CREAM = [238, 230, 208], JUNIPER = [40, 112, 84], AMBER = [234, 124, 44];
const GLASS = [44, 66, 92], DARK = [44, 46, 52];

// Fuselage stations from nose to tail: half width, belly, roof, z.
const STATIONS = [
  { w: 0.44, low: -0.46, high: 0.34, z: 3.0 },
  { w: 0.66, low: -0.72, high: 0.46, z: 1.9 },
  { w: 0.69, low: -0.76, high: 0.96, z: 1.0 },
  { w: 0.67, low: -0.72, high: 0.96, z: -0.9 },
  { w: 0.12, low: 0.1, high: 0.5, z: -4.7 },
];
const SKIN = [
  { top: JUNIPER, side: JUNIPER, belly: JUNIPER },
  { top: GLASS, side: CREAM, belly: CREAM },
  { top: CREAM, side: CREAM, belly: CREAM },
  { top: CREAM, side: CREAM, belly: CREAM },
];

function fuselagePanels() {
  const panels = [];
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const a = STATIONS[i], b = STATIONS[i + 1], skin = SKIN[i];
    panels.push({ points: [[-a.w, a.high, a.z], [a.w, a.high, a.z], [b.w, b.high, b.z], [-b.w, b.high, b.z]], colour: skin.top });
    panels.push({ points: [[-a.w, a.low, a.z], [a.w, a.low, a.z], [b.w, b.low, b.z], [-b.w, b.low, b.z]], colour: skin.belly });
    for (const side of [-1, 1]) {
      panels.push({ points: [[side * a.w, a.low, a.z], [side * a.w, a.high, a.z], [side * b.w, b.high, b.z], [side * b.w, b.low, b.z]], colour: skin.side });
    }
  }
  const nose = STATIONS[0];
  panels.push({ points: [[-nose.w, nose.low, nose.z], [nose.w, nose.low, nose.z], [nose.w, nose.high, nose.z], [-nose.w, nose.high, nose.z]], colour: DARK });
  for (const side of [-1, 1]) {
    const x = side * 0.7;
    panels.push({ points: [[x, 0.08, 1.75], [x, 0.84, 1.05], [x, 0.84, -0.7], [x, 0.08, -0.7]], colour: GLASS });
    panels.push({ points: [[side * 0.69, -0.3, 0.9], [side * 0.69, -0.08, 0.9], [side * 0.2, 0.2, -4.3], [side * 0.2, 0.08, -4.3]], colour: JUNIPER });
  }
  return panels;
}

function wingPanels() {
  const panels = [];
  for (const side of [-1, 1]) {
    panels.push({ points: [[0, 0.98, 1.78], [side * 5.0, 1.1, 1.66], [side * 5.0, 1.1, 0.3], [0, 0.98, 0.12]], colour: CREAM });
    panels.push({ points: [[side * 5.0, 1.1, 1.66], [side * 5.9, 1.13, 1.5], [side * 5.9, 1.13, 0.46], [side * 5.0, 1.1, 0.3]], colour: AMBER });
    panels.push({ points: [[side * 0.2, 0.44, -3.85], [side * 2.15, 0.46, -4.05], [side * 2.15, 0.46, -4.8], [side * 0.2, 0.44, -4.9]], colour: side < 0 ? CREAM : CREAM });
    panels.push({ points: [[side * 0.5, -0.7, 1.25], [side * 0.62, -0.7, 0.95], [side * 1.22, -1.42, 1.0], [side * 1.1, -1.42, 1.3]], colour: DARK });
  }
  panels.push({ points: [[0, 0.46, -3.6], [0, 2.1, -4.5], [0, 2.1, -4.98], [0, 0.46, -4.92]], colour: JUNIPER });
  panels.push({ points: [[0, 1.5, -4.2], [0, 2.1, -4.5], [0, 2.1, -4.98], [0, 1.5, -4.95]], colour: AMBER });
  return panels;
}

export const WREN_PANELS = [...fuselagePanels(), ...wingPanels()];

export const WREN_STRUTS = [
  [[-0.68, -0.6, 1.0], [-3.1, 1.02, 1.0]], [[0.68, -0.6, 1.0], [3.1, 1.02, 1.0]],
  [[-0.68, -0.6, 0.4], [-3.1, 1.02, 0.7]], [[0.68, -0.6, 0.4], [3.1, 1.02, 0.7]],
  [[0, 0.0, -4.3], [0, -0.3, -4.5]],
];

export const WREN_WHEELS = [[-1.16, -1.42, 1.15], [1.16, -1.42, 1.15], [0, -0.32, -4.5]];

export const WREN_LAMPS = [
  { at: [-5.9, 1.13, 1.0], colour: [255, 60, 50], blink: false },
  { at: [5.9, 1.13, 1.0], colour: [70, 255, 120], blink: false },
  { at: [0, 2.14, -4.75], colour: [255, 70, 60], blink: true },
  { at: [0, 0.4, -4.95], colour: [255, 255, 240], blink: false },
];

export const WREN_PROPELLER = { centre: [0, -0.05, 3.12], radius: 1.18 };

// The outline the shadow painter drops onto the ground.
export const WREN_SHADOW = [
  [[-5.9, 0, 1.6], [5.9, 0, 1.6], [5.9, 0, 0.3], [-5.9, 0, 0.3]],
  [[-0.6, 0, 3.0], [0.6, 0, 3.0], [0.3, 0, -4.8], [-0.3, 0, -4.8]],
  [[-2.15, 0, -4.0], [2.15, 0, -4.0], [2.15, 0, -4.85], [-2.15, 0, -4.85]],
];
