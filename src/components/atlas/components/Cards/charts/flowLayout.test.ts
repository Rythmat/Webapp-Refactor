import { describe, expect, it } from 'vitest';
import { BAND, flowLayout } from './flowLayout';

describe('the flow diagram', () => {
  const from = [
    { key: 'a', label: 'New Orleans', weight: 8 },
    { key: 'b', label: 'A place with a very long name indeed', weight: 2 },
  ];
  const to = [{ key: 'c', label: 'Chicago', weight: 4 }];
  const layout = flowLayout(from, to, 240, 120);

  it('bands each side into the hub, as wide as its share of the strongest', () => {
    expect(layout.bands.map((b) => [b.key, b.side])).toEqual([
      ['in:a', 'in'],
      ['in:b', 'in'],
      ['out:c', 'out'],
    ]);
    expect(layout.bands[0].width).toBe(BAND.max);
    expect(layout.bands[1].width).toBeLessThan(layout.bands[2].width);
    expect(layout.bands[0].d.startsWith('M0,')).toBe(true);
    expect(
      layout.bands[2].d.endsWith(
        `240,${layout.labels[2].y + layout.bands[2].width / 2 + 4}`,
      ),
    ).toBe(true);
    expect(layout.hub.x).toBe(120);
  });

  it('names each side at its own edge, cutting long names', () => {
    expect(layout.labels.map((l) => [l.anchor, l.x])).toEqual([
      ['start', 0],
      ['start', 0],
      ['end', 240],
    ]);
    expect(layout.labels[1].text).toHaveLength(16);
    expect(layout.labels[1].text.endsWith('…')).toBe(true);
  });
});
