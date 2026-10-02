import { keyNoteName, keyNumberLabel } from '@/components/guitar/ScaleBox';
import type { DiagramInfoNote, FretBracket } from '@/components/guitar/types';
import { hybridLabel } from '@/curriculum/data/guitar/bookOne';
import {
  centerScaleName,
  centerScalePosition,
  chordName,
  chordRootPc,
  getGuitarCenter,
  getGuitarShape,
} from '@/curriculum/data/guitar/centers';
import {
  notesFor,
  stepPrefix,
  theoryString,
} from '@/curriculum/data/guitar/theoryNotes';
import type {
  GuitarCenter,
  GuitarCenterId,
  GuitarChordShape,
  GuitarScalePosition,
} from '@/curriculum/data/guitar/types';
import type {
  ActivityStepV2,
  ChordTarget,
} from '@/curriculum/types/activity.v2';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import {
  fretToMidi,
  fretWindow,
  shapePositions,
  type FretWindow,
} from '@/lib/guitar/fretboard';
import {
  chordToneLabel,
  spokenToneLabel,
  toneLabelText,
} from '@/lib/guitar/theory/chordTones';
import {
  pentatonicGhosts,
  stepSizes,
  suggestedFingers,
} from '@/lib/guitar/theory/scaleTheory';
import type {
  GuitarSubsectionPrefix,
  LabelMode,
} from '@/lib/guitar/theory/types';
import type { FingerNumber, FretPosition } from '@/lib/guitar/types';
import type { TabStepChip } from '../LearnTabView';
import type { MarkerLabeler, NoteGroup } from './fretboardMarkers';

// ── Guitar lesson visuals: what a step shows ───────────────────────────────
// The book material behind one guitar step, ready for the diagrams: its chord
// boxes in playing order, the scale position a scale or melody step plays
// in, and the fret window the fretboard draws. Built once per step from the
// step's ids and notes, so the neck never jumps while the step runs.

export interface GuitarVisualChord {
  shapeId: string;
  shape: GuitarChordShape;
  /** 'B♭ major 7', as the book captions it. */
  name: string;
  /** Hybrid Number System label, e.g. '2 min7'. */
  hybridLabel: string;
  rootPc: number;
  /** Where the shape's strings sound, for the fretboard. */
  positions: FretPosition[];
}

export interface GuitarVisualScale {
  /** 'C Major Scale', 'F♯ Major Pentatonic Scale', 'D Dorian Scale'. */
  name: string;
  position: GuitarScalePosition;
  /** One finger per fret, per note of `position.playOrder` (null: open or out of reach). */
  fingers: (FingerNumber | null)[];
  /** Where finger 1 sits (the position label's fret). */
  anchor: number;
  /** Where the notes a pentatonic leaves out sit; empty on a 7-note scale. */
  ghosts: FretPosition[];
  /** The position's half steps on one string, bracketed with "Show steps". */
  halfSteps: FretBracket[];
}

/** Which label toggle a step offers: scale/melody steps or chord steps. */
export type GuitarLabelKind = 'scale' | 'chord';

export interface GuitarVisualModel {
  tonicPc: number;
  /** One box per chord the step names, in order; empty on scale steps. */
  chords: GuitarVisualChord[];
  /** For each of step.chordTargets, the index of its box in `chords`. */
  chordIndexOfTarget: number[];
  scale: GuitarVisualScale | null;
  /** Fixed for the whole step: every note and diagram position fits. */
  window: FretWindow;
  /** The step's subsection ('A1', 'B7' …), from its activity number. */
  prefix: GuitarSubsectionPrefix | null;
  /** Which label toggle the step offers; null on a step with neither. */
  labelKind: GuitarLabelKind | null;
  /** An arpeggio step (B1, B5, B7): chord tones can annotate its TAB. */
  isArpeggio: boolean;
  /** A1, A4 or A5: the scale box joins its two tonics with an 'octave' hairline. */
  showOctave: boolean;
  /** A1: whole and half steps can be shown (TAB chips, fretboard brackets). */
  hasSteps: boolean;
  /** (i) popover notes for the scale box ('What is Ionian?' on A1). */
  scaleAbout: DiagramInfoNote[];
}

const ARPEGGIO_PREFIXES: ReadonlySet<GuitarSubsectionPrefix> = new Set([
  'B1',
  'B5',
  'B7',
]);

/** 'A1.2: Major Scale Ascending (In Time)' → 'A1'. */
export function guitarStepPrefix(
  step: Pick<ActivityStepV2, 'activity'>,
): GuitarSubsectionPrefix | null {
  return stepPrefix(step.activity.split(':')[0].trim());
}

