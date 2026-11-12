/**
 * The Studio demo's look, copied from today's Studio shell
 * (`daw/ui/daw-tokens.css`, `daw/shell/*`) — values only, never the DAW's
 * modules or its stylesheet. Like the real shell the UI is monochrome: color
 * comes only from the key center (track stripes, clip bands) and Prism's
 * chord colors (chord lane, notes). The older `studioTokens` still dress the
 * Connections demo's Studio.
 */

/** `daw-tokens.css` surfaces and text. */
export const SHELL = {
  bg: '#101012',
  /** The stage card and the track column (`surface-1`). */
  surface: '#151518',
  /** Top-bar pills. */
  pill: '#141417',
  /** The prompt card (`popover`). */
  popover: '#141416',
  text: '#e8e8f0',
  text2: 'rgba(255, 255, 255, 0.7)',
  text3: '#8e8ea3',
  pillText: 'rgba(255, 255, 255, 0.5)',
  pillOn: 'rgba(255, 255, 255, 0.2)',
  chip: 'rgba(255, 255, 255, 0.08)',
  hairline: '#232326',
  outline: 'rgba(255, 255, 255, 0.15)',
  /** The float shadow (prompt card). */
  shadow: '0 8px 28px rgba(0, 0, 0, 0.36)',
} as const;

/** Track stripes and notes before Prism sets a key. */
export const NEUTRAL_TRACK = 'rgb(107, 107, 128)';

/** Glass clip box (`clipChrome.ts`). */
export const CLIP = {
  fill: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.2)',
  radius: 4,
  /** The header band: track color at 34%. */
  bandPct: 34,
  /** Paint-in when Prism writes a clip. */
  paintMs: 600,
  writeHead: 'rgba(255, 255, 255, 0.7)',
} as const;

/** Chord-lane fills (`color-mix` percentages). */
export const REGION = { fill: 15, active: 40, outline: 1.5 } as const;

/** Lanes grid: white at 2–5%. */
export const GRID = {
  bar: 'rgba(255, 255, 255, 0.07)',
  beat: 'rgba(255, 255, 255, 0.025)',
} as const;

/** Clip note alpha from MIDI velocity. */
export const noteAlpha = (velocity: number) => 0.6 + (velocity / 127) * 0.4;

/** Scene-drawn "pressed" state for the auto cursor's clicks. */
export const PRESS = {
  overlay: 'rgba(255, 255, 255, 0.3)',
  ring: 'inset 0 0 0 2px #ffffff',
  scale: 0.97,
} as const;

/** The prompt's ∆ (`PromptDeltaIcon`), 20×20. */
export const DELTA_PATH = 'M10 2.75 17.25 15.5H2.75Z';

export interface Row {
  top: number;
  h: number;
}

/**
 * Pixel boxes in scene coordinates. `card` is the stage card; every row
 * below it is relative to the card. `trackW` is the track column, so lanes
 * start at `trackW` and tick 0 sits there.
 */
export interface ShellLayout {
  w: number;
  h: number;
  topH: number;
  bottomH: number;
  /** The right side rail (0: none). */
  railW: number;
  card: { x: number; y: number; w: number; h: number };
  trackW: number;
  /** Px per bar (4 bars + a tail fill the lanes). */
  barW: number;
  sections: Row;
  ruler: Row;
  chordLane: Row;
  rows: Record<'chords' | 'bass' | 'drums', Row>;
  addTrack: Row;
  /** Timeline footer (zoom), desktop only. */
  footer: Row | null;
  prompt: { w: number; bottom: number };
  /** Pill height (top bar), and the type scale. */
  pillH: number;
  font: { micro: number; label: number; body: number; title: number };
}

export const DESKTOP: ShellLayout = {
  w: 1000,
  h: 560,
  topH: 44,
  bottomH: 44,
  railW: 48,
  card: { x: 8, y: 44, w: 936, h: 472 },
  trackW: 184,
  barW: 168,
  sections: { top: 0, h: 24 },
  ruler: { top: 24, h: 28 },
  chordLane: { top: 52, h: 24 },
  rows: {
    chords: { top: 76, h: 70 },
    bass: { top: 146, h: 70 },
    drums: { top: 216, h: 70 },
  },
  addTrack: { top: 286, h: 48 },
  footer: { top: 440, h: 32 },
  prompt: { w: 520, bottom: 46 },
  pillH: 30,
  font: { micro: 10, label: 11, body: 12, title: 13 },
};

export const COMPACT: ShellLayout = {
  w: 680,
  h: 660,
  topH: 52,
  bottomH: 52,
  railW: 0,
  card: { x: 8, y: 52, w: 664, h: 556 },
  trackW: 132,
  barW: 124,
  sections: { top: 0, h: 28 },
  ruler: { top: 28, h: 32 },
  chordLane: { top: 60, h: 30 },
  rows: {
    chords: { top: 90, h: 84 },
    bass: { top: 174, h: 84 },
    drums: { top: 258, h: 84 },
  },
  addTrack: { top: 342, h: 56 },
  footer: null,
  prompt: { w: 508, bottom: 16 },
  pillH: 40,
  font: { micro: 13, label: 15, body: 16, title: 17 },
};

export const shellLayout = (compact: boolean) => (compact ? COMPACT : DESKTOP);

/** Ticks per 4/4 bar (480 PPQ), as in `studioSong`. */
const BAR_TICKS = 1920;

/** Lane x (card px) of a tick. */
export const laneX = (layout: ShellLayout, tick: number) =>
  layout.trackW + (tick * layout.barW) / BAR_TICKS;
