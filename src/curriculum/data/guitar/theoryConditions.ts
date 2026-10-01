// ── Theory notes: conditions and tokens ────────────────────────────────────
// When each GUITAR_THEORY_NOTES entry applies, and the values its {tokens}
// take, for one key center and (optionally) one step, shape, map or change.
// Everything is derived from Book One data; note names are spelled in the
// key (ASCII accidentals; theoryNotes.ts can switch them to ♭ and ♯).

import { shapeNotes } from '@/lib/guitar/fretboard';
import {
  analyzeMusicMap,
  classifyVoicing,
  hiddenTriad,
  keyChange,
  octaveReturnKind,
  previousBookKey,
  relativeMinor,
  shapeTones,
  spellChordTones,
  suggestedFingers,
  toneLabelText,
  topLineRuns,
  type BookShape,
  type ChangeInfo,
  type ChordToneLabel,
  type ChordToneRole,
  type KeyChange,
  type MapPatternId,
  type MusicMapAnalysis,
  type TheoryNoteCondition,
  type VoicingInfo,
} from '@/lib/guitar/theory';
import type { ActivityFlowV2 } from '../../types/activity.v2';
import {
  GUITAR_KEY_ORDER,
  chordName,
  chordRootName,
  chordRootPc,
  chordSymbol,
  getGuitarShape,
  keyScaleSpelling,
} from './bookOne';
import type {
  GuitarKeyCenter,
  GuitarMusicMap,
  GuitarScalePosition,
} from './types';

// ── Context ────────────────────────────────────────────────────────────────

/** What the theory layer needs from a lesson step. */
export interface TheoryStep {
  /** The activity number: 'A1.2', 'B7.5', 'D3.4'. */
  id: string;
  /** Played to a tempo rather than at the student's own pace. */
  inTime: boolean;
  articulation: 'staccato' | 'legato' | null;
  scalePosition: 'major' | 'pentatonic' | null;
  /** Book shape ids the step plays, in order ('C/triad/1', 'C/map/4/2'). */
  shapeIds: readonly string[];
  mapExample: 1 | 2 | 3 | 4 | 5 | null;
}

/** The guitar flow's steps, in order, as the theory layer reads them. */
export function theoryStepsFor(flow: ActivityFlowV2): TheoryStep[] {
  return flow.sections
    .flatMap((section) => section.steps)
    .map((step) => {
      const suffix = step.tag.split(' | ')[0];
      return {
        id: step.activity.split(':')[0].trim(),
        inTime: step.assessment !== 'pitch_only',
        articulation: suffix.endsWith('_staccato')
          ? 'staccato'
          : suffix.endsWith('_legato')
            ? 'legato'
            : null,
        scalePosition: step.guitar?.scalePosition ?? null,
        shapeIds: step.guitar?.shapeIds ?? [],
        mapExample: step.guitar?.musicMap?.example ?? null,
      };
    });
}

export interface TheoryNoteSettings {
  /** Teacher/classroom setting "Show Roman numerals". */
  showRomanNumerals?: boolean;
  /** Note names in filled tokens: 'Db' (default) or 'D♭'. */
  accidentals?: 'ascii' | 'unicode';
}

export interface TheoryNoteContext {
  center: GuitarKeyCenter;
  /** Absent on key-level surfaces (key header, Section B card, practice tools). */
  step?: TheoryStep;
  /** This key's steps in flow order, for the "first … in this key" conditions. */
  steps?: readonly TheoryStep[];
  /** The chord box the note is about; defaults to the step's only shape. */
  shape?: BookShape;
  voicing?: VoicingInfo;
  /** Defaults to the step's Music Map. */
  map?: GuitarMusicMap;
  analysis?: MusicMapAnalysis;
  /** A chord change (Music Map bars, or neighbouring chords of a B step). */
  change?: ChangeInfo;
  settings?: TheoryNoteSettings;
}

/** The context with everything the conditions and tokens read worked out. */
export interface DerivedTheoryContext extends TheoryNoteContext {
  keyShift: KeyChange | null;
  position: GuitarScalePosition;
  /** The shapes of the step, in order. */
  stepShapes: BookShape[];
}

function shapesOf(step: TheoryStep | undefined): BookShape[] {
  return (step?.shapeIds ?? []).flatMap((id) => {
    const shape = getGuitarShape(id);
    return shape ? [shape] : [];
  });
}

export function deriveTheoryContext(
  ctx: TheoryNoteContext,
): DerivedTheoryContext {
  const { center, step } = ctx;
  const prev = previousBookKey(center.key);
  const stepShapes = shapesOf(step);
  const shape =
    ctx.shape ?? (stepShapes.length === 1 ? stepShapes[0] : undefined);
  const map =
    ctx.map ??
    (step?.mapExample ? center.musicMaps[step.mapExample - 1] : undefined);
  return {
    ...ctx,
    shape,
    voicing: ctx.voicing ?? (shape && voicingOf(center, shape)),
    map,
    analysis: ctx.analysis ?? (map && analyzeMusicMap(map)),
    keyShift: prev ? keyChange(prev, center.key) : null,
    position:
      step?.scalePosition === 'pentatonic'
        ? center.pentatonic
        : center.majorScale,
    stepShapes,
  };
}

