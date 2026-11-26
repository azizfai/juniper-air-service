// Small numeric helpers shared by the flight model, the camera and the renderers.

export const clamp = (value, low, high) => (value < low ? low : value > high ? high : value);

export const mix = (a, b, t) => a + (b - a) * t;

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Folds any angle into -PI..PI, so a heading error always turns the short way.
export function wrapAngle(angle) {
  let a = (angle + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

export function headingDegrees(heading) {
  return ((heading * 180 / Math.PI) % 360 + 360) % 360;
}

export function bearingTo(fromX, fromZ, toX, toZ) {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

export function colorString(r, g, b, alpha) {
  if (alpha === undefined) return `rgb(${r | 0},${g | 0},${b | 0})`;
  return `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
}

export function mixColor(from, to, t) {
  return [mix(from[0], to[0], t), mix(from[1], to[1], t), mix(from[2], to[2], t)];
}

export function padNumber(value, width) {
  return String(Math.round(value)).padStart(width, '0');
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
