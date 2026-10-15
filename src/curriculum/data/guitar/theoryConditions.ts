// ── Theory notes: conditions and tokens ────────────────────────────────────
// When each GUITAR_THEORY_NOTES entry applies, and the values its {tokens}
// take, for one key center (a Book One key, or a mode on one) and optionally
// one step, shape, map or change. Note names are spelled in the center (ASCII
// accidentals; theoryNotes.ts can switch them to ♭ and ♯).

import { shapeNotes } from '@/lib/guitar/fretboard';
import {
  analyzeMusicMap,
  chordFormulaTones,
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
import { SCALE_LESSONS } from '@/lib/learn/scaleLessons';
import type { ActivityFlowV2 } from '../../types/activity.v2';
import { GUITAR_KEY_ORDER, keyScaleSpelling } from './bookOne';
import {
  centerModeName,
  centerScalePosition,
  chordName,
  chordRootName,
  chordRootPc,
  chordSymbol,
  degreeAccidental,
  diatonicSevenths,
  diatonicTriads,
  getGuitarShape,
  qualityWords,
} from './centers';
import {
  COLOUR_CHORD,
  COLOUR_DEGREE,
  MODE_COLOUR_TEXT,
  isGuitarModalMode,
} from './modes';
import {
  BLUE_NOTE_INDEX,
  COLOUR,
  COLOUR_TEXT,
  SCALE_PARTNER,
} from './scales/scaleTables';
import { guitarScaleEntry } from './theoryCatalog';
import type {
  BookChordQuality,
  GuitarCenter,
  GuitarHeptatonicScale,
  GuitarMusicMap,
  GuitarPentatonicScale,
  GuitarPentatonic,
  GuitarScalePosition,
  GuitarScaleSlot,
  ScaleDegree,
} from './types';

// ── Context ────────────────────────────────────────────────────────────────

/** What the theory layer needs from a lesson step. */
export interface TheoryStep {
  /** The activity number: 'A1.2', 'B7.5', 'D3.4'. */
  id: string;
  /** Played to a tempo rather than at the student's own pace. */
  inTime: boolean;
  articulation: 'staccato' | 'legato' | null;
  scalePosition: GuitarScaleSlot | null;
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
  center: GuitarCenter;
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
  // Book One walks the circle of fifths key by key; the modes don't.
  const prev = center.mode === 'ionian' ? previousBookKey(center.key) : null;
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
    analysis: ctx.analysis ?? (map && analyzeMusicMap(map, center.mode)),
    keyShift: prev ? keyChange(prev, center.key) : null,
    position: centerScalePosition(center, step?.scalePosition ?? 'major'),
    stepShapes,
  };
}

function voicingOf(center: GuitarCenter, shape: BookShape): VoicingInfo {
  return classifyVoicing(
    shape,
    chordRootPc(center, shape.degree),
    shape.quality,
  );
}

// ── Conditions ─────────────────────────────────────────────────────────────

/**
 * A mode whose notes take other names than its parent key's: D♭ Locrian
 * sounds like D major from its 7, but spells E𝄫 where D major has E.
 */
