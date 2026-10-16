import { describe, expect, it } from 'vitest';
import {
  FOLD_STEPS,
  folded,
  foldLevelFor,
  MAX_FOLD,
} from '../useToolbarOverflow';

// ── The top bar's fold (milestone 2.5) ─────────────────────────────────────
// The bar's width at each fold level, illustrative: the bar without the
// transport and the song (B4a), with the name and the tabs each folding a
// little, and the room each window gives it (the window less the bar's
// 16 px of padding). R29 measures the real bar.
//
// Run: npx vitest run src/daw/shell/topbar/__tests__/useToolbarOverflow.test.ts

const WIDTHS = [880, 846, 826];
const room = (window: number) => window - 16;

describe('foldLevelFor', () => {
  it('folds only as far as each target window needs', () => {
    expect(foldLevelFor(room(1440), WIDTHS)).toBe(0);
    expect(foldLevelFor(room(1280), WIDTHS)).toBe(0);
    // The name narrower.
    expect(foldLevelFor(room(870), WIDTHS)).toBe(1);
    // A very narrow window: every step, and nothing clipped.
    expect(foldLevelFor(room(840), WIDTHS)).toBe(MAX_FOLD);
  });

  it('measures a level it hasn’t yet, rather than folding past it', () => {
    expect(foldLevelFor(1300, [1490, undefined, 1418])).toBe(1);
  });

  it('takes every step when even that is too wide', () => {
    expect(foldLevelFor(700, WIDTHS)).toBe(MAX_FOLD);
  });
});

describe('folded', () => {
  it('folds a step and every step before it', () => {
    expect(folded(0, 'name-narrow')).toBe(false);
    expect(folded(1, 'name-narrow')).toBe(true);
    expect(folded(1, 'tabs-tight')).toBe(false);
    expect(folded(MAX_FOLD, FOLD_STEPS[MAX_FOLD - 1])).toBe(true);
  });
});
