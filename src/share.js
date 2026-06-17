// Build the Wordle-style shareable result text.

export const GAME_URL = 'https://jatt-mohnson.github.io/eggdle/';

export function buildShareText({ date, score, maxCombo, caught, total, badHit, golden }, streak) {
  const acc = total ? Math.round((caught / total) * 100) : 0;
  const lines = [
    `Eggdle ${date} — ${score.toLocaleString()} 🥚`,
    `Caught ${caught}/${total} (${acc}%) · best combo x${maxCombo}`,
  ];
  if (golden > 0) lines.push(`✨ golden eggs: ${golden}`);
  if (badHit > 0) lines.push(`💥 bad eggs caught: ${badHit}`);
  if (streak > 0) lines.push(`Streak: ${streak}`);
  return lines.join('\n');
}
