// ── Tap tempo (milestone 2.5) ──────────────────────────────────────────────
//
// The BPM from taps: the average of the last four gaps between taps. A
// pause of two seconds starts the count over, so a student can tap a new
// tempo without the old one dragging the average.

/** A pause this long between taps starts over. */
export const TAP_RESET_MS = 2000;
/** How many gaps the average takes. */
export const TAP_GAPS = 4;

export interface TapTempo {
  /** One tap at `now` ms; the BPM so far, or null after the first tap. */
  tap(now: number): number | null;
  reset(): void;
}

export function createTapTempo(): TapTempo {
  let taps: number[] = [];
  return {
    tap(now) {
      const last = taps[taps.length - 1];
      if (last !== undefined && now - last > TAP_RESET_MS) taps = [];
      taps.push(now);
      if (taps.length > TAP_GAPS + 1) taps = taps.slice(-(TAP_GAPS + 1));
      if (taps.length < 2) return null;
      const span = taps[taps.length - 1] - taps[0];
      const gap = span / (taps.length - 1);
      return gap > 0 ? Math.round(60_000 / gap) : null;
    },
    reset() {
      taps = [];
    },
  };
}
