import { describe, expect, it } from 'vitest';
import {
  DOCK_DEFAULT_FRAC,
  DOCK_MIN_PX,
  dockFracFor,
  dockHeightPx,
  isDockHeights,
  isInspectorOpenByView,
  isInspectorWidth,
  isReadoutMode,
  resolveInspectorOpen,
  snapDockPx,
} from '../layoutModel';

// ── The shell's geometry (milestone 2.4) ───────────────────────────────────
// Run: npx vitest run src/daw/shell/layout/__tests__/layoutModel.test.ts

/** A Chromebook in focus mode: 655 px less the 44 px top bar. */
const CHROMEBOOK_BODY = 611;
/** A laptop window: 787 px less the top bar. */
const LAPTOP_BODY = 743;

describe('the dock’s height', () => {
  it('meets the plan’s pixel budget by default', () => {
    // 220 px on a Chromebook, 267 px on a laptop (plan, pixel budget).
    const frac = dockFracFor('controls', {});
    expect(dockHeightPx(frac, CHROMEBOOK_BODY)).toBe(220);
    expect(dockHeightPx(frac, LAPTOP_BODY)).toBe(267);
  });

  it('keeps each tab’s own height, and the default for the others', () => {
    const heights = { fx: 0.5 };
    expect(dockFracFor('fx', heights)).toBe(0.5);
    expect(dockFracFor('piano-roll', heights)).toBe(
      DOCK_DEFAULT_FRAC['piano-roll'],
    );
  });

  it('stays between 120 px and 85% of the body', () => {
    expect(dockHeightPx(0.01, CHROMEBOOK_BODY)).toBe(DOCK_MIN_PX);
    expect(dockHeightPx(0.99, CHROMEBOOK_BODY)).toBe(519);
  });

  it('snaps a drag to 25, 40, 60 and 85% within 12 px', () => {
    // 40% of 611 is 244.
    expect(snapDockPx(236, CHROMEBOOK_BODY)).toBe(244);
    expect(snapDockPx(255, CHROMEBOOK_BODY)).toBe(244);
    expect(snapDockPx(300, CHROMEBOOK_BODY)).toBe(300);
    expect(snapDockPx(40, CHROMEBOOK_BODY)).toBe(DOCK_MIN_PX);
  });
});

describe('the Inspector’s default', () => {
  it('opens in Create from 1440 px, and starts closed on a Chromebook', () => {
    expect(resolveInspectorOpen('arrange', {}, 1440)).toBe(true);
    expect(resolveInspectorOpen('arrange', {}, 1366)).toBe(false);
    expect(resolveInspectorOpen('studio', {}, 1920)).toBe(false);
  });

  it('follows the student’s choice for the view', () => {
    expect(resolveInspectorOpen('arrange', { arrange: false }, 1920)).toBe(
      false,
    );
    expect(resolveInspectorOpen('score', { score: true }, 1280)).toBe(true);
  });
});

describe('what the prefs store takes from storage', () => {
  it('takes valid layout prefs only', () => {
    expect(isDockHeights({ fx: 0.4, prism: 0.6 })).toBe(true);
    expect(isDockHeights({ nope: 0.4 })).toBe(false);
    expect(isDockHeights({ fx: 2 })).toBe(false);
    expect(isDockHeights([0.4])).toBe(false);
    expect(isInspectorOpenByView({ arrange: true, score: false })).toBe(true);
    expect(isInspectorOpenByView({ arrange: 'yes' })).toBe(false);
    expect(isInspectorOpenByView({ mixer: true })).toBe(false);
    expect(isInspectorWidth(300)).toBe(true);
    expect(isInspectorWidth(80)).toBe(false);
    expect(isInspectorWidth(Number.NaN)).toBe(false);
    expect(isReadoutMode('time')).toBe(true);
    expect(isReadoutMode('beats')).toBe(false);
  });
});
