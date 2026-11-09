import { describe, expect, it, vi } from 'vitest';
import { CHIP, addChipImages, chipImage } from './mapChips';

const FILL = [20, 20, 24, 0.9] as const;
const BORDER = [255, 255, 255, 0.5] as const;

describe('the name chips', () => {
  const chip = chipImage(FILL, BORDER, 2);
  const alpha = (x: number, y: number) =>
    chip.data[(y * chip.width + x) * 4 + 3];

  it('is a rounded box that stretches between its corners', () => {
    expect(chip.width).toBe(48);
    expect(chip.height).toBe(48);
    expect(chip.data).toHaveLength(48 * 48 * 4);
    expect(chip.stretchX).toEqual([[16, 32]]);
    const [x1, y1, x2, y2] = chip.content;
    expect(x1).toBeGreaterThanOrEqual(0);
    expect(x2).toBeLessThanOrEqual(chip.width);
    expect(y1).toBeLessThan(y2);
  });

  it('is clear in its corners, filled in its middle, edged round it', () => {
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(24, 24)).toBe(Math.round(0.9 * 255));
    // The edge: the border over the fill, brighter than the fill alone.
    const edge = (24 * chip.width + 1) * 4;
    expect(chip.data[edge]).toBeGreaterThan(FILL[0]);
  });

  it('adds both chips to a map once', () => {
    const images = new Set<string>();
    const map = {
      hasImage: (id: string) => images.has(id),
      addImage: vi.fn((id: string) => void images.add(id)),
    };
    addChipImages(map);
    addChipImages(map);
    expect(map.addImage).toHaveBeenCalledTimes(2);
    expect([...images]).toEqual([CHIP.plain, CHIP.on]);
  });
});
