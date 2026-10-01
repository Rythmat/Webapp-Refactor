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
import type { StaffLayout } from '@/components/notation/StaffView';
import { GUITAR_ATLAS_BOOK_ONE } from '@/curriculum/data/guitar/bookOne';
import { fretToMidi } from '@/lib/guitar/fretboard';
import type { NoteEvent } from '../GenrePianoRoll';
import { LearnTabView, TabTheoryOverlay } from '../LearnTabView';

// The TAB's theory layers: W / H chips between scale notes and a chord tone
// under each arpeggio note, drawn from the layout TabStaffView reports.

const Q = 480;

// VexFlow measures glyphs as canvas text, and the view sizes itself from a
// ResizeObserver; jsdom has neither.
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

// The C major scale position, one quarter note each.
const events: NoteEvent[] = GUITAR_ATLAS_BOOK_ONE.C.majorScale.playOrder.map(
  (position, i) => ({
    id: `n${i}`,
    pitchName: 'C4',
    midi: fretToMidi(position),
    startTicks: i * Q,
    durationTicks: Q,
    fretPosition: position,
  }),
);

function renderTab(props: Partial<Parameters<typeof LearnTabView>[0]> = {}) {
  return render(
    <LearnTabView
      events={events}
      bars={2}
      beatsPerBar={4}
      inTime={false}
      playheadTick={-1}
      height={320}
      toggle={null}
      {...props}
    />,
  ).container;
}

describe('LearnTabView theory layers', () => {
  it('draws W / H chips between notes, read as whole or half steps', async () => {
    const host = renderTab({
      stepChips: [
        { fromId: 'n0', toId: 'n1', size: 'W', spoken: 'C to D: whole step' },
        { fromId: 'n2', toId: 'n3', size: 'H', spoken: 'E to F: half step' },
      ],
    });
    await waitFor(
      () => expect(host.querySelectorAll('[data-step-chip]')).toHaveLength(2),
      { timeout: 5000 },
    );
    const [w, h] = [...host.querySelectorAll('[data-step-chip]')];
    expect(w.getAttribute('data-step-chip')).toBe('W');
    expect(w.querySelector('[aria-hidden]')?.textContent).toBe('W');
    expect(w.querySelector('.sr-only')?.textContent).toBe('C to D: whole step');
    expect(h.querySelector('.sr-only')?.textContent).toBe('E to F: half step');
    // Between its two notes, which sit left to right.
    const left = (el: Element) => parseFloat((el as HTMLElement).style.left);
    expect(left(h)).toBeGreaterThan(left(w));
  });

  it('writes a chord tone under each annotated note', async () => {
    const host = renderTab({
      noteAnnotations: new Map([
        ['n0', 'R'],
        ['n1', '♭3'],
      ]),
    });
    await waitFor(
      () =>
        expect(host.querySelectorAll('[data-note-annotation]')).toHaveLength(2),
      { timeout: 5000 },
    );
    const texts = [...host.querySelectorAll('[data-note-annotation]')].map(
      (a) => a.textContent,
    );
    expect(texts).toEqual(['R', '♭3']);
  });

  it('draws nothing without layers, and keeps the practice overlay', async () => {
    const overlay = vi.fn((layout: StaffLayout | null) =>
      layout ? <span data-practice-overlay /> : null,
    );
    const host = renderTab({ overlay, stepChips: [] });
    await waitFor(
      () => expect(host.querySelector('[data-practice-overlay]')).toBeTruthy(),
      { timeout: 5000 },
    );
    expect(host.querySelector('[data-tab-theory]')).toBeNull();
  });
});

describe('TabTheoryOverlay', () => {
  const layout: StaffLayout = {
    barlines: [],
    measures: [
      {
        measureIndex: 0,
        partIndex: 0,
        system: 0,
        x: 0,
        y: 28,
        width: 300,
        height: 128,
        startTick: 0,
        endTick: 1920,
      },
      {
        measureIndex: 1,
        partIndex: 0,
        system: 1,
        x: 0,
        y: 196,
        width: 300,
        height: 128,
        startTick: 1920,
        endTick: 3840,
      },
    ],
    notes: [
      ['a', 0, 0, 100],
      ['b', 0, 480, 160],
      ['c', 1, 1920, 60],
      // A tied continuation of 'a', later: not where 'a' is written.
      ['a', 1, 1920, 20],
    ].map(([id, measureIndex, tick, x]) => ({
      id: id as string,
      partIndex: 0,
      measureIndex: measureIndex as number,
      tick: tick as number,
      x: x as number,
      y: 60,
      space: 6.5,
      stem: 'down' as const,
      letter: 'c',
      octave: 4,
      alteration: 0,
      line: 0,
    })),
    rests: [],
    scale: 1,
    systemHeight: 168,
    stepPx: 6.5,
    topLineDrop: 13,
  };
  const px = (el: Element | null, prop: 'left' | 'top') =>
    parseFloat((el as HTMLElement).style[prop]);

  it('centres a chip between its notes above the top string', () => {
    const { container } = render(
      <TabTheoryOverlay
        layout={layout}
        stepChips={[{ fromId: 'a', toId: 'b', size: 'W', spoken: 'W' }]}
      />,
    );
    const chip = container.querySelector('[data-step-chip]');
    expect(px(chip, 'left')).toBe(130);
    expect(px(chip, 'top')).toBe(28);
  });

  it('keeps a chip on its first note’s line when the next note wraps', () => {
    const { container } = render(
      <TabTheoryOverlay
        layout={layout}
        stepChips={[{ fromId: 'b', toId: 'c', size: 'H', spoken: 'H' }]}
      />,
    );
    const chip = container.querySelector('[data-step-chip]');
    expect(px(chip, 'left')).toBe(174);
    expect(px(chip, 'top')).toBe(28);
  });

  it('puts an annotation under the first drawn note, below the rhythm', () => {
    const { container } = render(
      <TabTheoryOverlay
        layout={layout}
        noteAnnotations={
          new Map([
            ['a', 'R'],
            ['missing', '3'],
          ])
        }
      />,
    );
    const notes = container.querySelectorAll('[data-note-annotation]');
    expect(notes).toHaveLength(1);
    expect(px(notes[0], 'left')).toBe(100);
    expect(px(notes[0], 'top')).toBe(28 + 128 - 7);
  });

  it('draws nothing without a layout', () => {
    const { container } = render(
      <TabTheoryOverlay
        layout={null}
        stepChips={[{ fromId: 'a', toId: 'b', size: 'W', spoken: 'W' }]}
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});
