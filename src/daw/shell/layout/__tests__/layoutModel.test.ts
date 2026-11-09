import { describe, expect, it } from 'vitest';
import {
  DOCK_MIN_PX,
  DOCK_SLOTS,
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

describe('the dock’s height', () => {
  // The default height, the same for every dock, is shellGeometry's
  // (dockDefault.test.ts).

  it('stores a height for each slot, and for a tab the dock no longer has', () => {
    expect(DOCK_SLOTS).toEqual([
      'controls',
      'fx',
      'prism',
      'piano-roll',
      'master',
      'rack',
    ]);
    expect(isDockHeights({ fx: 0.5, grooves: 0.36, parts: 0.4 })).toBe(true);
    expect(isDockHeights({ mixer: 0.5 })).toBe(false);
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
