/**
 * Phase 4 — Voicing renderer.
 *
 * Renders a UnisonChordRegion into concrete MIDI pitches using the
 * Music Atlas Genre Voicing Taxonomy + Voicing Algorithm Library +
 * Chord Quality Library.
 *
 * The pipeline per chord:
 *   1. Map the engine quality ("major7") -> qualityId ("maj7") via
 *      CHORD_QUALITY_LIBRARY.engineEquivalent.
 *   2. Look up a taxonomy entry for (genre, level, qualityId), preferring
 *      lower tier values (tier 1 = most common / earliest taught).
 *   3. Compute the right-hand semitones from root:
 *        rhOverride if set on the taxonomy entry,
 *        else quality.rootPosition[i] + algorithm.displacements[i]
 *      The algorithm is looked up by (algorithmId, derived category) where
 *      the category comes from the quality (triad / seventh / ninth / etc.).
 *   4. Add rootPc + base octave to get absolute MIDI pitches, then
 *      octave-shift so the lowest RH note lands in C4..B4.
 *   5. Add a left-hand note per lhAssignment:
 *        'root_bass'      -> single root in the bass register
 *        'voicing_in_lh'  -> voicing transposed down an octave (RH empty)
 *        'none'           -> nothing
 *
 * If no taxonomy entry matches the chord at all, returns null. Callers can
 * still play the chord using the engine's plain root-position semitones.
 */

import {
  CHORD_QUALITY_LIBRARY,
  type ChordQualityEntry,
} from '@/curriculum/data/chordQualityLibrary';
import {
  GENRE_VOICING_TAXONOMY,
  type VoicingTaxonomyEntry,
} from '@/curriculum/data/genreVoicingTaxonomy';
import {
  VOICING_ALGORITHM_LIBRARY,
  type VoicingAlgorithmEntry,
} from '@/curriculum/data/voicingAlgorithmLibrary';
import type { UnisonChordRegion } from '../types/schema';

// ── Public API ────────────────────────────────────────────────────────────────

export interface VoicingRenderResult {
  rh: number[];
  lh: number[];
  /** All notes combined (rh + lh), sorted ascending — convenient for MIDI output. */
  notes: number[];
  taxonomy: VoicingTaxonomyEntry;
  voicingId: string;
}

export interface RenderVoicingOptions {
  /**
   * Centre MIDI for the lowest RH note. The renderer octave-shifts the
   * voicing so the lowest note lands in [baseOctaveMidi, baseOctaveMidi + 11].
   * Defaults to 60 (C4).
   */
  baseOctaveMidi?: number;
  /**
   * MIDI value for the LH root note. Defaults to 36 (C2).
   */
  bassOctaveMidi?: number;
}

/**
 * Render a single chord into MIDI pitches for a given (genre, level).
 * Returns null if no taxonomy entry covers the chord's quality.
 */
export function renderVoicing(
  rootPc: number,
  engineQuality: string,
  genre: string,
  level: number,
  options?: RenderVoicingOptions,
): VoicingRenderResult | null {
  const quality = findQualityByEngine(engineQuality);
  if (!quality) return null;

  const taxonomy = findTaxonomyEntry(genre, level, quality.id);
  if (!taxonomy) return null;

  return renderTaxonomyEntry(taxonomy, quality, rootPc, options);
}

export interface ApplyVoicingsOptions extends RenderVoicingOptions {
  /**
   * If true (default), when multiple taxonomy entries share the lowest
   * tier for a given (genre, level, qualityId) — i.e. inversion variants
   * the curriculum tags "Voice leading — choose closest inversion" — pick
   * the variant that minimises total semitone motion from the previous
   * chord's right-hand voicing. If false, always pick the first lowest-tier
   * entry (legacy behaviour).
   */
  voiceLeading?: boolean;
}

/**
 * Walk a chord timeline and attach voicingNotes / voicingId to each region
 * that the taxonomy can cover. Regions without a matching taxonomy entry
 * are left untouched.
 *
 * When `voiceLeading` is on (default), the picker considers every
 * lowest-tier candidate per chord and chooses the one whose right-hand
 * pitches are closest to the previous chord's right-hand pitches in a
 * greedy nearest-pair sense. This smooths the line through inversion
 * variants without needing the GCM to spell them out per progression.
 *
 * Returns a new array (does not mutate input).
 */
