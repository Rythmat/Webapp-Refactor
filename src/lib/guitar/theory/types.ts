// ── Guitar theory layer: types ─────────────────────────────────────────────
// Labels, voicing families, key and Music Map facts derived from Book One
// data (docs/guitar-atlas/design/beato-knowledge-spec.md §2). Nothing here is
// stored: every value is computed from key + degree + quality + shape.

import type { BookChordQuality } from '@/curriculum/data/guitar/types';
import type {
  GuitarShapeDiagram,
  GuitarStringNumber,
} from '@/lib/guitar/types';

/** Rendered with ♭ via toneLabelText; 'R', never '1', so it can't read as finger 1. */
export type ChordToneLabel = 'R' | '3' | 'b3' | '5' | 'b5' | '7' | 'b7';
export type ChordToneRole = 'root' | 'third' | 'fifth' | 'seventh';
/** Scale degree in a major key. */
export type KeyDegree = 7 | 6 | 5 | 4 | 3 | 2 | 1;
export type LabelMode = 'fingers' | 'notes' | 'keyNumbers' | 'chordTones';
/** Book qualities plus the diminished triad on 7, which the book never prints. */
export type DiatonicQuality = BookChordQuality | 'dim';
export type SeventhQuality = Extract<
  BookChordQuality,
  'maj7' | 'dom7' | 'min7' | 'min7b5'
>;

/** A chord box from a chord page or a Music Map bar. */
export type BookShape = GuitarShapeDiagram & {
  degree: KeyDegree;
  quality: BookChordQuality;
};

export interface ShapeTone {
  string: GuitarStringNumber;
  fret: number;
  midi: number;
  label: ChordToneLabel;
  role: ChordToneRole;
  /** Key-aware spelling (spellChordTones), ASCII: 'E#', 'Bb'. */
  noteName: string;
  /** role ∈ QUALITY_TONES[quality]. */
  isQualityTone: boolean;
}

export type VoicingFamily =
  | 'open-chord'
  | 'root6-full-barre'
  | 'root6-four-string'
  | 'root5-four-string'
  | 'root4-four-string' // triads
  | 'drop2'
  | 'drop3'
  | 'close'
  | 'drop2and4'
  | 'drop2and3' // 4 distinct notes
  | 'open-string-seventh'
  | 'unclassified';

export interface VoicingInfo {
  family: VoicingFamily;
  /** String of the lowest sounding note. */
  rootString: GuitarStringNumber;
  /** Played strings, low to high: '5-4-3-2', '6-4-3-2'. */
  stringSet: string;
  /** Low → high. Notes outside the chord are left out (the shape is then unclassified). */
  toneOrder: ChordToneLabel[];
  /** 3 for triads, 4 for 7ths. */
  distinctTones: number;
  /** [] for drop voicings. */
  doubledTones: ChordToneLabel[];
  usesOpenStrings: boolean;
  movable: boolean;
  /** X strings, string 6 first. */
  mutedStrings: GuitarStringNumber[];
  /** X strings between the lowest and highest played ([5] for drop 3). */
  skippedStrings: GuitarStringNumber[];
  /** The lowest note is the root (every Book One shape). */
  isRootPosition: boolean;
  barre: 'none' | 'partial' | 'full';
}

export type FunctionGroup = 'home' | 'away' | 'tension';
export type MapPatternId = 'two-five-one' | 'turnaround-1625' | 'five-to-one';

// Bar numbers below are 0-based indexes into GuitarMusicMap.bars (0 = bar 1).

export interface MapPattern {
  id: MapPatternId;
  startBar: number;
  length: 2 | 3 | 4;
  /** The pattern runs across the repeat sign (the map plays twice). */
  wrapsRepeat: boolean;
}

export interface ChangeAnchor {
  string: GuitarStringNumber;
  fret: number;
  finger: 1 | 2 | 3 | 4;
}

export interface ChangeInfo {
  fromBar: number;
  toBar: number;
  wrapsRepeat: boolean;
  sharedPitchClasses: number[];
  /** Same string + fret + finger in both shapes, fret > 0. */
  anchors: ChangeAnchor[];
  /** Fret > 0 only. */
  sameFretRootMove?: 'r6-to-r5' | 'r5-to-r6';
  /** sharedPitchClasses.length === 0. */
  isTricky: boolean;
}

export interface MusicMapAnalysis {
  degrees: KeyDegree[];
  functions: FunctionGroup[];
  patterns: MapPattern[];
  changes: ChangeInfo[];
  startsOnSix: boolean;
  hasSevenChord: boolean;
  triadBarsIn7thMap: number[];
  /** Bars holding a 5 dom7 that moves to 1. */
  dom7ToOne: number[];
}

export type GuitarSubsectionPrefix =
  | 'KEY'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'B'
  | 'B1'
  | 'B2'
  | 'B3'
  | 'B4'
  | 'B5'
  | 'B6'
  | 'B7'
  | 'B8'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'PRACTICE';

/** Predicate ids for GuitarTheoryNote.when (theoryConditions.ts). */
export type TheoryNoteCondition =
  // key and step
  | 'always'
  | 'isFirstKey'
  | 'notFirstKeyNoRespell'
  | 'isFlatSwitch'
  | 'scaleHasOpenStrings'
  | 'inTimeStep'
  | 'staccatoStep'
  | 'legatoStep'
  | 'romanSettingOn'
  // shape
  | 'firstBarreStepInKey'
  | 'shapeHasDoubledTones'
  | 'shapeHasMutedStrings'
  | 'shapeIsMovable'
  | 'familyDrop2'
  | 'familyDrop3'
  | 'familyOpenSeventh'
  | 'firstDrop3StepInKey'
  | 'degreeIsNot5'
  | 'degreeIs7'
  // change
  | 'changeHasAnchor'
  | 'changeSharesNoNotes'
  | 'changeIsSameFretR6toR5'
  // map
  | 'mapHasFiveToOne'
  | 'mapHasTwoFiveOne'
  | 'twoFiveOneWraps'
  | 'mapHasTurnaround'
  | 'mapStartsOnSix'
  | 'mapHasSevenChord'
  | 'mapHasTriadBarIn7thMap'
  | 'mapHasDom7ToOne'
  // B8
  | 'hasTopLineRun'
  | 'octaveIsSameShape'
  | 'octaveIsNewShape'
  | 'octaveNotHigher';

export interface GuitarTheoryNote {
  /** Stable, e.g. 'b7.drop3mute'. */
  id: string;
  subsectionPrefix: GuitarSubsectionPrefix | readonly GuitarSubsectionPrefix[];
  /** intro = step info panel (auto-opens once); info = (i) drawer; popover = ChordBox/chip popover. */
  placement: 'intro' | 'info' | 'popover';
  kind: 'theory' | 'technique' | 'listening' | 'practice';
  when: TheoryNoteCondition;
  /** ≤ 5 words. */
  title: string;
  /** 1–4 sentences, ≤ 20 words each; {tokens} are resolved per key and step. */
  body: string;
}