function modeRespelled(center: GuitarCenter): boolean {
  if (center.family !== 'diatonic') return false;
  const parent = keyScaleSpelling(center.parentKey);
  return center.spelling.some((name) => !parent.includes(name));
}

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
  isFirstKey: (d) =>
    d.center.mode === 'ionian' && d.center.key === GUITAR_KEY_ORDER[0],
  notFirstKeyNoRespell: (d) => !!d.keyShift && !d.keyShift.respelled,
  isFlatSwitch: (d) => !!d.keyShift?.respelled,
  modeSpelledLikeParent: (d) =>
    d.center.family === 'diatonic' &&
    d.center.mode !== 'ionian' &&
    !modeRespelled(d.center),
  modeRespelled: (d) => d.center.mode !== 'ionian' && modeRespelled(d.center),
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
  hasHiddenTriad: (d) => !!d.shape && !!hiddenTriad(d.center, d.shape.degree),
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

  // A 7th-chord page's; pentatonic and blues lessons have none.
  hasTopLineRun: (d) => hasSevenths(d) && topLineRuns(d.center).length > 0,
  octaveIsSameShape: (d) =>
    hasSevenths(d) && octaveReturnKind(d.center) === 'same-shape',
  octaveIsNewShape: (d) =>
    hasSevenths(d) && octaveReturnKind(d.center) === 'new-shape',
  octaveNotHigher: (d) =>
    hasSevenths(d) && octaveReturnKind(d.center) === 'not-higher',

  // The rest of Theory
  handStill: (d) => d.center.family === 'diatonic' || !stretchOf(d.position),
  positionNeedsStretch: (d) => !!stretchOf(d.position),
  octaveTwoOverTwoUp: (d) => {
    const { playOrder } = d.position;
    const low = playOrder[0];
    const high = playOrder[playOrder.length - 1];
    return high.string === low.string - 2 && high.fret === low.fret + 2;
  },
  modeIsFamilyParent: (d) => familyParentOf(d)?.degree === 1,
  modeIsFamilyMode: (d) => (familyParentOf(d)?.degree ?? 1) > 1,
  scaleHasAugmentedSecond: (d) => augmentedSeconds(d.center).length > 0,
  scaleHasBlueNote: (d) => blueNoteIndex(d) !== undefined,
  hasAugTriad: (d) => familyTriads(d).includes('aug'),
  hasTwoDimTriads: (d) =>
    familyTriads(d).filter((q) => q === 'dim').length === 2,
  hasMajFlat5Triad: (d) => familyTriads(d).includes('majb5'),
  hasSus2Flat5Triad: (d) => familyTriads(d).includes('sus2b5'),
  stepChordsHaveThird: (d) =>
    chordsOf(d).every((s) =>
      chordFormulaTones(s.quality).some(
        (t) => t.label === '3' || t.label === 'b3',
      ),
    ),
  chordTopIsSeventh: (d) =>
    chordsOf(d).every((s) => {
      const tones = chordFormulaTones(s.quality);
      return tones.length < 4 || /7$/.test(tones[3].label);
    }),
  chordIsMinMaj7: (d) => d.shape?.quality === 'minMaj7',
  chordIsAugMaj7: (d) => d.shape?.quality === 'maj7#5',
  chordIsDim7: (d) => d.shape?.quality === 'dim7',
  chordIsHalfDim: (d) => d.shape?.quality === 'min7b5',
  chordIsMin6: (d) => d.shape?.quality === 'min6',
  chordIsDom7b5: (d) => d.shape?.quality === 'dom7b5',
  chordIsSus2b5add6: (d) => d.shape?.quality === 'sus2b5add6',
};

// ── The rest of Theory ─────────────────────────────────────────────────────

const hasSevenths = (d: DerivedTheoryContext) => d.center.sevenths.length > 0;

/**
 * Where a position needs the first finger to reach back a fret (a five-fret
 * shape that uses all five): the fret the hand sits on, and the one below.
 */
function stretchOf(
  position: GuitarScalePosition,
): { anchor: number; low: number } | null {
  const frets = position.playOrder.map((p) => p.fret).filter((f) => f > 0);
  const low = Math.min(...frets);
  const { anchor } = suggestedFingers(position);
  return anchor > low ? { anchor, low } : null;
}

function familyParentOf(d: DerivedTheoryContext) {
  return d.center.family === 'diatonic' ? null : d.center.familyParent;
}

/** A seven-note family mode's triads; none for pentatonic and blues. */
function familyTriads(d: DerivedTheoryContext): BookChordQuality[] {
  return familyParentOf(d) ? diatonicTriads(d.center) : [];
}

/** The chords a note is about: its chord box, or the step's. */
function chordsOf(d: DerivedTheoryContext): readonly BookShape[] {
  return d.shape ? [d.shape] : d.stepShapes;
}

/** Neighbouring notes a step and a half apart, by index (the last wraps to 1). */
function augmentedSeconds(center: GuitarCenter): number[] {
  if (center.family === 'diatonic' || center.family === 'pentatonic-blues') {
    return [];
  }
  return gapsOf(center, 3);
}

/** Indexes i where note i + 1 (or the octave) is `semitones` above note i. */
function gapsOf(center: GuitarCenter, semitones: number): number[] {
  const { steps } = center;
  return steps.flatMap((step, i) => {
    const next = i === steps.length - 1 ? 12 : steps[i + 1];
    return next - step === semitones ? [i] : [];
  });
}

function blueNoteIndex(d: DerivedTheoryContext): number | undefined {
  return d.center.family === 'pentatonic-blues'
    ? BLUE_NOTE_INDEX[d.center.mode as GuitarPentatonicScale]
    : undefined;
}

/** The interval's two ends by degree label: '♭6 and 7', '7 and 1'. */
function pairText(center: GuitarCenter, i: number, joiner: string): string {
  const labels = center.degreeLabels;
  return `${labels[i]}${joiner}${i === labels.length - 1 ? 1 : labels[i + 1]}`;
}

const NUMBER_WORD = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
];

