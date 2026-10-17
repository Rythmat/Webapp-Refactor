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
import { buildScore, type NotationScore } from '@/lib/notation';
import { GrandStaff } from '../GrandStaff';
import type { StaffLayout } from '../StaffView';

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

// ── The Score's own clefs ──────────────────────────────────────────────────
// A viola's alto clef, and a bass guitar's bass clef with an 8 under it,
// which writes its notes an octave above the pitch they sound.

async function drawn(drawnScore: NotationScore) {
  let layout: StaffLayout | null = null;
  const { container } = render(
    <GrandStaff
      score={drawnScore}
      onLayout={(next) => {
        layout = next;
      }}
    />,
  );
  await waitFor(
    () => {
      expect(container.querySelector('.vf-clef')).not.toBeNull();
      expect(layout?.notes.length).toBeGreaterThan(0);
    },
    { timeout: 5000 },
  );
  return {
    glyphs: [...container.querySelectorAll('.vf-clef text')].map(
      (text) => text.textContent,
    ),
    notes: (layout as StaffLayout | null)?.notes ?? [],
  };
}

const one = (midi: number, staves: 'treble' | 'bass' | 'bass8vb' | 'alto') =>
  buildScore([{ id: 'n', midi, startTick: 0, durationTicks: 1920 }], {
    staves,
    minMeasures: 1,
  });

describe("the Score's clefs", () => {
  it('draws the alto clef, middle C on its middle line', async () => {
    const { glyphs, notes } = await drawn(one(60, 'alto'));
    // Bravura cClef U+E05C.
    expect(glyphs).toEqual(['\u{E05C}']);
    expect(notes[0]).toMatchObject({ letter: 'c', octave: 4 });
    // On the middle line, where B4 sits in treble clef.
    const treble = await drawn(one(71, 'treble'));
    expect(notes[0].line).toBe(treble.notes[0].line);
    expect(notes[0].y).toBe(treble.notes[0].y);
  });

  it('draws the bass clef with an 8 under it, C2 on the C3 space', async () => {
    const bass8vb = await drawn(one(36, 'bass8vb'));
    // Bravura fClef8vb U+E064, as against fClef U+E062.
    expect(bass8vb.glyphs).toEqual(['\u{E064}']);
    const bass = await drawn(one(48, 'bass'));
    expect(bass.glyphs).toEqual(['\u{E062}']);
    // C2 on the bass clef with an 8 sits where C3 sits on the plain one.
    expect(bass8vb.notes[0]).toMatchObject({ letter: 'c', octave: 3 });
    expect(bass8vb.notes[0].line).toBe(bass.notes[0].line);
    expect(bass8vb.notes[0].y).toBe(bass.notes[0].y);
  });
});
