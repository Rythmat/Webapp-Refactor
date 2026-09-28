/**
 * The card-wall cap.
 *
 * A flat cap of 40 silently dropped most of a class's answers: ~70px per card
 * in 3 columns is ~1150px of wall rendered into a ~316px reveal band, inside a
 * a reveal band that is `overflow-hidden` with no scroll — so the "+N more" chip
 * that was meant to disclose the overflow was itself clipped away.
 */
import { describe, expect, it } from 'vitest';
import { barRowScale } from './AnimatedChoiceBars';
import { cardCapForHeight } from './ResponseCardWall';

describe('cardCapForHeight', () => {
  it('keeps the old ceiling when the box height is unknown', () => {
    // The teacher dashboard column is auto-height and scrolls; nothing is lost.
    expect(cardCapForHeight('projector')).toBe(40);
    expect(cardCapForHeight('panel')).toBe(40);
  });

  it('fits the reveal band rather than overflowing it', () => {
    // The `body` zone is 316px tall; minus the chip that leaves 3 rows × 3 cols.
    const cap = cardCapForHeight('projector', 316);
    expect(cap).toBeLessThan(40);
    expect(cap % 3).toBe(0);
    // Sanity: the cards it admits actually fit.
    expect((cap / 3) * 70).toBeLessThanOrEqual(316 - 52);
  });

  it('never returns zero — a small class must still see its answers', () => {
    expect(cardCapForHeight('projector', 0)).toBe(3);
    expect(cardCapForHeight('projector', 60)).toBe(3);
    expect(cardCapForHeight('panel', 10)).toBe(2);
  });

  it('never exceeds the readability ceiling on a very tall box', () => {
    expect(cardCapForHeight('projector', 10_000)).toBe(40);
  });

  it('grows monotonically with height', () => {
    const caps = [100, 200, 316, 500, 800].map((h) =>
      cardCapForHeight('projector', h),
    );
    for (let i = 1; i < caps.length; i++) {
      expect(caps[i]).toBeGreaterThanOrEqual(caps[i - 1]);
    }
  });

  it('the compact panel fits more cards in the same height than the projector', () => {
    expect(cardCapForHeight('panel', 316)).toBeGreaterThan(
      cardCapForHeight('projector', 316),
    );
  });
});

describe('barRowScale — a poll compresses, it never truncates', () => {
  it('leaves comfortable polls alone', () => {
    // 3 options at projector scale fit the 316px body band easily.
    expect(barRowScale('projector', 3, 316)).toBe(1);
    expect(barRowScale('projector', 6)).toBe(1); // no height known
  });

  it('shrinks a six-option poll to fit the reveal band', () => {
    const s = barRowScale('projector', 6, 316);
    expect(s).toBeLessThan(1);
    // And it genuinely fits afterwards.
    const natural = 6 * (36 + 6 + 24) + 5 * 20;
    expect(natural * s).toBeLessThanOrEqual(316 + 0.01);
  });

  it('never shrinks past legibility from the back of a room', () => {
    // 20 options in a tiny box would be illegible; the floor holds.
    const s = barRowScale('projector', 20, 100);
    expect(s * 36).toBeGreaterThanOrEqual(15);
  });

  it('is monotonic: more options means more compression', () => {
    const scales = [3, 4, 6, 8].map((n) => barRowScale('projector', n, 316));
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeLessThanOrEqual(scales[i - 1]);
    }
  });

  it('EVERY option survives — that is the whole point', () => {
    // Unlike the card wall there is no cap: the function returns a scale, so
    // the caller always renders aggregate.options in full.
    expect(barRowScale('projector', 12, 316)).toBeGreaterThan(0);
    expect(barRowScale('panel', 12, 120)).toBeGreaterThan(0);
  });
});
