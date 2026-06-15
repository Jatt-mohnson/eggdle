// Eggs fall straight down one of three lanes. A catch is decided when an egg crosses the
// catch line: it's caught only if the catcher's discrete slot matches the egg's lane.

import { LANE_X, EGG_SPAWN_Y, GRAVITY, MAX_FALL } from './config.js';

export function laneX(lane) {
  return LANE_X[lane];
}

export function spawnEgg(state, lane, type, speed = 1) {
  state.eggs.push({
    x: LANE_X[lane],
    y: EGG_SPAWN_Y,
    vy: 0,
    lane,
    type, // 'egg' | 'bad'
    speed, // per-egg gravity multiplier (faster eggs later in the round)
    dead: false,
  });
}

// Integrate one egg by a fixed dt. Returns the outcome string at the catch line, else null.
export function integrateEgg(egg, state, dt) {
  const prevY = egg.y;
  egg.vy = Math.min(egg.vy + GRAVITY * egg.speed * dt, MAX_FALL);
  egg.y += egg.vy * dt;

  if (prevY < state.catchY && egg.y >= state.catchY) {
    egg.dead = true;
    const atLane = state.catcher.slot === egg.lane;
    if (egg.type === 'bad') return atLane ? 'badCaught' : 'badAvoided';
    return atLane ? 'caught' : 'missed';
  }
  return null;
}
