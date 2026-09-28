import { LESSON, LOOP } from './connectionsData';

/**
 * The "Connected" demo's guided script (pure — unit tested in
 * `__tests__/connectionsModel.test.ts`). Like the Studio demo, the scene has
 * no timers: it reads the tour's `stepProgress` and asks `autoFrame` what is
 * on screen at that moment of the step, so it pauses with the tour.
 *
 * Each step's cursor first goes to something on its own surface (and clicks
 * it); later the step's `data-tour-target` moves to the button that leads on
 * (the demo's cursor follows and clicks again ~700 ms after the move).
 */

/** Step durations, as in the tour config (`CONNECTED_TOUR`). */
export const STEP_MS = [3800, 4600, 9400, 6600] as const;

/** The cursor lands and clicks ~720 ms after it leaves; presses bracket that. */
const PRESS_FROM = 650;
const PRESS_TO = 950;

/** When each step's target moves to its "next" button. */
export const ACTION_AT = [2400, 3300, 8000, 5000] as const;

// Step 1 (Song): the F♯7 chip is pressed and previewed.
export const PREVIEW_AT = 750;

// Step 2 (Globe): the flight, then the story, then the influence arcs.
export const FLIGHT_MS = 1300;
export const STORY_AT = 950;
export const ARCS_AT = 1300;

// Step 3 (Studio): Play, then one pass of the loop at the song's 120 BPM,
// each chord in half notes, two per bar (as the piano roll draws it).
export const PLAY_AT = 1000;
export const HALF_MS = 1000;
export const BAR_MS = HALF_MS * 2;
export const LOOP_MS = BAR_MS * LOOP.length;
/** A half note's sound, a touch short so the two hits don't blur. */
export const HALF_S = (HALF_MS / 1000) * 0.95;

// Step 4 (Theory): the scale runs up, the loop's chords light, the payoff.
export const SCALE_AT = 1000;
export const NOTE_MS = 180;
export const CHORDS_AT = 2700;
export const CHORD_MS = 400;
export const PAYOFF_AT = 4300;

export interface ConnectionsFrame {
  /** Changes whenever anything below changes (render trigger). */
  key: string;
  /** Which element carries the step's `data-tour-target`. */
  target: 'first' | 'action';
  /** The scene-drawn press on it, if any. */
  press: 'first' | 'action' | null;
  /** Changes once per cue (sound trigger); null before the first. */
  soundKey: string | null;
  /** Notes to play at this cue (silent unless Sound is on). */
  sound: { midis: number[]; seconds: number } | null;
  /** Song: the loop chord lit on the chart (the F♯7 preview). */
  lit: number | null;
  /** Globe: the story card and the influence arcs are shown. */
  story: boolean;
  arcs: boolean;
  /** Studio: the loop is playing, and the bar under the playhead. */
  playing: boolean;
  bar: number;
  /** Theory: the scale note sounding, and how many loop chords are lit. */
  note: number | null;
  chords: number;
  payoff: boolean;
}

const pressAt = (ms: number, step: number): ConnectionsFrame['press'] => {
  if (ms >= PRESS_FROM && ms < PRESS_TO) return 'first';
  const action = ACTION_AT[step];
  if (ms >= action + PRESS_FROM && ms < action + PRESS_TO) return 'action';
  return null;
};

/** The last cue at or before `ms` (index into `cues`), or -1. */
const lastCue = (cues: readonly number[], ms: number) => {
  let at = -1;
  cues.forEach((t, i) => {
    if (ms >= t) at = i;
  });
  return at;
};

const SCALE_CUES = LESSON.notes.map((_, i) => SCALE_AT + i * NOTE_MS);
const CHORD_CUES = LOOP.map((_, i) => CHORDS_AT + i * CHORD_MS);
const HALF_CUES = Array.from(
  { length: LOOP.length * 2 },
  (_, i) => PLAY_AT + i * HALF_MS,
);

/**
 * What the auto tour shows `ms` into a step. `ms = Infinity` is the step's
 * end state (user / static modes): nothing pressed, nothing sounding, the
 * Studio stopped on the loop's last bar (E, whose card links to the key).
 */
export const autoFrame = (step: number, ms: number): ConnectionsFrame => {
  const final = !Number.isFinite(ms);
  const frame: ConnectionsFrame = {
    key: '',
    target: !final && ms >= ACTION_AT[step] ? 'action' : 'first',
    press: final ? null : pressAt(ms, step),
    soundKey: null,
    sound: null,
    lit: null,
    story: false,
    arcs: false,
    playing: false,
    bar: 0,
    note: null,
    chords: 0,
    payoff: false,
  };

  switch (step) {
    case 0:
      if (!final && ms >= PREVIEW_AT && ms < ACTION_AT[0]) {
        frame.lit = 1;
        frame.soundKey = '0:preview';
        frame.sound = { midis: LOOP[1].midis, seconds: 1.2 };
      }
      break;
    case 1:
      frame.story = final || ms >= STORY_AT;
      frame.arcs = final || ms >= ARCS_AT;
      break;
    case 2: {
      if (final) {
        frame.bar = LOOP.length - 1;
        break;
      }
      const half = lastCue(HALF_CUES, ms);
      const bar = half < 0 ? 0 : Math.floor(half / 2);
      frame.playing = half >= 0 && ms < PLAY_AT + LOOP_MS;
      frame.bar = bar;
      if (half >= 0) {
        frame.soundKey = `2:${half}`;
        frame.sound = { midis: LOOP[bar].midis, seconds: HALF_S };
      }
      break;
    }
    case 3: {
      if (final) {
        frame.chords = LOOP.length;
        frame.payoff = true;
        break;
      }
      const note = lastCue(SCALE_CUES, ms);
      const chord = lastCue(CHORD_CUES, ms);
      frame.note = note >= 0 && ms < SCALE_CUES.at(-1)! + NOTE_MS ? note : null;
      frame.chords = chord + 1;
      frame.payoff = ms >= PAYOFF_AT;
      if (chord >= 0) {
        frame.soundKey = `3:c${chord}`;
        frame.sound = { midis: LOOP[chord].midis, seconds: 0.35 };
      } else if (note >= 0) {
        frame.soundKey = `3:n${note}`;
        frame.sound = { midis: [LESSON.notes[note].midi], seconds: 0.3 };
      }
      break;
    }
  }

  frame.key = [
    step,
    final ? 'end' : '',
    frame.target,
    frame.press,
    frame.soundKey,
    frame.lit,
    frame.story,
    frame.arcs,
    frame.playing,
    frame.bar,
    frame.note,
    frame.chords,
    frame.payoff,
  ].join(':');
  return frame;
};
