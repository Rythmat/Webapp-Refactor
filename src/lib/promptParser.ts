import type { ChordStyle } from '@prism/engine';

// ── Types ────────────────────────────────────────────────────────────────

export interface ParsedPrompt {
  genre: string;
  rootNote: number; // 0-11 (C=0)
  mode: string; // 'ionian' | 'aeolian'
  bpm: number; // 40-300
}

// ── Genre keyword map (matches STUDIO_GENRES in PrismStudio) ─────────────

const GENRE_KEYWORDS: [RegExp, string][] = [
  [/\bhip[\s-]?hop\b/i, 'Hip Hop'],
  [/\blo[\s-]?fi\b/i, 'Hip Hop'],
  [/\btrap\b/i, 'Hip Hop'],
  [/\bchill\b/i, 'Hip Hop'],
  [/\bneo[\s-]?soul\b/i, 'R&B'],
  [/\br\s?&\s?b\b/i, 'R&B'],
  [/\brnb\b/i, 'R&B'],
  [/\bsoulful\b/i, 'R&B'],
  [/\bsoul\b/i, 'R&B'],
  [/\bjazz(?:y)?\b/i, 'Jazz'],
  [/\bfunk(?:y)?\b/i, 'Funk'],
  [/\brock(?:y)?\b/i, 'Rock'],
  [/\bpop(?:py)?\b/i, 'Pop'],
  [/\bedm\b/i, 'EDM'],
  [/\belectronic\b/i, 'EDM'],
  [/\breggae\b/i, 'Reggae'],
  [/\blatin\b/i, 'Latin'],
  [/\bsalsa\b/i, 'Latin'],
  [/\bbossa\b/i, 'Latin'],
  [/\bindie\b/i, 'Indie'],
  [/\bfolk\b/i, 'Folk'],
];

// ── Note name → pitch class ──────────────────────────────────────────────

const NOTE_PC: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

// ── Extraction helpers ───────────────────────────────────────────────────

function extractGenre(text: string): string | null {
  for (const [re, genre] of GENRE_KEYWORDS) {
    if (re.test(text)) return genre;
  }
  return null;
}

function extractKey(
  text: string,
): { root: number; mode: string } | null {
  // Match patterns like "C minor", "Dm", "F# major", "Bb min", "Ab maj"
  const re =
    /\b([A-G][#b]?)\s*(minor|major|min|maj|m(?!e|a|i|o|u))\b/i;
  const match = text.match(re);
  if (!match) return null;

  const noteName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const pc = NOTE_PC[noteName];
  if (pc === undefined) return null;

  const qual = match[2].toLowerCase();
  const isMinor = qual === 'minor' || qual === 'min' || qual === 'm';
  return { root: pc, mode: isMinor ? 'aeolian' : 'ionian' };
}

function extractBpm(text: string): number | null {
  const match = text.match(/(\d{2,3})\s*bpm/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  if (val < 40 || val > 300) return null;
  return val;
}

// ── Genre-based default tempo ranges (from curriculum Activity Flows) ────

const GENRE_TEMPO_RANGE: Record<string, [number, number]> = {
  'Pop':     [70, 110],
  'Rock':    [110, 140],
  'Jazz':    [100, 140],
  'Funk':    [95, 120],
  'Folk':    [80, 120],
  'EDM':     [120, 135],
  'Hip Hop': [80, 100],
  'R&B':     [70, 100],
  'Reggae':  [70, 90],
  'Latin':   [100, 130],
  'Indie':   [70, 110],
};

function randomBpmForGenre(genre: string): number {
  const range = GENRE_TEMPO_RANGE[genre] ?? [90, 120];
  return Math.round(range[0] + Math.random() * (range[1] - range[0]));
}

// ── Main parser ──────────────────────────────────────────────────────────

export function parsePrompt(
  text: string,
  tagGenre: string | null,
  tagKey: { root: number; mode: string } | null,
  tagBpm: number | null,
): ParsedPrompt {
  const textGenre = extractGenre(text);
  const textKey = extractKey(text);
  const textBpm = extractBpm(text);

  const genre = tagGenre ?? textGenre ?? 'Pop';

  return {
    genre,
    rootNote: tagKey?.root ?? textKey?.root ?? 0,
    mode: tagKey?.mode ?? textKey?.mode ?? 'ionian',
    bpm: tagBpm ?? textBpm ?? randomBpmForGenre(genre),
  };
}

// ── Style helper for suggestion engine ───────────────────────────────────

const JAZZ_LIKE = new Set(['Jazz', 'R&B', 'Latin']);

export function getStyleForGenre(genre: string): ChordStyle {
  const isJazzy = JAZZ_LIKE.has(genre);
  return {
    triadRatio: isJazzy ? 0.2 : 0.7,
    seventhRatio: isJazzy ? 0.7 : 0.25,
    extendedRatio: isJazzy ? 0.1 : 0.05,
    preferredQualities: [],
    avgChordsPerMeasure: isJazzy ? 2 : 1,
  };
}
