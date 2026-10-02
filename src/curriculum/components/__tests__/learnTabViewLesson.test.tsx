// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

// The guitar lesson's TAB: no header strip on the raised panel, the digits
// in the lesson's colours, the count-in counted in the empty count-in bar,
// and chord symbols at a fixed size with the one being played underlined.

const Q = 480;
const BAR = 4 * Q;
const KEY = '#D2404A';
/** The TAB's box, as the ResizeObserver reports it (a test may change it). */
const PANEL = { width: 900, height: 300 };
const scrollTo = vi.fn();

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
          [{ contentRect: { ...PANEL } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
    },
  );
});
afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  scrollTo.mockClear();
});
// The TAB keeps the playhead's line in view; jsdom can't scroll.
HTMLElement.prototype.scrollTo = scrollTo as unknown as HTMLElement['scrollTo'];

/** The colour a browser reports once `color` is set to this. */
const css = (color: string) => {
  const el = document.createElement('i');
  el.style.color = color;
  return el.style.color;
};

/**
 * The C major scale, one quarter note each, after an empty count-in bar —
 * the way the lesson hands in-time notes to the TAB.
 */
const events: NoteEvent[] = GUITAR_ATLAS_BOOK_ONE.C.majorScale.playOrder.map(
  (position, i) => ({
    id: `n${i}`,
    pitchName: 'C4',
    midi: fretToMidi(position),
    startTicks: BAR + i * Q,
    durationTicks: Q,
    color: `${KEY}b3`,
    fretPosition: position,
  }),
);

type Props = Parameters<typeof LearnTabView>[0];

async function drawTab(props: Partial<Props> = {}) {
  let layout: StaffLayout | null = null;
  const view = render(
    <LearnTabView
      events={events}
      bars={3}
      beatsPerBar={4}
      keyColor={KEY}
      inTime
      playheadTick={-1}
      countInTicks={2 * BAR}
      beatTicks={Q}
      musicStartTick={BAR}
      height={320}
      toggle={<span data-testid="view-toggle" />}
      overlay={(l) => {
        layout = l;
        return null;
      }}
      {...props}
    />,
  );
  await waitFor(() => expect(layout).not.toBeNull(), { timeout: 5000 });
  return { ...view, layout: () => layout! };
}

/** Each note's drawn group, in time order (a scale: one note per group). */
const noteGroups = (host: Element) => [
  ...host.querySelectorAll<SVGElement>('.vf-tabnote'),
];

