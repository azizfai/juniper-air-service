// Keyboard and mouse: turns held keys and the dragged pointer into a smoothed
// stick, a throttle lever and one-shot presses.

import { clamp } from './mathTools.js';

const held = new Set();
const pressed = new Set();
const pointer = { steering: false, x: 0, y: 0, wheel: 0 };
const stick = { pitch: 0, roll: 0 };

const FLIGHT_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'];

export function listenForInput(canvas) {
  window.addEventListener('keydown', event => {
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
    if (FLIGHT_KEYS.includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', event => held.delete(event.code));
  window.addEventListener('blur', () => { held.clear(); pointer.steering = false; });
  const track = event => {
    const box = canvas.getBoundingClientRect();
    pointer.x = clamp(((event.clientX - box.left) / box.width - 0.5) * 2.6, -1, 1);
    pointer.y = clamp(((event.clientY - box.top) / box.height - 0.5) * 2.6, -1, 1);
  };
  canvas.addEventListener('mousedown', event => { pointer.steering = true; track(event); pressed.add('MouseDown'); });
  window.addEventListener('mouseup', () => { pointer.steering = false; });
  canvas.addEventListener('mousemove', track);
  canvas.addEventListener('wheel', event => { pointer.wheel -= Math.sign(event.deltaY); event.preventDefault(); }, { passive: false });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
}

export function wasPressed(code) {
  return pressed.has(code);
}

export function anyKeyPressed() {
  return pressed.size > 0;
}

export function clearPresses() {
  pressed.clear();
  pointer.wheel = 0;
}

// The pilot's inputs for one step. The stick eases toward the keys, so taps
// make small corrections and holds make full deflections.
export function readFlightControls(dt) {
  let pitch = 0, roll = 0;
  if (held.has('ArrowDown') || held.has('KeyS')) pitch += 1;
  if (held.has('ArrowUp') || held.has('KeyW')) pitch -= 1;
  if (held.has('ArrowRight') || held.has('KeyD')) roll += 1;
  if (held.has('ArrowLeft') || held.has('KeyA')) roll -= 1;
  if (pointer.steering) { roll = pointer.x; pitch = pointer.y; }
  const ease = Math.min(1, dt * 7);
  stick.pitch += (pitch - stick.pitch) * ease;
  stick.roll += (roll - stick.roll) * ease;
  let throttle = 0;
  if (held.has('ShiftLeft') || held.has('ShiftRight') || held.has('KeyE')) throttle += 1;
  if (held.has('ControlLeft') || held.has('ControlRight') || held.has('KeyQ')) throttle -= 1;
  throttle += pointer.wheel * 4;
  return {
    pitch: stick.pitch, roll: stick.roll, throttle,
    brake: held.has('KeyB'),
    release: pressed.has('Space'),
    toggleFlaps: pressed.has('KeyF'),
  };
}

export function centreStick() {
  stick.pitch = 0; stick.roll = 0;
}