/** ASCII chord text for display: 'Bb minor 7(b5)' → 'B♭ minor 7(♭5)'. */
function display(text: string): string {
  return formatAccidentalsForDisplay(text).replace('(b5)', '(♭5)');
}

function visualChord(
  center: GuitarCenter,
  shapeId: string,
): GuitarVisualChord | null {
  const shape = getGuitarShape(shapeId);
  if (!shape) return null;
  return {
    shapeId,
    shape,
    name: display(chordName(center, shape.degree, shape.quality)),
    hybridLabel: display(hybridLabel(shape.degree, shape.quality)),
    rootPc: chordRootPc(center, shape.degree),
    positions: shapePositions(shape.frets),
  };
}

/**
 * Each chord target's box. A Music Map strums a bar's chord several times
 * and plays the map twice, but shows each bar once: a target belongs to the
 * next box, in order and wrapping, that has its shape, so repeats of one
 * shape in a row share a box.
 */
function boxForEachTarget(
  chords: readonly GuitarVisualChord[],
  targets: readonly ChordTarget[],
): number[] {
  let box = 0;
  return targets.map((target) => {
    for (let k = 0; k < chords.length; k++) {
      const i = (box + k) % chords.length;
      if (chords[i].shapeId === target.shapeId) {
        box = i;
        break;
      }
    }
    return box;
  });
}

/** Half steps between neighbouring notes of a position that stay on one string. */
function halfStepBrackets(position: GuitarScalePosition): FretBracket[] {
  return stepSizes(position.playOrder).flatMap(({ from, to, size }) =>
    size === 'H' && from.string === to.string
      ? [
          {
            string: from.string,
            fromFret: from.fret,
            toFret: to.fret,
            label: 'H',
            spoken: 'half step',
          },
        ]
      : [],
  );
}

export function guitarVisualModel(
  step: ActivityStepV2,
  keyCenter: GuitarCenterId,
): GuitarVisualModel {
  const center = getGuitarCenter(keyCenter);
  const prefix = guitarStepPrefix(step);
  const chords = (step.guitar?.shapeIds ?? []).flatMap(
    (id) => visualChord(center, id) ?? [],
  );
  const scalePosition = step.guitar?.scalePosition;
  let scale: GuitarVisualScale | null = null;
  if (scalePosition) {
    const position = centerScalePosition(center, scalePosition);
    const { anchor, fingers } = suggestedFingers(position);
    scale = {
      name: centerScaleName(center, scalePosition),
      position,
      fingers,
      anchor,
      ghosts:
        scalePosition === 'major' ? [] : pentatonicGhosts(center, position),
      halfSteps: halfStepBrackets(position),
    };
  }

  // The book position counts too: a melody plays a few notes of it, and the
  // fretboard draws all of it faintly.
  const positions = [
    ...(step.targetNotes ?? []).flatMap((note) => note.fretPosition ?? []),
    ...(scale?.position.playOrder ?? []),
    ...chords.flatMap((chord) => chord.positions),
  ];

  return {
    tonicPc: center.tonicPc,
    chords,
    chordIndexOfTarget: boxForEachTarget(chords, step.chordTargets ?? []),
    scale,
    window: fretWindow(positions),
    prefix,
    labelKind: scale ? 'scale' : chords.length > 0 ? 'chord' : null,
    isArpeggio: !!prefix && ARPEGGIO_PREFIXES.has(prefix) && chords.length > 0,
    showOctave:
      !!scale && (prefix === 'A1' || prefix === 'A4' || prefix === 'A5'),
    hasSteps: !!scale && prefix === 'A1',
    scaleAbout:
      scale && prefix
        ? notesFor(prefix, {
            center,
            settings: { accidentals: 'unicode' },
          }).popover.map(({ id, title, body }) => ({ id, title, body }))
        : [],
  };
}

/**
 * The chord target sounding at a roll tick: the last one started by then
 * (chord ticks + countInOffset = roll ticks), or the first before any has.
 */
export function chordTargetAt(
  targets: readonly ChordTarget[],
  tick: number,
  countInOffset: number,
): number {
  let at = 0;
  targets.forEach((target, i) => {
    if (target.onsetTick + countInOffset <= tick) at = i;
  });
  return at;
}

// ── Labels ─────────────────────────────────────────────────────────────────

const spotKey = (p: FretPosition) => `${p.string}:${p.fret}`;

/**
 * What the fretboard's markers say in a label mode, in place of note names
 * (undefined for 'notes', the markers' own labels):
 * - fingers: the book fingering of the group's chord shape, or one finger
 *   per fret in the scale position; an open string or a spot outside the
 *   shape shows nothing, never a guess;
 * - key numbers: 1-7 from the key's tonic;
 * - chord tones: R/3/♭3/5/♭5/7/♭7 from the group's chord (never '1').
 */
