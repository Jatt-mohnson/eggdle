// Canvas rendering. Phase A uses simple shapes; sprites come in Phase C.

import { VIRTUAL_W, VIRTUAL_H, LANE_X, CHANSEY_Y, CATCH_Y, ROUND_SECONDS } from './config.js';

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

function drawChansey(ctx, x) {
  ctx.save();
  ctx.translate(x, CHANSEY_Y);
  ctx.fillStyle = '#f6a5c0';
  ctx.beginPath();
  ctx.ellipse(0, 0, 40, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(0, 8, 24, 16, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#3a2b2b';
  ctx.beginPath();
  ctx.arc(-10, -10, 2.5, 0, Math.PI * 2);
  ctx.arc(10, -10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function render(ctx, g) {
  ctx.fillStyle = '#bfe3ff';
  ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

  ctx.fillStyle = '#7ec77e';
  ctx.fillRect(0, CHANSEY_Y + 24, VIRTUAL_W, VIRTUAL_H - CHANSEY_Y - 24);
  drawGrassArrows(ctx, g);

  drawLanes(ctx);
  for (const egg of g.eggs) drawEgg(ctx, egg);
  drawChansey(ctx, g.catcher.x);

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
