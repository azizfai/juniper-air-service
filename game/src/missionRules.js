// Runs one sortie of a mission: places its targets on the terrain, notices
// rings flown, parcels dropped, water scooped and fires doused, and decides
// when the job is done or lost.

import { SCORE, AIRCRAFT } from './config.js';
import { airfieldById, runwayPoint } from './airfields.js';
import { surfaceHeight, isWater } from './terrainHeight.js';
import { bearingTo } from './mathTools.js';
import { heightAboveGround, applyDamage } from './flightModel.js';

export function startMissionRun(mission) {
  const startField = airfieldById(mission.startField);
  const landField = airfieldById(mission.landField);
  const start = runwayPoint(startField, mission.startAlong, 0);
  const targets = mission.targets.map((spec, index) => {
    const y = spec.aboveField !== undefined ? landField.elevation + spec.aboveField : surfaceHeight(spec.x, spec.z) + spec.agl;
    return { ...spec, index, y, done: false, side: 0, axis: 0, flare: 0 };
  });
  targets.forEach((target, i) => {
    if (target.axis !== 0 || mission.targets[i].axis !== undefined) { target.axis = mission.targets[i].axis; return; }
    const from = mission.scoop && target.kind === 'fire' ? mission.scoop : i === 0 ? start : targets[i - 1];
    target.axis = bearingTo(from.x, from.z, target.x, target.z);
  });
  return {
    mission, startField, landField, targets,
    phase: 'targets', clock: 0, score: 0, doneCount: 0,
    notices: [], scoopTimer: 0, heatTime: 0, refuelled: false, result: null,
  };
}

export function postNotice(run, text, tone) {
  run.notices.unshift({ text, tone: tone || 'info', age: 0 });
  if (run.notices.length > 3) run.notices.length = 3;
}

// The next thing the pilot should fly toward, for the HUD marker and autopilot.
export function navigationTarget(run, aircraft) {
  const mission = run.mission;
  if (run.phase === 'land') {
    const f = run.landField;
    return { x: f.x, y: f.elevation, z: f.z, label: `LAND ${f.code}`, kind: 'land' };
  }
  if (mission.id === 'fireLine' && aircraft.water === 0) {
    return { x: mission.scoop.x, y: 12, z: mission.scoop.z, label: 'SCOOP', kind: 'scoop' };
  }
  let target = null;
  if (mission.ordered) target = run.targets.find(t => !t.done);
  else {
    let best = Infinity;
    for (const t of run.targets) {
      const d = Math.hypot(t.x - aircraft.x, t.z - aircraft.z);
      if (!t.done && d < best) { best = d; target = t; }
    }
  }
  if (!target) return null;
  const label = target.kind === 'fire' ? 'FIRE' : target.kind === 'delivery' ? target.name.toUpperCase() : `${mission.goal.slice(0, -1)} ${target.index + 1}`;
  return { x: target.x, y: target.y, z: target.z, label, kind: target.kind, target };
}

function completeTarget(run, target, points, text, happenings) {
  target.done = true;
  target.flare = 1;
  run.doneCount += 1;
  run.score += points;
  postNotice(run, text, 'good');
  happenings.push({ type: 'targetDone', target });
  if (run.doneCount === run.targets.length) {
    run.phase = 'land';
    postNotice(run, `All done. Land at ${run.landField.name}.`, 'good');
  }
}

// True when the aircraft has just flown through the ring's disc.
function crossedRing(target, aircraft) {
  const dx = aircraft.x - target.x, dz = aircraft.z - target.z;
  const side = dx * Math.sin(target.axis) + dz * Math.cos(target.axis);
  const before = target.side;
  target.side = side;
  if (before === 0 || (before < 0) === (side < 0)) return false;
  const lateral = dx * Math.cos(target.axis) - dz * Math.sin(target.axis);
  return Math.hypot(lateral, aircraft.y - target.y) < target.radius;
}

function checkOrderedTargets(run, aircraft, happenings) {
  const mission = run.mission;
  const target = run.targets.find(t => !t.done);
  if (!target || !crossedRing(target, aircraft)) return;
  if (target.kind === 'delivery') {
    if (aircraft.speed > mission.dropSpeedLimit) {
      postNotice(run, 'Too fast: the parcel overshot. Go around below 90 kt.', 'bad');
      happenings.push({ type: 'missedDrop', target });
      return;
    }
    happenings.push({ type: 'parcelDrop', target });
    return completeTarget(run, target, SCORE.delivery, `Parcel delivered to ${target.name}.`, happenings);
  }
  const points = target.kind === 'gate' ? SCORE.gate : SCORE.ring;
  completeTarget(run, target, points, `${target.kind === 'gate' ? 'Gate' : 'Ring'} ${target.index + 1} of ${run.targets.length}.`, happenings);
}

