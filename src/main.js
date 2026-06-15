// Bootstrap + scene flow: menu -> play -> result. Owns the fixed-timestep loop.

import { FIXED_DT, ROUND_SECONDS, RAGE_COMBO } from './config.js';
import { rngFromString, todaySeed } from './rng.js';
import { createGame, step } from './game.js';
import { attachInput } from './input.js';
import { resizeCanvas, render } from './render.js';

// Shown on the result screen for a 25+ combo run (distinct from the in-game rage sprite).
const CONGRATS_SRC = './assets/congrats.png';
import { getStats, hasPlayedToday, recordDaily, resetAll } from './storage.js';
import { buildShareText, GAME_URL } from './share.js';
import * as audio from './audio.js';
import * as effects from './effects.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');

let game = null; // current running game, or null when idle
const getGame = () => game;
attachInput(canvas, getGame);

window.addEventListener('resize', () => resizeCanvas(canvas));
resizeCanvas(canvas);

// --- fixed-timestep loop ---------------------------------------------------
let lastTime = 0;
let acc = 0;

// Turn a sim event into sound + on-screen juice.
function handleEvent(ev) {
  if (ev.type === 'caught') {
    audio.catchSound(ev.combo);
    effects.catchFx(ev.x, ev.y, ev.combo, ev.points);
  } else if (ev.type === 'missed') {
    audio.missSound();
    effects.missFx(ev.x, ev.y);
  } else if (ev.type === 'badCaught') {
    audio.badSound();
    effects.badFx(ev.x, ev.y, ev.points);
  } else if (ev.type === 'badAvoided') {
    effects.avoidFx(ev.x, ev.y);
  }
}

// Draw the scene, wrapped in any active screen shake, with effects on top.
function drawScene() {
  const s = effects.shake();
  ctx.save();
  if (s) ctx.translate(s.x, s.y);
  render(ctx, game);
  effects.draw(ctx);
  ctx.restore();
}

function frame(now) {
  if (game && !game.finished) {
    let real = (now - lastTime) / 1000;
    lastTime = now;
    if (real > 0.25) real = 0.25; // avoid spiral-of-death after a tab stall
    acc += real;
    while (acc >= FIXED_DT && !game.finished) {
      step(game);
      acc -= FIXED_DT;
    }
    for (const ev of game.events) handleEvent(ev);
    game.events.length = 0;
    effects.update(real); // cosmetic effects run on real frame time
    drawScene();
    if (game.finished) onFinish();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 'M' toggles sound.
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') audio.toggleMute();
});

// --- scenes ----------------------------------------------------------------
const dateSeed = todaySeed();

// Dev: `?reset` clears saved state on load so the daily can be re-tested.
if (new URLSearchParams(location.search).has('reset')) resetAll();

function startGame(seed, mode) {
  game = createGame(seed, mode);
  lastTime = performance.now();
  acc = 0;
  effects.reset();
  audio.resume(); // started from a button click → satisfies autoplay gesture rule
  overlay.classList.add('hidden');
}

function onFinish() {
  const result = {
    date: game.mode === 'daily' ? dateSeed : null,
    score: game.score,
    maxCombo: game.maxCombo,
    caught: game.caught,
    total: game.goodTotal,
    badHit: game.badHit,
    results: game.results,
  };
  let stats = getStats();
  if (game.mode === 'daily') stats = recordDaily({ ...result, date: dateSeed });
  showResult(result, stats, game.mode);
  game = null;
}

function el(tag, props = {}, children = []) {
  const n = Object.assign(document.createElement(tag), props);
  for (const c of children) n.append(c);
  return n;
}

function showMenu() {
  const played = hasPlayedToday(dateSeed);
  const stats = getStats();
  overlay.replaceChildren(
    el('div', { className: 'card' }, [
      el('h1', { textContent: 'Eggdle' }),
      el('p', { className: 'sub', textContent: `Daily egg-catch · ${dateSeed}` }),
      played
        ? el('p', { className: 'note', textContent: "You've played today's egg. Come back tomorrow!" })
        : el('button', {
            className: 'primary',
            textContent: 'Play today',
            onclick: () => startGame(dateSeed, 'daily'),
          }),
      el('button', {
        className: 'secondary',
        textContent: 'Practice (random)',
        onclick: () => startGame('practice-' + Math.random().toString(36).slice(2), 'practice'),
      }),
      stats.streak
        ? el('p', { className: 'note', textContent: `Streak ${stats.streak} · Best ${stats.bestScore.toLocaleString()}` })
        : '',
    ].filter(Boolean))
  );
  if (played && stats.lastResult) {
    overlay.firstChild.append(buildResultBlock(stats.lastResult, stats, 'daily'));
  }
  overlay.classList.remove('hidden');
}

function buildResultBlock(result, stats, mode) {
  const share =
    mode === 'daily'
      ? buildShareText({ ...result, date: dateSeed }, stats.streak)
      : `Eggdle practice — ${result.score.toLocaleString()} 🥚 · caught ${result.caught}/${result.total}`;
  // Displayed result omits the link; the copied version appends it so shares are clickable.
  const copyText = `${share}\n${GAME_URL}`;
  // Hot streak (combo reached the rage threshold at any point): egg-man reward.
  const perfect = result.maxCombo >= RAGE_COMBO;
  const block = el('div', { className: 'result' }, [
    perfect
      ? el('img', { className: 'congrats', src: CONGRATS_SRC, alt: 'Congrats big boy', draggable: false })
      : '',
    perfect ? el('div', { className: 'perfect', textContent: `🔥 ${RAGE_COMBO}+ COMBO!` }) : '',
    el('div', { className: 'score', textContent: result.score.toLocaleString() }),
    el('pre', { className: 'share', textContent: share }),
  ].filter(Boolean));
  block.append(
    el('button', {
      className: 'secondary',
      textContent: 'Copy result',
      onclick: async (e) => {
        try {
          await navigator.clipboard.writeText(copyText);
          e.target.textContent = 'Copied!';
        } catch {
          e.target.textContent = 'Copy failed';
        }
      },
    })
  );
  return block;
}

function showResult(result, stats, mode) {
  const card = el('div', { className: 'card' }, [
    el('h1', { textContent: mode === 'daily' ? 'Done!' : 'Practice done' }),
    buildResultBlock(result, stats, mode),
  ]);
  if (mode === 'practice') {
    card.append(
      el('button', {
        className: 'primary',
        textContent: 'Practice again',
        onclick: () => startGame('practice-' + Math.random().toString(36).slice(2), 'practice'),
      })
    );
  }
  card.append(el('button', { className: 'secondary', textContent: 'Menu', onclick: showMenu }));
  overlay.replaceChildren(card);
  overlay.classList.remove('hidden');
}

// Dev: `?auto` jumps straight into a practice round (for screenshot/testing).
if (new URLSearchParams(location.search).has('auto')) {
  startGame('practice-auto', 'practice');
} else {
  showMenu();
}
