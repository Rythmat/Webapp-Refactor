// ── Guitar key centers ────────────────────────────────────────────────────
// Every guitar lesson plays one key center in one scale: Book One's key
// center for Ionian ('C'), a mode built on a Book One key ('D:dorian',
// data/guitar/modes), or a scale from the rest of Theory ('E:phrygiandominant',
// 'A:minorblues', data/guitar/scales). Lessons, steps and shape ids carry the
// center's id; everything that depends on the scale (chord roots and names,
// shape lookup, scale names, Roman numerals) is derived here from the
// resolved center, so nothing can fall back to major by accident.

import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { classifyStack } from '@/lib/guitar/theory/chordQuality';
import {
  GUITAR_ATLAS_BOOK_ONE,
  MAJOR_SCALE_STEPS,
  isGuitarKeyName,
  keyPitchClass,
  keyScaleSpelling,
  toBookKey,
} from './bookOne';
import { accidentalFor, heptatonicDegreeLabels } from './degreeLabels';
import {
  GUITAR_MODE_NAME,
  buildModeCenter,
  isGuitarModalMode,
  isGuitarMode,
} from './modes';
import { buildExtendedCenter } from './scales';
import { guitarScaleEntry, isGuitarScaleKey } from './theoryCatalog';
import type {
  BookChordQuality,
  GuitarCenter,
  GuitarCenterId,
  GuitarChordShape,
  GuitarKeyName,
  GuitarPentatonic,
  GuitarScaleKey,
  GuitarScalePosition,
  GuitarScaleSlot,
  ScaleDegree,
} from './types';

// ── Ids ───────────────────────────────────────────────────────────────────

/** 'C' for C Ionian (Book One's own id), 'D:dorian' for a mode or scale. */
export function centerId(
  key: GuitarKeyName,
  mode: GuitarScaleKey,
): GuitarCenterId {
  return mode === 'ionian' ? key : `${key}:${mode}`;
}

/** The key and scale of a center id, or null for anything else. */
export function parseCenterId(
  id: string,
): { key: GuitarKeyName; mode: GuitarScaleKey } | null {
  const [key, mode = 'ionian', ...rest] = id.split(':');
  if (rest.length > 0 || !isGuitarKeyName(key)) return null;
  if (mode === 'ionian' && id.includes(':')) return null;
  return isGuitarScaleKey(mode) ? { key, mode } : null;
}

export function isGuitarCenterId(id: string): id is GuitarCenterId {
  return parseCenterId(id) !== null;
}

// ── Centers ───────────────────────────────────────────────────────────────

function bookCenter(key: GuitarKeyName): GuitarCenter {
  const book = GUITAR_ATLAS_BOOK_ONE[key];
  const pentatonic: GuitarPentatonic = {
    name: 'Major Pentatonic',
    degrees: [1, 2, 3, 5, 6],
    position: book.pentatonic,
    notes: book.pentatonicNotes,
  };
  const spelling = keyScaleSpelling(key);
  return {
    ...book,
    id: key,
    family: 'diatonic',
    mode: 'ionian',
    tonicPc: keyPitchClass(key),
    steps: MAJOR_SCALE_STEPS,
    spelling,
    degreeLabels: heptatonicDegreeLabels(MAJOR_SCALE_STEPS),
    chordSteps: MAJOR_SCALE_STEPS,
    chordSpelling: spelling,
    parentKey: key,
    parentDegree: 1,
    pentatonics: [pentatonic],
  };
}

const CENTERS = new Map<GuitarCenterId, GuitarCenter>();

/** The center an id names, built once and kept (stable for memo deps). */
export function getGuitarCenter(id: GuitarCenterId): GuitarCenter {
  const cached = CENTERS.get(id);
  if (cached) return cached;
  const parsed = parseCenterId(id);
  if (!parsed) throw new Error(`Unknown guitar key center "${id}"`);
  const center =
    parsed.mode === 'ionian'
      ? bookCenter(parsed.key)
      : isGuitarModalMode(parsed.mode)
        ? buildModeCenter(parsed.key, parsed.mode)
        : buildExtendedCenter(parsed.key, parsed.mode);
  CENTERS.set(id, center);
  return center;
}

