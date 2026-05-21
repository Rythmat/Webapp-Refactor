/**
 * Phase 4 — GCM dispatcher.
 *
 * Parses a free-form style phrase, looks up the corresponding Genre
 * Curriculum Map entry, and applies all five Phase-4 renderers in one go.
 *
 * The compound-genre blend (per user spec):
 *   primary   = last word     → voicings + melody (harmonic core)
 *   modifier  = earlier word  → comping + bass + drums (rhythm-section feel)
 *
 * Vibes parsed from the input are returned in the result and used as a
 * deterministic seed nudge so different vibes select different patterns from
 * the GCM-listed pools. This is a v1 simplification — vibes don't yet apply
 * any musical-rule filtering (e.g. forbidden chord qualities); they just
 * vary which pattern is chosen when multiple are available.
 */

import {
  CURRICULUM_TO_ENGINE_GENRE,
  curriculumToVoicingGenre,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import { getGCMEntry } from '@/curriculum/data/gcmHelpers';
import type {
  CurriculumLevelId,
  GenreCurriculumEntry,
} from '@/curriculum/types/curriculum';
import type { VibeTag } from '@/curriculum/types/progression';
import type { GenreName } from '@/daw/prism-engine/types';
import type { UnisonDocument } from '../types/schema';
import { applyBass } from './bassRenderer';
import { applyComping } from './compingRenderer';
import { applyDrums } from './drumRenderer';
import { applyMelody, type MelodyConfig } from './melodyRenderer';
import { parseStyle, type ParsedStyle } from './styleParser';
import { applyVoicingsToTimeline } from './voicingRenderer';

// ── Public API ────────────────────────────────────────────────────────────────

export interface ArrangeForStyleOptions {
  /** Throw if `input` can't be parsed into at least one genre. Default false. */
  strict?: boolean;
  /** Selection seed used to pick from pattern pools. Default 0. */
  seed?: number;
}

export interface ArrangeResult {
  doc: UnisonDocument;
  /** What the parser understood; null if it found no genre. */
  parsed: ParsedStyle | null;
}

/**
 * Arrange a UnisonDocument according to a natural-language style phrase.
 *
 *   arrangeForStyle(doc, "advanced funk")
 *   arrangeForStyle(doc, "pop jazz")
 *   arrangeForStyle(doc, "smooth sophisticated neo-soul")
 */
export function arrangeForStyle(
  doc: UnisonDocument,
  input: string,
  options?: ArrangeForStyleOptions,
): ArrangeResult {
  const parsed = parseStyle(input);
  if (!parsed) {
    if (options?.strict) {
      throw new Error(`arrangeForStyle: could not parse "${input}"`);
    }
    return { doc, parsed: null };
  }

  const baseSeed = options?.seed ?? 0;
  const seed = baseSeed + vibeSeedOffset(parsed.vibes);

  const primaryGCM = getGCMEntry(parsed.primaryGenre, parsed.level);
  const modifierGCM = parsed.modifierGenre
    ? getGCMEntry(parsed.modifierGenre, parsed.level)
    : null;
  const rhythmGCM = modifierGCM ?? primaryGCM;
  const rhythmGenre = parsed.modifierGenre ?? parsed.primaryGenre;

  // 1. Voicings (always from primary).
  let next: UnisonDocument = {
    ...doc,
    analysis: {
      ...doc.analysis,
      chordTimeline: applyVoicingsToTimeline(
        doc.analysis.chordTimeline,
        curriculumToVoicingGenre(parsed.primaryGenre),
        levelToNumber(parsed.level),
      ),
    },
  };

  // 2. Comping (from rhythm-section source). Some GCM entries don't list a
  //    compingPatterns pool at all (e.g. FUNK_L3) — in that case we skip the
  //    chord track rather than emit an empty one.
  const compingId = pickFrom(rhythmGCM.chords.compingPatterns, seed);
  if (compingId) next = applyComping(next, compingId);

  // 3. Bass (from rhythm-section source).
  const contourId = pickFrom(rhythmGCM.bass.bassContours, seed);
  const rhythmId = pickFrom(rhythmGCM.bass.bassRhythms, seed);
  if (contourId && rhythmId) {
    next = applyBass(next, contourId, rhythmId);
  }

  // 4. Drums (from rhythm-section source).
  const drumGenre = curriculumToDrumGenre(rhythmGenre);
  next = applyDrums(next, { genreName: drumGenre });

  // 5. Melody (from primary, with vibe-aware contour direction filter).
  const melodyConfig = buildMelodyConfig(primaryGCM, parsed.vibes);
  next = applyMelody(next, melodyConfig, { seed });

  return { doc: next, parsed };
}

// ── Internals ────────────────────────────────────────────────────────────────

function pickFrom<T>(pool: T[] | undefined, seed: number): T | undefined {
  if (!pool || pool.length === 0) return undefined;
  const idx = ((seed % pool.length) + pool.length) % pool.length;
  return pool[idx];
}

function levelToNumber(level: CurriculumLevelId): number {
  return parseInt(level.slice(1), 10);
}

function curriculumToDrumGenre(id: CurriculumGenreId): GenreName {
  return CURRICULUM_TO_ENGINE_GENRE[id];
}

function buildMelodyConfig(
  entry: GenreCurriculumEntry,
  vibes: VibeTag[],
): MelodyConfig {
  const bars = Array.isArray(entry.melody.phraseRhythmBars)
    ? entry.melody.phraseRhythmBars[0]
    : entry.melody.phraseRhythmBars;
  const safeBars: 1 | 2 = bars === 2 ? 2 : 1;

  const directions = vibesToMelodyDirections(vibes);

  return {
    scale: entry.melody.scale.intervals,
    contourNotes: entry.melody.contourNotes,
    contourTiers: entry.melody.contourTiers,
    zeroPoint: entry.melody.zeroPointOptions[0] ?? 0,
    phraseRhythmGenre: entry.melody.phraseRhythmGenre,
    phraseRhythmBars: safeBars,
    directionFilter: directions.length > 0 ? directions : undefined,
  };
}

/**
 * Map of vibe tag → preferred melody-contour directions.
 *
 * This is a curated heuristic mapping mood to motion: "dark" tunes tend to
 * descend, "happy" tunes ascend, "hypnotic" stays put, "sophisticated"
 * weaves around. Drawn from the same intuitions the curriculum's
 * teachingContext fields express verbally.
 */
const VIBE_DIRECTIONS: Record<VibeTag, string[]> = {
  cool: ['static', 'mixed'],
  sexy: ['mixed', 'descending'],
  intriguing: ['mixed'],
  dark: ['descending'],
  emotional: ['mixed', 'descending'],
  sophisticated: ['mixed'],
  fun: ['ascending', 'mixed'],
  happy: ['ascending'],
  melancholic: ['descending'],
  aggressive: ['ascending'],
  dreamy: ['static', 'mixed'],
  hypnotic: ['static'],
  triumphant: ['ascending'],
  spiritual: ['static', 'ascending'],
  rebellious: ['ascending'],
  romantic: ['mixed'],
};

/**
 * Union the preferred directions for every parsed vibe.
 * Returns an empty array if no vibes were parsed (caller treats that as
 * "no filter, use the full contour pool").
 */
function vibesToMelodyDirections(vibes: VibeTag[]): string[] {
  const set = new Set<string>();
  for (const v of vibes) {
    const dirs = VIBE_DIRECTIONS[v];
    if (dirs) for (const d of dirs) set.add(d);
  }
  return [...set];
}

/**
 * Map each parsed vibe to a fixed integer offset and sum them. This is a
 * v1 simplification: vibes are recognized but only affect which pattern
 * gets picked from the GCM-listed pools, not the musical content itself.
 * The mapping is alphabetical + 1 so two different vibe combinations are
 * very likely to pick different patterns.
 */
function vibeSeedOffset(vibes: string[]): number {
  let offset = 0;
  for (const v of vibes) {
    let sum = 0;
    for (let i = 0; i < v.length; i++) sum += v.charCodeAt(i);
    offset += sum;
  }
  return offset;
}
