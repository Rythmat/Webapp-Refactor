import { DEMO_PROGRESSION, demoChord } from '../../../music';
import {
  colorGroups,
  keyRootFor,
  optionsFor,
  pickFromColor,
  type StyleName,
  type TrackId,
} from './studioSong';

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
  /** Key center pitch class (major), or null before a key is picked. */
  keyPc: number | null;
  /** Prism chord selection (graph tokens). */
  seq: string[];
  /** The chords Create wrote to the CHORDS clip, or null before Create. */
  clip: string[] | null;
  dock: 'prism' | 'roll';
  style: StyleName;
  muted: TrackId[];
  soloed: TrackId[];
  /** Spectrum picks so far (rotates a color's chords off the demo path). */
  picks: number;
}

/** What a cursor click presses: a spectrum segment (color index), or a button. */
export type PressTarget = { segment: number } | 'create' | 'roll' | 'play';

/** Step 3: Play is pressed, one 4-bar pass runs, then it rings C again. */
export const PLAY_AT_MS = 1000;
export const LOOP_MS = 8000;
export const RESOLVE_MS = 400;
/** Where the playhead rests in the static end state: 4:1:1 (F min). */
export const PARK_TICK = 5760;

/** Spectrum segments (`KEY_COLORS` index) the script clicks. */
const RED = 1;
const GREEN = 5;
const PURPLE = 10;

/** Per step, the ms at which each cue lands. */
export const STEP_CUES: readonly (readonly number[])[] = [
  [750, 1700],
  [750, 1700, 2600],
  [750],
  [750, PLAY_AT_MS],
];

/** Per step, the scene-drawn pressed states (ms windows within the step). */
export const STEP_PRESSES: readonly (readonly {
  target: PressTarget;
  from: number;
  to: number;
}[])[] = [
  [{ target: { segment: RED }, from: 1500, to: 1850 }],
  [
    { target: { segment: GREEN }, from: 650, to: 950 },
    { target: { segment: RED }, from: 1500, to: 1850 },
    { target: { segment: PURPLE }, from: 2400, to: 2750 },
  ],
  [{ target: 'create', from: 650, to: 950 }],
  [
    { target: 'roll', from: 650, to: 950 },
    { target: 'play', from: 900, to: 1200 },
  ],
];

/**
 * The cursor leaves for a later spectrum press this long before it (it lands
 * and clicks ~720 ms after leaving, like the step's first click).
 */
export const CURSOR_LEAD_MS = 500;

const initialState = (): StudioState => ({
  keyPc: null,
  seq: [],
  clip: null,
  dock: 'prism',
  style: 'Pop',
  muted: [],
  soloed: [],
  picks: 0,
});

/** Before the tour's first click. */
export const INITIAL_STATE: Readonly<StudioState> = initialState();

const copy = (s: StudioState): StudioState => ({
  ...s,
  seq: [...s.seq],
  clip: s.clip && [...s.clip],
  muted: [...s.muted],
  soloed: [...s.soloed],
});

/**
 * The scene after `passed` of a step's cues (always fresh arrays). Each step
 * starts from the previous step's end state.
 */
export const stateAt = (step: number, passed: number): StudioState => {
  const s = step <= 0 ? initialState() : copy(endState(step - 1));
  switch (step) {
    case 0:
      s.keyPc = passed >= 1 ? 0 : null;
      s.seq = passed >= 2 ? DEMO_PROGRESSION.slice(0, 1) : [];
      break;
    case 1:
      s.seq = DEMO_PROGRESSION.slice(0, 1 + passed);
      break;
    case 2:
      s.clip = passed >= 1 ? [...DEMO_PROGRESSION] : null;
      break;
    case 3:
      s.dock = passed >= 1 ? 'roll' : 'prism';
      break;
  }
  s.picks = s.seq.length;
  return s;
};

/** A step's end state (user and static modes show this). */
export const endState = (step: number): StudioState =>
  stateAt(step, STEP_CUES[step]?.length ?? 0);

