// localStorage: daily one-play lock, streak, best score.

const KEY = 'eggdle.v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable (private mode); play still works, just not persisted */
  }
}

// Dev helper: wipe all saved state (daily lock, streak, best).
export function resetAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function getStats() {
  const d = load();
  return {
    lastDate: d.lastDate || null,
    streak: d.streak || 0,
    bestScore: d.bestScore || 0,
    lastResult: d.lastResult || null, // { date, score, maxCombo, caught, total, results }
  };
}

export function hasPlayedToday(dateSeed) {
  return load().lastDate === dateSeed;
}

function isYesterday(prev, today) {
  if (!prev) return false;
  const p = new Date(prev + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');
  return (t - p) / 86400000 === 1;
}

// Record a finished daily run. Returns the updated stats.
export function recordDaily(result) {
  const d = load();
  const prev = d.lastDate;
  let streak = d.streak || 0;
  if (prev === result.date) {
    // already recorded today; leave streak as-is
  } else if (isYesterday(prev, result.date)) {
    streak += 1;
  } else {
    streak = 1;
  }
  const next = {
    lastDate: result.date,
    streak,
    bestScore: Math.max(d.bestScore || 0, result.score),
    lastResult: result,
  };
  save(next);
  return getStats();
}