describe('LearnTabView, the guitar lesson TAB', () => {
  it('keeps its header strip and toggle by default', async () => {
    await drawTab();
    expect(screen.getByTestId('view-toggle')).toBeTruthy();
  });

  it('draws no header strip without showHeader, on the raised panel', async () => {
    const { container } = await drawTab({ showHeader: false });
    expect(screen.queryByTestId('view-toggle')).toBeNull();
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain('border-white/[0.08]');
    expect(panel.style.background).toBe(css('#151518'));
    // The digits' gap boxes take the panel's colour.
    expect(panel.style.getPropertyValue('--ma-tab-gap')).toBe('#151518');
    // Nothing but the TAB in the panel.
    expect(panel.children).toHaveLength(1);
  });

  it('counts in inside the empty count-in bar, in the neutral tone', async () => {
    // Half a bar into a two-bar count: beat 3 of bar one.
    const { container, layout } = await drawTab({ playheadTick: -BAR / 2 });
    const countIn = layout().measures.find((m) => m.endTick <= BAR)!;
    const box = container.querySelector<HTMLElement>(
      '.ma-tab-staff .notation-countoff',
    )!;
    expect(box.className).toBe('notation-countoff is-in-bar');
    expect(box.style.left).toBe(`${countIn.x}px`);
    expect(box.style.top).toBe(`${countIn.y}px`);
    expect(box.style.width).toBe(`${countIn.width}px`);
    const number = box.querySelector('.notation-countoff-number')!;
    expect(number.className).toBe('notation-countoff-number is-neutral');
    expect(number.textContent).toBe('3');
    // Only the one count, and none once bar 1 arrives.
    expect(container.querySelectorAll('.notation-countoff')).toHaveLength(1);
  });

  it('stops counting when bar 1 arrives', async () => {
    const { container } = await drawTab({ playheadTick: BAR });
    expect(container.querySelector('.notation-countoff')).toBeNull();
  });

  it('opens a paged TAB on the music, not on the empty count-in bar', async () => {
    // A phone: one bar a line, one line a page.
    Object.assign(PANEL, { width: 260, height: 180 });
    try {
      // Between two passes of a loop: parked and stopped, but the next count
      // is on its way, so the count-in bar's line stays.
      await drawTab({ playheadTick: -2 * BAR, playing: false });
      for (const [options] of scrollTo.mock.calls) {
        expect(options).toEqual(expect.objectContaining({ top: 0 }));
      }
      cleanup();
      scrollTo.mockClear();
      // The preview: parked before the count, stopped.
      const preview = await drawTab({
        playheadTick: -2 * BAR,
        playing: false,
        openOnMusic: true,
      });
      const firstBar = preview
        .layout()
        .measures.find((m) => m.startTick === BAR)!;
      expect(firstBar.system).toBeGreaterThan(0);
      expect(scrollTo).toHaveBeenLastCalledWith(
        expect.objectContaining({
          top: firstBar.system * preview.layout().systemHeight,
        }),
      );
      cleanup();
      scrollTo.mockClear();
      // Counting: back to the count-in bar's line, where the count is.
      await drawTab({ playheadTick: -BAR, playing: true });
      expect(scrollTo).toHaveBeenCalled();
      for (const [options] of scrollTo.mock.calls) {
        expect(options).toEqual(expect.objectContaining({ top: 0 }));
      }
    } finally {
      Object.assign(PANEL, { width: 900, height: 300 });
    }
  });

  it('counts only while the playhead runs: no lone "1" in the preview', async () => {
    // The preview parks the playhead before the count-in, stopped.
    const parked = await drawTab({ playheadTick: -2 * BAR, playing: false });
    expect(parked.container.querySelector('.notation-countoff')).toBeNull();
    cleanup();
    // The same spot once the count starts.
    const counting = await drawTab({ playheadTick: -2 * BAR, playing: true });
    const number = counting.container.querySelector(
      '.notation-countoff-number',
    );
    expect(number?.textContent).toBe('1');
  });

  it('colours the digits: key colour for now and played, white/30 for missed, no glow', async () => {
    // n0 played; n1 passed unplayed; the playhead is on n2; the rest to come.
    const { container } = await drawTab({
      playheadTick: BAR + 2 * Q + 10,
      performanceMeta: { n0: { startTick: BAR + 20 } },
    });
    await waitFor(() =>
      expect(noteGroups(container)[2].style.color).toBe(css(KEY)),
    );
    const [played, missed, now, next] = noteGroups(container);
    expect(played.style.color).toBe(css(`${KEY}b3`));
    expect(missed.style.color).toBe(css('rgba(255, 255, 255, 0.3)'));
    expect(now.style.color).toBe(css(KEY));
    // Still to play: the TAB's own ink.
    expect(next.style.color).toBe('');
    expect(container.querySelector('.ma-note-glow')).toBeNull();
  });

  it('lights no note once the take has stopped: the one left under the playhead was missed', async () => {
    const chordSymbols = [{ id: 's0', text: 'C', startTick: BAR }];
    // Stopped inside n2 (unplayed); n0 was played.
    const at = {
      playheadTick: BAR + 2 * Q + 10,
      performanceMeta: { n0: { startTick: BAR + 20 } },
      chordSymbols,
    };
    const running = await drawTab({ ...at, playing: true });
    await waitFor(() =>
      expect(noteGroups(running.container)[2].style.color).toBe(css(KEY)),
    );
    expect(
      running.container.querySelector('[data-chord-symbol="C"]'),
    ).toHaveAttribute('data-current');
    cleanup();

    const { container } = await drawTab({ ...at, playing: false });
    const missed = css('rgba(255, 255, 255, 0.3)');
    await waitFor(() =>
      expect(noteGroups(container)[2].style.color).toBe(missed),
    );
    const [played, passed, , next] = noteGroups(container);
    expect(played.style.color).toBe(css(`${KEY}b3`));
    expect(passed.style.color).toBe(missed);
    expect(next.style.color).toBe('');
    // Nothing is being played: no chord is underlined.
    expect(container.querySelector('[data-current]')).toBeNull();
  });

  it('keeps the note to play in the key colour out of time, without a glow', async () => {
    const { container } = await drawTab({
      inTime: false,
      playheadTick: 0,
      noteHoldMeta: {
        n0: { isCompleted: true, isCurrentChord: false, holdProgress: 1 },
        n1: { isCompleted: false, isCurrentChord: true, holdProgress: 0 },
      },
    });
    await waitFor(() =>
      expect(noteGroups(container)[1].style.color).toBe(css(KEY)),
    );
    expect(container.querySelector('.ma-note-glow')).toBeNull();
    expect(container.querySelector('.notation-countoff')).toBeNull();
  });

  it('writes chord symbols at a fixed 16px, underlining the one being played', async () => {
    const chordSymbols = [
      { id: 's0', text: 'C', startTick: BAR },
      { id: 's1', text: 'Dm', startTick: BAR + 2 * Q },
    ];
    const symbol = (host: Element, text: string) =>
      host.querySelector<HTMLElement>(`[data-chord-symbol="${text}"]`)!;

    const before = await drawTab({ chordSymbols, playheadTick: -1 });
    expect(symbol(before.container, 'C').style.fontSize).toBe('16px');
    expect(symbol(before.container, 'C').className).toContain('font-bold');
    // Nothing is being played yet.
    expect(before.container.querySelector('[data-current]')).toBeNull();
    cleanup();

    const { container, layout } = await drawTab({
      chordSymbols,
      playheadTick: BAR + 2 * Q + 10,
    });
    const dm = symbol(container, 'Dm');
    expect(dm.hasAttribute('data-current')).toBe(true);
    expect(dm.style.textDecorationLine).toBe('underline');
    expect(dm.style.textDecorationColor.toLowerCase()).toBe(KEY.toLowerCase());
    // The text itself stays in the text colour; only the underline is keyed.
    expect(dm.className).toContain('text-[#e8e8f0]');
    expect(dm.style.color).toBe('');
    expect(symbol(container, 'C').hasAttribute('data-current')).toBe(false);
    // Fixed size at any scale: over the TAB's headroom line by the gap.
    const { scale, topLineDrop, measures } = layout();
    const bar1 = measures.find((m) => m.startTick === BAR)!;
    expect(dm.style.fontSize).toBe('16px');
    expect(parseFloat(dm.style.top)).toBeCloseTo(
      bar1.y + topLineDrop - 6 * scale - 16,
    );
  });
});

