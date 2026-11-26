// The four jobs on the Juniper Air Service board. Each has a different goal:
// a ring circuit, a fuel-tight mail run, a water-bombing sortie and a timed
// slalom at dusk. Positions are metres east (x) and north (z) of Juniper Field.

export const MISSIONS = [
  {
    id: 'ringCircuit',
    title: 'Ridge Ring Circuit',
    tagline: 'Fly the eight check rings and land back at Juniper.',
    hint: 'Fly each ring in order, then land',
    goal: 'RINGS',
    palette: 'day',
    startField: 'juniper', startAlong: -500, startReversed: false, startFuel: 60,
    landField: 'juniper', parSeconds: 250, timeLimit: 0, ordered: true,
    briefing: [
      'The annual check flight. Thread all eight rings in order.',
      'Hold your bank through the ridge turn: a steep turn bleeds speed.',
      'The last ring sits on the glide path. Land on the numbers.',
    ],
    targets: [
      { kind: 'ring', x: 0, z: 1600, agl: 110, radius: 42 },
      { kind: 'ring', x: -300, z: 2900, agl: 160, radius: 42 },
      { kind: 'ring', x: -1200, z: 3600, agl: 200, radius: 42 },
      { kind: 'ring', x: -1900, z: 2600, agl: 210, radius: 42 },
      { kind: 'ring', x: -1700, z: 900, agl: 190, radius: 42 },
      { kind: 'ring', x: -1500, z: -900, agl: 170, radius: 42 },
      { kind: 'ring', x: -900, z: -2600, agl: 150, radius: 42 },
      { kind: 'ring', x: 0, z: -820, aboveField: 34, radius: 30, axis: 0 },
    ],
  },
  {
    id: 'mailRun',
    title: 'Saltmarsh Mail Run',
    tagline: 'Three parcel drops, one tank that will not quite reach.',
    hint: 'Drop below 90 kt; refuel at Cedar Gap',
    goal: 'PARCELS',
    palette: 'day',
    startField: 'juniper', startAlong: -500, startReversed: false, startFuel: 34,
    landField: 'saltmarsh', parSeconds: 330, timeLimit: 0, ordered: true,
    dropSpeedLimit: 47,
    briefing: [
      'Drop parcels through the three low rings, then land at Saltmarsh.',
      'Slow below 90 kt for each drop or the parcel overshoots.',
      'The tank is light. Cruise lean, or stop at Cedar Gap to refuel.',
    ],
    targets: [
      { kind: 'delivery', x: 1500, z: 1500, agl: 60, radius: 40, name: 'Alder Farm' },
      { kind: 'delivery', x: 2500, z: 1300, agl: 70, radius: 40, name: 'Cedar Gap' },
      { kind: 'delivery', x: 4800, z: -2350, agl: 62, radius: 40, name: 'Tern Light' },
    ],
  },
  {
    id: 'fireLine',
    title: 'Fire on Tamarack Ridge',
    tagline: 'Scoop from the bay, douse four fires, mind the heat.',
    hint: 'Scoop, then release over a fire',
    goal: 'FIRES',
    palette: 'day',
    startField: 'juniper', startAlong: 500, startReversed: true, startFuel: 72,
    landField: 'juniper', parSeconds: 420, timeLimit: 0, ordered: false,
    scoop: { x: 600, z: -3800 },
    briefing: [
      'Skim the bay below 50 ft to fill the tank: it holds two loads.',
      'Release over a fire ring with SPACE. Four fires, two trips.',
      'Fly low through the heat and it cooks the airframe.',
    ],
    targets: [
      { kind: 'fire', x: 1900, z: -900, agl: 78, radius: 44 },
      { kind: 'fire', x: 2500, z: -300, agl: 78, radius: 44 },
      { kind: 'fire', x: 2100, z: 400, agl: 78, radius: 44 },
      { kind: 'fire', x: 2900, z: 700, agl: 78, radius: 44 },
    ],
  },
  {
    id: 'duskSlalom',
    title: 'Last Light Slalom',
    tagline: 'Ten gates up the valley and home before night falls.',
    hint: 'Gates in order; land before night',
    goal: 'GATES',
    palette: 'dusk',
    startField: 'juniper', startAlong: -500, startReversed: false, startFuel: 48,
    landField: 'juniper', parSeconds: 280, timeLimit: 400, ordered: true,
    briefing: [
      'Small gates, set left and right of the river. Fly them in order.',
      'Throttle back before each reversal or you will swing wide.',
      'The field closes at night: be on the runway before the clock runs out.',
    ],
    targets: [
      { kind: 'gate', x: 250, z: 1500, agl: 72, radius: 31 },
      { kind: 'gate', x: -350, z: 2300, agl: 80, radius: 31 },
      { kind: 'gate', x: 450, z: 3100, agl: 85, radius: 31 },
      { kind: 'gate', x: -250, z: 3900, agl: 90, radius: 31 },
      { kind: 'gate', x: 600, z: 4700, agl: 95, radius: 31 },
      { kind: 'gate', x: -100, z: 5500, agl: 105, radius: 31 },
      { kind: 'gate', x: 250, z: 6600, agl: 100, radius: 34 },
      { kind: 'gate', x: 850, z: 5300, agl: 95, radius: 34 },
      { kind: 'gate', x: 700, z: 3100, agl: 90, radius: 34 },
      { kind: 'gate', x: 0, z: 1300, aboveField: 48, radius: 36, axis: Math.PI },
    ],
  },
];

export function missionById(id) {
  return MISSIONS.find(mission => mission.id === id) || MISSIONS[0];
}
