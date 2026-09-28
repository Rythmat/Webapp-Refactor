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
import {
  buildBackingNotes,
  getGrooveForStyleRef,
  type BackingNote,
} from '@/curriculum/engine/genreGeneration/backingPatterns';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type {
  ActivityFlowV2,
  ActivitySectionV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import {
  flowKeyLabel,
  flowKeyRoot,
  flowMode,
} from '@/curriculum/utils/flowKey';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import { nextChordId, type ChordRegion } from '@/daw/store/prismSlice';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { formatChord, normalizeQuality, parseChord } from '@/lib/chordNotation';
import { flowPracticeScales, type PracticeScale } from './practiceScales';

// ── Constants ────────────────────────────────────────────────────────────────

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
  /** Chord symbols, one per bar, as the chart draws them. */
  chordCycle: string[];
  /** One region per bar across the whole loop — the Studio's chord lane. */
  chordRegions: ChordRegion[];
  /** The engine's parts. A part this section's student plays is absent. */
  clips: Partial<Record<EnginePart, MidiClip>>;
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
  /** The source step's own instruction, as the first improvisation prompt. */
  sourceDirection: string | null;
  grooveId: string;
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
      ? step.chordSymbols
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
      startTick: bar * BAR_TICKS,
      endTick: (bar + 1) * BAR_TICKS,
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
): MidiClip | null {
  const events = notes
    .filter((note) => note.part === part && note.onset < LOOP_TICKS)
    .sort((a, b) => a.onset - b.onset)
    .map((note) => ({
      note: note.note + transpose,
      velocity: note.velocity,
      startTick: note.onset,
      durationTicks: Math.max(
        1,
        Math.min(note.duration, LOOP_TICKS - note.onset),
      ),
      channel: 0,
    }));
  if (events.length === 0) return null;
  return {
    id: crypto.randomUUID(),
    name,
    startTick: 0,
    durationTicks: LOOP_TICKS,
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
  options: { bpm?: number } = {},
): GenrePracticeTrackResult | null {
  const section = flow.sections.find((s) => s.id === sectionId);
  if (!section || !sectionHasContent(section)) return null;

  const step = sourceStep(section);
  const keyRootMidi = flowKeyRoot(flow);
  const keyLabel = flowKeyLabel(flow);
  const mode = flowMode(flow);
  const { chords, grooveId } = resolveLoop(flow, step, keyLabel, mode);
  const { engine, student } = SECTION_PARTS[sectionId];
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
    step?.styleRef ?? 'l1a',
    [],
    flow.genre,
    0,
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
    );
    if (clip) clips[part] = clip;
  }

  return {
    genre: flow.genre,
    level: flow.level,
    section: sectionId,
    sectionName: section.name,
    keyLabel,
    keyRootPc: ((keyRootMidi % 12) + 12) % 12,
    mode,
    bpm,
    loopTicks: LOOP_TICKS,
    chordCycle: chords,
    chordRegions: buildChordRegions(chords, keyRootMidi, mode),
    clips,
    studentParts: student,
    melodyFloor: melodyFloor(measured) ?? MELODY_FLOOR_FALLBACK,
    studentRange: studentRange(measured),
    scales: flowPracticeScales(flow),
    sourceDirection: step?.direction ?? null,
    grooveId,
  };
}
