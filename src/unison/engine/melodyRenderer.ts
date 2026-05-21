/**
 * Phase 4 — Melody renderer.
 *
 * Generates a melodic line over a chord timeline by composing three
 * curriculum libraries:
 *
 *   - melodyContourLibrary  (690 entries) — scale-degree offset sequences
 *                            tagged by noteCount + tier
 *   - melodyPhraseRhythmLibrary (146 entries) — `[startTick, durationTicks][]`
 *                            patterns tagged by genre + noteCount + bars
 *   - a key-relative scale (e.g. major pentatonic [0, 2, 4, 7, 9])
 *
 * The renderer is generative, not selective: each chord region gets its own
 * phrase composed from one contour + one rhythm, deterministically seeded
 * by the region index so the same `(timeline, config)` always yields the
 * same melody (testable and reproducible across runs).
 *
 * Per-region pipeline:
 *   1. Pick a 1- or 2-bar phrase rhythm matching `phraseRhythmGenre` and
 *      a noteCount drawn from `contourNotes`. Filter is genre+bars+noteCount.
 *   2. Pick a contour with the same noteCount and a tier in `contourTiers`.
 *   3. Map each contour offset through the scale, anchored at `zeroPoint`.
 *      Out-of-range indices octave-wrap (idx -1 -> last degree minus an
 *      octave; idx +N where N > scale.length -> wraps with an octave up).
 *   4. Add `keyRootPc` and a base octave so the pitches sit in a vocal /
 *      lead range (defaults to C5 = 72).
 *   5. Tile the rhythm across the region's duration; each loop reuses the
 *      same contour pitches so the phrase repeats coherently. Notes whose
 *      startTick exceeds region.endTick are clipped.
 *
 * Regions are skipped (no events emitted) when no matching rhythm or
 * contour exists for the requested filters — typically because the
 * contourNotes / phraseRhythmGenre combination is too narrow.
 */

import {
  getContours,
  type MelodyContourEntry,
} from '@/curriculum/data/melodyContourLibrary';
import {
  getPhraseRhythms,
  type PhraseRhythmEntry,
} from '@/curriculum/data/melodyPhraseRhythmLibrary';
import { InstrumentChannel } from '@/daw/prism-engine/types';
import type {
  UnisonChordRegion,
  UnisonDocument,
  UnisonNoteEvent,
  UnisonTrack,
} from '../types/schema';

// ── Public API ────────────────────────────────────────────────────────────────

export interface MelodyConfig {
  /** Scale as semitone offsets from the key root, e.g. [0, 2, 4, 7, 9]. */
  scale: number[];
  /** Which contour note counts to pick from (e.g. [3] or [3, 4, 5]). */
  contourNotes: number[];
  /** Which contour tiers are allowed (e.g. [1, 2]). */
  contourTiers: number[];
  /** Scale-degree anchor for contour offset 0. Defaults to 0 (root). */
  zeroPoint?: number;
  /** Genre tag for phrase-rhythm lookup. */
  phraseRhythmGenre: string;
  /** Phrase rhythm length in bars. */
  phraseRhythmBars: 1 | 2;
  /**
   * If set and non-empty, restrict contour selection to entries whose
   * `direction` field is in this list (`'static' | 'ascending' |
   * 'descending' | 'mixed'`). Used by `arrangeForStyle` to map parsed
   * vibes to a musical mood: "dark" prefers descending, "happy" ascending,
   * "smooth / chill" prefers static and mixed, etc. Falls back to the
   * unfiltered candidate set if the filter would otherwise eliminate all
   * matches at the requested noteCount + tier.
   */
  directionFilter?: string[];
}

export interface RenderMelodyOptions {
  /** MIDI velocity for emitted notes. Defaults to 100. */
  velocity?: number;
  /** MIDI channel. Defaults to InstrumentChannel.Melody (4). */
  channel?: number;
  /**
   * Base MIDI value for scale degree 0. Defaults to 72 (C5) — typical lead
   * / vocal range above the chord voicings.
   */
  baseOctaveMidi?: number;
  /**
   * Selection seed. With a fixed seed and the same inputs, the renderer
   * picks identical contours and rhythms across runs (stable for tests).
   * Defaults to 0.
   */
  seed?: number;
}

/** Render a melody track of note events over a chord timeline. */
export function renderMelody(
  timeline: UnisonChordRegion[],
  keyRootPc: number,
  config: MelodyConfig,
  options?: RenderMelodyOptions,
): UnisonNoteEvent[] {
  if (timeline.length === 0) return [];

  const seed = options?.seed ?? 0;
  const events: UnisonNoteEvent[] = [];

  for (let regionIdx = 0; regionIdx < timeline.length; regionIdx++) {
    const region = timeline[regionIdx];
    emitMelodyForRegion(
      region,
      regionIdx,
      keyRootPc,
      config,
      seed,
      events,
      options,
    );
  }

  events.sort((a, b) => a.startTick - b.startTick);
  return events;
}

