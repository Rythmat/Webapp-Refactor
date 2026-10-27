// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { UKULELE } from '@/lib/guitar/instrument';
import { ChordBox } from '../ChordBox';
import { Fretboard } from '../Fretboard';
import { FrettedInstrumentContext } from '../frettedInstrumentContext';

const RED = '#D2404A';

const onUkulele = (node: ReactNode) =>
  render(
    <FrettedInstrumentContext.Provider value={UKULELE}>
      {node}
    </FrettedInstrumentContext.Provider>,
  ).container;

describe('a ukulele neck', () => {
  afterEach(cleanup);

  it('draws C major 0-0-0-3 as a four-string box', () => {
    const host = onUkulele(
      <ChordBox
        shape={{
          frets: '0-0-0-3',
          diagramStartFret: 1,
          fingering: [{ finger: 3, string: 1, fret: 3 }],
        }}
        name="C major"
        hybridLabel="1 maj"
        rootPc={0}
        quality="maj"
        keyColor={RED}
      />,
    );
    // SIDE * 2 + 3 gaps of 16, like the bass box.
    expect(host.querySelector('svg')!.getAttribute('viewBox')).toMatch(
      /^0 0 96 /,
    );
    const open = [...host.querySelectorAll('[data-marker="open"]')];
    expect(open.map((m) => m.getAttribute('data-string'))).toEqual([
      '4',
      '3',
      '2',
    ]);
    const dot = host.querySelector(
      '[data-dot][data-string="1"][data-fret="3"]',
    );
    expect(dot).not.toBeNull();
  });

  it('draws the C string thickest, the re-entrant G thinner than E', () => {
    const host = onUkulele(
      <Fretboard window={{ min: 0, max: 5 }} keyColor={RED} markers={[]} />,
    );
    const widths = new Map(
      [...host.querySelectorAll('line')]
        .filter((l) => l.getAttribute('y1') === l.getAttribute('y2'))
        .map((l) => [
          l.getAttribute('y1'),
          Number(l.getAttribute('stroke-width')),
        ]),
    );
    // Four strings, top (A) to bottom (G): A < G < E < C.
    expect(widths.size).toBe(4);
    const [a, e, c, g] = [...widths.entries()]
      .sort((x, y) => Number(x[0]) - Number(y[0]))
      .map(([, w]) => w);
    expect(c).toBeGreaterThan(e);
    expect(e).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(a);
  });
});