/** A quality as prose: 'minor 7(♭5)', 'major 7(♯5)'. */
function qualityProse(quality: BookChordQuality): string {
  return qualityWords(quality).replace(/b5/g, '♭5').replace(/#5/g, '♯5');
}

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
  | 'thirdNote'
  // The modes
  | 'mode'
  | 'parentKey'
  | 'parentDegree'
  | 'colourText'
  | 'colourNote'
  | 'colourDegree'
  | 'colourChord'
  | 'halfSteps'
  | 'pentDegrees'
  | 'skipped'
  | 'triadPattern'
  | 'dimDegree'
  // The rest of Theory
  | 'noteCount'
  | 'scaleDegrees'
  | 'scaleNoteNames'
  | 'scaleCharacter'
  | 'partnerKey'
  | 'partnerName'
  | 'blueNote'
  | 'blueDegree'
  | 'halfStepCount'
  | 'halfStepList'
  | 'augSecondPairs'
  | 'stretchFret'
  | 'lowFret'
  | 'familyParentKey'
  | 'familyName'
  | 'familyDegree'
  | 'augDegree'
  | 'dimDegrees'
  | 'majb5Degree'
  | 'sus2b5Degree'
  | 'seventhKinds'
  | 'seventhKindCount';

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
  'parentKey',
  'colourNote',
  'scaleNoteNames',
  'partnerKey',
  'blueNote',
  'familyParentKey',
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
    chordRootName(d.center, shape.degree),
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
  const dominant = spellChordTones(chordRootName(d.center, 5), 'dom7');
  const tonic = spellChordTones(chordRootName(d.center, 1), 'maj');
  return { dominant, tonic };
}

// ── The modes ──────────────────────────────────────────────────────────────

/** A degree as the mode has it: '♭3' in Dorian, '♯4' in Lydian. */
function degreeLabel(center: GuitarCenter, degree: number): string {
  return `${degreeAccidental(center, degree as ScaleDegree)}${degree}`;
}

const TRIAD_WORD: Partial<Record<BookChordQuality, string>> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  majb5: 'major(♭5)',
  sus2b5: 'sus2(♭5)',
};

/** The pentatonic the step plays (the first when it plays none). */
function pentatonicOf(d: DerivedTheoryContext): GuitarPentatonic | undefined {
  const { pentatonics } = d.center;
  return d.position.id === 'pentatonic2' ? pentatonics[1] : pentatonics[0];
}

/** A modal center's mode, or undefined in Book One. */
function modalMode(d: DerivedTheoryContext) {
  return isGuitarModalMode(d.center.mode) ? d.center.mode : undefined;
}

export const THEORY_TOKENS: Readonly<
  Record<TheoryToken, (d: DerivedTheoryContext) => string | number | undefined>
