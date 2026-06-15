// Build the Wordle-style shareable result text.

const GLYPH = {
  caught: '🥚',
  missed: '⬜',
  badCaught: '💥', // caught a bad egg — bad!
  badAvoided: '🟢', // correctly dodged a bad egg
};

// Compress per-egg results into a strip, capped so the share stays tidy.
function emojiStrip(results, cap = 20) {
  const g = (r) => GLYPH[r] || '⬜';
  if (results.length <= cap) return results.map(g).join('');
  const out = [];
  for (let i = 0; i < cap; i++) {
    out.push(g(results[Math.floor((i / cap) * results.length)]));
  }
  return out.join('');
}

export function buildShareText({ date, score, maxCombo, caught, total, badHit, results }, streak) {
  const acc = total ? Math.round((caught / total) * 100) : 0;
  const lines = [
    `Eggdle ${date} — ${score.toLocaleString()} 🥚`,
    emojiStrip(results),
    `Caught ${caught}/${total} (${acc}%) · best combo x${maxCombo}`,
  ];
  if (badHit > 0) lines.push(`💥 bad eggs caught: ${badHit}`);
  if (streak > 0) lines.push(`Streak: ${streak}`);
  return lines.join('\n');
}