function workTheFire(run, aircraft, controls, dt, happenings, events) {
  const height = heightAboveGround(aircraft);
  if (!aircraft.grounded && isWater(aircraft.x, aircraft.z) && height < 16 && aircraft.water < AIRCRAFT.waterLoads) {
    run.scoopTimer += dt;
    happenings.push({ type: 'scooping' });
    if (run.scoopTimer > 1.1) {
      run.scoopTimer = 0;
      aircraft.water += 1;
      postNotice(run, `Water aboard: ${aircraft.water} of ${AIRCRAFT.waterLoads}.`, 'good');
      happenings.push({ type: 'scooped' });
    }
  } else run.scoopTimer = 0;

  for (const fire of run.targets) {
    if (fire.done) continue;
    const distance = Math.hypot(fire.x - aircraft.x, fire.z - aircraft.z);
    if (distance < 120 && aircraft.y - (fire.y - fire.agl) < 62 && !aircraft.grounded) {
      run.heatTime += dt;
      applyDamage(aircraft, 15 * dt, events, 'Cooked over the fire');
      happenings.push({ type: 'heat' });
    }
  }
  if (controls.release) {
    if (aircraft.water === 0) return postNotice(run, 'Tank empty. Scoop from the bay.', 'bad');
    aircraft.water -= 1;
    happenings.push({ type: 'waterDrop' });
    let doused = null;
    for (const fire of run.targets) {
      const distance = Math.hypot(fire.x - aircraft.x, fire.z - aircraft.z);
      if (!fire.done && distance < 190 && aircraft.y - (fire.y - fire.agl) < 190) doused = fire;
    }
    if (doused) completeTarget(run, doused, SCORE.fire, `Fire out. ${run.targets.length - run.doneCount - 1} still burning.`, happenings);
    else postNotice(run, 'Missed: the load fell wide of the fire.', 'bad');
  }
}

function landingPoints(touchdown) {
  if (!touchdown) return 60;
  return Math.max(60, Math.round(SCORE.landing - touchdown.sinkRate * 55 - Math.abs(touchdown.across) * 9));
}

function finishRun(run, aircraft) {
  const mission = run.mission;
  const landing = landingPoints(aircraft.lastTouchdown);
  const timeBonus = Math.max(0, Math.round((mission.parSeconds - run.clock) * 4));
  const fuelBonus = Math.round(aircraft.fuel * 3);
  const damagePenalty = Math.round(aircraft.damage * 5);
  const total = Math.max(0, run.score + landing + timeBonus + fuelBonus - damagePenalty);
  const best = run.score + 400 + 200 + 150;
  const ratio = total / best;
  const grade = ratio > 0.9 ? 'S' : ratio > 0.76 ? 'A' : ratio > 0.6 ? 'B' : 'C';
  run.result = { won: true, targets: run.score, landing, timeBonus, fuelBonus, damagePenalty, total, grade, touchdown: aircraft.lastTouchdown };
  run.phase = 'complete';
}

export function failRun(run, cause, detail) {
  if (run.result) return;
  run.result = { won: false, cause, detail, total: run.score };
  run.phase = 'failed';
}

// One step of the mission's rules; events are the flight model's from this step.
export function advanceMission(run, aircraft, controls, dt, events) {
  const happenings = [];
  if (run.phase === 'complete' || run.phase === 'failed') return happenings;
  run.clock += dt;
  for (const notice of run.notices) notice.age += dt;
  for (const target of run.targets) if (target.flare > 0) target.flare = Math.max(0, target.flare - dt * 1.4);
  const mission = run.mission;

  if (run.phase === 'targets') {
    if (mission.ordered) checkOrderedTargets(run, aircraft, happenings);
    else workTheFire(run, aircraft, controls, dt, happenings, events);
  } else if (run.phase === 'land') {
    if (aircraft.grounded && aircraft.field === run.landField && aircraft.speed < 1.5) {
      finishRun(run, aircraft);
      happenings.push({ type: 'missionComplete' });
    } else if (aircraft.grounded && aircraft.field && aircraft.field !== run.landField && aircraft.speed < 1.5 && !run.wrongFieldTold) {
      run.wrongFieldTold = true;
      postNotice(run, `This is ${aircraft.field.name}. The job ends at ${run.landField.name}.`, 'bad');
    }
  }
  for (const event of events) {
    if (event.type === 'refuelling' && !run.refuelled && run.clock > 8) {
      run.refuelled = true;
      postNotice(run, `Refuelling at ${event.field.name}. Hold the brakes.`, 'info');
    }
    if (event.type === 'fuelOut') postNotice(run, 'Fuel exhausted. Glide for a strip.', 'bad');
    if (event.type === 'touchdown') {
      const firm = event.sinkRate > 2.4 ? 'Firm' : 'Smooth';
      postNotice(run, `${firm} touchdown: ${event.sinkRate.toFixed(1)} m/s, ${Math.abs(event.across).toFixed(0)} m off centre.`, event.sinkRate > 2.4 ? 'bad' : 'good');
    }
  }
  if (mission.timeLimit && run.clock > mission.timeLimit && !run.result) {
    failRun(run, 'Night fell on the valley', 'The field lights went out before you were down.');
    happenings.push({ type: 'missionFailed' });
  }
  return happenings;
}