describe('TabTheoryOverlay chips', () => {
  const layout = (scale: number): StaffLayout => ({
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
    ],
    notes: [
      ['a', 0, 100],
      ['b', 480, 160],
    ].map(([id, tick, x]) => ({
      id: id as string,
      partIndex: 0,
      measureIndex: 0,
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
    scale,
    systemHeight: 168 * scale,
    stepPx: 6.5 * scale,
    topLineDrop: 13 * scale,
  });

  it('are neutral pills of fixed 12px type at any TAB scale', () => {
    for (const scale of [1, 2]) {
      const { container } = render(
        <TabTheoryOverlay
          layout={layout(scale)}
          stepChips={[{ fromId: 'a', toId: 'b', size: 'W', spoken: 'W' }]}
          noteAnnotations={new Map([['a', 'R']])}
        />,
      );
      for (const el of container.querySelectorAll<HTMLElement>(
        '[data-step-chip], [data-note-annotation]',
      )) {
        expect(el.className).toContain('text-xs');
        expect(el.className).toContain('h-5');
        expect(el.className).toContain('rounded-full');
        expect(el.className).toContain('border-white/15');
        expect(el.className).toContain('text-white/55');
        expect(el.className).not.toMatch(/font-(bold|semibold|medium)/);
        expect(el.style.fontSize).toBe('');
      }
      cleanup();
    }
  });
});
