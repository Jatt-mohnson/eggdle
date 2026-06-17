// Fixed-timestep game: deterministic egg sim + 3-slot catcher + scoring.

import {
  ROUND_SECONDS,
  FIXED_DT,
  LANE_X,
  SLOT_MIDDLE,
  CATCHER_SLIDE,
  CATCH_Y,
  EGGMAN_Y,
  EGG_BASE,
  COMBO_BONUS,
  BAD_PENALTY,
  GOLDEN_BONUS,
  EGGMAN_EAT_TIME,
} from './config.js';
import { buildSchedule } from './schedule.js';
import { spawnEgg, integrateEgg } from './entities.js';

export function createGame(seedString, mode) {
  const schedule = buildSchedule(seedString);
  return {
    seed: seedString,
    mode, // 'daily' | 'practice'
    schedule,
    goodTotal: schedule.filter((s) => s.type === 'egg').length,
    eggs: [],
    nextSpawn: 0,
    t: 0,
    catchY: CATCH_Y,
    // catcher: slot drives catch logic; x is a cosmetic slide toward the slot.
    // eatT counts down a chomp/swallow animation each time a good egg is caught.
    catcher: { slot: SLOT_MIDDLE, x: LANE_X[SLOT_MIDDLE], eatT: 0 },
    input: { left: false, right: false }, // set by keyboard or the touch hold-buttons
    score: 0,
    combo: 0,
    maxCombo: 0,
    caught: 0,
    badHit: 0,
    golden: 0, // golden eggs caught (bonus, not part of caught/total accuracy)
    results: [], // outcomes in spawn order, for the share strip
    events: [], // cosmetic events drained each frame by the audio/effects layer
    finished: false,
  };
}

// Which of the three slots does the current input select? Default: middle.
// Holding both (or neither) springs back to the middle, matching the original.
function targetSlot(input) {
  if (input.left && !input.right) return 0;
  if (input.right && !input.left) return 2;
  return SLOT_MIDDLE;
}

// Advance the simulation by exactly FIXED_DT.
export function step(g) {
  const dt = FIXED_DT;
  g.t += dt;

  // Spawn any eggs whose time has arrived.
  while (g.nextSpawn < g.schedule.length && g.schedule[g.nextSpawn].time <= g.t) {
    const s = g.schedule[g.nextSpawn];
    spawnEgg(g, s.lane, s.type, s.speed);
    g.nextSpawn++;
  }

  // Catcher: pick a discrete slot, then slide the sprite toward it (cosmetic only).
  g.catcher.slot = targetSlot(g.input);
  const tx = LANE_X[g.catcher.slot];
  const d = tx - g.catcher.x;
  const maxMove = CATCHER_SLIDE * dt;
  g.catcher.x += Math.abs(d) <= maxMove ? d : Math.sign(d) * maxMove;
  if (g.catcher.eatT > 0) g.catcher.eatT = Math.max(0, g.catcher.eatT - dt);

  // Integrate eggs and resolve outcomes at the catch line.
  for (const egg of g.eggs) {
    const r = integrateEgg(egg, g, dt);
    if (!r) continue;
    if (r === 'caught') {
      const gained = EGG_BASE + g.combo * COMBO_BONUS;
      g.score += gained;
      g.combo += 1;
      g.maxCombo = Math.max(g.maxCombo, g.combo);
      g.caught += 1;
      g.catcher.eatT = EGGMAN_EAT_TIME; // kick off the chomp/swallow animation
      g.results.push('caught');
      g.events.push({ type: 'caught', x: egg.x, y: g.catchY, combo: g.combo, points: gained });
    } else if (r === 'missed') {
      g.combo = 0;
      g.results.push('missed');
      g.events.push({ type: 'missed', x: egg.x, y: g.catchY });
    } else if (r === 'badCaught') {
      g.score = Math.max(0, g.score - BAD_PENALTY);
      g.combo = 0;
      g.badHit += 1;
      g.results.push('badCaught');
      g.events.push({ type: 'badCaught', x: egg.x, y: g.catchY, points: -BAD_PENALTY });
    } else if (r === 'badAvoided') {
      g.results.push('badAvoided');
      g.events.push({ type: 'badAvoided', x: egg.x, y: g.catchY });
    } else if (r === 'goldenCaught') {
      const gained = GOLDEN_BONUS + g.combo * COMBO_BONUS;
      g.score += gained;
      g.combo += 1;
      g.maxCombo = Math.max(g.maxCombo, g.combo);
      g.golden += 1;
      g.catcher.eatT = EGGMAN_EAT_TIME;
      g.results.push('goldenCaught');
      g.events.push({ type: 'goldenCaught', x: egg.x, y: g.catchY, combo: g.combo, points: gained });
    } else if (r === 'goldenMissed') {
      // A dodged golden egg costs nothing and doesn't break the combo — pure bonus.
      g.results.push('goldenMissed');
      g.events.push({ type: 'goldenMissed', x: egg.x, y: g.catchY });
    }
  }
  if (g.eggs.some((e) => e.dead)) g.eggs = g.eggs.filter((e) => !e.dead);

  // Round ends once time is up and the field is clear.
  if (g.t >= ROUND_SECONDS && g.nextSpawn >= g.schedule.length && g.eggs.length === 0) {
    g.finished = true;
  }
}

export const constants = { EGGMAN_Y, ROUND_SECONDS };
