// Canvas rendering. Phase A uses simple shapes; sprites come in Phase C.

import {
  VIRTUAL_W, VIRTUAL_H, LANE_X, EGGMAN_Y, CATCH_Y, ROUND_SECONDS,
  SLOT_MIDDLE, EGGMAN_SCALE, EGGMAN_MAX_TILT, EGGMAN_STRETCH, EGGMAN_EAT_TIME,
} from './config.js';

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
  if (egg.type === 'bad') {
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

// The catcher: a light-blue "egg-man" — tall egg body, two eyes, an open mouth,
// bent arms on the hips, and two stubby legs/feet on the grass.
//
// He lunges toward the active lane rather than sliding: the body tilts (and
// stretches) about the planted feet, and the feet take only the partial step
// needed so his open mouth lands directly under the lane. `lean` is -1..1
// (left..right). `eatT` is the remaining chomp-animation time after a catch.
function drawEggMan(ctx, lean, eatT) {
  const S = EGGMAN_SCALE;
  const mid = LANE_X[SLOT_MIDDLE];
  const side = LANE_X[2] - LANE_X[SLOT_MIDDLE];
  const MOUTH_Y = -42; // mouth height above the feet, in sprite-local units

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
  ctx.scale(S, S);
  ctx.strokeStyle = ink;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Planted feet (upright — they do not tilt with the body).
  ctx.lineWidth = 3;
  for (const lx of [-11, 11]) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(lx + (lx < 0 ? -3 : 3), 0, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // The body leans/stretches toward the lane, pivoting on the feet; it squashes
  // a touch on the swallow.
  ctx.rotate(tilt);
  ctx.scale(1, stretch * (1 - 0.06 * chomp));

  // Legs
  ctx.lineWidth = 3;
  for (const lx of [-11, 11]) {
    ctx.beginPath();
    ctx.moveTo(lx, -2);
    ctx.lineTo(lx, -18);
    ctx.stroke();
  }

  // Tall egg-shaped body (pointier at the top, rounder at the bottom)
  ctx.fillStyle = fill;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -86);
  ctx.bezierCurveTo(28, -80, 34, -30, 0, -14);
  ctx.bezierCurveTo(-34, -30, -28, -80, 0, -86);
  ctx.fill();
  ctx.stroke();

  // Arms bent onto the hips, with a hand-line across the waist
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-26, -30);
  ctx.lineTo(-37, -22);
  ctx.lineTo(-20, -14);
  ctx.moveTo(26, -30);
  ctx.lineTo(37, -22);
  ctx.lineTo(20, -14);
  ctx.moveTo(-20, -14);
  ctx.lineTo(20, -14);
  ctx.stroke();

  // Eyes (whites + pupils)
  for (const ex of [-11, 11]) {
    ctx.fillStyle = fill;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, -56, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(ex, -56, 1.8, 0, Math.PI * 2);
    ctx.fill();
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

  // Mouth: resting ajar; opens wide to receive the egg, then chomps shut.
  let open = 2.2;
  if (eating) {
    open = u < 0.5
      ? 3 + 9 * (u / 0.5) // widen as the egg drops in
      : 12 * Math.max(0, 1 - (u - 0.5) / 0.35); // snap closed
  }
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(0, MOUTH_Y, 7, open, 0, 0, Math.PI * 2);
  ctx.fill();

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
  drawEggMan(ctx, lean, g.catcher.eatT);

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
