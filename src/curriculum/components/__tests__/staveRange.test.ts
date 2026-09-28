import { describe, expect, it } from 'vitest';
import {
  computeSplitMidi,
  computeStaveParams,
  laneHeightFor,
  splitEvents,
} from '../DualStaffPianoRoll';

/**
 * Aaron's rule for two-hand rolls: **every note of both hands is on screen,
 * with at least one empty lane above the highest and below the lowest.** A
 * note flush against the edge of its stave reads as clipped even when it is
 * technically drawn, and a note past the edge is simply gone.
 *
 * Two things have to hold for that, and they are easy to break independently:
 *
 *  1. The lane range has to carry the boundary lane. `computeStaveParams`
 *     sizes the box and `buildLaneList` draws the rows, and each adds its own
 *     padding — if they ever disagree, the rows no longer divide the box
 *     evenly and the bottom of the stave is clipped by `overflow-hidden`.
 *  2. The whole thing has to FIT. This is the one that actually broke: a lane
 *     floor of 13px needs 430–570px of staves for a two-hand step, more than
 *     any real lesson viewport, so every step overflowed and the bottom of the
 *     LH stave scrolled out of view.
 *
 * These sweep the authored content rather than a fixture, so a new step with a
 * wider reach than anything written so far fails here rather than in a lesson.
 */

const flows = import.meta.glob<Record<string, unknown>>(
  '../../data/activityFlows/*_v2.ts',
  { eager: true },
);

interface Note {
  midi: number;
  onset: number;
  duration: number;
  hand?: 'lh' | 'rh';
}

interface Step {
  activity: string;
  instrument_config?: Record<string, string>;
  targetNotes?: Note[];
  variants?: { variantId: string; targetNotes: Note[] }[];
}

/** The lane count `buildLaneList` will actually draw, from the same inputs. */
function drawnLaneCount(
  notes: Note[],
  rangeMin: number,
  rangeMax: number,
): number {
  if (notes.length === 0) return 1; // buildLaneList's empty-events fallback
  const effMin = Math.min(rangeMin, ...notes.map((n) => n.midi));
  const effMax = Math.max(rangeMax, ...notes.map((n) => n.midi));
  return Math.min(effMax + 1, 127) - Math.max(effMin - 1, 0) + 1;
}

interface HandCase {
  where: string;
  hand: 'RH' | 'LH';
  notes: Note[];
  laneCount: number;
  rangeMin: number;
  rangeMax: number;
}

/** Every two-hand note set the curriculum actually ships. */
const { hands, totals } = (() => {
  const hands: HandCase[] = [];
  const totals: { where: string; lanes: number }[] = [];

  for (const [path, mod] of Object.entries(flows)) {
    const genre = path.split('/').pop()?.replace('_v2.ts', '');
    for (const value of Object.values(mod)) {
      const flow = value as {
        level?: number;
        sections?: { id: string; steps: Step[] }[];
      };
      if (!flow?.sections) continue;

      for (const section of flow.sections) {
        for (const step of section.steps) {
          const ic = step.instrument_config;
          const isDualStaff =
            !!ic &&
            ic.hand_config !== 'open' &&
            ic.lh_role !== 'open' &&
            ic.rh_role !== 'open';
          if (!isDualStaff) continue;

          const sets: { label: string; notes: Note[] }[] = [];
          if (step.targetNotes?.length) {
            sets.push({ label: 'base', notes: step.targetNotes });
          }
          for (const v of step.variants ?? []) {
            if (v.targetNotes?.length) {
              sets.push({ label: v.variantId, notes: v.targetNotes });
            }
          }

          for (const { label, notes } of sets) {
            const split = computeSplitMidi(notes as never);
            const { rh, lh } = splitEvents(notes as never, split);
            const rhP = computeStaveParams(rh as never, 64, 12);
            const lhP = computeStaveParams(lh as never, 48, 12);
            const where = `${genre} L${flow.level} ${section.id} ${step.activity.slice(0, 40)} [${label}]`;

            totals.push({ where, lanes: rhP.laneCount + lhP.laneCount });
            hands.push(
              {
                where,
                hand: 'RH',
                notes: rh as unknown as Note[],
                laneCount: rhP.laneCount,
                rangeMin: rhP.midiRangeMin,
                rangeMax: rhP.midiRangeMax,
              },
              {
                where,
                hand: 'LH',
                notes: lh as unknown as Note[],
                laneCount: lhP.laneCount,
                rangeMin: lhP.midiRangeMin,
                rangeMax: lhP.midiRangeMax,
              },
            );
          }
        }
      }
    }
  }
  return { hands, totals };
})();

describe('every authored two-hand step', () => {
  it('was found at all', () => {
    // If the glob or the dual-staff test ever stops matching, every assertion
    // below would pass vacuously.
    expect(totals.length).toBeGreaterThan(50);
    expect(hands.length).toBe(totals.length * 2);
  });

  it('keeps an empty lane above the highest and below the lowest note', () => {
    const flush = hands
      .filter((h) => h.notes.length > 0)
      .filter((h) => {
        const lo = Math.min(...h.notes.map((n) => n.midi));
        const hi = Math.max(...h.notes.map((n) => n.midi));
        const laneLo = Math.max(Math.min(h.rangeMin, lo) - 1, 0);
        const laneHi = Math.min(Math.max(h.rangeMax, hi) + 1, 127);
        return laneLo >= lo || laneHi <= hi;
      })
      .map((h) => `${h.where} ${h.hand}`);
    expect(flush).toEqual([]);
  });

  it('draws exactly as many lanes as it reserved height for', () => {
    // rowHeight is laneCount × laneHeight but the rows come from
    // buildLaneList. Disagree and the rows stop dividing the box evenly, so
    // the bottom of the stave is clipped by the roll's overflow-hidden.
    const mismatched = hands
      .filter(
        (h) => drawnLaneCount(h.notes, h.rangeMin, h.rangeMax) !== h.laneCount,
      )
      .map(
        (h) =>
          `${h.where} ${h.hand}: reserved ${h.laneCount}, draws ${drawnLaneCount(h.notes, h.rangeMin, h.rangeMax)}`,
      );
    expect(mismatched).toEqual([]);
  });

  it('fits both hands inside a real lesson viewport, without scrolling', () => {
    // 420px is the roll box on a 13" laptop with the lesson chrome above it —
    // the smallest case that has to work. This is the assertion that a lane
    // floor set too high fails: at 13px not one step fitted.
    const BOX = 420;
    const tooTall = totals
      .filter((t) => t.lanes * laneHeightFor(BOX, t.lanes) + 48 > BOX)
      .map(
        (t) =>
          `${t.where}: ${t.lanes} lanes × ${laneHeightFor(BOX, t.lanes)}px + 48 > ${BOX}`,
      );
    expect(tooTall).toEqual([]);
  });

  it('still fits the widest step written, whatever that turns out to be', () => {
    const widest = Math.max(...totals.map((t) => t.lanes));
    for (const box of [420, 470, 520, 640]) {
      const used = widest * laneHeightFor(box, widest) + 48;
      expect(used).toBeLessThanOrEqual(box);
    }
  });

  it('does not shrink rows further than it has to', () => {
    // The floor exists for pathological windows, not as the normal outcome:
    // in a comfortable box real content should sit well above it.
    const widest = Math.max(...totals.map((t) => t.lanes));
    expect(laneHeightFor(640, widest)).toBeGreaterThanOrEqual(12);
  });
});
