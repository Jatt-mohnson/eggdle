// Eggs fall straight down one of three lanes. A catch is decided when an egg crosses the
// catch line: it's caught only if the catcher's discrete slot matches the egg's lane.

import {
  LANE_X, LANES, EGG_SPAWN_Y, GRAVITY, MAX_FALL,
  GOLDEN_HOP_EVERY, GOLDEN_SLIDE, GOLDEN_LOCK_AHEAD,
} from './config.js';

export function laneX(lane) {
  return LANE_X[lane];
}

export function spawnEgg(state, lane, type, speed = 1) {
  const egg = {
    x: LANE_X[lane],
    y: EGG_SPAWN_Y,
    vy: 0,
    lane,
    type, // 'egg' | 'bad' | 'golden'
    speed, // per-egg gravity multiplier (faster eggs later in the round)
    dead: false,
  };
  if (type === 'golden') {
    egg.hopT = GOLDEN_HOP_EVERY; // countdown to the next lane change
    egg.hopFlip = lane % 2; // deterministic tiebreak when fleeing has two equal options
    egg.locked = false; // true once it commits to a lane near the bottom
  }
  state.eggs.push(egg);
}

// Pick the lane that sits farthest from the player's slot — the golden egg's
// instinct is to dodge wherever the catcher is. When two lanes are equally far
// (player in the middle), it alternates between them so it darts side to side.
function fleeLane(egg, slot) {
  let maxD = -1;
  const cands = [];
  for (let l = 0; l < LANES; l++) {
    const d = Math.abs(l - slot);
    if (d > maxD) { maxD = d; cands.length = 0; cands.push(l); }
    else if (d === maxD) cands.push(l);
  }
  if (cands.length === 1) return cands[0];
  egg.hopFlip = (egg.hopFlip + 1) % cands.length;
  return cands[egg.hopFlip];
}

// Golden eggs juke between lanes to avoid the catcher while they're high, then
// lock onto their current lane once within GOLDEN_LOCK_AHEAD of the catch line,
// giving the player a fair window to slide under it.
function updateGolden(egg, state, dt) {
  if (!egg.locked) {
    if (egg.y >= state.catchY - GOLDEN_LOCK_AHEAD) {
      egg.locked = true;
    } else {
      egg.hopT -= dt;
      if (egg.hopT <= 0) {
        egg.hopT += GOLDEN_HOP_EVERY;
        egg.lane = fleeLane(egg, state.catcher.slot);
      }
    }
  }
  // Dart the visible egg toward its target lane (catch logic still uses egg.lane).
  const tx = LANE_X[egg.lane];
  const d = tx - egg.x;
  const maxMove = GOLDEN_SLIDE * dt;
  egg.x += Math.abs(d) <= maxMove ? d : Math.sign(d) * maxMove;
}

// Integrate one egg by a fixed dt. Returns the outcome string at the catch line, else null.
export function integrateEgg(egg, state, dt) {
  const prevY = egg.y;
  egg.vy = Math.min(egg.vy + GRAVITY * egg.speed * dt, MAX_FALL);
  egg.y += egg.vy * dt;

  if (egg.type === 'golden') updateGolden(egg, state, dt);

  if (prevY < state.catchY && egg.y >= state.catchY) {
    egg.dead = true;
    const atLane = state.catcher.slot === egg.lane;
    if (egg.type === 'golden') return atLane ? 'goldenCaught' : 'goldenMissed';
    if (egg.type === 'block') return atLane ? 'blockHit' : 'blockAvoided';
    if (egg.type === 'bad') return atLane ? 'badCaught' : 'badAvoided';
    return atLane ? 'caught' : 'missed';
  }
  return null;
}
