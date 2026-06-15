// Tunable constants for Eggdle. Geometry is in logical units (the canvas is scaled to fit).

export const VIRTUAL_W = 400;
export const VIRTUAL_H = 700;

// Round
export const ROUND_SECONDS = 60; // shorter, punchier round
export const START_DELAY = 1.2; // grace before the first egg

// Simulation
export const FIXED_DT = 1 / 120; // fixed-timestep step size (seconds)
export const GRAVITY = 680; // base straight-down acceleration (px/s^2)
export const MAX_FALL = 1500; // vertical speed cap (px/s)
export const EGG_SPAWN_Y = 30; // y where eggs appear

// Per-egg fall-speed multiplier, eased over the round so eggs get faster as it goes.
export const FALL_SPEED_START = 1.0;
export const FALL_SPEED_END = 1.95;

// Catcher (egg-man) — three discrete slots, springs back to middle
export const EGGMAN_Y = 640; // feet / ground line for the egg-man
export const CATCH_Y = 584; // y line where a catch is decided (≈ the egg-man's mouth)
export const CATCHER_SLIDE = 2600; // px/s cosmetic slide between slots (does not affect catch logic)
// The egg-man lunges toward the active lane: his body tilts (and stretches) hard
// while his feet take only a partial step, so his mouth lands under the egg.
export const EGGMAN_SCALE = 1.35; // overall size of the egg-man sprite
export const EGGMAN_MAX_TILT = 1.05; // radians the body tilts at a full left/right lean (~60°)
export const EGGMAN_STRETCH = 1.5; // body lengthens up to this at full lean, to extend the reach
export const EGGMAN_EAT_TIME = 0.5; // seconds of the chomp/swallow animation on a catch
// Combo length that triggers the raging egg-man. The catcher rages while the
// live combo is at or above this; the result screen rewards reaching it at all.
export const RAGE_COMBO = 25;

// Lanes: three straight vertical columns
export const LANES = 3;
export const LANE_X = [VIRTUAL_W * (1 / 6), VIRTUAL_W * (3 / 6), VIRTUAL_W * (5 / 6)];
export const SLOT_MIDDLE = 1;

// Scoring
export const EGG_BASE = 100;
export const COMBO_BONUS = 10; // per current combo
export const BAD_PENALTY = 150; // points lost for catching a bad egg

// --- Schedule / difficulty curve ------------------------------------------
// Chance a plain "single" spawn is a bad egg (eased up over the round).
export const BAD_CHANCE_START = 0.16;
export const BAD_CHANCE_END = 0.5;
// Gap between rapid eggs inside a pattern (burst/sweep/flick), eased tighter.
export const GAP_SHORT_START = 0.34;
export const GAP_SHORT_END = 0.12;
// Gap between separate patterns, eased tighter.
export const GAP_NORMAL_START = 0.78;
export const GAP_NORMAL_END = 0.32;
// Length of a "breather" pause woven in after busy stretches.
export const BREATHER_START = 1.1;
export const BREATHER_END = 0.52;
// Force a breather after this many busy patterns in a row.
export const BUSY_BEFORE_BREATHER = 3;