/**
 * The center a guitar flow plays: its defaultKey's key ('F#', or another
 * spelling of a book key) in the mode its defaultScaleId names (Book One's
 * 'major' is Ionian). The rest of Theory's scales count only in a guitar
 * flow, so a piano flow can never name one by accident.
 */
export function flowGuitarCenterId(
  flow: Pick<ActivityFlowV2, 'params'>,
): GuitarCenterId {
  const key = toBookKey(flow.params.defaultKey.split(' ')[0]) ?? 'C';
  const scaleId = flow.params.defaultScaleId;
  if (isGuitarMode(scaleId)) return centerId(key, scaleId);
  if (flow.params.instrument === 'guitar' && isGuitarScaleKey(scaleId)) {
    return centerId(key, scaleId);
  }
  return centerId(key, 'ionian');
}

// ── Names ─────────────────────────────────────────────────────────────────

/** A chord degree's root, spelled: degrees count in the center's chord frame. */
export function chordRootName(
  center: GuitarCenter,
  degree: ScaleDegree,
): string {
  return center.chordSpelling[degree - 1];
}

export function chordRootPc(center: GuitarCenter, degree: ScaleDegree): number {
  return (center.tonicPc + center.chordSteps[degree - 1]) % 12;
}

const QUALITY_WORDS: Readonly<Record<BookChordQuality, string>> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  majb5: 'major(b5)',
  sus2b5: 'sus2(b5)',
  maj7: 'major 7',
  min7: 'minor 7',
  dom7: 'dominant 7',
  min7b5: 'minor 7(b5)',
  dim7: 'diminished 7',
  minMaj7: 'minor(major 7)',
  'maj7#5': 'major 7(#5)',
  dom7b5: 'dominant 7(b5)',
  min6: 'minor 6',
  sus2b5add6: 'sus2(b5) add 6',
};

const QUALITY_SYMBOL: Readonly<Record<BookChordQuality, string>> = {
  maj: '',
  min: 'm',
  dim: 'dim',
  aug: 'aug',
  majb5: 'maj(b5)',
  sus2b5: 'sus2(b5)',
  maj7: 'maj7',
  min7: 'm7',
  dom7: '7',
  min7b5: 'm7b5',
  dim7: 'dim7',
  // Parenthesised: the parser lowercases, and 'mM7' would read as m7.
  minMaj7: 'm(maj7)',
  'maj7#5': 'maj7#5',
  dom7b5: '7b5',
  min6: 'm6',
  sus2b5add6: 'sus2(b5)add6',
};

/** The quality in words, as the book captions it: 'minor 7(b5)'. */
export function qualityWords(quality: BookChordQuality): string {
  return QUALITY_WORDS[quality];
}

/** As the book captions it: 'B minor 7(b5)'. */
export function chordName(
  center: GuitarCenter,
  degree: ScaleDegree,
  quality: BookChordQuality,
): string {
  return `${chordRootName(center, degree)} ${QUALITY_WORDS[quality]}`;
}

/** A chord symbol the app's chord parser reads: 'Bm7b5', 'F#m', 'Gmaj7'. */
export function chordSymbol(
  center: GuitarCenter,
  degree: ScaleDegree,
  quality: BookChordQuality,
): string {
  return `${chordRootName(center, degree)}${QUALITY_SYMBOL[quality]}`;
}

/** 'Dorian', 'Phrygian Dominant', 'Minor Blues'. */
export function centerModeName(center: GuitarCenter): string {
  return center.family === 'diatonic'
    ? GUITAR_MODE_NAME[center.mode]
    : guitarScaleEntry(center.mode).name;
}

/** 'C major' (as lesson headers always said), 'D Dorian', 'E Phrygian Dominant'. */
export function centerTitle(center: GuitarCenter): string {
  return center.mode === 'ionian'
    ? `${center.displayName} major`
    : `${center.displayName} ${centerModeName(center)}`;
}

/** The scale diagram a step's slot names. */
export function centerScalePosition(
  center: GuitarCenter,
  slot: GuitarScaleSlot,
): GuitarScalePosition {
  if (slot === 'major') return center.majorScale;
  return (
    center.pentatonics[slot === 'pentatonic2' ? 1 : 0]?.position ??
    center.pentatonic
  );
}

