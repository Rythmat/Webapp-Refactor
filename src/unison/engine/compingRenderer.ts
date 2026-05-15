/**
 * Phase 4 — Comping renderer.
 *
 * Turns a `UnisonChordRegion[]` into note events that play each chord using
 * a rhythmic comping pattern from the 183-entry Music Atlas Comping Pattern
 * Library. The library's `computerArray` encodes one bar of hits as
 * `[startTick, durationTicks]` pairs at PPQ=480 / 1920 ticks per bar; this
 * renderer tiles that pattern across each chord region's duration.
 *
 * Voicing source per chord:
 *   - `region.voicingNotes` if Phase 4 voicing rendering has already run
 *   - otherwise the chord quality's root-position pitches placed at C4
 *
 * If a chord's quality is unknown to the chord-quality library and no
 * voicing was applied, the region contributes no events (caller can still
 * render it via `unisonToMidi` for melody/MIDI passthrough).
 */

import {
  CHORD_QUALITY_LIBRARY,
  type ChordQualityEntry,
} from '@/curriculum/data/chordQualityLibrary';
import {
  COMPING_PATTERNS,
  getCompingPattern,
  type CompingPatternEntry,
} from '@/curriculum/data/compingPatterns';
import type {
  UnisonChordRegion,
  UnisonDocument,
  UnisonNoteEvent,
  UnisonTrack,
} from '../types/schema';

// ── Public API ────────────────────────────────────────────────────────────────

export interface RenderCompingOptions {
  /** MIDI velocity for emitted notes. Defaults to 100. */
  velocity?: number;
  /** MIDI channel for emitted notes. Defaults to 1. */
  channel?: number;
  /**
   * Centre MIDI value for the default voicing (used when a region has no
   * `voicingNotes`). The chord's root-position pitches are octave-shifted
   * so that the lowest pitch falls in [baseOctaveMidi, baseOctaveMidi + 11].
   * Defaults to 60 (C4).
   */
  baseOctaveMidi?: number;
}

/**
 * Render comping events for a chord timeline.
 *
 * Returns events in ascending startTick order.
 */
export function renderComping(
  timeline: UnisonChordRegion[],
  patternId: string,
  options?: RenderCompingOptions,
): UnisonNoteEvent[] {
  const pattern = getCompingPattern(patternId);
  if (!pattern) return [];

  const events: UnisonNoteEvent[] = [];
  for (const region of timeline) {
    const voicing = resolveVoicing(region, options?.baseOctaveMidi ?? 60);
    if (voicing.length === 0) continue;
    emitPatternForRegion(pattern, region, voicing, events, options);
  }

  events.sort((a, b) => a.startTick - b.startTick);
  return events;
}

/**
 * Apply comping to a UnisonDocument by appending a chords track of the
 * rendered events. Returns a new document (input is not mutated).
 *
 * The new track is given role='chords' and id `unison-comping-{patternId}`.
 */
export function applyComping(
  doc: UnisonDocument,
  patternId: string,
  options?: RenderCompingOptions,
): UnisonDocument {
  const events = renderComping(doc.analysis.chordTimeline, patternId, options);

  const compTrack: UnisonTrack = {
    id: `unison-comping-${patternId}`,
    name: `Comping (${patternId})`,
    channel: options?.channel ?? 1,
    role: 'chords',
    events,
    ccEvents: [],
  };

  return {
    ...doc,
    tracks: [...doc.tracks, compTrack],
  };
}

/**
 * List all comping pattern IDs whose `genreUse` mentions the given genre
 * (case-insensitive substring match — matches the existing
 * getCompingPatternsForGenre helper's contract).
 */
export function listCompingPatternsForGenre(
  genre: string,
): CompingPatternEntry[] {
  const needle = genre.toLowerCase();
  return COMPING_PATTERNS.filter((p) =>
    p.genreUse.toLowerCase().includes(needle),
  );
}

// ── Internals ─────────────────────────────────────────────────────────────────

/** Pattern bar length in ticks at the comping library's authoring PPQ. */
const PATTERN_BAR_TICKS = 1920;

function emitPatternForRegion(
  pattern: CompingPatternEntry,
  region: UnisonChordRegion,
  voicing: number[],
  out: UnisonNoteEvent[],
  options?: RenderCompingOptions,
): void {
  const velocity = options?.velocity ?? 100;
  const channel = options?.channel ?? 1;
  const patternSpanTicks = pattern.bars * PATTERN_BAR_TICKS;
  const regionDuration = region.endTick - region.startTick;
  if (regionDuration <= 0) return;

  const loops = Math.ceil(regionDuration / patternSpanTicks);

  for (let loop = 0; loop < loops; loop++) {
    const loopOffset = loop * patternSpanTicks;
    for (const [startInPattern, durInPattern] of pattern.computerArray) {
      const startTick = region.startTick + loopOffset + startInPattern;
      if (startTick >= region.endTick) continue;
      const maxDur = region.endTick - startTick;
      const durationTicks = Math.min(durInPattern, maxDur);
      if (durationTicks <= 0) continue;

      for (const pitch of voicing) {
        out.push({
          pitch,
          velocity,
          startTick,
          durationTicks,
          channel,
        });
      }
    }
  }
}

function resolveVoicing(
  region: UnisonChordRegion,
  baseOctaveMidi: number,
): number[] {
  if (region.voicingNotes && region.voicingNotes.length > 0) {
    return region.voicingNotes;
  }
  return defaultRootPositionVoicing(
    region.rootPc,
    region.quality,
    baseOctaveMidi,
  );
}

const QUALITY_BY_ENGINE_EQUIVALENT: Record<string, ChordQualityEntry> = {};
for (const q of CHORD_QUALITY_LIBRARY) {
  if (q.engineEquivalent && !QUALITY_BY_ENGINE_EQUIVALENT[q.engineEquivalent]) {
    QUALITY_BY_ENGINE_EQUIVALENT[q.engineEquivalent] = q;
  }
}

function defaultRootPositionVoicing(
  rootPc: number,
  engineQuality: string,
  baseOctaveMidi: number,
): number[] {
  const quality = QUALITY_BY_ENGINE_EQUIVALENT[engineQuality];
  if (!quality) return [];

  let pitches = quality.rootPosition.map((s) => s + rootPc + baseOctaveMidi);
  while (Math.min(...pitches) < baseOctaveMidi) {
    pitches = pitches.map((p) => p + 12);
  }
  while (Math.min(...pitches) > baseOctaveMidi + 11) {
    pitches = pitches.map((p) => p - 12);
  }
  return pitches;
}
