/**
 * One run of a Music Literacy step, as cues on its timeline: the count-in
 * clicks, every note of the words, the call and the response, and the turn
 * changing hands. Pure, so the scheduling maths is tested without Tone; the
 * player (curriculum/musicLiteracy/literacyRun.ts) puts each cue on the
 * transport, sounds it there and draws it with Tone.getDraw().
 *
 *   Listen    the whole step, the response played by the app
 *   Practice  the same run, the response keys lit, not scored
 *   Play      the graded run: the student plays the response alone
 *
 * Every run lights the hub's scale degrees as the call sounds and as the
 * response should be played, whatever the mode.
 *
 * With a drum groove chosen (Settings), the drums come in on the words'
 * first beat and loop to the end of the response, on the same ticks as
 * everything else; then a final downbeat, a kick and a crash together, and
 * the run ends once they've rung. The count-in still clicks. Nothing else
 * moves: the response's window and its grading are the same either way.
 *
 * Words with a pickup sing it at the end of the count-in, which clicks on
 * under it; the teacher's turn starts with its first syllable, and the
 * drums still come in on the words' downbeat.
 *
 * Part 2 (passes.ts) runs the same way in the student's key (pass their
 * choices). The challenge is a Play run with `challenge` set: the same
 * cues, Atlas still playing the words and the call, but the student plays
 * along, so those notes and their beats are marked `playAlong`. The create
 * pass has cues of its own (createRunCues): count-in, the student's call,
 * their repeat, on one pulse, with no Atlas notes at all.
 */

