/**
 * Phase 4 — Bass renderer.
 *
 * Combines a Bass Contour (which scale degrees to play) with a Bass Rhythm
 * (when to play them) to produce a melodic bass line over a chord timeline.
 *
 * The two libraries that drive this live in
 *   src/curriculum/data/bassPatterns.ts
 *
 * Contour labels in `BASS_CONTOUR_PATTERNS[].contour`:
 *   'R'                       chord root
 *   '2','3','4','5','6','7'   scale degrees above the root, in the chord's
 *                             quality-derived mode (ionian / aeolian /
 *                             mixolydian / locrian — major fallback)
 *   '8','9'                   octave / 9th (root + 12 / +14 from the mode)
 *   '-1','-2','-3'            one/two/three diatonic steps below the root
 *                             in the same mode
 *   'P5'                      perfect 5th above root  (+7 semitones, mode-independent)
 *   'P5-'                     perfect 5th below root  (-5 semitones, mode-independent)
 *
 * Rhythm patterns are encoded the same way as comping patterns:
 *   `computerArray: [startTick, durationTicks][]`, PPQ=480, 1 bar = 1920 ticks.
 *
 * Contour + rhythm composition: if the contour has N pitches and a single
 * loop of the rhythm has H hits, the i-th hit (0-indexed across the whole
 * region, not just one rhythm loop) uses `contour[i % N]`. This loops the
 * pitch sequence smoothly through repeated rhythm bars.
 */

import {
  BASS_CONTOUR_PATTERNS,
  BASS_RHYTHM_PATTERNS,
  getBassContour,
  getBassRhythm,
  type BassContourEntry,
  type BassRhythmEntry,
} from '@/curriculum/data/bassPatterns';
import type {
  UnisonChordRegion,
  UnisonDocument,
  UnisonNoteEvent,
  UnisonTrack,
} from '../types/schema';

// ── Public API ────────────────────────────────────────────────────────────────

export interface RenderBassOptions {
  /** MIDI velocity for emitted notes. Defaults to 95. */
  velocity?: number;
  /** MIDI channel for emitted notes. Defaults to 2. */
  channel?: number;
  /**
   * Base MIDI value for the chord root in the bass register. Defaults to 36
   * (C2). Other contour pitches are offset from this anchor — e.g. 'P5' lands
   * at base + 7 (G2 for C), '8' at base + 12 (C3 for C).
   */
  baseMidi?: number;
}

/** Render a bass track of note events. */
export function renderBass(
  timeline: UnisonChordRegion[],
  contourId: string,
  rhythmId: string,
  options?: RenderBassOptions,
): UnisonNoteEvent[] {
  const contour = getBassContour(contourId);
  const rhythm = getBassRhythm(rhythmId);
  if (!contour || !rhythm || contour.contour.length === 0) return [];

  const events: UnisonNoteEvent[] = [];
  for (const region of timeline) {
    emitBassForRegion(contour, rhythm, region, events, options);
  }
  events.sort((a, b) => a.startTick - b.startTick);
  return events;
}

/**
 * Append a bass track of rendered events to a UnisonDocument.
 * Returns a new document — input is not mutated.
 */
export function applyBass(
  doc: UnisonDocument,
  contourId: string,
  rhythmId: string,
  options?: RenderBassOptions,
): UnisonDocument {
  const events = renderBass(
    doc.analysis.chordTimeline,
    contourId,
    rhythmId,
    options,
  );

  const bassTrack: UnisonTrack = {
    id: `unison-bass-${contourId}-${rhythmId}`,
    name: `Bass (${contourId} / ${rhythmId})`,
    channel: options?.channel ?? 2,
    role: 'bass',
    events,
    ccEvents: [],
  };

  return {
    ...doc,
    tracks: [...doc.tracks, bassTrack],
  };
}

/** Lookup helpers exposed for picker UIs. */
export function listBassContours(): BassContourEntry[] {
  return BASS_CONTOUR_PATTERNS;
}

export function listBassRhythmsForGenre(genre: string): BassRhythmEntry[] {
  const needle = genre.toLowerCase();
  return BASS_RHYTHM_PATTERNS.filter(
    (p) =>
      p.section.toLowerCase().includes(needle) ||
      p.genre.toLowerCase().includes(needle),
  );
}

// ── Internals ────────────────────────────────────────────────────────────────

const PATTERN_BAR_TICKS = 1920;

const SCALE_IONIAN = [0, 2, 4, 5, 7, 9, 11];
const SCALE_AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const SCALE_MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];
const SCALE_LOCRIAN = [0, 1, 3, 5, 6, 8, 10];

function emitBassForRegion(
  contour: BassContourEntry,
  rhythm: BassRhythmEntry,
  region: UnisonChordRegion,
  out: UnisonNoteEvent[],
  options?: RenderBassOptions,
): void {
  const velocity = options?.velocity ?? 95;
  const channel = options?.channel ?? 2;
  const baseMidi = options?.baseMidi ?? 36;

  const scale = scaleForQuality(region.quality);
  const pitches = contour.contour.map((label) =>
    contourLabelToMidi(label, region.rootPc, baseMidi, scale),
  );

  const patternSpanTicks = rhythm.bars * PATTERN_BAR_TICKS;
  const regionDuration = region.endTick - region.startTick;
  if (regionDuration <= 0) return;

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
      out.push({
        pitch,
        velocity,
        startTick,
        durationTicks,
        channel,
      });
      hitIdx++;
    }
  }
}

/**
 * Pick a scale by chord quality. Falls back to ionian for unknown qualities.
 */
function scaleForQuality(engineQuality: string): number[] {
  const q = engineQuality.toLowerCase();
  if (q.startsWith('diminished')) return SCALE_LOCRIAN;
  if (q.startsWith('minor')) return SCALE_AEOLIAN;
  if (q.startsWith('dominant')) return SCALE_MIXOLYDIAN;
  // major*, augmented, sus*, add*, slash chords, etc. → major fallback
  return SCALE_IONIAN;
}

/**
 * Convert a contour pitch label to an absolute MIDI pitch.
 *
 * `scale` is a 7-element ascending semitone array starting from the root
 * (e.g. ionian = [0,2,4,5,7,9,11]). Numeric labels '2'..'7' index into it;
 * '-1'..'-3' walk backwards from index 6 of the scale, transposed an octave
 * down so the result lands below the root.
 */
function contourLabelToMidi(
  label: string,
  rootPc: number,
  baseMidi: number,
  scale: number[],
): number {
  // Absolute (mode-independent) labels.
  if (label === 'R') return rootPc + baseMidi;
  if (label === '8') return rootPc + baseMidi + 12;
  if (label === '9') return rootPc + baseMidi + 12 + scale[1];
  if (label === 'P5') return rootPc + baseMidi + 7;
  if (label === 'P5-') return rootPc + baseMidi - 5;

  // Mode-dependent ascending degrees: '2' → scale[1], '3' → scale[2], …
  if (/^[2-7]$/.test(label)) {
    const degreeIdx = parseInt(label, 10) - 1;
    return rootPc + baseMidi + scale[degreeIdx];
  }

  // Mode-dependent descending degrees: '-1' is one diatonic step below R,
  // '-2' two steps below, '-3' three steps below.
  if (label === '-1') return rootPc + baseMidi + scale[6] - 12;
  if (label === '-2') return rootPc + baseMidi + scale[5] - 12;
  if (label === '-3') return rootPc + baseMidi + scale[4] - 12;

  // Unknown label — degrade gracefully to root.
  return rootPc + baseMidi;
}
