import {
  buildSpellingMap,
  formatNoteName,
  noteNameToPitchClass,
  spellMidi,
  spellScale,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';
import { DOUBLE_HARMONIC_MODES } from './doubleHarmonicContent';
import { HARMONIC_MAJOR_MODES } from './harmonicMajorContent';
import { HARMONIC_MINOR_MODES } from './harmonicMinorContent';
import { MELODIC_MINOR_MODES } from './melodicMinorContent';
import type { ScaleFamilyMode } from './modeHelpers';

// All spelling decisions live in enharmonicEngine. The curated family tables
// below are only a fallback for mode slugs whose steps aren't known locally.

// Normalize key roots so Unicode ♭/♯ and enharmonic equivalents all match
// the canonical spellings used by CHROMATIC_KEYS in ModeOverview.
const ENHARMONIC_TO_CANONICAL: Record<string, string> = {
  'C#': 'Db',
  'G#': 'Ab',
  'D#': 'Eb',
  'A#': 'Bb',
  Gb: 'F#',
};

function normalizeKey(key: string): string {
  const ascii = formatNoteName(key, 'ascii');
  return ENHARMONIC_TO_CANONICAL[ascii] ?? ascii;
}

const ALL_FAMILIES: ScaleFamilyMode[][] = [
  HARMONIC_MINOR_MODES,
  MELODIC_MINOR_MODES,
  HARMONIC_MAJOR_MODES,
  DOUBLE_HARMONIC_MODES,
];

// Build a fast lookup map: modeSlug → Map<rootKey, notes>
const SLUG_MAP = new Map<string, Map<string, string[]>>();

for (const family of ALL_FAMILIES) {
  for (const mode of family) {
    const keyMap = new Map<string, string[]>();
    for (const entry of mode.keys) {
      keyMap.set(normalizeKey(entry.root), entry.notes);
    }
    SLUG_MAP.set(mode.modeSlug, keyMap);
  }
}

/**
 * The enharmonic-correct note spelling for a mode + root key, e.g.
 * ('ionian', 'B♭') → ['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A'].
 * Returns undefined if no data is available for this combination.
 */
export function getNoteSpelling(
  modeSlug: string,
  rootKey: string,
): string[] | undefined {
  const steps = getLocalModeSteps(modeSlug);
  const spelled = steps ? spellScale(rootKey, steps) : null;
  if (spelled) return spelled;

  return SLUG_MAP.get(modeSlug)
    ?.get(normalizeKey(rootKey))
    ?.map((name) => formatNoteName(name));
}

/**
 * Pitch-class → note-name map covering all twelve pitch classes: scale tones
 * spelled for the mode, everything else from the engine's key table.
 * `scaleMidis` supplies the steps when the mode isn't known locally.
 */
export function buildPitchClassSpellingMap(
  modeSlug: string,
  rootKey: string,
  scaleMidis: number[],
): Map<number, string> {
  const steps =
    getLocalModeSteps(modeSlug) ??
    scaleMidis.map((midi) => midi - (scaleMidis[0] ?? 0));
  const map = buildSpellingMap(rootKey, steps);

  if (!spellScale(rootKey, steps)) {
    getNoteSpelling(modeSlug, rootKey)?.forEach((name) => {
      const pitchClass = noteNameToPitchClass(name);
      if (pitchClass !== null) map.set(pitchClass, name);
    });
  }
  return map;
}

/** MIDI number → spelled note name + octave (e.g. "B♭4") using the map above. */
export function spelledMidiNoteName(
  midi: number,
  pcMap: Map<number, string>,
): string {
  return spellMidi(midi, pcMap);
}
