/**
 * buildGenrePracticeTrack.ts — A Practice Track for one section of one genre
 * level: the groove that section's activities played over, looped, with the
 * student's own part left out for them to play.
 *
 * **Why this returns clips and not parameters.** The genre backing engine
 * (backingPatterns.ts) is deliberately not reproducible — it jitters
 * micro-timing, varies the hi-hat and picks between drum phrases at random, so
 * the same call twice is two different performances. The Theory Practice Track
 * can rebuild itself from `?practiceMode=dorian&practiceRoot=a` because its
 * generator is pure; this one cannot. So the backing is generated once, here,
 * and the clips travel to the Studio — which means the performance the student
 * improvised over is the performance they keep when they take it in. Nothing
 * re-rolls behind their back.
 *
 * The loop is the engine's full sixteen bars rather than the four-bar chord
 * cycle. The engine writes a structured four-bar phrase and varies bars 5-8, so
 * sixteen bars breathes where four would grind, and the harmony still comes
 * round every `chordCycle.length` bars.
 */

import { CHORDS, getChordColorFromNotes } from '@prism/engine';
import { flowGuitarCenterId } from '@/curriculum/data/guitar/centers';
import {
  getLessonStyle,
  lessonStyleFor,
  lessonStylesForLevel,
} from '@/curriculum/data/lessonStyles';
import {
  buildBackingNotes,
  getGrooveForStyleRef,
  stepBassVoice,
  stepDrumKit,
  type BackingNote,
} from '@/curriculum/engine/genreGeneration/backingPatterns';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { genreBassVoice } from '@/curriculum/engine/genreGeneration/genreBassVoices';
import { resolveStepContent } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import { swingPercent } from '@/curriculum/engine/genreGeneration/swing';
import { pairingForStyle } from '@/curriculum/engine/lessonPairings/registry';
import {
  barTicks as meterBarTicks,
  stepTimeSignature,
} from '@/curriculum/engine/meter';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type {
  ActivityFlowV2,
  ActivitySectionV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { flowInstrument } from '@/curriculum/utils/flowInstrument';
import {
  flowKeyRoot,
  stepKeyLabel,
  stepKeyRoot,
  stepMode,
} from '@/curriculum/utils/flowKey';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import type { DrumKitId } from '@/daw/instruments/drumKits';
import { nextChordId, type ChordRegion } from '@/daw/store/prismSlice';
import type { MidiClip, StudioBassVoice } from '@/daw/store/tracksSlice';
import type { GuitarPracticeInfo } from '@/daw/store/uiSlice';
import { formatChord, normalizeQuality, parseChord } from '@/lib/chordNotation';
import { stylisticVoicings } from '../chordVoicings';
import { flowPracticeScales, type PracticeScale } from './practiceScales';

// ── Constants ────────────────────────────────────────────────────────────────

/** A 4/4 bar; a level in another meter uses meter.ts barTicks. */
const BAR_TICKS = 1920;
/**
 * Where a melody is assumed to start when a section writes none of its own:
 * A3, the foot of the octave the practice keyboard centres the scale in.
 */
const MELODY_FLOOR_FALLBACK = 57;

/** The engine writes sixteen bars; the Practice Track loops all of them. */
const LOOP_BARS = 16;
const LOOP_TICKS = LOOP_BARS * BAR_TICKS;

/** What the engine plays and what the student plays, per section. */
type EnginePart = 'drums' | 'bass' | 'chords';
export type StudentPart = 'melody' | 'chords' | 'bass';

/**
 * Each section hands the student the part it just taught and has the engine
 * play everything else. This is fixed per section rather than read from the
 * source step's `backing_parts`, because a step's split is chosen for an
 * exercise ("you play the bass AND the chords") while a Practice Track's job is
 * always "you play the one thing this section was about".
 */
const SECTION_PARTS: Record<
  ActivitySectionId,
  { engine: EnginePart[]; student: StudentPart[] }
> = {
  A: { engine: ['drums', 'bass', 'chords'], student: ['melody'] },
  B: { engine: ['drums', 'bass'], student: ['chords'] },
  C: { engine: ['drums', 'chords'], student: ['bass'] },
  D: { engine: ['drums', 'bass'], student: ['chords', 'melody'] },
};

// ── Result ───────────────────────────────────────────────────────────────────

/** A band layer's own track in a Practice Track. */
export interface PracticeLayerClip {
  /** The band layer's id. */
  layer: string;
  /** The track's name: the layer's. */
  name: string;
  /** A sound string (daw/instruments/soundString.ts). */
  sound: string;
  /** 0–1. */
  volume: number;
  /** The lesson part it plays in. */
  part: EnginePart;
  clip: MidiClip;
}

export interface GenrePracticeTrackResult {
  genre: string;
  level: number;
  section: ActivitySectionId;
  /** The section's own name: 'Melody', 'Chords', 'Bass', 'Performance'. */
  sectionName: string;
  /** Note letter of the tonic, e.g. 'A'. */
  keyLabel: string;
  /** Tonic as a pitch class, 0-11. */
  keyRootPc: number;
  /** The Prism mode the Studio colours and spells in. */
  mode: string;
  bpm: number;
  loopTicks: number;
  /** The loop's meter (D-085); the Studio opens in it. */
  timeSignature: [number, number];
  /** Chord symbols, one per bar, as the chart draws them. */
  chordCycle: string[];
  /** One region per bar across the whole loop — the Studio's chord lane. */
  chordRegions: ChordRegion[];
  /** The engine's parts. A part this section's student plays is absent. */
  clips: Partial<Record<EnginePart, MidiClip>>;
  /**
   * The style's band layers that play on instruments of their own (a second
   * keyboard, a guitar, a synth, a layer with its own sound or level), one
   * Studio track each, beside the parts' tracks.
   */
  layerClips: PracticeLayerClip[];
  studentParts: StudentPart[];
  /**
   * The lowest note this section's own melody writing uses, so the practice
   * keyboard lights the scale where the lesson actually wrote it.
   */
  melodyFloor: number;
  /** The span the section's own writing covers, both hands. */
  studentRange: { low: number; high: number };
  /** Every scale this level teaches, the level's default first. */
  scales: PracticeScale[];
  /**
   * For a Chords track, the lesson's own voicings the keyboard can show — one
   * set per switch option, each chord of `chordCycle` as that activity voiced
   * it (null where none does). Null on the other tracks.
   */
  voicingSets: VoicingSet[] | null;
  /** Which of `voicingSets` the keyboard opens on. */
  defaultVoicing: string | null;
  /** The lesson's drum kit, so the Studio's drums sound like the play-along. */
  drumKit: DrumKitId;
  /** The lesson's bass sound; undefined = the sampled electric bass. */
  bassVoice?: StudioBassVoice;
  /**
   * The lowest bass note the section writes — where its bass notes are lit —
   * or null when the student's writing has no bass part.
   */
  bassFloor: number | null;
  /** The source step's own instruction, as the first improvisation prompt. */
  sourceDirection: string | null;
  grooveId: string;
  /**
   * The level's styles, for the groove toggle (D-088) — empty when the level
   * teaches one. Switching swaps drums, bass and comping to that style's
   * pairing (D-084), and its groove's meter.
   */
  styles: PracticeStyleOption[];
  /** The style playing, or null when the level has one. */
  styleId: string | null;
  /** Every progression the level teaches, for the progression switch. */
  progressions: PracticeProgressionOption[];
  /** The one playing: its chords joined by spaces. */
  progressionId: string;
  /**
   * A guitar lesson's track: the key center, scale position and chord shapes
   * the practice screen draws on a fretboard in place of the keyboard.
   * Absent on piano.
   */
  guitar?: GuitarPracticeInfo;
}

export interface PracticeStyleOption {
  id: string;
  name: string;
}

export interface PracticeProgressionOption {
  id: string;
  /** 'Cumbia · Em – Am – B7 – Em', raw symbols; the switch writes `chords`
   *  in the reader's notation after `styleName`. */
  label: string;
  chords: string[];
  /** The groove the progression comes with, when the level has several. */
  styleName?: string;
}

export interface GenrePracticeTrackOptions {
  bpm?: number;
  /** A lesson style id (lessonStyles.ts) to play instead of the section's. */
  styleId?: string;
  /** Chord symbols to loop instead of the section's. */
  chords?: string[];
}

// ── Content gate ─────────────────────────────────────────────────────────────

/** A step a student could actually play: it has notes, or it names chords. */
function stepHasContent(step: ActivityStepV2): boolean {
  return (
    (step.targetNotes?.length ?? 0) > 0 ||
    (step.chordSymbols?.length ?? 0) > 0 ||
    (step.variants?.length ?? 0) > 0
  );
}

/**
 * Whether a section is authored enough to practise over. The twelve stub
 * genres have one placeholder step per section with `targetNotes: []`, so they
 * report false and never offer a Practice Track.
 */
export function sectionHasContent(section: ActivitySectionV2): boolean {
  return section.steps.some(stepHasContent);
}

/** Whether any of this level's sections can offer a Practice Track. */
export function flowHasPracticeTracks(flow: ActivityFlowV2): boolean {
  return flow.sections.some(sectionHasContent);
}

/**
 * The step a section's Practice Track is built from: the last one that plays
 * over a backing, else the last with any content at all. The last is the right
 * one — it is the most developed thing the section taught, and the Practice
 * Track arrives immediately after it.
 */
function sourceStep(section: ActivitySectionV2): ActivityStepV2 | null {
  const withContent = section.steps.filter(stepHasContent);
  if (withContent.length === 0) return null;
  const withBacking = withContent.filter(
    (step) => (step.backing_parts?.engine_generates?.length ?? 0) > 0,
  );
  const pool = withBacking.length > 0 ? withBacking : withContent;
  return pool[pool.length - 1];
}

// ── The chord loop ───────────────────────────────────────────────────────────

/**
 * The tonic seventh of a mode, as a chord symbol — the vamp a section without
 * chord symbols of its own plays over. Every symbol here is one
 * `chordSymbolTones` parses; a ninth rather than a plain seventh because that is
 * how these genres voice a tonic, and it is what Funk's own chord sections
 * teach ('Am9').
 */
function tonicSymbol(keyLabel: string, mode: string, genre: string): string {
  if (genre === 'pop') return keyLabel;
  switch (mode) {
    case 'ionian':
    case 'lydian':
      return `${keyLabel}maj7`;
    case 'mixolydian':
      return `${keyLabel}9`;
    case 'locrian':
      return `${keyLabel}m7b5`;
    default:
      return `${keyLabel}m9`;
  }
}

/**
 * The kit and bass sound the lesson's play-along used: a back-office pairing's
 * (D-084), else the source step's own (Hip Hop names them per step), else the
 * genre's bass (Pop Fretless, Funk
 * Finger electric — genreBassVoices.ts).
 */
function lessonSounds(
  flow: ActivityFlowV2,
  step: ActivityStepV2 | null,
  backingStep: ActivityStepV2,
  styleRef: string | undefined,
): Pick<GenrePracticeTrackResult, 'drumKit' | 'bassVoice'> {
  const voice =
    stepBassVoice(step ?? backingStep, styleRef, flow.genre, flow.level) ??
    genreBassVoice(flow.genre)?.id;
  return {
    drumKit: stepDrumKit(backingStep, styleRef, flow.genre, flow.level),
    bassVoice: voice === 'electric' ? undefined : voice,
  };
}

/**
 * An activity's chord list as a loop. Activities are written as phrases, and a
 * phrase's shape isn't a loop's:
 *
 * - A phrase that ends by landing back on its first chord lists that landing
 *   as a bar of its own — Funk L3's capstone is Cm9 F13 A♭13 G7alt Cm9. Looped,
 *   that's a fifth bar and two Cm9s in a row; the loop is the four before it.
 *   Only an odd-length list is read this way, since an even one ending where
 *   it began (Am9 D13 E7♯5 Am9) is a progression, not a landing.
 * - A list written out twice over (Pop L1's eight-bar jam, C G Am F C G Am F)
 *   is one turn of it — down to four bars, never fewer, so a four-bar vamp
 *   (Dm7 G9 Dm7 G9) still reads as the four bars it was taught as.
 */
const MIN_LOOP_BARS = 4;

export function loopChords(chords: readonly string[]): string[] {
  let loop = [...chords];
  if (
    loop.length > 1 &&
    loop.length % 2 === 1 &&
    loop[loop.length - 1] === loop[0]
  )
    loop = loop.slice(0, -1);
  for (let size = MIN_LOOP_BARS; size < loop.length; size++) {
    if (
      loop.length % size === 0 &&
      loop.every((chord, i) => chord === loop[i % size])
    )
      return loop.slice(0, size);
  }
  return loop;
}

/** The chords the Practice Track loops, and the groove under them. */
function resolveLoop(
  flow: ActivityFlowV2,
  step: ActivityStepV2 | null,
  keyLabel: string,
  mode: string,
): { chords: string[]; grooveId: string } {
  const authored = flow.params.practiceTrack;
  const grooveId =
    authored?.grooveId ??
    step?.grooveId ??
    getGrooveForStyleRef(step?.styleRef, flow.genre);

  const chords = authored?.chords?.length
    ? authored.chords
    : step?.chordSymbols?.length
      ? loopChords(step.chordSymbols)
      : [tonicSymbol(keyLabel, mode, flow.genre)];

  // A symbol the parser can't read would sound as the engine's fallback tonic
  // while the chart still showed it — drop it rather than let the two disagree.
  const playable = chords.filter((symbol) => chordSymbolTones(symbol) !== null);
  return {
    chords: playable.length
      ? playable
      : [tonicSymbol(keyLabel, mode, flow.genre)],
    grooveId,
  };
}

/**
 * Every progression the level teaches, one per distinct loop, for the
 * Practice Track's progression switch (D-088): the authored Practice Track
 * chords first, then each step's chords in lesson order. In a level that
 * teaches several styles, each is labelled with the style it came from.
 */
function levelProgressions(flow: ActivityFlowV2): PracticeProgressionOption[] {
  const styles = lessonStylesForLevel(flow.genre, flow.level);
  const options: PracticeProgressionOption[] = [];
  const add = (chords: readonly string[], styleRef?: string) => {
    const loop = loopChords(chords).filter((c) => chordSymbolTones(c) !== null);
    // A chord-learning step's one chord is not a progression to jam over.
    if (new Set(loop).size < 2) return;
    const id = loop.join(' ');
    if (options.some((o) => o.id === id)) return;
    const style =
      styles.length > 1
        ? lessonStyleFor(flow.genre, flow.level, styleRef)
        : undefined;
    const chart = loop.map(formatAccidentalsForDisplay).join(' – ');
    options.push({
      id,
      label: style ? `${style.name} · ${chart}` : chart,
      chords: loop,
      ...(style ? { styleName: style.name } : {}),
    });
  };
  if (flow.params.practiceTrack?.chords?.length)
    add(flow.params.practiceTrack.chords);
  for (const section of flow.sections)
    for (const step of section.steps)
      if (step.chordSymbols?.length) add(step.chordSymbols, step.styleRef);
  return options;
}

// ── Chord regions ────────────────────────────────────────────────────────────

/**
 * A chord symbol as its hybrid degree label in the key — 'D13' in A Dorian is
 * "4 dom13", 'E7#5' is "5 dom7(#5)".
 *
 * A quality the app's vocabulary doesn't know keeps the symbol as written.
 * 'Afunk9' is the case that matters: it is Aaron's own name for a rootless
 * b7-9-5 voicing, and "1 funk9" is the formatter passing the word through
 * rather than a degree label anyone would write. `normalizeQuality` tells the
 * two apart — it translates every quality it knows ('m9' -> 'minor9', '7alt'
 * -> 'dominant7alt') and hands back an unknown one untouched.
 */
function degreeLabel(
  symbol: string,
  keyRootMidi: number,
  mode: string,
): string {
  const written = formatAccidentalsForDisplay(symbol);
  const spec = parseChord(symbol);
  if (!spec) return written;
  const quality = normalizeQuality(spec.quality);
  if (quality === spec.quality && !(quality in CHORDS)) return written;
  return formatChord(spec, 'hybrid', {
    keyRootPc: ((keyRootMidi % 12) + 12) % 12,
    mode,
  });
}

/**
 * One region per bar of the loop, cycling the chord symbols — the Studio's
 * chord lane and the practice chart both read these.
 *
 * `noteName` keeps the authored symbol exactly as written. That matters for
 * Aaron's own symbols: 'Afunk9' is a rootless ♭7-9-5 voicing with a name of its
 * own, and re-deriving a "correct" letter name from its tones would rewrite it.
 *
 * `name` is the hybrid degree label the app writes chords in ('Am9' in A Dorian
 * is "1 min9"), so the chart's two lines say two things rather than the same
 * thing twice. A symbol hybrid cannot write keeps its own spelling — writing
 * 'Afunk9' as "1 funk9" would be the formatter's fallback, not a degree label.
 */
function buildChordRegions(
  chordCycle: string[],
  keyRootMidi: number,
  mode: string,
  barLength = BAR_TICKS,
): ChordRegion[] {
  const regions: ChordRegion[] = [];
  for (let bar = 0; bar < LOOP_BARS; bar++) {
    const symbol = chordCycle[bar % chordCycle.length];
    const tones = chordSymbolTones(symbol);
    if (!tones) continue;
    // Voiced from the octave below the tonic, so the lane reads where the
    // engine's own chord part sits rather than an octave clear of it.
    const rootMidi =
      keyRootMidi - 12 + ((tones.rootPc - (keyRootMidi % 12) + 12) % 12);
    const midis = tones.intervals.map((interval) => rootMidi + interval);
    regions.push({
      id: nextChordId(),
      startTick: bar * barLength,
      endTick: (bar + 1) * barLength,
      name: degreeLabel(symbol, keyRootMidi, mode),
      noteName: formatAccidentalsForDisplay(symbol),
      color: getChordColorFromNotes(midis, keyRootMidi, mode),
      midis,
    });
  }
  return regions;
}

// ── The student's own register ────────────────────────────────────────────────

/**
 * The lowest note the melody is written on — where the student will be playing.
 * Left-hand notes are excluded: a Performance step's LH bass says nothing about
 * where the melody sits. Null when nothing here writes a melody.
 */
function melodyFloor(steps: readonly ActivityStepV2[]): number | null {
  const midis = steps.flatMap((step) =>
    (step.targetNotes ?? [])
      .filter((note) => note.hand !== 'lh')
      .map((note) => note.midi),
  );
  return midis.length ? Math.min(...midis) : null;
}

/**
 * The span the writing covers, both hands — where the student will be playing,
 * and so which three octaves the practice keyboard should draw. Falls back to
 * the octave either side of middle C when nothing here is written.
 */
function studentRange(steps: readonly ActivityStepV2[]): {
  low: number;
  high: number;
} {
  const midis = steps.flatMap((step) =>
    (step.targetNotes ?? []).map((note) => note.midi),
  );
  if (midis.length === 0) return { low: 48, high: 83 };
  return { low: Math.min(...midis), high: Math.max(...midis) };
}

/**
 * Octaves to drop the backing chords so they comp under an improvising student
 * instead of on top of them.
 *
 * The genre engine pins a chord's guide tone between A3 and G4 and stacks the
 * 3rd and 5th above it (backingPatterns.ts `buildVoicings`). For an A-rooted
 * ninth the ♭7 lands on the very top of that window, so Am9 comes out G4-C5-E5
 * and its chromatic approach reaches F♯5 — above the C3-C5 register rule each
 * Funk level states for itself, and sitting right where a student improvising
 * in A Dorian spends most of their time. An octave down puts the figure at
 * G3-C4-E4: inside the rule, in the sweet spot it names (E3-G4), and under the
 * middle of the improvising register.
 *
 * Not *below* the melody — a student ranging over three octaves will cross any
 * comping register there is, and real comping shares register with a soloist
 * all the time. The point is where the chords sit, not that they never meet.
 *
 * Decided from the section's own writing rather than from the generated notes.
 * That matters: the engine sprinkles random chromatic approach voicings a
 * semitone or two off the shell, so a measurement of the notes moves between one
 * draw and the next, and the same lesson would voice its chords an octave apart
 * on two visits. The flow data doesn't move.
 *
 * Only sections where the student actually plays a melody are shifted.
 * Everywhere else the Practice Track voices its chords exactly where the lesson
 * did, which is the point of playing over the thing you just practised.
 */
/** Top of the window the engine pins a chord's guide tone into — G4. */
const SHELL_TOP = 67;

export function chordOctaveShift(
  steps: readonly ActivityStepV2[],
  studentParts: StudentPart[],
): number {
  if (!studentParts.includes('melody')) return 0;
  const floor = melodyFloor(steps) ?? MELODY_FLOOR_FALLBACK;
  return floor <= SHELL_TOP ? -12 : 0;
}

// ── Stylistic voicings ───────────────────────────────────────────────────────

export interface VoicingSet {
  id: string;
  label: string;
  voicings: (number[] | null)[];
}

/**
 * The hands that play chords in a step: all of them in a Chords section, the
 * hand given the chords role in a Performance one ('lh_chords_rh_melody' is the
 * left, 'lh_bass_rh_chords' the right). None when a Performance step doesn't
 * say, since its chords can't be told from its melody or bass.
 */
function chordHands(
  step: ActivityStepV2,
  sectionId: ActivitySectionId,
): ('lh' | 'rh')[] | 'all' {
  if (sectionId !== 'D') return 'all';
  const roles = step.instrument_config;
  if (!roles) return [];
  return (['lh', 'rh'] as const).filter(
    (hand) => roles[`${hand}_role`] === 'chords',
  );
}

/**
 * The voicings a section taught, one per chord of the loop: read from
 * `fromActivity` (its last activity when not given), then from earlier ones for
 * any chord that one doesn't play. Read through `resolveStepContent`, so they
 * sit in the register the student saw them in. In a Performance section only
 * the chord hand is read.
 */
function sectionVoicings(
  flow: ActivityFlowV2,
  section: ActivitySectionV2,
  chords: string[],
  fromActivity?: string,
): (number[] | null)[] {
  const ctx = {
    section: section.id,
    keyRoot: flowKeyRoot(flow),
    tempo: flow.params.tempoRange[0],
    timeSignature: stepTimeSignature(null, flow),
    tpb: 480,
    defaultScale: flow.params.defaultScale,
    genre: flow.genre,
  };
  const from = fromActivity
    ? section.steps.findIndex((step) =>
        step.activity.startsWith(`${fromActivity}:`),
      )
    : section.steps.length - 1;
  const activities = section.steps
    .slice(0, from + 1)
    .reverse()
    .flatMap((step) => {
      const variant = step.targetNotes?.length ? null : step.variants?.[0];
      const written: ActivityStepV2 = variant
        ? {
            ...step,
            targetNotes: variant.targetNotes,
            chordSymbols: variant.chordSymbols ?? step.chordSymbols,
          }
        : step;
      const hands = chordHands(step, section.id);
      if (
        !written.targetNotes?.length ||
        !written.chordSymbols?.length ||
        hands.length === 0
      )
        return [];
      const notes = resolveStepContent(written, ctx) ?? [];
      return [
        {
          notes:
            hands === 'all'
              ? notes
              : notes.filter((note) => note.hand && hands.includes(note.hand)),
          chordSymbols: written.chordSymbols,
        },
      ];
    });
  return stylisticVoicings(
    chords,
    activities,
    meterBarTicks(stepTimeSignature(null, flow)),
  );
}

/**
 * The switch options a Chords track offers beyond Root Position: the level's
 * authored ones, else one set from the section's last activity. A set that
 * voices none of the loop's chords is left off.
 */
function voicingSets(
  flow: ActivityFlowV2,
  section: ActivitySectionV2,
  chords: string[],
): VoicingSet[] {
  // A level's authored sets name Chords activities; Performance reads its own.
  const authored =
    section.id === 'B' ? flow.params.practiceTrack?.voicings : undefined;
  const sources = authored ?? [
    { id: 'stylistic', label: 'Stylistic Voicings', activity: undefined },
  ];
  return sources
    .map(({ id, label, activity }) => ({
      id,
      label,
      voicings: sectionVoicings(flow, section, chords, activity),
    }))
    .filter((set) => set.voicings.some((v) => v !== null));
}

/**
 * Where the section's own bass writing starts: every note of a Bass section,
 * the left hand of a Performance step that gives it the bass. Null where the
 * student's writing has no bass.
 */
function bassFloor(
  steps: readonly ActivityStepV2[],
  sectionId: ActivitySectionId,
): number | null {
  const midis = steps.flatMap((step) => {
    if (sectionId === 'C') return (step.targetNotes ?? []).map((n) => n.midi);
    if (sectionId !== 'D' || step.instrument_config?.lh_role !== 'bass')
      return [];
    return (step.targetNotes ?? [])
      .filter((n) => n.hand === 'lh')
      .map((n) => n.midi);
  });
  return midis.length ? Math.min(...midis) : null;
}

// ── Clips ────────────────────────────────────────────────────────────────────

/**
 * One part's notes as a Studio clip, trimmed to the loop.
 *
 * `buildBackingNotes` appends a copy of bar 1's beat-one content at the
 * downbeat *after* the last bar, to end a one-shot play-along on the tonic.
 * A looping Practice Track already returns to bar 1 there, so that copy would
 * double every note at the seam — trimming to `LOOP_TICKS` drops it.
 */
function toClip(
  notes: BackingNote[],
  part: EnginePart,
  name: string,
  transpose = 0,
  loopTicks = LOOP_TICKS,
): MidiClip | null {
  const events = notes
    .filter(
      (note) => note.part === part && !note.voice && note.onset < loopTicks,
    )
    .sort((a, b) => a.onset - b.onset)
    .map((note) => ({
      note: note.note + transpose,
      velocity: note.velocity,
      startTick: note.onset,
      durationTicks: Math.max(
        1,
        Math.min(note.duration, loopTicks - note.onset),
      ),
      channel: 0,
    }));
  if (events.length === 0) return null;
  return {
    id: crypto.randomUUID(),
    name,
    startTick: 0,
    durationTicks: loopTicks,
    events,
  };
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Build the Practice Track for one section of one genre level, or null when
 * that section has no authored content to practise over.
 */
export function buildGenrePracticeTrack(
  flow: ActivityFlowV2,
  sectionId: ActivitySectionId,
  options: GenrePracticeTrackOptions = {},
): GenrePracticeTrackResult | null {
  const section = flow.sections.find((s) => s.id === sectionId);
  if (!section || !sectionHasContent(section)) return null;

  const step = sourceStep(section);
  // The groove toggle (D-088): a level of several styles plays the chosen
  // one's pairing, else the section's own style.
  const levelStyles = lessonStylesForLevel(flow.genre, flow.level);
  const style =
    (options.styleId ? getLessonStyle(options.styleId) : undefined) ??
    lessonStyleFor(flow.genre, flow.level, step?.styleRef);
  const styleRef = style?.styleRefs?.[0] ?? step?.styleRef ?? 'l1a';
  // The style's key: a level in two keys (Latin L1's Mariachi is in G major)
  // names it on that style's steps (stepKeyLabel), and the track follows.
  const keyStep =
    (style?.styleRefs &&
      flow.sections
        .flatMap((s) => s.steps)
        .find((s) => style.styleRefs!.includes(s.styleRef))) ||
    step;
  const keyRootMidi = stepKeyRoot(flow, keyStep);
  const keyLabel = stepKeyLabel(flow, keyStep);
  const mode = stepMode(flow, keyStep);
  const loop = resolveLoop(flow, step, keyLabel, mode);
  const { grooveId } = loop;
  const chosenChords = options.chords?.filter(
    (symbol) => chordSymbolTones(symbol) !== null,
  );
  const chords = chosenChords?.length ? chosenChords : loop.chords;
  const { engine, student } = SECTION_PARTS[sectionId];
  // The meter (D-085): a style's paired groove brings its own (a mariachi
  // vals turns the track into 3/4), else the level's. The loop is LOOP_BARS
  // of its bars.
  const pairedDrums = style ? pairingForStyle(style)?.drums : undefined;
  const timeSignature: [number, number] =
    pairedDrums?.timeSignature ?? stepTimeSignature(step, flow);
  const barLength = meterBarTicks(timeSignature);
  const loopTicks = LOOP_BARS * barLength;
  /**
   * Which writing the register and keyboard are measured from: the source step
   * alone where it has notes, else the whole section.
   *
   * The step, not the section, because a section's steps are written for
   * different hand configurations — Funk L2's Performance section has a step
   * with the left hand down on a bass A2 and another with it up on funk9
   * voicings at C4 under a right hand reaching D6. Measured together they span
   * four octaves, which no keyboard on this screen can show; measured on the one
   * step the Practice Track was built from, the window is exact.
   */
  const measured =
    (step?.targetNotes?.length ?? 0) > 0 ? [step!] : section.steps;

  const [tempoLow, tempoHigh] = flow.params.tempoRange;
  const bpm =
    options.bpm ??
    flow.params.practiceTrack?.bpm ??
    step?.tempo ??
    Math.round((tempoLow + tempoHigh) / 2);

  // A synthetic step, so the engine generates the parts this section's student
  // isn't playing, over the resolved loop. No target notes: the chord timeline
  // then places one chord per bar (chordTimeline.ts `perBar`) instead of
  // following some exercise's hits, which is what a looping vamp wants.
  const backingStep: ActivityStepV2 = {
    ...(step ?? ({} as ActivityStepV2)),
    chordSymbols: chords,
    grooveId,
    targetNotes: [],
    variants: undefined,
    backing_parts: { engine_generates: engine, student_plays: student },
  };

  const notes = buildBackingNotes(
    backingStep,
    keyRootMidi,
    flow.level,
    styleRef,
    [],
    flow.genre,
    0,
    swingPercent(
      flow.params.practiceTrack?.swing ?? step?.swing ?? flow.params.swing,
    ),
    timeSignature,
  );

  const clips: Partial<Record<EnginePart, MidiClip>> = {};
  const names: Record<EnginePart, string> = {
    drums: 'Drums',
    bass: 'Bass',
    chords: 'Chords',
  };
  const chordShift = chordOctaveShift(measured, student);
  for (const part of engine) {
    const clip = toClip(
      notes,
      part,
      names[part],
      part === 'chords' ? chordShift : 0,
      loopTicks,
    );
    if (clip) clips[part] = clip;
  }

  // Band layers on their own instruments: a clip each, the chords' octave
  // shift applied to the chord-part layers as to the chords.
  const layerClips: PracticeLayerClip[] = [];
  for (const part of engine) {
    const voiced = new Map<string, BackingNote[]>();
    for (const n of notes)
      if (n.part === part && n.voice)
        voiced.set(n.voice.layer, [...(voiced.get(n.voice.layer) ?? []), n]);
    for (const own of voiced.values()) {
      const { voice } = own[0];
      const clip = toClip(
        own.map(({ voice: _v, ...n }) => n),
        part,
        voice!.name,
        part === 'chords' ? chordShift : 0,
        loopTicks,
      );
      if (clip)
        layerClips.push({
          layer: voice!.layer,
          name: voice!.name,
          sound: voice!.sound,
          volume: voice!.volume,
          part,
          clip,
        });
    }
  }

  const sets =
    sectionId === 'B' || sectionId === 'D'
      ? voicingSets(flow, section, chords)
      : null;

  return {
    genre: flow.genre,
    level: flow.level,
    section: sectionId,
    sectionName: section.name,
    keyLabel,
    keyRootPc: ((keyRootMidi % 12) + 12) % 12,
    mode,
    bpm,
    loopTicks,
    timeSignature,
    chordCycle: chords,
    chordRegions: buildChordRegions(chords, keyRootMidi, mode, barLength),
    clips,
    layerClips,
    studentParts: student,
    melodyFloor: melodyFloor(measured) ?? MELODY_FLOOR_FALLBACK,
    studentRange: studentRange(measured),
    scales: flowPracticeScales(flow, style?.styleRefs),
    voicingSets: sets,
    bassFloor: bassFloor(measured, sectionId),
    defaultVoicing: sets
      ? (sets.find(
          (set) => set.id === flow.params.practiceTrack?.defaultVoicing,
        )?.id ??
        sets[0]?.id ??
        null)
      : null,
    sourceDirection:
      flow.params.practiceTrack?.directions?.[sectionId] ??
      step?.direction ??
      null,
    grooveId,
    styles:
      levelStyles.length > 1
        ? levelStyles.map(({ id, name }) => ({ id, name }))
        : [],
    styleId: levelStyles.length > 1 ? (style?.id ?? null) : null,
    progressions: (() => {
      const all = levelProgressions(flow);
      const id = chords.join(' ');
      return all.some((p) => p.id === id)
        ? all
        : [
            {
              id,
              label: chords.map(formatAccidentalsForDisplay).join(' – '),
              chords,
            },
            ...all,
          ];
    })(),
    progressionId: chords.join(' '),
    ...lessonSounds(flow, step, backingStep, styleRef),
    ...(flowInstrument(flow) === 'guitar'
      ? { guitar: guitarPracticeInfo(flow, section) }
      : {}),
  };
}

/**
 * What a guitar Practice Track draws: the section's key center, the scale
 * position it plays from (the level's first when the section has none of its
 * own, as Chords doesn't), and every chord shape the section plays (the
 * level's when it plays none, as Melody doesn't), in the order first met.
 */
export function guitarPracticeInfo(
  flow: ActivityFlowV2,
  section: ActivitySectionV2,
): GuitarPracticeInfo {
  const own = section.steps.filter((step) => step.guitar);
  const all = flow.sections.flatMap((s) => s.steps).filter((s) => s.guitar);
  const scaleOf = (steps: ActivityStepV2[]) =>
    steps.find((step) => step.guitar?.scalePosition)?.guitar?.scalePosition;
  const shapesOf = (steps: ActivityStepV2[]) => [
    ...new Set(steps.flatMap((step) => step.guitar?.shapeIds ?? [])),
  ];
  const shapeIds = shapesOf(own);
  return {
    keyCenter: own[0]?.guitar?.keyCenter ?? flowGuitarCenterId(flow),
    scalePosition: scaleOf(own) ?? scaleOf(all) ?? null,
    shapeIds: shapeIds.length > 0 ? shapeIds : shapesOf(all),
  };
}
