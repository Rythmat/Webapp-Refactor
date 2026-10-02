import { describe, expect, it } from 'vitest';
import {
  CHIP_CHROME,
  CHIP_GAP,
  CHIP_MAX_WIDTH,
  CHAR_WIDTH,
  chipWidth,
  fitChips,
  MORE_WIDTH,
} from '../fitChips';

/** How many chips a cell's one line holds, with room kept for "+N". */

const chip = (label: string) => ({ label });
// Five characters: 30 px of text plus the chip's chrome.
const five = chipWidth(chip('Abcde'));

describe('fitChips', () => {
  it('estimates a chip from its text, capped', () => {
    expect(five).toBe(5 * CHAR_WIDTH + CHIP_CHROME);
    expect(chipWidth(chip('x'.repeat(200)))).toBe(CHIP_MAX_WIDTH);
    expect(chipWidth({ label: 'Abcde', tag: 'song pins' })).toBeGreaterThan(
      five,
    );
  });

  it('shows them all when they fit', () => {
    const chips = [chip('Abcde'), chip('Abcde')];
    expect(fitChips(chips, five * 2 + CHIP_GAP)).toBe(2);
  });

  it('keeps room for “+N” when some are left over', () => {
    const chips = [chip('Abcde'), chip('Abcde'), chip('Abcde')];
    // Room for two chips, but not two chips and "+1".
    expect(fitChips(chips, five * 2 + CHIP_GAP)).toBe(1);
    expect(fitChips(chips, five * 2 + CHIP_GAP * 2 + MORE_WIDTH)).toBe(2);
  });

  it('counts neighbours past the chips it was given', () => {
    // Both chips fit, but the cell has twenty neighbours: "+18" needs room.
    const chips = [chip('Abcde'), chip('Abcde')];
    expect(fitChips(chips, five * 2 + CHIP_GAP, 20)).toBe(1);
  });

  it('always shows one chip, truncated if need be', () => {
    expect(fitChips([chip('A very long name indeed')], 20)).toBe(1);
    expect(fitChips([], 200)).toBe(0);
  });
});
