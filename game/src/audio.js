// Every sound is made here from oscillators and noise: the engine note that
// follows the throttle, wind that follows the airspeed, a stall horn, chimes
// for targets, a thump for touchdown and a crunch for a crash. No audio files.

let context = null, master = null, engine = null, wind = null, horn = null;
let muted = false;

function noiseBuffer(seconds) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = 12345;
  for (let i = 0; i < data.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    data[i] = (state / 2147483648) - 1;
  }
  return buffer;
}

function buildEngine() {
  const low = context.createOscillator(), high = context.createOscillator();
  const filter = context.createBiquadFilter(), gain = context.createGain();
  low.type = 'sawtooth'; high.type = 'square';
  filter.type = 'lowpass'; filter.frequency.value = 420;
  gain.gain.value = 0;
  low.connect(filter); high.connect(filter); filter.connect(gain); gain.connect(master);
  low.start(); high.start();
  return { low, high, filter, gain };
}

function buildWind() {
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
  source.buffer = noiseBuffer(2); source.loop = true;
  filter.type = 'bandpass'; filter.frequency.value = 700; filter.Q.value = 0.6;
  gain.gain.value = 0;
  source.connect(filter); filter.connect(gain); gain.connect(master);
  source.start();
  return { filter, gain };
}

function buildHorn() {
  const tone = context.createOscillator(), gain = context.createGain();
  tone.type = 'square'; tone.frequency.value = 520; gain.gain.value = 0;
  tone.connect(gain); gain.connect(master); tone.start();
  return { gain };
}

// Browsers only allow sound after a key or click, so this runs on the first one.
export function wakeAudio() {
  if (context) { if (context.state === 'suspended') context.resume(); return; }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  context = new AudioContextClass();
  master = context.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(context.destination);
  engine = buildEngine(); wind = buildWind(); horn = buildHorn();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function tuneFlightSound(power, speed, stalled, flying) {
  if (!context) return;
  const now = context.currentTime;
  const note = 46 + power * 62;
  engine.low.frequency.setTargetAtTime(note, now, 0.08);
  engine.high.frequency.setTargetAtTime(note * 2.02, now, 0.08);
  engine.filter.frequency.setTargetAtTime(300 + power * 900, now, 0.1);
  engine.gain.gain.setTargetAtTime(flying ? 0.1 + power * 0.16 : 0, now, 0.1);
  wind.filter.frequency.setTargetAtTime(400 + speed * 14, now, 0.2);
  wind.gain.gain.setTargetAtTime(flying ? Math.min(0.3, speed * 0.0035) : 0, now, 0.2);
  horn.gain.gain.setTargetAtTime(flying && stalled && (now % 0.3) < 0.16 ? 0.08 : 0, now, 0.01);
}

function playTone(frequency, duration, type, volume, slideTo) {
  if (!context) return;
  const tone = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
  tone.type = type; tone.frequency.setValueAtTime(frequency, now);
  if (slideTo) tone.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  tone.connect(gain); gain.connect(master);
  tone.start(now); tone.stop(now + duration);
}

function playNoise(duration, volume, frequency) {
  if (!context) return;
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain(), now = context.currentTime;
  source.buffer = noiseBuffer(duration);
  filter.type = 'lowpass'; filter.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter); filter.connect(gain); gain.connect(master);
  source.start(now);
}

export function playTargetChime() { playTone(660, 0.14, 'triangle', 0.3); playTone(990, 0.3, 'triangle', 0.25, 1320); }
export function playMissChime() { playTone(240, 0.3, 'sawtooth', 0.2, 160); }
export function playTouchdownThump(firm) { playNoise(0.25, firm ? 0.6 : 0.3, 260); playTone(90, 0.2, 'sine', 0.4, 50); }
export function playCrashCrunch() { playNoise(1.2, 0.9, 900); playTone(120, 0.9, 'sawtooth', 0.4, 30); }
export function playWaterRelease() { playNoise(0.9, 0.35, 1800); }
export function playMissionFanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.35, 'triangle', 0.28), i * 130)); }
export function playMenuTick() { playTone(880, 0.06, 'square', 0.12); }