export function markerLabeler(
  model: GuitarVisualModel,
  mode: LabelMode,
): MarkerLabeler | undefined {
  if (mode === 'notes') return undefined;
  if (mode === 'keyNumbers') {
    return (_position, midi) => {
      const text = keyNumberLabel(midi, model.tonicPc);
      return { text, spoken: `key number ${text.replace('♭', 'flat ')}` };
    };
  }
  const chordOf = (group: NoteGroup | undefined) =>
    model.chords.find((c) => c.shapeId === group?.shapeId) ??
    (model.chords.length === 1 ? model.chords[0] : undefined);
  if (mode === 'chordTones') {
    return (_position, midi, group) => {
      const chord = chordOf(group);
      if (!chord) return undefined;
      const tone = chordToneLabel(midi, chord.rootPc, chord.shape.quality);
      return tone
        ? { text: toneLabelText(tone), spoken: spokenToneLabel(tone) }
        : { text: '' };
    };
  }
  // Fingers.
  const scaleFingers = new Map<string, FingerNumber>();
  model.scale?.position.playOrder.forEach((p, i) => {
    const finger = model.scale?.fingers[i];
    if (finger) scaleFingers.set(spotKey(p), finger);
  });
  return (position, _midi, group) => {
    const chord = chordOf(group);
    const finger = chord
      ? chord.shape.fingering.find(
          (f) => f.string === position.string && f.fret === position.fret,
        )?.finger
      : scaleFingers.get(spotKey(position));
    return finger
      ? { text: String(finger), spoken: `finger ${finger}` }
      : { text: '' };
  };
}

// ── TAB layers ─────────────────────────────────────────────────────────────

interface TabEvent {
  id: string;
  midi?: number;
  pitchName: string;
  startTicks: number;
  fretPosition?: FretPosition;
}

const eventMidi = (e: TabEvent) =>
  e.fretPosition ? fretToMidi(e.fretPosition) : e.midi;

/**
 * W / H chips between neighbouring single notes of a scale step, read as
 * 'C to D: whole step'. Chords, repeated notes and leaps get none.
 */
export function tabStepChips(
  events: readonly TabEvent[],
  tonicPc: number,
): TabStepChip[] {
  const byTick = new Map<number, TabEvent[]>();
  for (const e of events) {
    byTick.set(e.startTicks, [...(byTick.get(e.startTicks) ?? []), e]);
  }
  const line = [...byTick.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, notes]) => (notes.length === 1 ? notes[0] : null));
  const chips: TabStepChip[] = [];
  line.slice(1).forEach((to, i) => {
    const from = line[i];
    const a = from && eventMidi(from);
    const b = to && eventMidi(to);
    if (!from || !to || a == null || b == null) return;
    const gap = Math.abs(b - a);
    const size = gap === 2 ? 'W' : gap === 1 ? 'H' : null;
    if (!size) return;
    chips.push({
      fromId: from.id,
      toId: to.id,
      size,
      spoken: theoryString('aria.step', {
        interval: `${keyNoteName(a, tonicPc)} to ${keyNoteName(b, tonicPc)}`,
        stepWord: size === 'W' ? 'whole step' : 'half step',
      }),
    });
  });
  return chips;
}

/**
 * Each note's key number (1-7 from the key's tonic), keyed by event id: the
 * TAB's face of Key numbers mode on scale and melody steps.
 */
export function tabKeyNumberAnnotations(
  events: readonly TabEvent[],
  tonicPc: number,
): Map<string, string> {
  const annotations = new Map<string, string>();
  for (const e of events) {
    const midi = eventMidi(e);
    if (midi != null) annotations.set(e.id, keyNumberLabel(midi, tonicPc));
  }
  return annotations;
}

/**
 * Each arpeggio note's chord tone (R, 3, ♭7 …), keyed by event id, from the
 * chord target it sounds under.
 */
export function tabChordToneAnnotations(
  events: readonly TabEvent[],
  chordTargets: readonly ChordTarget[],
  countInOffset: number,
): Map<string, string> {
  const annotations = new Map<string, string>();
  if (chordTargets.length === 0) return annotations;
  for (const e of events) {
    const midi = eventMidi(e);
    const target =
      chordTargets[chordTargetAt(chordTargets, e.startTicks, countInOffset)];
    const quality = getGuitarShape(target.shapeId)?.quality;
    if (midi == null || !quality) continue;
    const tone = chordToneLabel(midi, target.rootPc, quality);
    if (tone) annotations.set(e.id, toneLabelText(tone));
  }
  return annotations;
}
