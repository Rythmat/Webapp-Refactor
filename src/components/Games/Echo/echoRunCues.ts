import {
  chordEchoNotes,
  melodyEchoNotes,
  type EchoCall,
} from '@/curriculum/engine/echo';
import type {
  ChordAttack,
  StepTimeline,
  TimedNote,
} from '@/curriculum/engine/musicLiteracy/literacy';
import {
  createRunCues,
  phaseAt,
  type RunCue,
  type RunGroove,
  type RunSegment,
} from '@/curriculum/engine/musicLiteracy/run';

// ── An Echo run, as cues on the transport ──────────────────────────────────
// A round is one run: a bar of count-in, Atlas's call (sounded and lit), then
// the student's bars. The Final Boss is one run of four: its calls back to
// back after one count-in (grading.ts bossTimelines). Either is played by
// Music Literacy's runner (literacyRun.ts) from these cues, so the pulse,
// the hub's cues and the drums behave as they do in a lesson:
//
//   beats    every beat, the count-in clicking, the click past it the
//            setting's; each beat says whose turn it is in its own call
//   notes    the call's, sounded and lit; the answer's, silent and dark,
//            so the hub lights the scale degree to play as it comes round
//   drums    from the first call's downbeat to the end, then a kick and a
//            crash on the final downbeat (run.ts createRunCues)
//
// Ticks are from the run's first count-in click.

/** One call of a run, laid out: its notes on the run's ticks. */
export interface RunCall {
  call: EchoCall;
  timeline: StepTimeline;
  /** The call's notes, then the answer's (a chord call: every chord tone). */
  notes: { call: TimedNote[]; response: TimedNote[] };
  /** A chord call's strikes, call and answer; empty for a melody. */
  attacks: { call: ChordAttack[]; response: ChordAttack[] };
}

/** A call placed on its timeline. */
export function placeCall(call: EchoCall, timeline: StepTimeline): RunCall {
  if (call.kind === 'melody') {
    const notes = melodyEchoNotes(call, timeline);
    return {
      call,
      timeline,
      notes: { call: notes.call, response: notes.response },
      attacks: { call: [], response: [] },
    };
  }
  const strikes = chordEchoNotes(call, timeline);
  return {
    call,
    timeline,
    notes: { call: strikes.callNotes, response: strikes.responseNotes },
    attacks: { call: strikes.call, response: strikes.response },
  };
}

/** The whole run as one timeline: the first call's count-in to the last end. */
export function wholeTimeline(calls: readonly RunCall[]): StepTimeline {
  const first = calls[0].timeline;
  const last = calls[calls.length - 1].timeline;
  return { ...first, total: last.total };
}

/** Which of the run's calls `tick` is in (its count-in counts as the first's). */
export function callIndexAt(calls: readonly RunCall[], tick: number): number {
  const at = calls.findIndex((c) => tick < c.timeline.total);
  return at === -1 ? calls.length - 1 : at;
}

const ORDER: Record<RunCue['kind'], number> = {
  noteEnd: 0,
  beat: 1,
  drum: 2,
  note: 3,
  end: 4,
};

function noteCues(
  notes: readonly TimedNote[],
  segment: RunSegment,
  heard: boolean,
): RunCue[] {
  return notes.flatMap((note): RunCue[] => [
    {
      kind: 'note',
      tick: note.onset,
      segment,
      index: note.index,
      midi: note.midi,
      duration: note.duration,
      sound: heard,
      light: heard,
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

export interface EchoRunOptions {
  /** The click past the count-in. */
  metronome: boolean;
  /** The drum groove to play over, if any. */
  groove?: RunGroove | null;
}

/** Every cue of a run of these calls, in the order they happen. */
export function echoRunCues(
  calls: readonly RunCall[],
  { metronome, groove }: EchoRunOptions,
): RunCue[] {
  const whole = wholeTimeline(calls);
  const frame = createRunCues(
    { timeSignature: [4, 4] },
    { timeline: whole },
    { metronome, groove },
  ).map((cue) => {
    if (cue.kind !== 'beat' || cue.tick >= whole.total) return cue;
    // Each beat's turn, read off its own call's timeline.
    const own = calls[callIndexAt(calls, cue.tick)].timeline;
    const phase = phaseAt(own, cue.tick, own.call.start);
    return phase ? { ...cue, phase } : cue;
  });
  return [
    ...frame,
    ...calls.flatMap((c) => [
      ...noteCues(c.notes.call, 'call', true),
      ...noteCues(c.notes.response, 'response', false),
    ]),
  ].sort((a, b) => a.tick - b.tick || ORDER[a.kind] - ORDER[b.kind]);
}
