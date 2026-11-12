/**
 * The piano roll's values (`MiniPianoRoll`, in the Connections demo's
 * Studio) and the layout boxes it is measured in, copied from the real
 * Studio (`Timeline`, `rulerLoop`) — values only, never the DAW's modules.
 * Everything else in the Studio demos wears `shellTokens`.
 */

/** Loop strip while looping is off (`rulerLoop.ts` `drawLoopRegion`). */
export const LOOP_STRIP = {
  fill: 'rgba(148, 163, 184, 0.14)',
  handle: 'rgba(148, 163, 184, 0.55)',
  handleW: 8,
} as const;

/** Arrangement canvas (`Timeline.tsx`). */
export const GRID = {
  shade: 'rgba(255, 255, 255, 0.025)',
  bar: 'rgba(255, 255, 255, 0.22)',
  beat: 'rgba(255, 255, 255, 0.07)',
  lane: 'rgba(255, 255, 255, 0.04)',
  /** Bar-number alpha / beat-label alpha / time-ruler alpha. */
  numberAlpha: 0.39,
  beatLabelAlpha: 0.24,
  timeAlpha: 0.3,
} as const;

/**
 * Bar numbers' x past the bar line: clear of the parked playhead's 12px grab
 * (`rulerLoop.ts` `PLAYHEAD_HANDLE_W`).
 */
export const BAR_NUMBER_X = 7;

/** Piano-roll note alpha from MIDI velocity. */
export const rollNoteAlpha = (velocity: number) => 0.7 + (velocity / 127) * 0.3;

export interface Row {
  top: number;
  h: number;
}

/**
 * Pixel boxes in scene coordinates (the stage minus the 40px window bar; its
 * 1px borders leave 558 on desktop, so the roll's rows stop 2px short).
 * `timelineX` + `barW` place ticks in the arrangement; `roll` places them in
 * the piano-roll dock body.
 */
export interface StudioLayout {
  w: number;
  h: number;
  transportH: number;
  headerW: number;
  /** Arrangement x of tick 0 and px per bar (4 bars + a tail). */
  timelineX: number;
  barW: number;
  loopStrip: Row;
  numbers: Row;
  chordRuler: Row;
  /** Track rows (header + lane). `master` / `addTrack` are desktop only. */
  rows: { chords: Row; drums: Row; master: Row | null; addTrack: Row | null };
  /** Bottom of the lanes (the time ruler sits below on desktop). */
  lanesBottom: number;
  timeRuler: Row | null;
  dockTabs: Row;
  dockBody: Row;
  /** Circle-of-fifths wheel diameter in the KEY card. */
  wheel: number;
  roll: {
    keyW: number;
    ruler: Row;
    rows: number;
    rowH: number;
    barW: number;
  };
}

export const DESKTOP: StudioLayout = {
  w: 1000,
  h: 560,
  transportH: 36,
  headerW: 160,
  timelineX: 160,
  barW: 190,
  loopStrip: { top: 36, h: 10 },
  numbers: { top: 46, h: 16 },
  chordRuler: { top: 62, h: 20 },
  rows: {
    chords: { top: 82, h: 68 },
    drums: { top: 150, h: 64 },
    master: { top: 214, h: 40 },
    addTrack: { top: 260, h: 24 },
  },
  lanesBottom: 290,
  timeRuler: { top: 290, h: 18 },
  dockTabs: { top: 308, h: 28 },
  dockBody: { top: 336, h: 224 },
  wheel: 130,
  roll: {
    keyW: 44,
    ruler: { top: 336, h: 18 },
    rows: 22,
    rowH: 204 / 22,
    barW: 224,
  },
};

export const COMPACT: StudioLayout = {
  w: 680,
  h: 660,
  transportH: 44,
  headerW: 112,
  timelineX: 112,
  barW: 142,
  loopStrip: { top: 44, h: 8 },
  numbers: { top: 52, h: 18 },
  chordRuler: { top: 70, h: 26 },
  rows: {
    chords: { top: 96, h: 80 },
    drums: { top: 176, h: 72 },
    master: null,
    addTrack: null,
  },
  lanesBottom: 248,
  timeRuler: null,
  dockTabs: { top: 248, h: 36 },
  dockBody: { top: 284, h: 376 },
  wheel: 106,
  roll: {
    keyW: 52,
    ruler: { top: 284, h: 20 },
    rows: 19,
    rowH: 354 / 19,
    barW: 152,
  },
};

export const studioLayout = (compact: boolean) => (compact ? COMPACT : DESKTOP);

/** Ticks per 4/4 bar (480 PPQ), as in `studioSong`. */
const BAR_TICKS = 1920;

/** Piano-roll x (scene px) of a tick. */
export const rollX = (layout: StudioLayout, tick: number) =>
  layout.roll.keyW + (tick * layout.roll.barW) / BAR_TICKS;
