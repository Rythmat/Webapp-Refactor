/**
 * flowKey.ts — The key, mode and scales an activity flow is written in.
 *
 * A flow states its key as prose (`defaultKey: 'A minor (Dorian)'`) and names
 * its scale with an id that isn't always one of Prism's seven modes
 * (`defaultScaleId: 'minor_blues'`). The lesson container and the Practice
 * Track both need the same answers out of those two fields — the tonic, the
 * mode to colour and spell in, a human-readable scale name — so the parsing
 * lives here instead of being written twice and drifting.
 */

import { ALL_MODES } from '@prism/engine';
import {
  guitarScaleEntry,
  isGuitarScaleKey,
} from '../data/guitar/theoryCatalog';
import {
  spellScale,
  buildSpellingMap,
} from '../engine/genreGeneration/enharmonicEngine';
import type { ActivityFlowV2 } from '../types/activity.v2';

// ── Key ──────────────────────────────────────────────────────────────────────

/** Note letter → MIDI note in the octave above middle C. */
const KEY_MAP: Record<string, number> = {
  C: 60,
  'C#': 61,
  Db: 61,
  D: 62,
  'D#': 63,
  Eb: 63,
  E: 64,
  F: 65,
  'F#': 66,
  Gb: 66,
  G: 67,
  'G#': 68,
  Ab: 68,
  A: 69,
  'A#': 70,
  Bb: 70,
  B: 71,
};

/** A bare note letter ('Bb', 'F#') → its MIDI note; middle C for anything else. */
export function parseKeyRoot(keyName: string): number {
  return KEY_MAP[keyName] ?? 60;
}

/**
 * The note letter a flow is in: the first word of `defaultKey`, which is always
 * the tonic ('A minor (Dorian)' → 'A').
 */
export function flowKeyLabel(flow: ActivityFlowV2): string {
  return flow.params.defaultKey.split(' ')[0];
}

/** The flow's tonic as a MIDI note in the octave above middle C. */
export function flowKeyRoot(flow: ActivityFlowV2): number {
  return parseKeyRoot(flowKeyLabel(flow));
}

// ── Mode ─────────────────────────────────────────────────────────────────────

/**
 * Scale id → the Prism mode that colours and spells it. A pentatonic or blues
 * scale has no mode of its own, so it borrows its parent's: everything built on
 * a minor third takes Dorian, everything on a major third takes Ionian. Chord
 * colours and note spelling both read this, so a scale missing from the map
 * would silently colour Ionian.
 */
const SCALE_TO_MODE: Record<string, string> = {
  ionian: 'ionian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'aeolian',
  locrian: 'locrian',
  major: 'ionian',
  minor: 'aeolian',
  major_pentatonic: 'ionian',
  minor_pentatonic: 'dorian',
  blues: 'dorian',
  minor_blues: 'dorian',
  major_blues: 'ionian',
  harmonic_minor: 'aeolian',
  melodic_minor: 'aeolian',
};

/** The Prism mode a scale id is coloured and spelled in. */
export function modeForScaleId(scaleId: string | undefined): string {
  const mode = SCALE_TO_MODE[scaleId ?? ''];
  if (mode) return mode;
  // The rest of Theory on guitar: its nearest diatonic mode.
  return isGuitarScaleKey(scaleId)
    ? guitarScaleEntry(scaleId).colourMode
    : 'dorian';
}

/** The Prism mode this flow is coloured and spelled in. */
export function flowMode(flow: ActivityFlowV2): string {
  return modeForScaleId(flow.params.defaultScaleId);
}

// ── Scale names ──────────────────────────────────────────────────────────────

/** Scale ids whose title isn't just their id title-cased. */
const SCALE_TITLES: Record<string, string> = {
  minor_blues: 'Minor Blues',
  major_blues: 'Major Blues',
  minor_pentatonic: 'Minor Pentatonic',
  major_pentatonic: 'Major Pentatonic',
  harmonic_minor: 'Harmonic Minor',
  melodic_minor: 'Melodic Minor',
};

/** A scale id as a student reads it: 'minor_blues' → 'Minor Blues'. */
export function scaleTitle(scaleId: string): string {
  return (
    SCALE_TITLES[scaleId] ??
    (isGuitarScaleKey(scaleId) ? guitarScaleEntry(scaleId).title : null) ??
    scaleId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

/**
 * Every note of a scale, spelled in the key the flow is written in: A Dorian is
 * A B C D E F♯ G, and A minor blues is A C D E♭ E G — the ♭5 flat, as the
 * lesson itself writes it ("Play it going up: A-C-D-Eb-E-G").
 *
 * A seven-note scale is spelled from itself, because `spellScale` then gives
 * every degree its own letter and no letter repeats. A pentatonic or blues
 * scale skips letters by definition, so `spellScale` refuses it and the notes
 * are read out of the *mode's* twelve-note spelling instead. That mode is the
 * one to ask: spelling A minor blues from A alone lands in A major's chromatic
 * row, which writes the ♭5 as D♯, whereas A Dorian's row — the key the music is
 * actually in — writes the E♭ the lesson teaches.
 */
export function spellScaleNames(
  rootLabel: string,
  intervals: readonly number[],
  mode: string,
): string[] {
  const heptatonic = spellScale(rootLabel, [...intervals]);
  if (heptatonic) return heptatonic;

  const spelling = buildSpellingMap(rootLabel, [
    ...(ALL_MODES[mode] ?? ALL_MODES.dorian),
  ]);
  const rootPc = (((KEY_MAP[rootLabel] ?? 60) % 12) + 12) % 12;
  return intervals.map(
    (step) => spelling.get((rootPc + step) % 12) ?? rootLabel,
  );
}
