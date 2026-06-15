// Synthesized sound via Web Audio — no asset files. Must be resumed from a user gesture
// (we call resume() when a game starts from a button click).

let actx = null;
let master = null;
let muted = false;

export function resume() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = muted ? 0 : 0.28;
    master.connect(actx.destination);
  }
  if (actx.state === 'suspended') actx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.28;
  return muted;
}

// One enveloped oscillator tone.
function tone({ freq, type = 'triangle', dur = 0.12, vol = 0.9, glideTo = null }) {
  if (!actx || muted) return;
  const t0 = actx.currentTime;
  const osc = actx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Catch: a pleasant blip whose pitch climbs the higher your combo gets.
export function catchSound(combo) {
  const step = Math.min(combo, 14); // semitone ladder, capped
  const freq = 523.25 * Math.pow(2, step / 12);
  tone({ freq, type: 'triangle', dur: 0.12, vol: 0.85, glideTo: freq * 1.5 });
  tone({ freq: freq * 2, type: 'sine', dur: 0.08, vol: 0.25 }); // sparkle
}

// Miss: a soft low blip downward.
export function missSound() {
  tone({ freq: 175, type: 'sine', dur: 0.16, vol: 0.45, glideTo: 110 });
}

// Bad egg caught: a harsh buzz.
export function badSound() {
  tone({ freq: 120, type: 'square', dur: 0.28, vol: 0.6, glideTo: 70 });
  tone({ freq: 92, type: 'sawtooth', dur: 0.28, vol: 0.35 });
}
