// ── Guitar key centers ────────────────────────────────────────────────────
// Every guitar lesson plays one key center in one mode: Book One's key
// center for Ionian ('C'), or a mode built on a Book One key ('D:dorian',
// data/guitar/modes). Lessons, steps and shape ids carry the center's id;
// everything that depends on the mode (chord roots and names, shape lookup,
// scale names, Roman numerals) is derived here from the resolved center, so
// nothing can fall back to major by accident.

import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import {
  GUITAR_ATLAS_BOOK_ONE,
  MAJOR_SCALE_STEPS,
  isGuitarKeyName,
  keyPitchClass,
  keyScaleSpelling,
  toBookKey,
} from './bookOne';
import {
  GUITAR_MODE_NAME,
  buildModeCenter,
  isGuitarModalMode,
  isGuitarMode,
} from './modes';
import type {
  BookChordQuality,
  GuitarCenter,
  GuitarCenterId,
  GuitarChordShape,
  GuitarKeyName,
  GuitarMode,
  GuitarPentatonic,
  GuitarScalePosition,
  GuitarScaleSlot,
  ScaleDegree,
} from './types';

// ── Ids ───────────────────────────────────────────────────────────────────

/** 'C' for C Ionian (Book One's own id), 'D:dorian' for a mode. */
export function centerId(key: GuitarKeyName, mode: GuitarMode): GuitarCenterId {
  return mode === 'ionian' ? key : `${key}:${mode}`;
}

/** The key and mode of a center id, or null for anything else. */
export function parseCenterId(
  id: string,
): { key: GuitarKeyName; mode: GuitarMode } | null {
  const [key, mode = 'ionian', ...rest] = id.split(':');
  if (rest.length > 0 || !isGuitarKeyName(key)) return null;
  if (mode === 'ionian' && id.includes(':')) return null;
  return isGuitarMode(mode) ? { key, mode } : null;
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
  return {
    ...book,
    id: key,
    mode: 'ionian',
    tonicPc: keyPitchClass(key),
    steps: MAJOR_SCALE_STEPS,
    spelling: keyScaleSpelling(key),
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
  const center = isGuitarModalMode(parsed.mode)
    ? buildModeCenter(parsed.key, parsed.mode)
    : bookCenter(parsed.key);
  CENTERS.set(id, center);
  return center;
}

/**
 * The center a guitar flow plays: its defaultKey's key ('F#', or another
 * spelling of a book key) in the mode its defaultScaleId names (Book One's
 * 'major' is Ionian).
 */
export function flowGuitarCenterId(
  flow: Pick<ActivityFlowV2, 'params'>,
): GuitarCenterId {
  const key = toBookKey(flow.params.defaultKey.split(' ')[0]) ?? 'C';
  const scaleId = flow.params.defaultScaleId;
  return centerId(key, isGuitarMode(scaleId) ? scaleId : 'ionian');
}

// ── Names ─────────────────────────────────────────────────────────────────

export function chordRootName(
  center: GuitarCenter,
  degree: ScaleDegree,
): string {
  return center.spelling[degree - 1];
}

export function chordRootPc(center: GuitarCenter, degree: ScaleDegree): number {
  return (center.tonicPc + center.steps[degree - 1]) % 12;
}

const QUALITY_WORDS: Readonly<Record<BookChordQuality, string>> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  maj7: 'major 7',
  min7: 'minor 7',
  dom7: 'dominant 7',
  min7b5: 'minor 7(b5)',
};

const QUALITY_SYMBOL: Readonly<Record<BookChordQuality, string>> = {
  maj: '',
  min: 'm',
  dim: 'dim',
  maj7: 'maj7',
  min7: 'm7',
  dom7: '7',
  min7b5: 'm7b5',
};

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

/** 'C major' (as lesson headers always said), 'D Dorian', 'F♯ Locrian'. */
export function centerTitle(center: GuitarCenter): string {
  return center.mode === 'ionian'
    ? `${center.displayName} major`
    : `${center.displayName} ${GUITAR_MODE_NAME[center.mode]}`;
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
    return `${center.displayName} ${GUITAR_MODE_NAME[center.mode]} Scale`;
  }
  const pentatonic = center.pentatonics[slot === 'pentatonic2' ? 1 : 0];
  return `${center.displayName} ${pentatonic?.name ?? 'Pentatonic'}`;
}

// ── The center's chords ───────────────────────────────────────────────────

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Semitones from degree `degree` up `skip` scale steps. */
function interval(center: GuitarCenter, degree: number, skip: number): number {
  const { steps } = center;
  return mod12(steps[(degree - 1 + skip) % 7] - steps[degree - 1]);
}

/** The triad built on each degree: Dorian is min min maj maj min dim maj. */
export function diatonicTriads(
  center: GuitarCenter,
): ('maj' | 'min' | 'dim')[] {
  return [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const third = interval(center, d, 2);
    const fifth = interval(center, d, 4);
    if (third === 4) return 'maj';
    return fifth === 6 ? 'dim' : 'min';
  });
}

/** The 7th chord built on each degree. */
export function diatonicSevenths(
  center: GuitarCenter,
): ('maj7' | 'min7' | 'dom7' | 'min7b5')[] {
  return diatonicTriads(center).map((triad, i) => {
    const seventh = interval(center, i + 1, 6);
    if (triad === 'dim') return 'min7b5';
    if (triad === 'min') return 'min7';
    return seventh === 11 ? 'maj7' : 'dom7';
  });
}

/** '♭', '♯' or '' : how a degree differs from the major scale's (♭3 in Dorian). */
export function degreeAccidental(
  center: GuitarCenter,
  degree: ScaleDegree,
): string {
  const diff = center.steps[degree - 1] - MAJOR_SCALE_STEPS[degree - 1];
  return diff < 0 ? '♭' : diff > 0 ? '♯' : '';
}

/** Each scale degree's label by its semitones above the tonic: 6 → '♭5' in Locrian. */
export function degreeLabelsBySemitone(
  center: GuitarCenter,
): ReadonlyMap<number, string> {
  return new Map(
    center.steps.map((step, i) => [
      step,
      `${degreeAccidental(center, (i + 1) as ScaleDegree)}${i + 1}`,
    ]),
  );
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
  if (kind === 'map') {
    const bar = center.musicMaps[Number(a) - 1]?.bars[Number(b) - 1];
    return bar ? { ...bar } : undefined;
  }
  return undefined;
}
