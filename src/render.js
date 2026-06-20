// Canvas rendering. Phase A uses simple shapes; sprites come in Phase C.

import {
  VIRTUAL_W, VIRTUAL_H, LANE_X, EGGMAN_Y, CATCH_Y, ROUND_SECONDS,
  SLOT_MIDDLE, EGGMAN_SCALE, EGGMAN_MAX_TILT, EGGMAN_STRETCH, EGGMAN_EAT_TIME,
  RAGE_COMBO, STUN_TIME,
} from './config.js';

// Perfect-run reward: once every good egg has been caught, the mild-mannered
// egg-man drops his composure and "turns into" this raging sprite. Loaded once;
// `rageReady` flips true on load so we never try to draw a half-decoded image.
export const RAGE_SRC = './assets/eggman-rage.png';
const rageImg = new Image();
let rageReady = false;
rageImg.onload = () => { rageReady = true; };
rageImg.src = RAGE_SRC;

// The egg-man rages while the live combo is at or above RAGE_COMBO. A miss
// breaks the combo and he reverts to his composed self until the streak rebuilds.
export function isRage(g) {
  return g.combo >= RAGE_COMBO;
}

export function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const maxW = Math.min(window.innerWidth, 460);
  const maxH = window.innerHeight;
  const scale = Math.min(maxW / VIRTUAL_W, maxH / VIRTUAL_H);
  const cssW = VIRTUAL_W * scale;
  const cssH = VIRTUAL_H * scale;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
}