/** 'C Major Scale', 'F♯ Major Pentatonic Scale', 'D Dorian Scale'. */
export function centerScaleName(
  center: GuitarCenter,
  slot: GuitarScaleSlot,
): string {
  if (center.mode === 'ionian') {
    return `${center.displayName} Major ${slot === 'major' ? 'Scale' : 'Pentatonic Scale'}`;
  }
  if (slot === 'major') {
    return `${center.displayName} ${centerModeName(center)} Scale`;
  }
  const pentatonic = center.pentatonics[slot === 'pentatonic2' ? 1 : 0];
  return `${center.displayName} ${pentatonic?.name ?? 'Pentatonic'}`;
}

// ── The center's chords ───────────────────────────────────────────────────

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Semitones from degree `degree` up `skip` steps of the chord frame. */
function interval(center: GuitarCenter, degree: number, skip: number): number {
  const steps = center.chordSteps;
  return mod12(steps[(degree - 1 + skip) % 7] - steps[degree - 1]);
}

const DEGREES = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * The triad built on each degree of the chord frame: Dorian is min min maj
 * maj min dim maj, harmonic minor min dim aug min maj maj dim.
 */
export function diatonicTriads(center: GuitarCenter): BookChordQuality[] {
  return DEGREES.map((d) =>
    classifyStack([interval(center, d, 2), interval(center, d, 4)]),
  );
}

/** The 7th chord (or a 6 chord in its place) built on each degree. */
export function diatonicSevenths(center: GuitarCenter): BookChordQuality[] {
  return DEGREES.map((d) =>
    classifyStack([
      interval(center, d, 2),
      interval(center, d, 4),
      interval(center, d, 6),
    ]),
  );
}

/** '♭', '♯', '𝄫' or '' : how a degree differs from the major scale's (♭3 in Dorian). */
export function degreeAccidental(
  center: GuitarCenter,
  degree: ScaleDegree,
): string {
  return accidentalFor(
    center.chordSteps[degree - 1] - MAJOR_SCALE_STEPS[degree - 1],
  );
}

/** Each scale note's degree label by its semitones above the tonic: 6 → '♭5' in Locrian. */
export function degreeLabelsBySemitone(
  center: GuitarCenter,
): ReadonlyMap<number, string> {
  return new Map(center.steps.map((step, i) => [step, center.degreeLabels[i]]));
}

// ── Shape ids ─────────────────────────────────────────────────────────────
// Stable ids a lesson step can carry: '<center>/triad/1', '<center>/seventh/8',
// '<center>/map/4/2' (example 4, bar 2). Book One's are 'C/triad/1' etc.

export function triadShapeId(center: GuitarCenter, index: number): string {
  return `${center.id}/triad/${index}`;
}

export function seventhShapeId(center: GuitarCenter, index: number): string {
  return `${center.id}/seventh/${index}`;
}

/** A pentatonic/blues center's progression chord. */
export function chordShapeId(center: GuitarCenter, index: number): string {
  return `${center.id}/chord/${index}`;
}

export function mapBarShapeId(
  center: GuitarCenter,
  example: number,
  bar: number,
): string {
  return `${center.id}/map/${example}/${bar}`;
}

/** The center a shape id belongs to, or undefined. */
export function centerOfShapeId(id: string): GuitarCenter | undefined {
  const centerPart = id.split('/')[0];
  return isGuitarCenterId(centerPart) ? getGuitarCenter(centerPart) : undefined;
}

export function getGuitarShape(id: string): GuitarChordShape | undefined {
  const [, kind, a, b] = id.split('/');
  const center = centerOfShapeId(id);
  if (!center) return undefined;
  if (kind === 'triad') return center.triads[Number(a) - 1];
  if (kind === 'seventh') return center.sevenths[Number(a) - 1];
  if (kind === 'chord') {
    return center.family === 'diatonic'
      ? undefined
      : center.chords[Number(a) - 1];
  }
  if (kind === 'map') {
    const bar = center.musicMaps[Number(a) - 1]?.bars[Number(b) - 1];
    return bar ? { ...bar } : undefined;
  }
  return undefined;
}
