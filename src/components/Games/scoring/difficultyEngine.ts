const STORAGE_KEY = 'musicAtlas:arcadeDifficulty';

interface SkillAccuracy {
  hits: number;
  total: number;
}

/**
 * Tracks rolling accuracy per skill tag across sessions.
 * Uses localStorage for persistence.
 */
function loadAccuracyMap(): Record<string, SkillAccuracy> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAccuracyMap(map: Record<string, SkillAccuracy>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Record a result for a skill tag.
 */
export function recordSkillResult(tag: string, hits: number, total: number) {
  const map = loadAccuracyMap();
  const prev = map[tag] ?? { hits: 0, total: 0 };
  // Keep a rolling window of the last ~100 attempts
  const decay = prev.total > 100 ? 0.9 : 1;
  map[tag] = {
    hits: Math.round(prev.hits * decay) + hits,
    total: Math.round(prev.total * decay) + total,
  };
  saveAccuracyMap(map);
}

/**
 * Get the rolling accuracy (0–1) for a skill tag.
 */
export function getSkillAccuracy(tag: string): number {
  const map = loadAccuracyMap();
  const entry = map[tag];
  if (!entry || entry.total === 0) return 0.5; // Default to medium
  return entry.hits / entry.total;
}

/**
 * Suggest a difficulty level (1–4) based on rolling accuracy for given tags.
 */
export function suggestDifficulty(tags: string[]): number {
  if (tags.length === 0) return 1;
  const avg =
    tags.reduce((sum, t) => sum + getSkillAccuracy(t), 0) / tags.length;

  if (avg < 0.4) return 1;
  if (avg < 0.65) return 2;
  if (avg < 0.85) return 3;
  return 4;
}