function drawLanes(ctx) {
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  for (const x of LANE_X) {
    ctx.beginPath();
    ctx.moveTo(x, 60);
    ctx.lineTo(x, CATCH_Y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawEgg(ctx, egg) {
  ctx.save();
  ctx.translate(egg.x, egg.y);
  if (egg.type === 'block') {
    // A grey cinderblock: a boxy slab with two hollow cores.
    const w = 30, h = 20;
    ctx.fillStyle = '#9a9a93';
    ctx.strokeStyle = '#5c5c54';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#6f6f67';
    for (const hx of [-7, 7]) {
      ctx.fillRect(hx - 4, -5, 8, 10);
      ctx.strokeRect(hx - 4, -5, 8, 10);
    }
    ctx.beginPath(); // center web between the cores
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, h / 2);
    ctx.stroke();
    ctx.restore();
    return;
  } else if (egg.type === 'golden') {
    // Shiny gold egg with a faint glow and a highlight, so it reads as the prize.
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,60,0.9)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffcf33';
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-3, -4, 2.4, 3.4, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (egg.type === 'bad') {
    // dark, spotted "rotten" egg — visually distinct from a good egg
    ctx.fillStyle = '#5b6b3a';
    ctx.strokeStyle = '#33401f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#33401f';
    for (const [sx, sy] of [[-3, -3], [3, 1], [-1, 4]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#fff7e6';
    ctx.strokeStyle = '#e3c9a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// Subtle directional hints sitting in the grass; the active side brightens while held.
function drawGrassArrows(ctx, g) {
  const y = 668;
  const s = 12;
  const chevron = (cx, dir, active) => {
    ctx.strokeStyle = active ? 'rgba(255,255,255,0.9)' : 'rgba(31,92,46,0.5)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + dir * s, y - s);
    ctx.lineTo(cx - dir * s, y);
    ctx.lineTo(cx + dir * s, y + s);
    ctx.stroke();
  };
  chevron(42, 1, g.input.left); // "<"
  chevron(VIRTUAL_W - 42, -1, g.input.right); // ">"
}

// The catcher: a light-blue "egg-man" — a rounded egg body with two ringed eyes,
// a neutral mouth, a pants/waistband line, and two splayed legs with outward
// feet on the grass.
//
// He lunges toward the active lane rather than sliding: the body tilts (and
// stretches) about the planted feet, and the feet take only the partial step
// needed so his open mouth lands directly under the lane. `lean` is -1..1
// (left..right). `eatT` is the remaining chomp-animation time after a catch.
// The raging egg-man: the reward sprite, drawn in place of the procedural
// catcher. It still leans toward the active lane (and gives a tiny chomp shake)
// so it reads as the same character, just transformed.
function drawRageMan(ctx, lean, eatT) {
  const mid = LANE_X[SLOT_MIDDLE];
  const side = LANE_X[2] - LANE_X[SLOT_MIDDLE];
  const cx = mid + lean * side;
  // Match the procedural egg-man's footprint: ~150px tall, feet on EGGMAN_Y.
  const h = 150;
  const w = h * (rageImg.width / rageImg.height || 1);
  const shake = eatT > 0 ? Math.sin(eatT * 60) * 3 : 0;
  ctx.save();
  ctx.translate(cx + shake, EGGMAN_Y);
  ctx.drawImage(rageImg, -w / 2, -h, w, h);
  ctx.restore();
}

function drawEggMan(ctx, lean, eatT, flat = 0) {
  const S = EGGMAN_SCALE;
  const mid = LANE_X[SLOT_MIDDLE];
  const side = LANE_X[2] - LANE_X[SLOT_MIDDLE];
  const MOUTH_Y = -48; // mouth height above the feet, in sprite-local units

  const tilt = lean * EGGMAN_MAX_TILT;
  const stretch = 1 + (EGGMAN_STRETCH - 1) * Math.abs(lean);
  // Horizontal distance the mouth gains purely from tilting/stretching the body
  // about the feet; the feet then step the remainder so the mouth sits on the lane.
  const reachX = -MOUTH_Y * S * stretch * Math.sin(tilt);
  const footX = mid + lean * side - reachX;

  // Eat animation: u runs 0 (just caught) -> 1 (finished).
  const eating = eatT > 0;
  const u = eating ? 1 - eatT / EGGMAN_EAT_TIME : 0;
  const chomp = eating ? Math.max(0, Math.sin(u * Math.PI)) : 0; // 0..1..0 swallow pulse

  const fill = '#cddde6';
  const ink = '#2b3a4a';

  ctx.save();
  ctx.translate(footX, EGGMAN_Y);
  // Flattened by a cinderblock: squash the whole sprite down toward the feet
  // and spread it wide. `flat` runs 1 (just hit) -> 0 (recovered upright).
  if (flat > 0) ctx.scale(1 + 0.8 * flat, 1 - 0.7 * flat);
  ctx.scale(S, S);
  ctx.strokeStyle = ink;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Legs stay tethered to the planted feet while their tops follow the leaning
  // body. Drawn in this (un-rotated) frame; each hip is the body's leg-attach
  // point pushed through the same tilt+stretch the body uses, so the legs angle
  // into the lunge without ever detaching from the feet.
  const stretchEff = stretch * (1 - 0.06 * chomp);
  ctx.lineWidth = 3;
  for (const s of [-1, 1]) {
    const hy = -12 * stretchEff; // hip height, stretched like the body
    const hx = s * 9;
    const hipX = hx * Math.cos(tilt) - hy * Math.sin(tilt);
    const hipY = hx * Math.sin(tilt) + hy * Math.cos(tilt);
    ctx.beginPath();
    ctx.moveTo(s * 22, -1); // foot end (planted)
    ctx.lineTo(hipX, hipY); // hip under the leaning body
    ctx.stroke();
  }

  // Planted feet (upright — they do not tilt with the body), splayed outward.
  ctx.lineWidth = 3;
  ctx.fillStyle = fill;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 23, 0, 11, 4.5, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // The body leans/stretches toward the lane, pivoting on the feet; it squashes
  // a touch on the swallow. (Legs were already drawn above so the body overlaps
  // their tops and hides the hip seam.)
  ctx.rotate(tilt);
  ctx.scale(1, stretchEff);

  // Smooth egg body: rounded top, fuller rounded bottom (horizontal tangents
  // top and bottom keep both ends nicely curved rather than pointed).
  ctx.fillStyle = fill;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -90);
  ctx.bezierCurveTo(30, -86, 38, -12, 0, -12);
  ctx.bezierCurveTo(-38, -12, -30, -86, 0, -90);
  ctx.fill();
  ctx.stroke();

  // Pants / waistband: a band that bows downward across the lower belly.
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-24, -34);
  ctx.quadraticCurveTo(0, -22, 24, -34);
  ctx.stroke();

  // Eyes (whites + calm solid pupils). When flattened, the pupils become dazed
  // X's instead.
  const dazed = flat > 0.4;
  for (const ex of [-12, 12]) {
    ctx.fillStyle = fill;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(ex, -60, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (dazed) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      const r = 3;
      ctx.beginPath();
      ctx.moveTo(ex - r, -60 - r); ctx.lineTo(ex + r, -60 + r);
      ctx.moveTo(ex + r, -60 - r); ctx.lineTo(ex - r, -60 + r);
      ctx.stroke();
    } else {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(ex, -60, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The caught egg drops from above into the open mouth, then is swallowed.
  if (eating && u < 0.55) {
    const t2 = u / 0.55;
    const ey = MOUTH_Y - 26 * (1 - t2);
    ctx.fillStyle = '#fff7e6';
    ctx.strokeStyle = '#e3c9a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, ey, 6, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = ink;
  }

  // Mouth: a neutral flat line at rest; opens wide to receive the egg on a catch.
  if (eating) {
    const open = u < 0.5
      ? 3 + 9 * (u / 0.5) // widen as the egg drops in
      : 12 * Math.max(0, 1 - (u - 0.5) / 0.35); // snap closed
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(0, MOUTH_Y, 7, open, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-11, MOUTH_Y + 1.5); // slight upturned corner
    ctx.lineTo(-9, MOUTH_Y);
    ctx.lineTo(9, MOUTH_Y);
    ctx.lineTo(11, MOUTH_Y + 1.5);
    ctx.stroke();
  }

  ctx.restore();
}

export function render(ctx, g) {
  ctx.fillStyle = '#bfe3ff';
  ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

  ctx.fillStyle = '#7ec77e';
  ctx.fillRect(0, EGGMAN_Y - 4, VIRTUAL_W, VIRTUAL_H - EGGMAN_Y + 4);
  drawGrassArrows(ctx, g);

  drawLanes(ctx);
  for (const egg of g.eggs) drawEgg(ctx, egg);
  // Map the cosmetic catcher x (which springs between lanes) to a -1..1 lean.
  const lean = Math.max(-1, Math.min(1,
    (g.catcher.x - LANE_X[SLOT_MIDDLE]) / (LANE_X[2] - LANE_X[SLOT_MIDDLE])));
  const flat = g.catcher.stunT > 0 ? g.catcher.stunT / STUN_TIME : 0;
  if (isRage(g) && rageReady) drawRageMan(ctx, lean, g.catcher.eatT);
  else drawEggMan(ctx, lean, g.catcher.eatT, flat);

  // HUD
  ctx.fillStyle = '#143a52';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${g.score}`, 12, 30);
  ctx.textAlign = 'right';
  const remain = Math.max(0, Math.ceil(ROUND_SECONDS - g.t));
  ctx.fillText(`${remain}s`, VIRTUAL_W - 12, 30);
  if (g.combo > 1) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d2691e';
    ctx.fillText(`x${g.combo}`, VIRTUAL_W / 2, 30);
  }
}
