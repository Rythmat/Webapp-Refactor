import { demoChord } from '../../../music';
import { keyRootFor } from './studioSong';

/**
 * The Micro Studio's guided script (pure — unit tested in
 * `__tests__/studioModel.test.ts`). The scene has no timers: it reads the
 * tour's `stepProgress` clock and asks `autoFrame` what is on screen at that
 * moment of the step, so it pauses with the tour. A cue is the moment a
 * cursor click lands (the cursor arrives at ~720 ms); a press is the
 * scene-drawn pressed state around it.
 */

export type { StyleName, TrackId } from './studioSong';

export interface StudioState {
  /** The prompt is written in the Prism bar. */
  asked: boolean;
  /** The key Prism wrote in (major), or null before it writes. */
  keyPc: number | null;
  /** Prism wrote the chords (the chord lane and the Chords clip). */
  chords: boolean;
  /** Prism wrote the bass and drums under them. */
  band: boolean;
}

/** What a cursor click presses (scene-drawn). */
export type PressTarget = 'prompt' | 'create' | 'play';

/** What the visitor asks Prism for. */
export const DEMO_PROMPT = 'An upbeat pop chorus in D';
/** The key Prism writes in: D major (orange). */
export const DEMO_KEY_PC = 2;
const DEMO_ROOT = keyRootFor(DEMO_KEY_PC);

/** Step 3: Play is pressed, one 4-bar pass runs, then it rings D again. */
export const PLAY_AT_MS = 1000;
export const LOOP_MS = 8000;
export const RESOLVE_MS = 400;
/** Where the playhead rests in the static end state: 4:1:1 (G min). */
export const PARK_TICK = 5760;

/** Per step, the ms at which each cue lands. */
export const STEP_CUES: readonly (readonly number[])[] = [
  [750],
  [750],
  [750],
  [PLAY_AT_MS],
];

/** Per step, the scene-drawn pressed states (ms windows within the step). */
export const STEP_PRESSES: readonly (readonly {
  target: PressTarget;
  from: number;
  to: number;
}[])[] = [
  [{ target: 'prompt', from: 650, to: 950 }],
  [{ target: 'create', from: 650, to: 950 }],
  [],
  [{ target: 'play', from: 650, to: 950 }],
];

const initialState = (): StudioState => ({
  asked: false,
  keyPc: null,
  chords: false,
  band: false,
});

/** Before the tour's first click. */
export const INITIAL_STATE: Readonly<StudioState> = initialState();

/**
 * The scene after `passed` of a step's cues. Each step starts from the
 * previous step's end state.
 */
export const stateAt = (step: number, passed: number): StudioState => {
  const s = step <= 0 ? initialState() : { ...endState(step - 1) };
  const done = passed >= 1;
  switch (step) {
    case 0:
      s.asked = done;
      break;
    case 1:
      s.chords = done;
      s.keyPc = done ? DEMO_KEY_PC : null;
      break;
    case 2:
      s.band = done;
      break;
  }
  return s;
};

/** A step's end state (user and static modes show this). */
export const endState = (step: number): StudioState =>
  stateAt(step, STEP_CUES[step]?.length ?? 0);

export interface AutoFrame {
  /** Changes whenever anything below changes (render trigger). */
  key: string;
  /** Changes once per cue (sound trigger). */
  soundKey: string;
  state: StudioState;
  press: PressTarget | null;
  /** Step 3's pass is running. */
  playing: boolean;
  /** Where the playhead rests while not playing. */
  parkTick: number;
  /** Notes to preview at this cue (silent unless Sound is on). */
  sound: number[] | null;
}

const passedAt = (step: number, ms: number) =>
  (STEP_CUES[step] ?? []).filter((at) => ms >= at).length;

/** Which cue sounds what: the key's tonic triad as the chords land. */
const cueSound = (step: number, passed: number): number[] | null =>
  step === 1 && passed > 0 ? demoChord('1 major', DEMO_ROOT).midis : null;

/**
 * What the auto tour shows `ms` into a step. `ms = Infinity` is the step's
 * end state (user / static modes): no press, not playing, and step 3's
 * playhead parked on G min.
 */
export const autoFrame = (step: number, ms: number): AutoFrame => {
  const passed = passedAt(step, ms);
  const presses = STEP_PRESSES[step] ?? [];
  const pressIndex = presses.findIndex((p) => ms >= p.from && ms < p.to);
  const final = !Number.isFinite(ms);
  return {
    key: `${step}:${passed}:${pressIndex}:${final ? 'end' : ''}`,
    soundKey: `${step}:${passed}`,
    state: stateAt(step, passed),
    press: pressIndex >= 0 ? presses[pressIndex].target : null,
    playing: step === 3 && passed >= 1 && !final,
    parkTick: step === 3 && final ? PARK_TICK : 0,
    sound: cueSound(step, passed),
  };
};
