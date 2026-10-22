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
          [{ contentRect: { width: 900, height: 300 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
    },
  );
});
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

// A pickup bar (bar 0: rests, then two eighths) and bar 1.
const score = buildScore(
  [
    { id: 'when', midi: 60, startTick: -480, durationTicks: 240 },
    { id: 'i', midi: 60, startTick: -240, durationTicks: 240 },
    { id: 'play', midi: 60, startTick: 0, durationTicks: 1920 },
  ],
  {
    staves: 'treble',
    minMeasures: 2,
    originTick: -1920,
    firstMeasureNumber: 0,
  },
);

/** Each drawn barline, as its strokes' widths: a double bar is [1, 1]. */
async function barlines(doubleBarEnds?: ReadonlySet<number>) {
  const { container } = render(
    <GrandStaff score={score} doubleBarEnds={doubleBarEnds} />,
  );
  await waitFor(
    () =>
      expect(
        container.querySelectorAll('.vf-stavebarline').length,
      ).toBeGreaterThan(0),
    { timeout: 5000 },
  );
  return [...container.querySelectorAll('.vf-stavebarline')]
    .map((group) =>
      [...group.querySelectorAll('rect')].map((r) =>
        Number(r.getAttribute('width')),
      ),
    )
    .filter((strokes) => strokes.length > 0);
}

describe('a double bar', () => {
  it('closes the pickup bar into the downbeat', async () => {
    const drawn = await barlines(new Set([0]));
    expect(drawn).toContainEqual([1, 1]);
    // And the piece still ends on its final bar line, thin then thick.
    expect(drawn).toContainEqual([1, 3]);
  });

  it('is only where it is asked for', async () => {
    expect(await barlines()).not.toContainEqual([1, 1]);
  });
});