/** Append a melody track to a UnisonDocument. Input is not mutated. */
export function applyMelody(
  doc: UnisonDocument,
  config: MelodyConfig,
  options?: RenderMelodyOptions,
): UnisonDocument {
  const events = renderMelody(
    doc.analysis.chordTimeline,
    doc.analysis.key.rootPc,
    config,
    options,
  );

  const track: UnisonTrack = {
    id: `unison-melody-${config.phraseRhythmGenre}`,
    name: `Melody (${config.phraseRhythmGenre})`,
    channel: options?.channel ?? InstrumentChannel.Melody,
    role: 'melody',
    events,
    ccEvents: [],
  };

  return {
    ...doc,
    tracks: [...doc.tracks, track],
  };
}

// ── Internals ────────────────────────────────────────────────────────────────

const PATTERN_BAR_TICKS = 1920;

function emitMelodyForRegion(
  region: UnisonChordRegion,
  regionIdx: number,
  keyRootPc: number,
  config: MelodyConfig,
  seed: number,
  out: UnisonNoteEvent[],
  options?: RenderMelodyOptions,
): void {
  const regionDuration = region.endTick - region.startTick;
  if (regionDuration <= 0) return;

  const velocity = options?.velocity ?? 100;
  const channel = options?.channel ?? InstrumentChannel.Melody;
  const baseOctaveMidi = options?.baseOctaveMidi ?? 72;
  const zeroPoint = config.zeroPoint ?? 0;

  // Pick a phrase rhythm. Loop noteCount candidates until one yields a hit.
  const rhythm = pickRhythm(config, seed + regionIdx);
  if (!rhythm) return;

  const contour = pickContour(
    rhythm.noteCount,
    config.contourTiers,
    seed + regionIdx,
    config.directionFilter,
  );
  if (!contour) return;

  const pitches = contour.contour.map((degree) =>
    scaleDegreeToMidi(
      degree,
      zeroPoint,
      config.scale,
      keyRootPc,
      baseOctaveMidi,
    ),
  );

  const patternSpanTicks = rhythm.bars * PATTERN_BAR_TICKS;
  const loops = Math.ceil(regionDuration / patternSpanTicks);
  let hitIdx = 0;

  for (let loop = 0; loop < loops; loop++) {
    const loopOffset = loop * patternSpanTicks;
    for (const [startInPattern, durInPattern] of rhythm.computerArray) {
      const startTick = region.startTick + loopOffset + startInPattern;
      if (startTick >= region.endTick) {
        hitIdx++;
        continue;
      }
      const maxDur = region.endTick - startTick;
      const durationTicks = Math.min(durInPattern, maxDur);
      if (durationTicks <= 0) {
        hitIdx++;
        continue;
      }

      const pitch = pitches[hitIdx % pitches.length];
      out.push({ pitch, velocity, startTick, durationTicks, channel });
      hitIdx++;
    }
  }
}

/**
 * Pick the first available phrase rhythm matching the requested
 * (genre, noteCount, bars). `noteCount` is drawn from `config.contourNotes`
 * in order; the first one with at least one matching rhythm wins.
 */
function pickRhythm(
  config: MelodyConfig,
  seedOffset: number,
): PhraseRhythmEntry | null {
  for (const noteCount of config.contourNotes) {
    const candidates = getPhraseRhythms(
      config.phraseRhythmGenre,
      noteCount,
      config.phraseRhythmBars,
    );
    if (candidates.length === 0) continue;
    return candidates[seedOffset % candidates.length];
  }
  return null;
}

function pickContour(
  noteCount: number,
  tiers: number[],
  seedOffset: number,
  directionFilter?: string[],
): MelodyContourEntry | null {
  const all = getContours(noteCount, tiers);
  if (all.length === 0) return null;

  // Filter by direction when requested. If the filter eliminates all
  // candidates (e.g. "dark" requests descending but only ascending exists
  // at this tier), gracefully fall back to the unfiltered set rather than
  // skipping the region entirely.
  let pool = all;
  if (directionFilter && directionFilter.length > 0) {
    const filtered = all.filter((c) => directionFilter.includes(c.direction));
    if (filtered.length > 0) pool = filtered;
  }

  return pool[seedOffset % pool.length];
}

/**
 * Map a contour scale-degree offset to an absolute MIDI pitch.
 *
 * `degree` is the contour value (may be negative or larger than scale.length);
 * `zeroPoint` is the scale-index anchor; together they index a (degree, octave)
 * pair via floor-division modulo the scale length.
 */
function scaleDegreeToMidi(
  contourDegree: number,
  zeroPoint: number,
  scale: number[],
  keyRootPc: number,
  baseOctaveMidi: number,
): number {
  if (scale.length === 0) return keyRootPc + baseOctaveMidi;
  const n = scale.length;
  const totalDegree = zeroPoint + contourDegree;
  const octaveShift = Math.floor(totalDegree / n);
  const wrappedIdx = ((totalDegree % n) + n) % n;
  return keyRootPc + baseOctaveMidi + scale[wrappedIdx] + octaveShift * 12;
}
