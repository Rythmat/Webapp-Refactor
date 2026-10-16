import { describe, expect, it } from 'vitest';
import {
  FOLD_STEPS,
  folded,
  foldLevelFor,
  MAX_FOLD,
} from '../useToolbarOverflow';

// ── The top bar's fold (milestone 2.5) ─────────────────────────────────────
// The bar's width at each fold level, illustrative: the trimmed bar (2.7)
// with the Song chip, the name, the count-in and the tabs each folding a
// little, and the room each target window gives it (the window less the
// bar's 16 px of padding). R29 measures the real bar.
//
// Run: npx vitest run src/daw/shell/topbar/__tests__/useToolbarOverflow.test.ts

const WIDTHS = [1330, 1296, 1262, 1246, 1226];
const room = (window: number) => window - 16;

describe('foldLevelFor', () => {
  it('folds only as far as each target window needs', () => {
    expect(foldLevelFor(room(1440), WIDTHS)).toBe(0);
    expect(foldLevelFor(room(1366), WIDTHS)).toBe(0);
    // The Song chip short.
    expect(foldLevelFor(room(1320), WIDTHS)).toBe(1);
    // The smallest window: every step, and nothing clipped.
    expect(foldLevelFor(room(1240), WIDTHS)).toBe(MAX_FOLD);
  });

  it('measures a level it hasn’t yet, rather than folding past it', () => {
    expect(foldLevelFor(1300, [1490, undefined, 1418])).toBe(1);
  });

  it('takes every step when even that is too wide', () => {
    expect(foldLevelFor(900, WIDTHS)).toBe(MAX_FOLD);
  });
});

describe('folded', () => {
  it('folds a step and every step before it', () => {
    expect(folded(0, 'song-short')).toBe(false);
    expect(folded(1, 'song-short')).toBe(true);
    expect(folded(1, 'name-narrow')).toBe(false);
    expect(folded(MAX_FOLD, FOLD_STEPS[MAX_FOLD - 1])).toBe(true);
  });
});