function voicingOf(center: GuitarKeyCenter, shape: BookShape): VoicingInfo {
  return classifyVoicing(
    shape,
    chordRootPc(center.key, shape.degree),
    shape.quality,
  );
}

// ── Conditions ─────────────────────────────────────────────────────────────

/**
 * The step is the first in this key whose shapes pass `test`. Steps before
 * it are read from `steps`; without them nothing counts as first.
 */
function firstStepInKey(
  d: DerivedTheoryContext,
  test: (shape: BookShape) => boolean,
): boolean {
  if (!d.step || !d.steps || !d.stepShapes.some(test)) return false;
  const index = d.steps.findIndex((s) => s.id === d.step?.id);
  if (index < 0) return false;
  return !d.steps.slice(0, index).some((s) => shapesOf(s).some(test));
}

const hasPattern = (
  d: DerivedTheoryContext,
  id: MapPatternId,
  wraps?: boolean,
) =>
  !!d.analysis?.patterns.some(
    (p) => p.id === id && (wraps === undefined || p.wrapsRepeat === wraps),
  );

export const THEORY_CONDITIONS: Readonly<
  Record<TheoryNoteCondition, (d: DerivedTheoryContext) => boolean>
> = {
  always: () => true,
  isFirstKey: (d) => d.center.key === GUITAR_KEY_ORDER[0],
  notFirstKeyNoRespell: (d) => !!d.keyShift && !d.keyShift.respelled,
  isFlatSwitch: (d) => !!d.keyShift?.respelled,
  scaleHasOpenStrings: (d) => d.position.playOrder.some((p) => p.fret === 0),
  inTimeStep: (d) => !!d.step?.inTime,
  staccatoStep: (d) => d.step?.articulation === 'staccato',
  legatoStep: (d) => d.step?.articulation === 'legato',
  romanSettingOn: (d) => !!d.settings?.showRomanNumerals,

  firstBarreStepInKey: (d) => firstStepInKey(d, (s) => !!s.barre),
  shapeHasDoubledTones: (d) => !!d.voicing?.doubledTones.length,
  shapeHasMutedStrings: (d) => !!d.voicing?.mutedStrings.length,
  shapeIsMovable: (d) => !!d.voicing?.movable,
  familyDrop2: (d) => d.voicing?.family === 'drop2',
  familyDrop3: (d) => d.voicing?.family === 'drop3',
  familyOpenSeventh: (d) => d.voicing?.family === 'open-string-seventh',
  firstDrop3StepInKey: (d) =>
    firstStepInKey(d, (s) => voicingOf(d.center, s).family === 'drop3'),
  degreeIsNot5: (d) => !!d.shape && d.shape.degree !== 5,
  degreeIs7: (d) => d.shape?.degree === 7,

  changeHasAnchor: (d) => !!d.change?.anchors.length,
  changeSharesNoNotes: (d) => !!d.change?.isTricky,
  changeIsSameFretR6toR5: (d) => d.change?.sameFretRootMove === 'r6-to-r5',

  mapHasFiveToOne: (d) => hasPattern(d, 'five-to-one'),
  mapHasTwoFiveOne: (d) => hasPattern(d, 'two-five-one'),
  twoFiveOneWraps: (d) => hasPattern(d, 'two-five-one', true),
  mapHasTurnaround: (d) => hasPattern(d, 'turnaround-1625'),
  mapStartsOnSix: (d) => !!d.analysis?.startsOnSix,
  mapHasSevenChord: (d) => !!d.analysis?.hasSevenChord,
  mapHasTriadBarIn7thMap: (d) => !!d.analysis?.triadBarsIn7thMap.length,
  mapHasDom7ToOne: (d) => !!d.analysis?.dom7ToOne.length,

  hasTopLineRun: (d) => topLineRuns(d.center).length > 0,
  octaveIsSameShape: (d) => octaveReturnKind(d.center) === 'same-shape',
  octaveIsNewShape: (d) => octaveReturnKind(d.center) === 'new-shape',
  octaveNotHigher: (d) => octaveReturnKind(d.center) === 'not-higher',
};

// ── Tokens ─────────────────────────────────────────────────────────────────

export type TheoryToken =
  | 'key'
  | 'prevKey'
  | 'oldNote'
  | 'newNote'
  | 'tonic'
  | 'relMinor'
  | 'startFret'
  | 'chord'
  | 'hiddenTriad'
  | 'hiddenDegree'
  | 'toneOrder'
  | 'stringCount'
  | 'noteNames'
  | 'rootString'
  | 'openStringRoles'
  | 'fromDegree'
  | 'toDegree'
  | 'dom7Chord'
  | 'seventhNote'
  | 'tonicThird'
  | 'thirdNote';

