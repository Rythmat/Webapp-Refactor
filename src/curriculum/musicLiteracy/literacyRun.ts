// ── One Music Literacy run on the transport ────────────────────────────────
// Everything a run sounds and draws is scheduled here, on the one
// Tone.Transport, in ticks from the step's timeline (engine/musicLiteracy/
// run.ts makes the cues): the count-in and metronome clicks
// (learn/audio/metronomeClick.ts), the words, call and Listen's response on
// the lesson piano (learn/audio/practiceGuide.ts), the play-along groove and
// its final downbeat on the lesson drums (literacyDrums.ts), and every
// visual through Tone.getDraw(), drawn when it's heard rather than when it's
// queued. The drums are only heard: a groove's hundreds of hits never draw.
//
// The run's Tone.Part lives at module level, as every Learn sound does: a
// node built in useMemo and disposed in an effect cleanup ends up disposed
// for good under StrictMode (metronomeClick.ts tells that story). The player
// calls startLiteracyRun / stopLiteracyRun and reads the clock below.

import * as Tone from 'tone';
import { startPianoSampler } from '@/audio/pianoSampler';
import {
  createTransportClock,
  heardLatencySec,
  TRANSPORT_LEAD_SEC,
} from '@/curriculum/components/transportClock';
import { secondsPerTick } from '@/curriculum/engine/musicLiteracy/literacy';
import type { RunCue } from '@/curriculum/engine/musicLiteracy/run';
import { playClick, resetClickSpacing } from '@/learn/audio/metronomeClick';
import { playGuideNote } from '@/learn/audio/practiceGuide';
import { loadDrumKit, strikeDrum } from './literacyDrums';

/** The transport as every in-time lesson reads it (transportClock.ts). */
export const literacyClock = createTransportClock();

/** The teacher's notes at the guide's full level (it scales them itself). */
const TEACHER_VELOCITY = 1;

/** If the last cue's frame never draws (a hidden tab), end the run anyway. */
const WATCHDOG_SPARE_SEC = 1;

let part: Tone.Part<RunCue & { time: number }> | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
/** Bumped by every start and stop: a cue from an older run is never drawn. */
let generation = 0;
/** The run under way: seconds per tick, and what draws its cues. */
let running: {
  spt: number;
  run: number;
  draw: (cue: RunCue) => void;
} | null = null;

/**
 * A cue added to a run this close to the transport's scheduling horizon
 * (seconds) might never fire: it's drawn at once instead.
 */
const ADD_MARGIN_SEC = 0.05;

function disposePart(): void {
  if (!part) return;
  // Stopped just after the transport went back to zero, Tone can place the
  // stop a hair before it and throw; the part goes either way.
  try {
    part.stop();
  } catch {
    // Disposed below.
  }
  part.dispose();
  part = null;
}

/** Stop the run: the transport, its part and anything it was going to draw. */
export function stopLiteracyRun(): void {
  generation += 1;
  running = null;
  if (watchdog !== null) clearTimeout(watchdog);
  watchdog = null;
  disposePart();
  literacyClock.stop();
  const transport = Tone.getTransport();
  transport.cancel();
  transport.position = 0;
}

export interface LiteracyRunOptions {
  cues: readonly RunCue[];
  /** Quarter notes per minute. */
  tempo: number;
  /** Each cue but the drums', when it's heard. The last is `end`. */
  onCue: (cue: RunCue) => void;
  /** The drum kit the cues' drums play on, loaded before the start. */
  kit?: string;
  /**
   * When the run's tick 0 should sound, in Date.now() ms: a class's round,
   * started together on every device (Echo in the classroom). Left out, or
   * already past, the run starts at once.
   */
  startsAtMs?: number;
}

/**
 * Start a run. Resolves true once the transport is under way (the clock
 * reads real ticks), false if another start or a stop got there first.
 * Call it from the click that starts the run: the audio context resumes
 * on that gesture.
 */
export async function startLiteracyRun({
  cues,
  tempo,
  onCue,
  kit,
  startsAtMs,
}: LiteracyRunOptions): Promise<boolean> {
  stopLiteracyRun();
  const run = generation;
  await startPianoSampler();
  if (run !== generation) return false;
  if (kit !== undefined) {
    // No drums is no reason to stop the step: it runs on the click alone.
    await loadDrumKit(kit).catch((error: unknown) => {
      console.warn('[MusicLiteracy] the drums did not load', error);
    });
    if (run !== generation) return false;
  }

  const transport = Tone.getTransport();
  transport.bpm.value = tempo;
  resetClickSpacing();

  const spt = secondsPerTick(tempo);
  const draw = (cue: RunCue) => {
    if (run === generation) onCue(cue);
  };
  part = new Tone.Part<RunCue & { time: number }>(
    (time, cue) => {
      if (cue.kind === 'drum') {
        strikeDrum(cue.note, cue.velocity, time);
        return;
      }
      if (cue.kind === 'beat' && cue.click) playClick(cue.downbeat, time);
      if (cue.kind === 'note' && cue.sound) {
        playGuideNote(cue.midi, cue.duration * spt, TEACHER_VELOCITY, time);
      }
      Tone.getDraw().schedule(() => draw(cue), time + heardLatencySec());
    },
    cues.map((cue) => ({ ...cue, time: cue.tick * spt })),
  );
  part.start(0);
  running = { spt, run, draw };
  // Measured once the sounds are loaded, so a round set for a moment in
  // time starts then, however long the loading took. Tone schedules a
  // look-ahead past "now", which a start at a moment takes off.
  const lead =
    startsAtMs === undefined
      ? TRANSPORT_LEAD_SEC
      : Math.max(
          TRANSPORT_LEAD_SEC,
          (startsAtMs - Date.now()) / 1000 - Tone.getContext().lookAhead,
        );
  literacyClock.start(lead);

  const end = cues.find((cue) => cue.kind === 'end');
  if (end) {
    const seconds =
      lead + end.tick * spt + heardLatencySec() + WATCHDOG_SPARE_SEC;
    watchdog = setTimeout(() => draw(end), seconds * 1000);
  }

  await literacyClock.wait();
  return run === generation;
}

/**
 * Add cues to the run under way, as if it had them from the start: the
 * create pass lights the student's own call on the keys during their repeat
 * (run.ts repeatLightCues) once it's transcribed. A cue already due, or too
 * near to schedule, is drawn at once. Nothing happens with no run going.
 */
export function addLiteracyRunCues(cues: readonly RunCue[]): void {
  if (!part || !running || running.run !== generation) return;
  const { spt, draw } = running;
  const horizon = Tone.getTransport().seconds + ADD_MARGIN_SEC;
  for (const cue of cues) {
    const time = cue.tick * spt;
    if (time <= horizon) draw(cue);
    else part.add({ ...cue, time });
  }
}

/**
 * Play a groove's preview cues (run.ts groovePreviewCues) on the run's
 * transport, then stop: a run started meanwhile, or a stop, cuts it off.
 */
export async function previewLiteracyGroove({
  cues,
  tempo,
  kit,
}: Omit<LiteracyRunOptions, 'onCue'>): Promise<void> {
  await startLiteracyRun({
    cues,
    tempo,
    kit,
    onCue: (cue) => {
      if (cue.kind === 'end') stopLiteracyRun();
    },
  });
}