export function applyVoicingsToTimeline(
  timeline: UnisonChordRegion[],
  genre: string,
  level: number,
  options?: ApplyVoicingsOptions,
): UnisonChordRegion[] {
  const voiceLeading = options?.voiceLeading ?? true;
  const out: UnisonChordRegion[] = [];
  let previousRh: number[] | null = null;

  for (const region of timeline) {
    const quality = findQualityByEngine(region.quality);
    if (!quality) {
      out.push(region);
      previousRh = null;
      continue;
    }

    const candidates = findCandidateTaxonomyEntries(genre, level, quality.id);
    if (candidates.length === 0) {
      out.push(region);
      previousRh = null;
      continue;
    }

    const pick =
      voiceLeading && previousRh !== null && candidates.length > 1
        ? selectByVoiceLeading(
            candidates,
            quality,
            region.rootPc,
            previousRh,
            options,
          )
        : candidates[0];

    const result = renderTaxonomyEntry(pick, quality, region.rootPc, options);
    out.push({
      ...region,
      voicingNotes: result.notes,
      voicingId: result.voicingId,
    });
    previousRh = result.rh.length > 0 ? result.rh : result.notes;
  }

  return out;
}

/**
 * List available (genre, level) pairs in the taxonomy.
 * Useful for UI surfaces that need to populate genre/level pickers.
 */
