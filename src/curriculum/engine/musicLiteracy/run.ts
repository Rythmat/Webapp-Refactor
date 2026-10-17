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

/** Every cue of one run, in the order it happens. */
export function runCues(
  lesson: MusicLiteracyLesson,
  step: LiteracyStep,
  mode: RunMode,
  { metronome, groove }: RunOptions,
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
  );
  if (!groove) {
    cues.push({ kind: 'end', tick: timeline.total });
    return inOrder(cues);
  }
  // The drums keep time from the words to the response's last bar line,
  // land the final downbeat on it, and let it ring before the end.
  cues.push(
    ...grooveCues(groove, timeline.words.start, timeline.total),
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
  );
  return inOrder(cues);
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
    case 'drum':
      // Heard, not drawn.
      return before;
    case 'end':
      return { ...view, ended: true, hub: null, lit: [] };
  }
}
