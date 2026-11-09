import {
  BEAT_TICKS,
  chordEchoNotes,
  echoCountOff,
  melodyEchoNotes,
  type EchoCall,
} from '@/curriculum/engine/echo';
import type {
  ChordAttack,
  StepTimeline,
  TimedNote,
} from '@/curriculum/engine/musicLiteracy/literacy';
import {
  FINAL_DOWNBEAT_BEATS,
  createRunCues,
  phaseAt,
  type RunCue,
  type RunGroove,
  type RunSegment,
} from '@/curriculum/engine/musicLiteracy/run';

// ── An Echo run, as cues on the transport ──────────────────────────────────
// A round is one run: a bar of count-in, Atlas's call (sounded and lit), a
// bar's rest counted off, then the student's bars and the final downbeat.
// The Final Boss is one run of four: its calls one after another after one
// count-in (echoFlow.ts bossRunTimelines). Either is played by Music
// Literacy's runner (literacyRun.ts) from these cues, so the pulse, the
// hub's cues and the drums behave as they do in a lesson:
//
//   beats    every beat, the count-in and the count-off clicking, the click
//            elsewhere the setting's; each beat says whose turn it is in its
//            own call (the count-off's are the count-in's: getting ready)
//   notes    the call's, sounded and lit; the answer's, silent and dark,
//            so the hub lights the scale degree to play as it comes round
//   drums    from the first call's downbeat to the end, then a kick and a
//            crash on the final downbeat (run.ts createRunCues); with no
//            drums, the final downbeat is a click
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

/**
 * A call's answer as cues, silent and dark: what a teacher's call adds to
 * the run under way once it's been played (literacyRun.ts
 * addLiteracyRunCues), so the hub lights each degree as it comes round.
 */
export const answerCues = (placed: RunCall): RunCue[] =>
  noteCues(placed.notes.response, 'response', false);

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
  ).flatMap((cue): RunCue[] => {
    // With no drums the run would end on the last bar line: it lands a
    // final downbeat there instead, a click, and rings as the drums' does.
    if (cue.kind === 'end' && !groove) {
      return [
        {
          kind: 'beat',
          tick: whole.total,
          beat: 0,
          phase: 'response',
          click: true,
          downbeat: true,
        },
        { kind: 'end', tick: whole.total + FINAL_DOWNBEAT_BEATS * BEAT_TICKS },
      ];
    }
    if (cue.kind !== 'beat' || cue.tick >= whole.total) return [cue];
    // Each beat's turn, read off its own call's timeline; the count-off
    // counts out loud, as the count-in does.
    const own = calls[callIndexAt(calls, cue.tick)].timeline;
    const off = echoCountOff(own);
    if (cue.tick >= off.start && cue.tick < off.start + off.length) {
      return [{ ...cue, phase: 'countIn', click: true }];
    }
    const phase = phaseAt(own, cue.tick, own.call.start);
    return [phase ? { ...cue, phase } : cue];
  });
  return [
    ...frame,
    ...calls.flatMap((c) => [
      ...noteCues(c.notes.call, 'call', true),
      ...noteCues(c.notes.response, 'response', false),
    ]),
  ].sort((a, b) => a.tick - b.tick || ORDER[a.kind] - ORDER[b.kind]);
}
