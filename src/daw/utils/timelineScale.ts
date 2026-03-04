// ── Timeline scale utilities ──────────────────────────────────────────────
// Shared tick-to-pixel / pixel-to-tick math used by Timeline, PianoRoll,
// playhead, and all mouse handlers.

export const TICKS_PER_BEAT = 480;
export const BEATS_PER_BAR = 4;
export const TICKS_PER_BAR = TICKS_PER_BEAT * BEATS_PER_BAR;
export const BASE_PIXELS_PER_BEAT = 40;

// ── Core conversions ─────────────────────────────────────────────────────

export function pixelsPerBeat(zoom: number): number {
  return BASE_PIXELS_PER_BEAT * zoom;
}

export function tickToPixel(tick: number, zoom: number, scrollLeft: number): number {
  return (tick / TICKS_PER_BEAT) * pixelsPerBeat(zoom) - scrollLeft;
}

export function pixelToTick(px: number, zoom: number, scrollLeft: number): number {
  return ((px + scrollLeft) / pixelsPerBeat(zoom)) * TICKS_PER_BEAT;
}

// ── Viewport helpers ─────────────────────────────────────────────────────

export function visibleTickRange(
  viewportWidth: number,
  zoom: number,
  scrollLeft: number,
): { startTick: number; endTick: number } {
  return {
    startTick: pixelToTick(0, zoom, scrollLeft),
    endTick: pixelToTick(viewportWidth, zoom, scrollLeft),
  };
}

// ── Dynamic subdivisions ─────────────────────────────────────────────────
// Returns which grid levels should be visible at the current zoom, with
// alpha values that fade in smoothly as the user zooms in.

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export interface SubdivisionLevel {
  tickInterval: number;
  alpha: number;
  lineWidth: number;
}

export function visibleSubdivisions(zoom: number): SubdivisionLevel[] {
  const ppb = pixelsPerBeat(zoom);
  const result: SubdivisionLevel[] = [];

  // Bar lines — always visible
  result.push({ tickInterval: TICKS_PER_BAR, alpha: 0.22, lineWidth: 1 });

  // Beat lines — visible when ppb >= 10
  if (ppb >= 10) {
    const fade = clamp01((ppb - 10) / 10);
    result.push({ tickInterval: TICKS_PER_BEAT, alpha: 0.12 * fade, lineWidth: 0.5 });
  }

  // 8th notes — visible when ppb >= 30
  if (ppb >= 30) {
    const fade = clamp01((ppb - 30) / 20);
    result.push({ tickInterval: 240, alpha: 0.07 * fade, lineWidth: 0.5 });
  }

  // 16th notes — visible when ppb >= 80
  if (ppb >= 80) {
    const fade = clamp01((ppb - 80) / 40);
    result.push({ tickInterval: 120, alpha: 0.05 * fade, lineWidth: 0.5 });
  }

  // 32nd notes — visible when ppb >= 200
  if (ppb >= 200) {
    const fade = clamp01((ppb - 200) / 60);
    result.push({ tickInterval: 60, alpha: 0.035 * fade, lineWidth: 0.5 });
  }

  return result;
}

// ── Smart ruler markings ─────────────────────────────────────────────────

export interface RulerLevel {
  tickInterval: number;
  format: (tick: number) => string;
  fontSize: number;
  alpha: number;
}

export function rulerMarkings(zoom: number, _bpm: number): RulerLevel[] {
  const ppb = pixelsPerBeat(zoom);
  const levels: RulerLevel[] = [];

  if (ppb < 10) {
    // Very zoomed out — every 4 bars
    levels.push({
      tickInterval: TICKS_PER_BAR * 4,
      format: (t) => `${Math.floor(t / TICKS_PER_BAR) + 1}`,
      fontSize: 10,
      alpha: 0.65,
    });
  } else if (ppb < 30) {
    // Bar numbers only
    levels.push({
      tickInterval: TICKS_PER_BAR,
      format: (t) => `${Math.floor(t / TICKS_PER_BAR) + 1}`,
      fontSize: 10,
      alpha: 0.65,
    });
  } else if (ppb < 80) {
    // Bars + beat numbers
    levels.push({
      tickInterval: TICKS_PER_BAR,
      format: (t) => `${Math.floor(t / TICKS_PER_BAR) + 1}`,
      fontSize: 10,
      alpha: 0.65,
    });
    levels.push({
      tickInterval: TICKS_PER_BEAT,
      format: (t) => {
        const bar = Math.floor(t / TICKS_PER_BAR) + 1;
        const beat = (Math.floor(t / TICKS_PER_BEAT) % BEATS_PER_BAR) + 1;
        return `${bar}.${beat}`;
      },
      fontSize: 9,
      alpha: 0.4,
    });
  } else {
    // Very zoomed in — bars + beats + subdivisions
    levels.push({
      tickInterval: TICKS_PER_BAR,
      format: (t) => `${Math.floor(t / TICKS_PER_BAR) + 1}`,
      fontSize: 10,
      alpha: 0.65,
    });
    levels.push({
      tickInterval: TICKS_PER_BEAT,
      format: (t) => {
        const bar = Math.floor(t / TICKS_PER_BAR) + 1;
        const beat = (Math.floor(t / TICKS_PER_BEAT) % BEATS_PER_BAR) + 1;
        return `${bar}.${beat}`;
      },
      fontSize: 9,
      alpha: 0.45,
    });
    levels.push({
      tickInterval: 240,
      format: (t) => {
        const bar = Math.floor(t / TICKS_PER_BAR) + 1;
        const beat = (Math.floor(t / TICKS_PER_BEAT) % BEATS_PER_BAR) + 1;
        const sub = (Math.floor(t / 240) % 2) + 1;
        return `${bar}.${beat}.${sub}`;
      },
      fontSize: 8,
      alpha: 0.3,
    });
  }

  return levels;
}

// ── Alternating bar group size ────────────────────────────────────────
// Returns how many bars form one "group" for alternating shading.
// Adapts to zoom level so shading stays visible when zoomed out.

export function alternatingBarGroup(zoom: number): number {
  const ppb = pixelsPerBeat(zoom);
  if (ppb >= 30) return 1;   // every other bar
  if (ppb >= 10) return 4;   // every 4 bars
  if (ppb >= 5) return 8;    // every 8 bars
  return 16;                  // every 16 bars
}

// ── Time format helper ───────────────────────────────────────────────────

export function tickToTime(tick: number, bpm: number): string {
  const seconds = (tick / TICKS_PER_BEAT) * (60 / bpm);
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function tickToTimePrecise(tick: number, bpm: number, showTenths: boolean): string {
  const seconds = (tick / TICKS_PER_BEAT) * (60 / bpm);
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  if (showTenths) {
    const tenths = Math.floor((seconds % 1) * 10);
    return `${min}:${sec.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
