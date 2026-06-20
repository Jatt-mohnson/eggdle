// Cosmetic particle bursts, floating score popups, and screen shake. Purely visual: uses
// Math.random freely and is never part of the scored simulation.

const SHAKE_DUR = 0.32;

let particles = [];
let texts = [];
let shakeT = 0;
let shakeMag = 0;

export function reset() {
  particles = [];
  texts = [];
  shakeT = 0;
  shakeMag = 0;
}

function burst(x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.6);
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - speed * 0.4, // bias upward
      life: 0,
      max: 0.5 + Math.random() * 0.3,
      color,
      size: 2 + Math.random() * 2.5,
    });
  }
}

export function catchFx(x, y, combo, points) {
  burst(x, y, '#fff3c4', 10, 230);
  texts.push({
    x,
    y: y - 12,
    vy: -62,
    life: 0,
    max: 0.8,
    text: `+${points}`,
    color: combo > 8 ? '#ff7a1a' : combo > 4 ? '#e8a317' : '#1f8a4c',
    size: combo > 8 ? 24 : combo > 4 ? 20 : 17,
  });
}

export function goldenFx(x, y, points) {
  burst(x, y, '#ffd84d', 22, 300);
  burst(x, y, '#fff7c2', 12, 200);
  texts.push({ x, y: y - 12, vy: -70, life: 0, max: 1.0, text: `+${points}`, color: '#e8a317', size: 26 });
  shakeT = SHAKE_DUR;
  shakeMag = 5;
}

export function badFx(x, y, points) {
  burst(x, y, '#c0392b', 16, 270);
  texts.push({ x, y: y - 12, vy: -52, life: 0, max: 0.9, text: `${points}`, color: '#c0392b', size: 22 });
  shakeT = SHAKE_DUR;
  shakeMag = 8;
}

export function blockFx(x, y) {
  burst(x, y, '#8a8a82', 20, 220);
  burst(x, y, '#b5b5ad', 12, 150);
  texts.push({ x, y: y - 14, vy: -40, life: 0, max: 1.1, text: 'SPLAT!', color: '#5c5c54', size: 22 });
  shakeT = SHAKE_DUR;
  shakeMag = 12;
}

export function missFx(x, y) {
  burst(x, y, '#9bb0c4', 5, 120);
}

export function avoidFx(x, y) {
  burst(x, y, '#3ad17a', 6, 160);
}

export function update(dt) {
  for (const p of particles) {
    p.life += dt;
    p.vy += 620 * dt; // gravity
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  particles = particles.filter((p) => p.life < p.max);
  for (const t of texts) {
    t.life += dt;
    t.y += t.vy * dt;
  }
  texts = texts.filter((t) => t.life < t.max);
  if (shakeT > 0) shakeT -= dt;
}

// Returns a small {x,y} offset to translate the scene by, or null.
export function shake() {
  if (shakeT <= 0) return null;
  const m = shakeMag * (shakeT / SHAKE_DUR);
  return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m };
}

export function draw(ctx) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of texts) {
    ctx.globalAlpha = Math.max(0, 1 - t.life / t.max);
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px system-ui, sans-serif`;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
