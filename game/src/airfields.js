// The three airstrips of the Juniper valley and the runway-relative geometry
// the landing judge, the autopilot and the runway painter all share.
// terrainHeight.js fills in each strip's elevation when the terrain is built.

export const AIRFIELDS = [
  { id: 'juniper', name: 'Juniper Field', code: 'JNP', x: 0, z: 0, heading: 0, length: 1150, width: 48, elevation: 0 },
  { id: 'cedar', name: 'Cedar Gap Strip', code: 'CDG', x: 3050, z: 1750, heading: 2.0, length: 820, width: 40, elevation: 0 },
  { id: 'saltmarsh', name: 'Saltmarsh Strip', code: 'SLT', x: 5600, z: -2900, heading: 1.2, length: 900, width: 42, elevation: 0 },
];

export function airfieldById(id) {
  return AIRFIELDS.find(field => field.id === id);
}

// Distance along the centreline (positive toward the runway heading) and
// across it (positive to the right of that heading).
export function runwayCoordinates(field, x, z) {
  const dx = x - field.x, dz = z - field.z;
  const s = Math.sin(field.heading), c = Math.cos(field.heading);
  return { along: dx * s + dz * c, across: dx * c - dz * s };
}

export function runwayPoint(field, along, across) {
  const s = Math.sin(field.heading), c = Math.cos(field.heading);
  return { x: field.x + along * s + across * c, z: field.z + along * c - across * s };
}

export function distanceToRunway(field, x, z) {
  const p = runwayCoordinates(field, x, z);
  const half = field.length / 2;
  const beyond = Math.max(0, Math.abs(p.along) - half);
  const beside = Math.max(0, Math.abs(p.across) - field.width / 2);
  return Math.hypot(beyond, beside);
}

export function airfieldUnder(x, z) {
  for (const field of AIRFIELDS) {
    if (distanceToRunway(field, x, z) < 3) return field;
  }
  return null;
}

export function nearestAirfield(x, z) {
  let best = AIRFIELDS[0], bestDistance = Infinity;
  for (const field of AIRFIELDS) {
    const d = Math.hypot(x - field.x, z - field.z);
    if (d < bestDistance) { best = field; bestDistance = d; }
  }
  return best;
}
