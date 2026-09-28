// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { buildScore } from '@/lib/notation';
import { GrandStaff } from '../GrandStaff';

// VexFlow measures its glyphs as canvas text, and the view sizes itself from
// a ResizeObserver; jsdom has neither.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => ({
    font: '',
    measureText: (text: string) => ({
      width: text.length * 10,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 3,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 3,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 10,
    }),
  })) as unknown as HTMLCanvasElement['getContext'];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe() {
        this.callback(
          [{ contentRect: { width: 600, height: 300 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
    },
  );
});
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

const score = buildScore(
  [{ id: 'c', midi: 60, startTick: 0, durationTicks: 1920 }],
  { staves: 'treble', minMeasures: 1 },
);

async function clefGlyphs(clefAnnotation?: '8vb') {
  const { container } = render(
    <GrandStaff score={score} clefAnnotation={clefAnnotation} />,
  );
  await waitFor(
    () => expect(container.querySelector('.vf-clef')).not.toBeNull(),
    { timeout: 5000 },
  );
  return [...container.querySelectorAll('.vf-clef text')].map(
    (text) => text.textContent,
  );
}

describe('clef annotation', () => {
  it('draws the plain treble clef when none is asked for', async () => {
    // Bravura gClef U+E050.
    expect(await clefGlyphs()).toEqual(['\u{E050}']);
  });

  it('draws the treble clef with an 8 below for guitar', async () => {
    // Bravura gClef8vb U+E052.
    expect(await clefGlyphs('8vb')).toEqual(['\u{E052}']);
  });
});
