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
 */

import type {
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { stepNotes, type StepTimeline, type TimedNote } from './literacy';

export type RunMode = 'listen' | 'practice' | 'play';

/** Whose turn: the count-in, the teacher's words and call, the student's bars. */
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

export type RunCue = BeatCue | NoteCue | NoteEndCue | EndCue;

export interface RunOptions {
  /** The metronome setting: the click past the count-in. */
  metronome: boolean;
}

/** Same tick: a key lets go before it's struck again, then the beat, then the note. */
const ORDER: Record<RunCue['kind'], number> = {
  noteEnd: 0,
  beat: 1,
  note: 2,
  end: 3,
};

/** Whose turn it is at `tick` (null before the first beat and after the last). */
export function phaseAt(timeline: StepTimeline, tick: number): RunPhase | null {
  if (tick < 0 || tick >= timeline.total) return null;
  if (tick < timeline.words.start) return 'countIn';
  if (tick < timeline.call.start) return 'words';
  if (tick < timeline.response.start) return 'call';
  return 'response';
}

function noteCues(
  notes: readonly TimedNote[],
  segment: RunSegment,
  sound: boolean,
  light: boolean,
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

/** Every cue of one run, in the order it happens. */
export function runCues(
  lesson: MusicLiteracyLesson,
  step: LiteracyStep,
  mode: RunMode,
  { metronome }: RunOptions,
): RunCue[] {
  const { timeline, words, call, response } = stepNotes(lesson, step);
  const [beatsPerBar] = lesson.timeSignature;
  const beatTicks = timeline.barTicks / beatsPerBar;

  const cues: RunCue[] = [];
  for (let tick = 0; tick < timeline.total; tick += beatTicks) {
    const phase = phaseAt(timeline, tick)!;
    const beat = Math.round((tick % timeline.barTicks) / beatTicks);
    cues.push({
      kind: 'beat',
      tick,
      beat,
      phase,
      // The count-in always counts; past it the click is the setting's.
      click: phase === 'countIn' || metronome,
      downbeat: beat === 0,
    });
  }
  cues.push(
    ...noteCues(words, 'words', true, true),
    ...noteCues(call, 'call', true, true),
    ...noteCues(response, 'response', mode === 'listen', mode !== 'play'),
    { kind: 'end', tick: timeline.total },
  );
  return cues.sort((a, b) => a.tick - b.tick || ORDER[a.kind] - ORDER[b.kind]);
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
    case 'end':
      return { ...view, ended: true, hub: null, lit: [] };
  }
}
