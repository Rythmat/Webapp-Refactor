/**
 * Phase 4 — Natural-language style parser.
 *
 * Turns a free-form phrase ("I want this song arranged in advanced funk",
 * "smooth jazz", "pop jazz", "rhythm and blues") into a structured
 * `ParsedStyle` the dispatcher can act on.
 *
 * The parser is pure (no I/O, no renderers) and lossless about ambiguity:
 * it does not invent matches, and returns null if no genre token appears.
 *
 * Algorithm
 * ---------
 *  1. Lowercase, collapse whitespace, strip punctuation except `&` and `-`.
 *  2. Walk tokens left-to-right doing greedy longest-match against three
 *     alias tables (3-word phrases, then 2-word, then 1-word).
 *  3. Collect every match by kind (level / genre / vibe). Unmatched tokens
 *     are silently dropped, so noise like "I want this song arranged in" /
 *     "style" / articles get ignored.
 *  4. Resolve: level = last level seen or L2 default; primary genre = LAST
 *     genre, modifier = second-to-last (if two or more). Vibes deduped,
 *     order preserved.
 *  5. No genres matched → return null.
 */

import { type CurriculumGenreId } from '@/curriculum/bridge/genreIdMap';
import { VIBE_ALGORITHMS } from '@/curriculum/engine/vibeAlgorithms';
import type { CurriculumLevelId } from '@/curriculum/types/curriculum';
import type { VibeTag } from '@/curriculum/types/progression';

// ── Public types ──────────────────────────────────────────────────────────────

export interface ParsedStyle {
  /** Last genre token in the phrase — drives harmony / melody. */
  primaryGenre: CurriculumGenreId;
  /** Earlier genre token (if any) — drives comping / bass / drums in blend mode. */
  modifierGenre?: CurriculumGenreId;
  /** Difficulty level. Defaults to L2 if no level keyword was present. */
  level: CurriculumLevelId;
  /** Recognized vibe tags, in input order, deduped. */
  vibes: VibeTag[];
}

// ── Alias tables ─────────────────────────────────────────────────────────────

const GENRE_ALIASES: Record<string, CurriculumGenreId> = {
  // Single-word direct matches
  pop: 'POP',
  rock: 'ROCK',
  jazz: 'JAZZ',
  funk: 'FUNK',
  blues: 'BLUES',
  reggae: 'REGGAE',
  folk: 'FOLK',
  latin: 'LATIN',
  electronic: 'ELECTRONIC',
  african: 'AFRICAN',
  // Multi-word + format variants
  'hip hop': 'HIP HOP',
  'hip-hop': 'HIP HOP',
  hiphop: 'HIP HOP',
  'neo soul': 'NEO SOUL',
  'neo-soul': 'NEO SOUL',
  neosoul: 'NEO SOUL',
  'jam band': 'JAM BAND',
  'jam-band': 'JAM BAND',
  jamband: 'JAM BAND',
  'r&b': 'R&B',
  rnb: 'R&B',
  'r and b': 'R&B',
  'rhythm and blues': 'R&B',
  // Sub-genre fallbacks (mirror ENGINE_ONLY_GENRES semantics)
  salsa: 'LATIN',
  merengue: 'LATIN',
  bossa: 'LATIN',
  samba: 'LATIN',
  'bossa nova': 'LATIN',
  ballad: 'POP',
};

const LEVEL_ALIASES: Record<string, CurriculumLevelId> = {
  beginner: 'L1',
  easy: 'L1',
  starter: 'L1',
  intro: 'L1',
  introductory: 'L1',
  basic: 'L1',
  simple: 'L1',
  novice: 'L1',
  l1: 'L1',
  'level 1': 'L1',
  intermediate: 'L2',
  medium: 'L2',
  mid: 'L2',
  standard: 'L2',
  l2: 'L2',
  'level 2': 'L2',
  advanced: 'L3',
  hard: 'L3',
  expert: 'L3',
  pro: 'L3',
  professional: 'L3',
  complex: 'L3',
  l3: 'L3',
  'level 3': 'L3',
};

const VIBE_ALIASES: Record<string, VibeTag> = buildVibeAliases();

function buildVibeAliases(): Record<string, VibeTag> {
  const table: Record<string, VibeTag> = {};
  for (const [tag, def] of Object.entries(VIBE_ALGORITHMS)) {
    const vibeTag = tag as VibeTag;
    table[vibeTag.toLowerCase()] = vibeTag;
    for (const synonym of def.synonyms) {
      table[synonym.toLowerCase()] = vibeTag;
    }
  }
  return table;
}

// ── Tokenisation ─────────────────────────────────────────────────────────────

const MAX_NGRAM = 3;

interface Match {
  kind: 'genre' | 'level' | 'vibe';
  value: CurriculumGenreId | CurriculumLevelId | VibeTag;
  /** Start index of the consumed run in the token stream. */
  index: number;
}

function normaliseInput(input: string): string[] {
  // Keep `&` and `-`, strip everything else that isn't alphanumeric / whitespace.
  const cleaned = input.toLowerCase().replace(/[^a-z0-9&\-\s]/g, ' ');
  return cleaned.split(/\s+/).filter((s) => s.length > 0);
}

function lookupAlias(phrase: string): Match | null {
  if (phrase in GENRE_ALIASES) {
    return { kind: 'genre', value: GENRE_ALIASES[phrase], index: -1 };
  }
  if (phrase in LEVEL_ALIASES) {
    return { kind: 'level', value: LEVEL_ALIASES[phrase], index: -1 };
  }
  if (phrase in VIBE_ALIASES) {
    return { kind: 'vibe', value: VIBE_ALIASES[phrase], index: -1 };
  }
  return null;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function parseStyle(input: string): ParsedStyle | null {
  const tokens = normaliseInput(input);
  if (tokens.length === 0) return null;

  const matches: Match[] = [];

  // Greedy longest-match left-to-right.
  let i = 0;
  while (i < tokens.length) {
    let consumed = 0;
    let hit: Match | null = null;

    for (let n = Math.min(MAX_NGRAM, tokens.length - i); n >= 1; n--) {
      const phrase = tokens.slice(i, i + n).join(' ');
      const m = lookupAlias(phrase);
      if (m) {
        hit = { ...m, index: i };
        consumed = n;
        break;
      }
    }

    if (hit) {
      matches.push(hit);
      i += consumed;
    } else {
      i++;
    }
  }

  const genreMatches = matches.filter((m) => m.kind === 'genre');
  if (genreMatches.length === 0) return null;

  const levelMatches = matches.filter((m) => m.kind === 'level');
  const vibeMatches = matches.filter((m) => m.kind === 'vibe');

  const primaryGenre = genreMatches[genreMatches.length - 1]
    .value as CurriculumGenreId;
  const modifierGenre =
    genreMatches.length >= 2
      ? (genreMatches[genreMatches.length - 2].value as CurriculumGenreId)
      : undefined;

  const level =
    levelMatches.length > 0
      ? (levelMatches[levelMatches.length - 1].value as CurriculumLevelId)
      : 'L2';

  const seenVibes = new Set<VibeTag>();
  const vibes: VibeTag[] = [];
  for (const m of vibeMatches) {
    const tag = m.value as VibeTag;
    if (!seenVibes.has(tag)) {
      seenVibes.add(tag);
      vibes.push(tag);
    }
  }

  const result: ParsedStyle = {
    primaryGenre,
    level,
    vibes,
  };
  if (modifierGenre && modifierGenre !== primaryGenre) {
    result.modifierGenre = modifierGenre;
  }
  return result;
}
