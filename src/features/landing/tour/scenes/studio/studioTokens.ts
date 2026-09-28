/**
 * The Micro Studio's look, copied from the real Studio (`daw/daw.css`,
 * `PrismStudio`, `TrackHeader`, `Timeline`) — values only, never the DAW's
 * modules or its stylesheet. Landing rule: the UI stays neutral and color
 * comes only from Prism and key centers, so the app's teal survives in one
 * place (the active dock tab's icon) and its green/yellow/red states go grey.
 */

/** `daw.css` surfaces and text. */
export const STUDIO = {
  bg: '#101012',
  surface: '#1a1a1a',
  surface2: '#1e1e1e',
  surface3: '#222222',
  /** Prism module cards (`PrismStudio.tsx` `moduleCard`). */
  card: '#242424',
  cardBorder: '#333333',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#e8e8f0',
  textDim: '#6b6b80',
} as const;

/** The app's teal. Only on the active dock tab's icon (it sits near F♯). */
export const STUDIO_ACCENT = '#7ecfcf';

/** Track stripes and drum notes before a key is set. */
export const NEUTRAL_TRACK = 'rgb(107, 107, 128)';

/** "On" fill for M/S, the Create button and other pressed-in states. */
export const ON_FILL = '#e8e8f0';
export const ON_TEXT = '#101012';
/** Play while playing (the app's green is too close to E's). */
export const PLAYING_BG = 'rgba(255, 255, 255, 0.1)';
export const METER_COLOR = 'rgba(255, 255, 255, 0.55)';
/** Master row stripe (teal in the app). */
export const MASTER_STRIPE = 'rgba(255, 255, 255, 0.35)';

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

/** Glass clip box. */
export const CLIP = {
  fill: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.2)',
  radius: 4,
  /** Note bars: 3px tall, radius 1, padded 12 top / 4 bottom. */
  noteH: 3,
  padTop: 12,
  padBottom: 4,
  /** Write-head during Create's paint-in. */
  writeHead: 'rgba(255, 255, 255, 0.7)',
  paintMs: 600,
} as const;

/**
 * Bar numbers' x past the bar line: clear of the parked playhead's 12px grab
 * (`rulerLoop.ts` `PLAYHEAD_HANDLE_W`).
 */
export const BAR_NUMBER_X = 7;

/** Chord-ruler region fills (`color-mix` percentages). */
export const REGION = { fill: 15, active: 40, outline: 1.5 } as const;

/** Clip note alpha from MIDI velocity (arrangement / piano roll). */
export const clipNoteAlpha = (velocity: number) => 0.6 + (velocity / 127) * 0.4;
export const rollNoteAlpha = (velocity: number) => 0.7 + (velocity / 127) * 0.3;

/** Scene-drawn "pressed" state for the auto cursor's clicks. */
export const PRESS = {
  overlay: 'rgba(255, 255, 255, 0.3)',
  ring: 'inset 0 0 0 2px #ffffff',
  scale: 0.97,
} as const;

/** Prism triangle tab icon (`ChannelStrip.tsx`). */
export const PRISM_ICON_PATH = 'M12 4L5 18h14L12 4z';

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

/** Arrangement x (scene px) of a tick. */
export const arrangeX = (layout: StudioLayout, tick: number) =>
  layout.timelineX + (tick * layout.barW) / BAR_TICKS;

/** Piano-roll x (scene px) of a tick. */
export const rollX = (layout: StudioLayout, tick: number) =>
  layout.roll.keyW + (tick * layout.roll.barW) / BAR_TICKS;