/** Tokens whose values are note or chord names (restyled for ♭ and ♯). */
export const SPELLED_TOKENS: ReadonlySet<TheoryToken> = new Set([
  'key',
  'prevKey',
  'oldNote',
  'newNote',
  'tonic',
  'relMinor',
  'chord',
  'hiddenTriad',
  'noteNames',
  'dom7Chord',
  'seventhNote',
  'tonicThird',
  'thirdNote',
]);

const STRING_NAMES = ['', 'high E', 'B', 'G', 'D', 'A', 'low E'];
const CHORD_ROLES: readonly ChordToneRole[] = [
  'root',
  'third',
  'fifth',
  'seventh',
];

/** 'C', 'C and E', 'C, E and G'. */
function listText(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** The book's '(b5)' caption with a real flat, for prose. */
function proseChordName(...args: Parameters<typeof chordName>): string {
  return chordName(...args).replace('(b5)', '(♭5)');
}

function tonesOf(d: DerivedTheoryContext) {
  const { shape } = d;
  if (!shape) return null;
  return shapeTones(
    shape.frets,
    chordRootName(d.center.key, shape.degree),
    shape.quality,
  );
}

/** "Open A is the 3. Open low E and high E are the root." */
function openStringRoles(d: DerivedTheoryContext): string | undefined {
  const open = tonesOf(d)?.filter((t) => t.fret === 0);
  if (!open?.length) return undefined;
  const byLabel = new Map<ChordToneLabel, string[]>();
  for (const tone of open) {
    byLabel.set(tone.label, [
      ...(byLabel.get(tone.label) ?? []),
      STRING_NAMES[tone.string],
    ]);
  }
  return [...byLabel]
    .map(([label, strings]) => {
      const role = label === 'R' ? 'root' : toneLabelText(label);
      const verb = strings.length > 1 ? 'are' : 'is';
      return `Open ${listText(strings)} ${verb} the ${role}.`;
    })
    .join(' ');
}

/** The change's bars: the map's, or the step's chords in order. */
function changeDegree(
  d: DerivedTheoryContext,
  end: 'fromBar' | 'toBar',
): number | undefined {
  if (!d.change) return undefined;
  const bars: readonly BookShape[] = d.map?.bars ?? d.stepShapes;
  return bars[d.change[end]]?.degree;
}

function dominantTones(d: DerivedTheoryContext) {
  if (!d.analysis?.dom7ToOne.length) return null;
  const key = d.center.key;
  const dominant = spellChordTones(chordRootName(key, 5), 'dom7');
  const tonic = spellChordTones(chordRootName(key, 1), 'maj');
  return { dominant, tonic };
}

export const THEORY_TOKENS: Readonly<
  Record<TheoryToken, (d: DerivedTheoryContext) => string | number | undefined>
> = {
  key: (d) => d.center.key,
  prevKey: (d) => previousBookKey(d.center.key) ?? undefined,
  oldNote: (d) => d.keyShift?.oldNote,
  newNote: (d) => d.keyShift?.newNote,
  tonic: (d) => keyScaleSpelling(d.center.key)[0],
  relMinor: (d) => relativeMinor(d.center),
  startFret: (d) => suggestedFingers(d.position).anchor,

  chord: (d) =>
    d.shape && proseChordName(d.center.key, d.shape.degree, d.shape.quality),
  hiddenTriad: (d) => {
    const hidden = d.shape && hiddenTriad(d.shape.degree);
    return hidden
      ? proseChordName(d.center.key, hidden.degree, hidden.quality)
      : undefined;
  },
  hiddenDegree: (d) => (d.shape && hiddenTriad(d.shape.degree))?.degree,
  toneOrder: (d) => d.voicing?.toneOrder.map(toneLabelText).join(', '),
  stringCount: (d) => d.shape && shapeNotes(d.shape.frets).length,
  // In chord order (C, E and G), not string order.
  noteNames: (d) => {
    const tones = tonesOf(d);
    if (!tones) return undefined;
    return listText(
      CHORD_ROLES.flatMap((role) => {
        const tone = tones.find((t) => t.role === role);
        return tone ? [tone.noteName] : [];
      }),
    );
  },
  rootString: (d) => d.voicing?.rootString,
  openStringRoles,

  fromDegree: (d) => changeDegree(d, 'fromBar'),
  toDegree: (d) => changeDegree(d, 'toBar'),
  dom7Chord: (d) =>
    d.analysis?.dom7ToOne.length
      ? chordSymbol(d.center.key, 5, 'dom7')
      : undefined,
  seventhNote: (d) => dominantTones(d)?.dominant[3],
  thirdNote: (d) => dominantTones(d)?.dominant[1],
  tonicThird: (d) => dominantTones(d)?.tonic[1],
};
