// Deterministic spawn schedule built from seeded "patterns" (phrases) rather than a flat
// interval. Intensity ramps over the round; breathers are woven in so it breathes.
// Each spawn: { time, lane, type:'egg'|'bad', speed } where speed is a fall-rate multiplier.

import { rngFromString } from './rng.js';
import {
  ROUND_SECONDS,
  START_DELAY,
  LANES,
  FALL_SPEED_START,
  FALL_SPEED_END,
  BAD_CHANCE_START,
  BAD_CHANCE_END,
  GAP_SHORT_START,
  GAP_SHORT_END,
  GAP_NORMAL_START,
  GAP_NORMAL_END,
  BREATHER_START,
  BREATHER_END,
  BUSY_BEFORE_BREATHER,
} from './config.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function weightedPick(rng, entries) {
  let total = 0;
  for (const [, w] of entries) total += w;
  let r = rng() * total;
  for (const [id, w] of entries) if ((r -= w) <= 0) return id;
  return entries[entries.length - 1][0];
}

export function buildSchedule(seedString) {
  const rng = rngFromString(seedString);
  const spawns = [];
  let t = START_DELAY;
  let busyStreak = 0;

  const rndLane = () => Math.floor(rng() * LANES);
  const otherLane = (a) => {
    const opts = [];
    for (let l = 0; l < LANES; l++) if (l !== a) opts.push(l);
    return opts[Math.floor(rng() * opts.length)];
  };
  const push = (lane, type, speed) => spawns.push({ time: t, lane, type, speed });

  while (t < ROUND_SECONDS) {
    // Intensity 0 -> 1, eased so the ramp accelerates as the round goes on
    // (calm open, sharply busier finish) rather than rising at a flat rate.
    const k = Math.pow(clamp01(t / ROUND_SECONDS), 1.35);
    const speed = lerp(FALL_SPEED_START, FALL_SPEED_END, k);
    const badChance = lerp(BAD_CHANCE_START, BAD_CHANCE_END, k);
    const gShort = lerp(GAP_SHORT_START, GAP_SHORT_END, k);
    const gNorm = lerp(GAP_NORMAL_START, GAP_NORMAL_END, k);

    // After a run of busy patterns, take a beat — the "then slower for a moment" rhythm.
    if (busyStreak >= BUSY_BEFORE_BREATHER) {
      t += lerp(BREATHER_START, BREATHER_END, k);
      if (rng() < 0.55) {
        push(rndLane(), 'egg', speed * 0.92); // a lone, gentler egg to reset the eye
        t += gNorm;
      }
      busyStreak = 0;
      continue;
    }

    const pattern = weightedPick(rng, [
      ['single', 3 * (1 - k) + 0.8],
      ['burst', 0.8 + 2.2 * k],
      ['sweep', 1.6 * (1 - 0.4 * k)],
      ['alternate', 1.3],
      ['flick', 0.3 + 2.0 * k],
      ['trap', 0.5 + 2.4 * k],
      ['decoy', 0.4 + 2.0 * k],
      ['badRun', 0.3 + 1.8 * k],
    ]);

    switch (pattern) {
      // One egg, occasionally a bad one. Calm baseline.
      case 'single': {
        push(rndLane(), rng() < badChance ? 'bad' : 'egg', speed);
        t += gNorm;
        break;
      }

      // 3-4 quick eggs in the SAME lane, then a longer beat after.
      case 'burst': {
        const lane = rndLane();
        const n = 3 + (rng() < 0.45 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          push(lane, 'egg', speed * 1.06);
          t += gShort;
        }
        t += lerp(0.95, 0.55, k); // breathe after the flurry
        busyStreak++;
        break;
      }

      // Staircase across all lanes, left->right or right->left.
      case 'sweep': {
        const order = rng() < 0.5 ? [0, 1, 2] : [2, 1, 0];
        for (const lane of order) {
          push(lane, 'egg', speed);
          t += gShort;
        }
        t += gNorm;
        break;
      }

      // Bounce between two lanes: A B A B.
      case 'alternate': {
        const a = rndLane();
        const b = otherLane(a);
        for (let i = 0; i < 4; i++) {
          push(i % 2 ? b : a, 'egg', speed);
          t += gShort;
        }
        t += gNorm;
        busyStreak++;
        break;
      }

      // Two eggs, different lanes, in fast succession — a quick flick across.
      case 'flick': {
        const a = rndLane();
        const b = otherLane(a);
        push(a, 'egg', speed);
        t += gShort * 0.85;
        push(b, 'egg', speed * 1.08);
        t += gNorm;
        busyStreak++;
        break;
      }

      // Good on the sides, BAD in the middle: catch left, dodge center, catch right.
      case 'trap': {
        const sides = rng() < 0.5 ? [0, 2] : [2, 0];
        push(sides[0], 'egg', speed);
        t += gShort;
        push(1, 'bad', speed);
        t += gShort;
        push(sides[1], 'egg', speed);
        t += gNorm;
        busyStreak++;
        break;
      }

      // Simultaneous good + bad in different lanes — read it and grab the good one.
      case 'decoy': {
        const gl = rndLane();
        const bl = otherLane(gl);
        push(gl, 'egg', speed);
        push(bl, 'bad', speed);
        t += gNorm;
        busyStreak++;
        break;
      }

      // Two bad eggs to dodge, then a good one rewarding the player who stayed mobile.
      case 'badRun': {
        const bl = rng() < 0.6 ? 1 : rndLane();
        push(bl, 'bad', speed);
        t += gShort;
        push(bl, 'bad', speed);
        t += gShort;
        push(otherLane(bl), 'egg', speed);
        t += gNorm;
        busyStreak++;
        break;
      }
    }
  }

  return spawns;
}