/** The spectrum's lit colors for a state (`KEY_COLORS` index → tokens). */
export const spectrumGroups = (s: StudioState): Map<number, string[]> =>
  s.keyPc === null
    ? new Map()
    : colorGroups(optionsFor(s), keyRootFor(s.keyPc));

/**
 * The HARMONY readout for a hovered/pressed segment: the color's chords and
 * the one a click would add (null when the color has nothing that fits).
 */
export const hoverReadout = (
  s: StudioState,
  segment: number,
): { tokens: string[]; pick: string | null } => {
  const tokens = spectrumGroups(s).get(segment) ?? [];
  return {
    tokens,
    pick: tokens.length > 0 ? pickFromColor(tokens, s.seq, s.picks) : null,
  };
};

export interface AutoFrame {
  /** Changes whenever anything below changes (render trigger). */
  key: string;
  /** Changes once per cue (sound trigger). */
  soundKey: string;
  state: StudioState;
  press: PressTarget | null;
  /**
   * The readout while a segment is pressed, computed from the state before
   * that click so it doesn't jump when the chord lands mid-press.
   */
  hover: { segment: number; tokens: string[]; pick: string | null } | null;
  /**
   * The spectrum segment the cursor is on (or heading to) for a press after
   * the step's own target, which then carries the step's `data-tour-target`.
   */
  cursor: number | null;
  /** Step 3's pass is running. */
  playing: boolean;
  /** Where the playhead rests while not playing. */
  parkTick: number;
  /** Notes to preview at this cue (silent unless Sound is on). */
  sound: number[] | null;
}

const passedAt = (step: number, ms: number) =>
  (STEP_CUES[step] ?? []).filter((at) => ms >= at).length;

/** See `AutoFrame.cursor`; null at the end state (no cursor). */
export const cursorSegment = (step: number, ms: number): number | null => {
  if (!Number.isFinite(ms)) return null;
  let segment: number | null = null;
  for (const p of STEP_PRESSES[step] ?? []) {
    if (typeof p.target === 'object' && ms >= p.from - CURSOR_LEAD_MS)
      segment = p.target.segment;
  }
  return segment;
};

/** Which cue sounds what: the key's tonic triad, then each added chord. */
const cueSound = (step: number, passed: number): number[] | null => {
  if (passed === 0) return null;
  if (step === 0) return demoChord('1 major').midis;
  if (step === 1) return demoChord(DEMO_PROGRESSION[passed]).midis;
  return null;
};

/**
 * What the auto tour shows `ms` into a step. `ms = Infinity` is the step's
 * end state (user / static modes): no press, not playing, and step 3's
 * playhead parked on F min.
 */
export const autoFrame = (step: number, ms: number): AutoFrame => {
  const passed = passedAt(step, ms);
  const presses = STEP_PRESSES[step] ?? [];
  let pressIndex = -1;
  presses.forEach((p, i) => {
    if (ms >= p.from && ms < p.to) pressIndex = i;
  });
  const active = pressIndex >= 0 ? presses[pressIndex] : null;
  const segment =
    active && typeof active.target === 'object' ? active.target.segment : null;
  const final = !Number.isFinite(ms);
  const playing = step === 3 && passed >= 2 && !final;
  const cursor = cursorSegment(step, ms);
  return {
    key: `${step}:${passed}:${pressIndex}:${cursor ?? ''}:${final ? 'end' : ''}`,
    soundKey: `${step}:${passed}`,
    state: stateAt(step, passed),
    press: active?.target ?? null,
    hover:
      active && segment !== null
        ? {
            segment,
            ...hoverReadout(
              stateAt(step, passedAt(step, active.from)),
              segment,
            ),
          }
        : null,
    cursor,
    playing,
    parkTick: step === 3 && final ? PARK_TICK : 0,
    sound: cueSound(step, passed),
  };
};
