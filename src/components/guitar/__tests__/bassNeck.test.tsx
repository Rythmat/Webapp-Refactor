// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { midiAt } from '@/lib/guitar/fretboard';
import { BASS } from '@/lib/guitar/instrument';
import { FretDiagram } from '../FretDiagram';
import {
  FRETBOARD_HEIGHT_UNITS,
  Fretboard,
  fretboardHeightUnits,
} from '../Fretboard';
import { FrettedInstrumentContext } from '../frettedInstrumentContext';

const RED = '#D2404A';

const onBass = (node: ReactNode) =>
  render(
    <FrettedInstrumentContext.Provider value={BASS}>
      {node}
    </FrettedInstrumentContext.Provider>,
  ).container;

function translateY(el: Element | null): number {
  const match = /translate\([-\d.]+ ([-\d.]+)\)/.exec(
    el?.getAttribute('transform') ?? '',
  );
  if (!match) throw new Error('element has no translate');
  return Number(match[1]);
}

describe('a bass neck', () => {
  afterEach(cleanup);

  it('is three string gaps tall instead of five', () => {
    expect(FRETBOARD_HEIGHT_UNITS - fretboardHeightUnits(BASS)).toBe(44);
  });

  it('draws four strings, G on top and E at the bottom', () => {
    const host = onBass(
      <Fretboard
        window={{ min: 0, max: 5 }}
        keyColor={RED}
        markers={[4, 1].map((string) => ({
          string: string as 1 | 4,
          fret: 3,
          midi: midiAt(string as 1 | 4, 3, BASS),
          label: 'x',
          role: 'target' as const,
        }))}
      />,
    );
    const svg = host.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toMatch(
      new RegExp(` ${fretboardHeightUnits(BASS)}$`),
    );
    const at = (string: number) =>
      host.querySelector(`[data-marker][data-string="${string}"]`);
    expect(translateY(at(4)) - translateY(at(1))).toBe(66);
  });

  it('draws a four-string box, string 4 on the left', () => {
    const host = onBass(
      <FretDiagram
        startFret={1}
        muted={[1]}
        open={[]}
        dots={[
          { string: 3, fret: 3 },
          { string: 2, fret: 2 },
          { string: 2, fret: 5 },
        ]}
        keyColor={RED}
        ariaLabel="C major arpeggio"
      />,
    );
    // SIDE * 2 + 3 gaps of 16.
    expect(host.querySelector('svg')!.getAttribute('viewBox')).toMatch(
      /^0 0 96 /,
    );
  });
});
