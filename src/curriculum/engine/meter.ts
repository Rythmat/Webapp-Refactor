/**
 * Meters for Genre lessons and Practice Tracks (ledger D-085): 4/4, 3/4, 6/8,
 * 12/8 and friends. Ticks are 480 per quarter everywhere and tempo is always
 * quarter-note bpm, as in the Drum Grooves designer (drumGroove.ts barTicks).
 *
 * The felt beat is what a musician counts and what the count-in clicks loud:
 * a quarter in simple meters, a dotted quarter in compound ones (6/8 = two,
 * 12/8 = four). Outside 4/4 the eighths between felt beats click soft (D-086).
 */

export type TimeSignature = [number, number];

export const PPQ = 480;
export const COMMON_TIME: TimeSignature = [4, 4];

export function isCommonTime(ts: TimeSignature | undefined): boolean {
  return !ts || (ts[0] === 4 && ts[1] === 4);
}

/** 6/8, 9/8, 12/8: groups of three eighths. */
export function isCompound([top, bottom]: TimeSignature): boolean {
  return bottom === 8 && top % 3 === 0 && top > 3;
}

/** Ticks per bar. 12/8 is twelve eighths = 2880, six quarters' worth. */
export function barTicks([top, bottom]: TimeSignature = COMMON_TIME): number {
  return Math.round((top * PPQ * 4) / bottom);
}

/** Ticks per felt beat: a dotted quarter (720) in compound meters. */
export function beatTicks(ts: TimeSignature = COMMON_TIME): number {
  const [, bottom] = ts;
  const unit = (PPQ * 4) / bottom;
  return isCompound(ts) ? unit * 3 : unit;
}

/** Felt beats per bar: 4/4 → 4, 3/4 → 3, 6/8 → 2, 12/8 → 4. */
export function beatsPerBar(ts: TimeSignature = COMMON_TIME): number {
  return Math.round(barTicks(ts) / beatTicks(ts));
}

/**
 * The soft subdivision clicks between felt beats: eighths outside 4/4, none in
 * 4/4 (its lessons count quarters, as they always have).
 */
export function subdivisionTicks(ts: TimeSignature = COMMON_TIME): number {
  return isCommonTime(ts) ? 0 : PPQ / 2;
}

export interface Click {
  /** Tick from the start of the bar. */
  tick: number;
  /** A felt beat (loud) or a subdivision (soft). */
  accent: 'downbeat' | 'beat' | 'sub';
}

/** One bar of metronome clicks. */
export function barClicks(ts: TimeSignature = COMMON_TIME): Click[] {
  const bar = barTicks(ts);
  const beat = beatTicks(ts);
  const sub = subdivisionTicks(ts) || beat;
  const clicks: Click[] = [];
  for (let t = 0; t < bar; t += sub) {
    clicks.push({
      tick: t,
      accent: t === 0 ? 'downbeat' : t % beat === 0 ? 'beat' : 'sub',
    });
  }
  return clicks;
}

/**
 * Swing moves the off-16th inside each eighth pair. A compound meter's
 * eighths are already in threes, so it plays straight.
 */
export function meterSwing(swing: number, ts: TimeSignature = COMMON_TIME) {
  return isCompound(ts) ? 50 : swing;
}

/** The meter a step plays in: its own, else its flow's, else 4/4. */
export function stepTimeSignature(
  step: { timeSignature?: TimeSignature } | null | undefined,
  flow?: { params?: { timeSignature?: TimeSignature } } | null,
): TimeSignature {
  return step?.timeSignature ?? flow?.params?.timeSignature ?? COMMON_TIME;
}

export function formatTimeSignature([top, bottom]: TimeSignature): string {
  return `${top}/${bottom}`;
}