> = {
  key: (d) => d.center.key,
  prevKey: (d) => previousBookKey(d.center.key) ?? undefined,
  oldNote: (d) => d.keyShift?.oldNote,
  newNote: (d) => d.keyShift?.newNote,
  tonic: (d) => d.center.spelling[0],
  relMinor: (d) => relativeMinor(d.center),
  startFret: (d) => suggestedFingers(d.position).anchor,

  chord: (d) =>
    d.shape && proseChordName(d.center, d.shape.degree, d.shape.quality),
  hiddenTriad: (d) => {
    const hidden = d.shape && hiddenTriad(d.center, d.shape.degree);
    return hidden
      ? proseChordName(d.center, hidden.degree, hidden.quality)
      : undefined;
  },
  hiddenDegree: (d) =>
    (d.shape && hiddenTriad(d.center, d.shape.degree))?.degree,
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
    d.analysis?.dom7ToOne.length ? chordSymbol(d.center, 5, 'dom7') : undefined,
  seventhNote: (d) => dominantTones(d)?.dominant[3],
  thirdNote: (d) => dominantTones(d)?.dominant[1],
  tonicThird: (d) => dominantTones(d)?.tonic[1],

  mode: (d) => centerModeName(d.center),
  parentKey: (d) =>
    d.center.family === 'diatonic' && modalMode(d)
      ? d.center.parentKey
      : undefined,
  parentDegree: (d) =>
    d.center.family === 'diatonic' && modalMode(d)
      ? d.center.parentDegree
      : undefined,
  colourText: (d) => {
    const mode = modalMode(d);
    if (mode) return MODE_COLOUR_TEXT[mode];
    const scale = familyScale(d);
    return scale && COLOUR_TEXT[scale];
  },
  colourNote: (d) => {
    const degree = colourDegreeOf(d);
    return degree && d.center.spelling[degree - 1];
  },
  colourDegree: (d) => {
    const degree = colourDegreeOf(d);
    return degree && degreeLabel(d.center, degree);
  },
  colourChord: (d) => {
    const mode = modalMode(d);
    if (mode) return COLOUR_CHORD[mode];
    const scale = familyScale(d);
    return scale && COLOUR[scale].chord;
  },
  // 'from 2 to ♭3, and from 6 to ♭7'.
  halfSteps: (d) => {
    const { steps } = d.center;
    const pairs = steps.flatMap((step, i) => {
      const next = i === 6 ? 12 : steps[i + 1];
      return next - step === 1
        ? [
            `from ${degreeLabel(d.center, i + 1)} to ${i === 6 ? 1 : degreeLabel(d.center, i + 2)}`,
          ]
        : [];
    });
    return pairs.join(', and ');
  },
  pentDegrees: (d) => {
    const pentatonic = pentatonicOf(d);
    return (
      pentatonic &&
      listText(pentatonic.degrees.map((n) => degreeLabel(d.center, n)))
    );
  },
  skipped: (d) => {
    const pentatonic = pentatonicOf(d);
    if (!pentatonic) return undefined;
    return listText(
      [1, 2, 3, 4, 5, 6, 7]
        .filter((n) => !pentatonic.degrees.includes(n as ScaleDegree))
        .map((n) => degreeLabel(d.center, n)),
    );
  },
  triadPattern: (d) =>
    diatonicTriads(d.center)
      .map((quality, i) => `${i + 1} ${TRIAD_WORD[quality] ?? quality}`)
      .join(', '),
  dimDegree: (d) => diatonicTriads(d.center).indexOf('dim') + 1 || undefined,

  // The rest of Theory
  noteCount: (d) => NUMBER_WORD[d.center.steps.length],
  scaleDegrees: (d) => listText(d.center.degreeLabels),
  scaleNoteNames: (d) => listText(d.center.spelling),
  scaleCharacter: (d) =>
    d.center.family === 'pentatonic-blues'
      ? SCALE_LESSONS[d.center.mode as GuitarPentatonicScale].character
      : undefined,
  partnerKey: (d) => {
    if (d.center.family !== 'pentatonic-blues') return undefined;
    const partner = SCALE_PARTNER[d.center.mode as GuitarPentatonicScale];
    return d.center.spelling[partner.index];
  },
  partnerName: (d) => {
    if (d.center.family !== 'pentatonic-blues') return undefined;
    const partner = SCALE_PARTNER[d.center.mode as GuitarPentatonicScale];
    return SCALE_LESSONS[partner.scale].title;
  },
  blueNote: (d) => {
    const i = blueNoteIndex(d);
    return i === undefined ? undefined : d.center.spelling[i];
  },
  blueDegree: (d) => {
    const i = blueNoteIndex(d);
    return i === undefined ? undefined : d.center.degreeLabels[i];
  },
  halfStepCount: (d) => NUMBER_WORD[gapsOf(d.center, 1).length],
  halfStepList: (d) =>
    listText(gapsOf(d.center, 1).map((i) => pairText(d.center, i, '–'))),
  augSecondPairs: (d) => {
    const pairs = augmentedSeconds(d.center);
    return pairs.length
      ? pairs.map((i) => pairText(d.center, i, ' and ')).join(', and between ')
      : undefined;
  },
  stretchFret: (d) => stretchOf(d.position)?.anchor,
  lowFret: (d) => stretchOf(d.position)?.low,
  familyParentKey: (d) => familyParentOf(d)?.tonic,
  familyName: (d) => {
    const parent = familyParentOf(d);
    return parent ? guitarScaleEntry(parent.scale).name : undefined;
  },
  familyDegree: (d) => familyParentOf(d)?.degree,
  augDegree: (d) => familyTriads(d).indexOf('aug') + 1 || undefined,
  dimDegrees: (d) => {
    const degrees = familyTriads(d).flatMap((q, i) =>
      q === 'dim' ? [String(i + 1)] : [],
    );
    return degrees.length ? listText(degrees) : undefined;
  },
  majb5Degree: (d) => familyTriads(d).indexOf('majb5') + 1 || undefined,
  sus2b5Degree: (d) => familyTriads(d).indexOf('sus2b5') + 1 || undefined,
  seventhKinds: (d) => {
    if (!familyParentOf(d)) return undefined;
    const kinds = [...new Set(diatonicSevenths(d.center))];
    return listText(kinds.map(qualityProse));
  },
  seventhKindCount: (d) =>
    familyParentOf(d)
      ? NUMBER_WORD[new Set(diatonicSevenths(d.center)).size]
      : undefined,
};

/** A seven-note family mode's scale key; undefined elsewhere. */
function familyScale(
  d: DerivedTheoryContext,
): GuitarHeptatonicScale | undefined {
  return familyParentOf(d)
    ? (d.center.mode as GuitarHeptatonicScale)
    : undefined;
}

/** The colour note's degree, in a mode or a seven-note family mode. */
function colourDegreeOf(d: DerivedTheoryContext): number | undefined {
  const mode = modalMode(d);
  if (mode) return COLOUR_DEGREE[mode];
  const scale = familyScale(d);
  return scale && COLOUR[scale].note;
}
