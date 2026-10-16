import { describe, expect, it } from 'vitest';
import {
  FOLD_STEPS,
  folded,
  foldLevelFor,
  MAX_FOLD,
} from '../useToolbarOverflow';

// ── The top bar's fold (milestone 2.5) ─────────────────────────────────────
// The bar's measured width at each fold level, as the editor measured it at
// 12 px Glacial (the left zone 473 px, the transport 361, then the right
// zone level by level), and the room each target window gives it (the
// window less the bar's 16 px of padding).
//
// Run: npx vitest run src/daw/shell/topbar/__tests__/useToolbarOverflow.test.ts

const WIDTHS = [1490, 1446, 1418, 1383, 1348, 1330, 1300, 1262];
const room = (window: number) => window - 16;

describe('foldLevelFor', () => {
  it('folds only as far as each target window needs', () => {
    expect(foldLevelFor(room(1600), WIDTHS)).toBe(0);
    // A laptop: the keyboard switch and Share as icons, the rest shown.
    expect(foldLevelFor(room(1440), WIDTHS)).toBe(2);
    // A Chromebook: '?' and Settings into '⋯', the Song chip short.
    expect(foldLevelFor(room(1366), WIDTHS)).toBe(4);
    expect(foldLevelFor(room(1320), WIDTHS)).toBe(6);
    // The smallest window: every step, and nothing clipped.
    expect(foldLevelFor(room(1280), WIDTHS)).toBe(MAX_FOLD);
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
    expect(folded(0, 'typing-icon')).toBe(false);
    expect(folded(1, 'typing-icon')).toBe(true);
    expect(folded(1, 'share-icon')).toBe(false);
    expect(folded(MAX_FOLD, FOLD_STEPS[MAX_FOLD - 1])).toBe(true);
  });
});
