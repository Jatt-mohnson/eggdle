# Eggdle — Spec

A daily, deterministic, single-player arcade game adapted from the **Egg Emergency**
mini-game in *Pokémon Stadium 2*. Vanilla JS + HTML5 Canvas, no build step, static-hostable.

## Concept

Blissey rolls eggs down a set of zig-zag ramps; they accelerate and drop off the bottom.
The player slides **Chansey** left/right along a catch line to catch them. A "daily"
wrapper makes every player on a given date play the **identical** egg sequence and compare
scores, like Wordle.

## Core rules

- A round is a fixed **60 seconds**.
- Catch a good egg: `+100` points plus a combo bonus (`+10 × current combo`).
- Miss a good egg (it hits the floor): combo resets to 0. No lives lost in Phase A.
- **Bad eggs** appear occasionally. Catching one costs `-150` points and resets the combo;
  the player must deliberately move *off* that lane to dodge it. Avoiding a bad egg is the
  correct play.
- Goal: maximize score. Secondary stats: eggs caught, accuracy, max combo, bad eggs caught.

## Schedule — pattern generator

The round is composed from seeded **patterns** (not a flat interval), with intensity ramping
0→1 over the 60s. Eggs also fall faster as the round progresses (per-egg `speed` multiplier
`1.0 → 1.7`). Patterns (`schedule.js`), weighted by intensity:

- **single** — one egg, occasionally bad. Calm baseline (favored early).
- **burst** — 3–4 quick eggs in one lane, then a longer beat ("3 fast, then slower").
- **sweep** — staircase across all three lanes, L→R or R→L.
- **alternate** — bounce between two lanes (A B A B).
- **flick** — two eggs, different lanes, fast succession (a quick cross).
- **trap** — good on the sides, **bad in the middle**: catch, dodge center, catch.
- **decoy** — simultaneous good + bad in different lanes; read it and grab the good one.
- **badRun** — two bad eggs to dodge, then a good one rewarding a mobile player.

A **breather** (gentle pause, sometimes a lone slow egg) is forced after a few busy patterns so
the round breathes. Invariant: no two *good* eggs ever share a timestamp in different lanes (that
would be an uncatchable forced miss); good+bad simultaneity is allowed (the decoy). Tuning lives
in `config.js` (gaps, bad-egg chance, fall-speed curve, breather cadence).

## Feedback (audio + effects)

The sim stays pure/deterministic but pushes cosmetic **events** (`game.events`) at each catch
outcome; the loop drains them each frame and dispatches to:

- **`audio.js`** — Web Audio synthesis (no asset files). Catch = a blip whose pitch climbs the
  semitone ladder with your combo; miss = soft low blip; bad-egg = harsh buzz. Resumed from the
  start-button gesture; **M** toggles mute.
- **`effects.js`** — canvas particle bursts, floating `+points` popups (color/size scale with
  combo), and a brief screen shake on a bad-egg catch. Uses `Math.random` freely since it never
  touches the score.

## The "rdle" wrapper

- **Deterministic daily run.** The local date (`YYYY-MM-DD`) seeds a PRNG that generates the
  *entire* spawn schedule (time + lane of every egg). Same date → identical run for everyone.
- **One daily play**, locked in `localStorage` (like Wordle). **Practice mode** uses random
  seeds for unlimited replays and never affects daily stats/streak.
- **Shareable result**: score, an emoji strip of the run, and current streak.
- **Local stats**: streak, best score, last result.

## Critical architecture decision — fixed-timestep simulation

Because scores are compared on a shared seed, egg physics **must** be identical regardless of
device framerate. The loop decouples update from render: accumulate real elapsed time and step
the simulation at a fixed `dt` (1/120 s). Egg motion is independent of player input, so the
same seed always yields the same egg behavior. This is foundational and built in from Phase A.

## Playfield model (Phase A)

Faithful to the *Pokémon Stadium 2* egg catch: **three straight vertical lanes**.

- Logical resolution `400 × 700`, canvas scaled to fit.
- Eggs fall straight down one of the three lanes, accelerating under gravity.
- The catcher occupies one of **three discrete slots** (left / middle / right) and **springs
  back to middle** whenever neither direction is held: hold ← → left slot, hold → → right slot,
  release → middle. Controls: ← →, A/D, or tap/hold a third of the screen (touch).
- A catch is decided at the catch line: an egg is caught only if the catcher's slot matches the
  egg's lane. (The catcher's on-screen position slides cosmetically between slots; catch logic
  is purely discrete.)

## Module layout

```
index.html, styles.css
src/
  config.js     tunable constants (geometry, physics, scoring, round length)
  rng.js        mulberry32 PRNG + string-hash + daily seed from date
  schedule.js   deterministic spawn schedule from a seed + difficulty curve
  entities.js   ramp generation + egg spawn/physics integration
  game.js       fixed-timestep loop, state, scoring, catch resolution
  input.js      keyboard + pointer
  render.js     canvas drawing (shapes in Phase A, sprites in Phase C)
  storage.js    localStorage: daily lock, streak, stats
  share.js      build shareable result text
  main.js       bootstrap + scene flow (menu → play → result)
```

## Build phases

- **Phase A (this pass) — MVP:** ramps + eggs, Chansey catch, score/combo, 75s timer,
  deterministic daily seed, fixed-timestep sim, one-play-per-day lock, result + share, practice
  mode. Plain shapes, no art.
- **Phase B — depth:** bombs/stun, golden eggs, difficulty curve tuning, stats/streak UI,
  full result screen + distribution.
- **Phase C — polish:** Pokémon sprites + animation, sound, render interpolation/juice, refined
  touch controls.

## Running locally

ES modules require HTTP (not `file://`):

```
python3 -m http.server 8000   # then open http://localhost:8000
```