export function listAvailableGenreLevels(): Array<{
  genre: string;
  level: number;
}> {
  const seen = new Set<string>();
  const out: Array<{ genre: string; level: number }> = [];
  for (const entry of GENRE_VOICING_TAXONOMY) {
    const key = `${entry.genre}:${entry.level}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ genre: entry.genre, level: entry.level });
  }
  return out;
}

// ── Lookups ───────────────────────────────────────────────────────────────────

const QUALITY_BY_ENGINE_EQUIVALENT: Record<string, ChordQualityEntry> = {};
for (const q of CHORD_QUALITY_LIBRARY) {
  if (q.engineEquivalent && !QUALITY_BY_ENGINE_EQUIVALENT[q.engineEquivalent]) {
    QUALITY_BY_ENGINE_EQUIVALENT[q.engineEquivalent] = q;
  }
}

function findQualityByEngine(engineQuality: string): ChordQualityEntry | null {
  return QUALITY_BY_ENGINE_EQUIVALENT[engineQuality] ?? null;
}

/**
 * Choose the best single taxonomy entry for a (genre, level, qualityId).
 *
 * If multiple entries match (e.g. pop L2 maj has root-pos AND inversions),
 * prefer the one with the lowest tier (tier 1 = most common), then the
 * earliest in the array. Callers wanting a different selection should
 * use the lower-level lookups directly.
 */
function findTaxonomyEntry(
  genre: string,
  level: number,
  qualityId: string,
): VoicingTaxonomyEntry | null {
  let best: VoicingTaxonomyEntry | null = null;
  for (const e of GENRE_VOICING_TAXONOMY) {
    if (e.genre !== genre || e.level !== level || e.qualityId !== qualityId)
      continue;
    if (!best || e.tier < best.tier) best = e;
  }
  return best;
}

/**
 * Return every taxonomy entry for (genre, level, qualityId) at the lowest
 * tier present. These are the candidates the voice-leading selector
 * evaluates — typically root-pos + inversion variants at L2+.
 */
function findCandidateTaxonomyEntries(
  genre: string,
  level: number,
  qualityId: string,
): VoicingTaxonomyEntry[] {
  let lowestTier = Infinity;
  const matches: VoicingTaxonomyEntry[] = [];
  for (const e of GENRE_VOICING_TAXONOMY) {
    if (e.genre !== genre || e.level !== level || e.qualityId !== qualityId)
      continue;
    if (e.tier < lowestTier) {
      lowestTier = e.tier;
      matches.length = 0;
      matches.push(e);
    } else if (e.tier === lowestTier) {
      matches.push(e);
    }
  }
  return matches;
}

/**
 * Pick the candidate whose right-hand voicing is closest to `previousRh`
 * in greedy nearest-pair semitone distance. Same metric the curriculum's
 * own teachingContext anticipates ("choose closest inversion").
 */
function selectByVoiceLeading(
  candidates: VoicingTaxonomyEntry[],
  quality: ChordQualityEntry,
  rootPc: number,
  previousRh: number[],
  options?: RenderVoicingOptions,
): VoicingTaxonomyEntry {
  let best = candidates[0];
  let bestCost = Infinity;
  for (const cand of candidates) {
    const rendered = renderTaxonomyEntry(cand, quality, rootPc, options);
    const rh = rendered.rh.length > 0 ? rendered.rh : rendered.notes;
    const cost = voicingMotionCost(previousRh, rh);
    if (cost < bestCost) {
      bestCost = cost;
      best = cand;
    }
  }
  return best;
}

/** Greedy nearest-pair semitone motion between two voicings. */
function voicingMotionCost(prev: number[], next: number[]): number {
  if (prev.length === 0 || next.length === 0) return Infinity;
  const used = new Set<number>();
  let total = 0;
  for (const p of prev) {
    let bestDist = Infinity;
    let bestIdx = -1;
    for (let i = 0; i < next.length; i++) {
      if (used.has(i)) continue;
      const d = Math.abs(next[i] - p);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      used.add(bestIdx);
      total += bestDist;
    } else {
      // More prev notes than next — penalise the excess at an octave cost.
      total += 12;
    }
  }
  return total;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderTaxonomyEntry(
  taxonomy: VoicingTaxonomyEntry,
  quality: ChordQualityEntry,
  rootPc: number,
  options?: RenderVoicingOptions,
): VoicingRenderResult {
  const baseOctaveMidi = options?.baseOctaveMidi ?? 60;
  const bassOctaveMidi = options?.bassOctaveMidi ?? 36;

  // Right-hand semitone offsets from chord root.
  const rhSemitones = taxonomy.rhOverride
    ? [...taxonomy.rhOverride]
    : computeAlgorithmSemitones(taxonomy.algorithmId, quality);

  const rhAbsolute = rhSemitones.map((s) => s + rootPc + baseOctaveMidi);
  const rhCentered = centreOnOctave(rhAbsolute, baseOctaveMidi);

  let rh: number[];
  let lh: number[];

  switch (taxonomy.lhAssignment) {
    case 'voicing_in_lh':
      // Voicing lives in the LH; RH stays empty so the caller can fill it
      // with melody / improvisation / etc.
      rh = [];
      lh = rhCentered.map((p) => p - 12);
      break;
    case 'root_bass':
      rh = rhCentered;
      lh = [rootPc + bassOctaveMidi];
      break;
    case 'none':
    default:
      rh = rhCentered;
      lh = [];
      break;
  }

  const notes = [...rh, ...lh].sort((a, b) => a - b);
  const voicingId = `${taxonomy.genre}:L${taxonomy.level}:${taxonomy.qualityId}:${taxonomy.algorithmId}`;

  return { rh, lh, notes, taxonomy, voicingId };
}

function computeAlgorithmSemitones(
  algorithmId: string,
  quality: ChordQualityEntry,
): number[] {
  const category = deriveAlgorithmCategory(quality);
  const algorithm =
    findAlgorithm(algorithmId, category) ??
    findAlgorithmByIdOnly(algorithmId, quality.noteCount);

  if (!algorithm) {
    // Last-resort fall back: plain root position.
    return [...quality.rootPosition];
  }

  // Align lengths defensively; the libraries are well-formed but be safe.
  const len = Math.min(
    quality.rootPosition.length,
    algorithm.displacements.length,
  );
  const result: number[] = [];
  for (let i = 0; i < len; i++) {
    result.push(quality.rootPosition[i] + algorithm.displacements[i]);
  }
  return result;
}

function findAlgorithm(
  id: string,
  category: string,
): VoicingAlgorithmEntry | null {
  for (const e of VOICING_ALGORITHM_LIBRARY) {
    if (e.id === id && e.category === category) return e;
  }
  return null;
}

function findAlgorithmByIdOnly(
  id: string,
  noteCount: number,
): VoicingAlgorithmEntry | null {
  // Prefer an entry whose noteCount matches the chord; otherwise first match.
  let fallback: VoicingAlgorithmEntry | null = null;
  for (const e of VOICING_ALGORITHM_LIBRARY) {
    if (e.id !== id) continue;
    if (e.noteCount === noteCount) return e;
    if (!fallback) fallback = e;
  }
  return fallback;
}

/**
 * Map a chord quality to its voicing-algorithm category. The chord-quality
 * categories ('triad', 'four_note', ...) don't line up 1:1 with the voicing
 * algorithm categories ('triad', 'seventh', 'seventh_sus4', ...); this
 * mapping uses both the category and the quality id to pick the right one.
 */
function deriveAlgorithmCategory(quality: ChordQualityEntry): string {
  const { category, id, noteCount } = quality;

  if (category === 'triad' || category === 'slash') return 'triad';

  if (category === 'four_note') {
    if (id === 'add2') return 'add2';
    if (id === 'add4') return 'add4';
    if (id.includes('sus4')) return 'seventh_sus4';
    if (id.includes('sus2')) return 'sus2';
    return 'seventh';
  }

  if (category === 'five_note') return 'ninth';
  if (category === 'six_note') return 'eleventh';
  if (category === 'seven_note') return 'thirteenth';

  if (category === 'altered') {
    if (noteCount === 5) return 'ninth';
    if (noteCount === 6) return 'eleventh';
    return 'thirteenth';
  }

  return 'triad';
}

/**
 * Octave-shift `pitches` so that min(pitches) is in [base, base + 11].
 */
function centreOnOctave(pitches: number[], base: number): number[] {
  if (pitches.length === 0) return pitches;
  let result = [...pitches];
  while (Math.min(...result) < base) {
    result = result.map((p) => p + 12);
  }
  while (Math.min(...result) > base + 11) {
    result = result.map((p) => p - 12);
  }
  return result;
}
