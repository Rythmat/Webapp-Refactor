import { echoCountOff } from '@/curriculum/engine/echo';
import type { StepTimeline } from '@/curriculum/engine/musicLiteracy/literacy';
import {
  TURN_CUE_TEXT,
  type HubHeadline,
  type TurnCue,
} from '@/curriculum/musicLiteracy/turnCues';

// ── What the hub says in Echo ──────────────────────────────────────────────
// Music Literacy's cues (turnCues.ts), in the order an echo needs them. A
// lesson sings its words first, so LISTEN comes over the count-in and GET
// READY over the call; Echo has no words, and the call is the thing to
// hear. Then a bar's rest, counted off, so the student can take the call in
// and get ready (the owner's "1, 2, Ready, Go"):
//
//   Get Ready  the count-in (the boss's later calls: the bar between)
//   Listen     Atlas's call, its scale degrees lighting as they sound
//   1, 2       the count-off's first two beats
//   Ready      its third
//   Go!        its last, held into the answer's first beat
//   Your Turn  the rest of the answer
//
// Read off the call's own timeline, beat by beat, as the lesson's are.

const BEAT = 480;

const cue = (name: TurnCue, text = TURN_CUE_TEXT[name]): HubHeadline => ({
  kind: 'cue',
  cue: name,
  text,
});

/** The count-off's beats before its last, which says Go!. */
const COUNT_OFF: readonly HubHeadline[] = [
  cue('countOff', '1'),
  cue('countOff', '2'),
  cue('countOff'),
];

/** The hub's headline at `tick` of a call's run; `idle` out of a run. */
export function echoHeadline(
  timeline: StepTimeline,
  tick: number,
  running: boolean,
  idle: string,
): HubHeadline {
  if (!running || tick < 0) return { kind: 'idle', text: idle };
  const off = echoCountOff(timeline);
  const turn = timeline.response.start;
  if (tick < timeline.call.start) return cue('getReady');
  if (tick < off.start) return cue('listen');
  if (tick < turn) {
    const beat = Math.floor((tick - off.start) / BEAT);
    // The last beat says Go!, however long the count-off.
    const left = Math.floor((turn - 1 - tick) / BEAT);
    return left === 0 ? cue('go') : COUNT_OFF[Math.min(beat, 2)];
  }
  if (tick < turn + BEAT) return cue('go');
  return { kind: 'turn', text: 'Your Turn' };
}
