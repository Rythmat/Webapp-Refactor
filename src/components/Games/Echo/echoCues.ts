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
// hear:
//
//   Get Ready  the count-in (the boss's later calls have none)
//   Listen     Atlas's call, its scale degrees lighting as they sound
//   Go!        the call's last beat and the answer's first
//   Your Turn  the rest of the answer
//
// Read off the call's own timeline, beat by beat, as the lesson's are.

const BEAT = 480;

const cue = (name: TurnCue): HubHeadline => ({
  kind: 'cue',
  cue: name,
  text: TURN_CUE_TEXT[name],
});

/** The hub's headline at `tick` of a call's run; `idle` out of a run. */
export function echoHeadline(
  timeline: StepTimeline,
  tick: number,
  running: boolean,
  idle: string,
): HubHeadline {
  if (!running || tick < 0) return { kind: 'idle', text: idle };
  const turn = timeline.response.start;
  const go = Math.max(timeline.call.start, turn - BEAT);
  if (tick < timeline.call.start) return cue('getReady');
  if (tick < go) return cue('listen');
  if (tick < turn + BEAT) return cue('go');
  return { kind: 'turn', text: 'Your Turn' };
}