import type {
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import type { LiteracyChoices } from './choices';
import type { CreatePass } from './createPass';
import { stepNotes, type StepTimeline, type TimedNote } from './literacy';

export type RunMode = 'listen' | 'practice' | 'play';

/**
 * Whose turn: the count-in, the teacher's words and call, the student's bars.
 * In a create run (createRunCues) 'call' is the student's own call and
 * 'response' their repeat of it.
 */
export type RunPhase = 'countIn' | 'words' | 'call' | 'response';

export type RunSegment = 'words' | 'call' | 'response';

/** A beat of the run: the pulse dots, and the click when it clicks. */
export interface BeatCue {
  kind: 'beat';
  tick: number;
  /** Beat within its bar, from 0. */
  beat: number;
  phase: RunPhase;
  click: boolean;
  downbeat: boolean;
  /** The challenge: the teacher's turn, which the student plays along with. */
  playAlong?: true;
}

export interface NoteCue {
  kind: 'note';
  tick: number;
  segment: RunSegment;
  index: number;
  midi: number;
  duration: number;
  /** The app plays it. */
  sound: boolean;
  /** Its key lights while it lasts. */
  light: boolean;
  /** The challenge: Atlas plays it and the student plays it too, graded. */
  playAlong?: true;
}

export interface NoteEndCue {
  kind: 'noteEnd';
  tick: number;
  segment: RunSegment;
  index: number;
  midi: number;
}

/** The last bar is over: time to grade. */
export interface EndCue {
  kind: 'end';
  tick: number;
}

/** A drum hit: heard, never drawn. */
export interface DrumCue {
  kind: 'drum';
  tick: number;
  /** General MIDI pad note (36 kick, 49 crash…). */
  note: number;
  /** 1–127. */
  velocity: number;
}

export type RunCue = BeatCue | NoteCue | NoteEndCue | DrumCue | EndCue;

/** One hit of a groove's loop, in ticks from the loop's start. */
export interface GrooveHit {
  tick: number;
  note: number;
  velocity: number;
}

/**
 * A drum groove to play along with: one loop of it, its swing and feel
 * already in the hits' ticks (literacyGrooves.ts builds it).
 */
export interface RunGroove {
  /** The loop's length in ticks; it repeats from the words to the end. */
  loopTicks: number;
  hits: readonly GrooveHit[];
  /** The groove's pad trims, so its final downbeat sits in its own mix. */
  padGains?: Partial<Record<number, number>>;
}

export interface RunOptions {
  /** The click past the count-in. */
  metronome: boolean;
  /** The drums to play along with, if any. */
  groove?: RunGroove | null;
  /** The student's choices: a Part 2 step plays in their key. */
  choices?: LiteracyChoices | null;
  /**
   * The challenge pass (passes.ts): the student plays every note along with
   * Atlas, so the words and the call, and their beats, are `playAlong`.
   * Nothing else changes: the timeline, the sounds, the drums.
   */
  challenge?: boolean;
}

/** The final downbeat: a kick and a crash cymbal, together (General MIDI). */
export const FINAL_DOWNBEAT_NOTES = [36, 49] as const;

/** Struck as an accent (drumGroove.ts VELOCITY_LEVELS). */
const FINAL_DOWNBEAT_VELOCITY = 112;

/**
 * How long the final downbeat has, in beats, before the run ends and the
 * result shows: its own beat and one more to ring. Past the response, so
 * the grading never hears it.
 */
export const FINAL_DOWNBEAT_BEATS = 2;

/**
 * Same tick: a key lets go before it's struck again, then the beat, the
 * drums, the note, and last the end.
 */
const ORDER: Record<RunCue['kind'], number> = {
  noteEnd: 0,
  beat: 1,
  drum: 2,
  note: 3,
  end: 4,
};

/**
 * Whose turn it is at `tick` (null before the first beat and after the
 * last). The teacher's starts on the words' downbeat, or at `firstWord`
 * when it comes before: a pickup's first syllable, in the count-in.
 */
export function phaseAt(
  timeline: StepTimeline,
  tick: number,
  firstWord = timeline.words.start,
): RunPhase | null {
  if (tick < 0 || tick >= timeline.total) return null;
  if (tick < Math.min(firstWord, timeline.words.start)) return 'countIn';
  if (tick < timeline.call.start) return 'words';
  if (tick < timeline.response.start) return 'call';
  return 'response';
}

function noteCues(
  notes: readonly TimedNote[],
  segment: RunSegment,
  sound: boolean,
  light: boolean,
  playAlong = false,
): RunCue[] {
  return notes.flatMap((note): RunCue[] => [
    {
      kind: 'note',
      tick: note.onset,
      segment,
      index: note.index,
      midi: note.midi,
      duration: note.duration,
      sound,
      light,
      ...(playAlong ? { playAlong: true as const } : {}),
    },
    {
      kind: 'noteEnd',
      tick: note.onset + note.duration,
      segment,
      index: note.index,
      midi: note.midi,
    },
  ]);
}

/**
 * A hit this close before the final downbeat is that downbeat played a
 * touch early (a performance's feel; drumGroove.ts splitFeel's window): the
 * final downbeat takes its place rather than flamming with it.
 */
const AHEAD_OF_THE_DOWNBEAT = 30;

/** The groove's hits from `from` up to the final downbeat at `to`, looped. */
function grooveCues(groove: RunGroove, from: number, to: number): DrumCue[] {
  const cues: DrumCue[] = [];
  if (groove.loopTicks <= 0) return cues;
  const last = to - AHEAD_OF_THE_DOWNBEAT;
  for (let start = from; start < last; start += groove.loopTicks) {
    for (const hit of groove.hits) {
      const tick = start + hit.tick;
      if (hit.tick < 0 || hit.tick >= groove.loopTicks || tick >= last) {
        continue;
      }
      cues.push({ kind: 'drum', tick, note: hit.note, velocity: hit.velocity });
    }
  }
  return cues;
}

/** The kick and crash on `tick`, at the groove's own levels. */
function finalDownbeat(groove: RunGroove, tick: number): DrumCue[] {
  return FINAL_DOWNBEAT_NOTES.map((note) => ({
    kind: 'drum',
    tick,
    note,
    velocity: Math.max(
      1,
      Math.min(
        127,
        Math.round(FINAL_DOWNBEAT_VELOCITY * (groove.padGains?.[note] ?? 1)),
      ),
    ),
  }));
}

/** The cues in the order they happen (ORDER breaks a tie). */
function inOrder(cues: RunCue[]): RunCue[] {
  return cues.sort((a, b) => a.tick - b.tick || ORDER[a.kind] - ORDER[b.kind]);
}

/** The pulse: a beat cue on every beat of the run. */
function beatCues(
  timeline: StepTimeline,
  beatsPerBar: number,
  metronome: boolean,
  firstWord: number,
  playAlong: boolean,
): BeatCue[] {
  const beatTicks = timeline.barTicks / beatsPerBar;
  const cues: BeatCue[] = [];
  for (let tick = 0; tick < timeline.total; tick += beatTicks) {
    const beat = Math.round((tick % timeline.barTicks) / beatTicks);
    const phase = phaseAt(timeline, tick, firstWord)!;
    cues.push({
      kind: 'beat',
      tick,
      beat,
      phase,
      // The count-in always counts, under a pickup too; past it the click
      // is the setting's.
      click: tick < timeline.words.start || metronome,
      downbeat: beat === 0,
      ...(playAlong && (phase === 'words' || phase === 'call')
        ? { playAlong: true as const }
        : {}),
    });
  }
  return cues;
}

/**
 * The run's end: with no groove, at the last bar line; with one, the drums
 * keep time from `from` to it, land the final downbeat on it, and let it
 * ring before the end.
 */
function ending(
  timeline: StepTimeline,
  beatsPerBar: number,
  groove: RunGroove | null | undefined,
  from: number,
): RunCue[] {
  if (!groove) return [{ kind: 'end', tick: timeline.total }];
  const beatTicks = timeline.barTicks / beatsPerBar;
  return [
    ...grooveCues(groove, from, timeline.total),
    {
      kind: 'beat',
      tick: timeline.total,
      beat: 0,
      phase: 'response',
      click: false,
      downbeat: true,
    },
    ...finalDownbeat(groove, timeline.total),
    {
      kind: 'end',
      tick: timeline.total + FINAL_DOWNBEAT_BEATS * beatTicks,
    },
  ];
}

/** Every cue of one run, in the order it happens. */
export function runCues(
  lesson: MusicLiteracyLesson,
  step: LiteracyStep,
  mode: RunMode,
  { metronome, groove, choices, challenge = false }: RunOptions,
): RunCue[] {
  const { timeline, words, call, response } = stepNotes(lesson, step, choices);
  const [beatsPerBar] = lesson.timeSignature;

  // A pickup is the teacher's turn from its first syllable.
  const firstWord = Math.min(...words.map((note) => note.onset));
  return inOrder([
    ...beatCues(timeline, beatsPerBar, metronome, firstWord, challenge),
    ...noteCues(words, 'words', true, true, challenge),
    ...noteCues(call, 'call', true, true, challenge),
    ...noteCues(response, 'response', mode === 'listen', mode !== 'play'),
    // The drums come in on the words' downbeat.
    ...ending(timeline, beatsPerBar, groove, timeline.words.start),
  ]);
}

/**
 * A create pass's run (createPass.ts): the count-in, then the student's own
 * call and their repeat of it, back to back on one pulse. Atlas plays no
 * notes, since the call is the student's; the count-in clicks, the click
 * past it is the setting's, and a groove comes in on the call's downbeat
 * and lands its final downbeat after the repeat, as in any run. Phases:
 * 'countIn', then 'call' (theirs), then 'response' (the repeat).
 */
export function createRunCues(
  lesson: Pick<MusicLiteracyLesson, 'timeSignature'>,
  pass: Pick<CreatePass, 'timeline'>,
  { metronome, groove }: Pick<RunOptions, 'metronome' | 'groove'>,
): RunCue[] {
  const { timeline } = pass;
  const [beatsPerBar] = lesson.timeSignature;
  return inOrder([
    ...beatCues(timeline, beatsPerBar, metronome, timeline.call.start, false),
    ...ending(timeline, beatsPerBar, groove, timeline.call.start),
  ]);
}

/**
 * Cues lighting the keys of the student's own call during their repeat (a
 * Practice-style hint, if the player wants one): its notes on the repeat,
 * silent and lit. The player adds them once the call is transcribed.
 */
export function repeatLightCues(targets: readonly TimedNote[]): RunCue[] {
  return inOrder(noteCues(targets, 'response', false, true));
}

/**
 * A groove's first bar and its final downbeat: what choosing it in
 * Settings plays, at the step's tempo.
 */
export function groovePreviewCues(
  groove: RunGroove,
  barTicks: number,
  beatsPerBar: number,
): RunCue[] {
  return inOrder([
    ...grooveCues(groove, 0, barTicks),
    ...finalDownbeat(groove, barTicks),
    {
      kind: 'end',
      tick: barTicks + (FINAL_DOWNBEAT_BEATS * barTicks) / beatsPerBar,
    },
  ]);
}

// ── What the run shows ─────────────────────────────────────────────────────

/** The run as drawn: the pulse, the turn, the karaoke line, the hub, the keys. */
export interface RunView {
  /** The last cue's tick (-1 before the first). */
  tick: number;
  phase: RunPhase | null;
  /** The beat just counted (-1 before the first). */
  beat: number;
  /** The syllable being sung, or the words' length once they're over. */
  word: number;
  /** The scale degree lit in the hub. */
  hub: { segment: 'call' | 'response'; index: number } | null;
  /** Keys sounding (or due, in Practice) now. */
  lit: readonly number[];
  ended: boolean;
  /** The challenge: the teacher's turn, which the student plays along with. */
  playAlong?: boolean;
}

export const IDLE_RUN_VIEW: RunView = {
  tick: -1,
  phase: null,
  beat: -1,
  word: -1,
  hub: null,
  lit: [],
  ended: false,
};

/** The view once `cue` has happened. */
export function applyCue(
  before: RunView,
  cue: RunCue,
  wordCount: number,
): RunView {
  const view = { ...before, tick: Math.max(before.tick, cue.tick) };
  switch (cue.kind) {
    case 'beat':
      return {
        ...view,
        ...(cue.playAlong
          ? { playAlong: true }
          : view.playAlong
            ? { playAlong: false }
            : {}),
        beat: cue.beat,
        phase: cue.phase,
        // Past the words, every syllable reads as sung.
        word:
          cue.phase === 'call' || cue.phase === 'response'
            ? wordCount
            : view.word,
      };
    case 'note':
      return {
        ...view,
        ...(cue.playAlong ? { playAlong: true } : {}),
        // A pickup's first syllable, off the beat, starts the teacher's turn.
        phase:
          cue.segment === 'words' && view.phase === 'countIn'
            ? 'words'
            : view.phase,
        word: cue.segment === 'words' ? cue.index : view.word,
        hub:
          cue.segment === 'words'
            ? view.hub
            : { segment: cue.segment, index: cue.index },
        lit:
          cue.light && !view.lit.includes(cue.midi)
            ? [...view.lit, cue.midi]
            : view.lit,
      };
    case 'noteEnd': {
      const hubEnds =
        view.hub !== null &&
        cue.segment !== 'words' &&
        view.hub.segment === cue.segment &&
        view.hub.index === cue.index;
      return {
        ...view,
        hub: hubEnds ? null : view.hub,
        lit: view.lit.filter((midi) => midi !== cue.midi),
      };
    }
    case 'drum':
      // Heard, not drawn.
      return before;
    case 'end':
      return { ...view, ended: true, hub: null, lit: [] };
  }
}
