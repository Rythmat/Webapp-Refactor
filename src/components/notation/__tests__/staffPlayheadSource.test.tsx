// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { Profiler } from 'react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { buildScore, type NotationNoteInput } from '@/lib/notation';
import {
  StaffView,
  type PlayheadSubscription,
  type ScorePart,
} from '../StaffView';

// ── A live playhead (milestone 1.7, score-05) ───────────────────────────────
// The Studio's Score, Lead Sheet and clip notation re-rendered the staff for
// every playback tick to move one cursor. With `playheadSource` the staff
// listens itself and moves the cursor through a ref: the same place as
// `playheadTick` would draw it, without a render, and it scrolls only when
// the cursor reaches another system. Without the prop a lesson's staff draws
// exactly as before.

const Q = 480;
const BAR = 4 * Q;

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
  window.matchMedia = ((media: string) => ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollTo = scrollTo as typeof Element.prototype.scrollTo;
  Object.defineProperty(window.SVGElement.prototype, 'getComputedTextLength', {
    configurable: true,
    value: () => 8,
  });
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
afterEach(() => {
  cleanup();
  scrollTo.mockClear();
});

/** Eight bars of quarter notes, four bars a system. */
function parts(): ScorePart[] {
  const notes: NotationNoteInput[] = [];
  for (let t = 0; t < 8 * BAR; t += Q) {
    notes.push({
      id: `n${t}`,
      midi: 67 + ((t / Q) % 5),
      startTick: t,
      durationTicks: Q,
    });
  }
  return [
    {
      id: 'part',
      score: buildScore(notes, {
        ticksPerQuarter: Q,
        timeSignature: [4, 4],
        minMeasures: 8,
        staves: 'treble',
      }),
    },
  ];
}

/** A playhead driven by hand, as the Studio's clock drives it. */
function fakeSource(start: number) {
  let tick = start;
  const listeners = new Set<(tick: number) => void>();
  const source: PlayheadSubscription = {
    get: () => tick,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const move = (next: number) => {
    tick = next;
    act(() => listeners.forEach((l) => l(next)));
  };
  return { source, move, listeners };
}

const cursor = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.ma-playhead');

/** Where `playheadTick` draws the cursor, the original way. */
async function drawnAt(tick: number): Promise<string> {
  const view = render(
    <StaffView parts={parts()} playheadTick={tick} measuresPerSystem={4} />,
  );
  await waitFor(() => expect(cursor(view.container)).not.toBeNull());
  const transform = cursor(view.container)!.style.transform;
  view.unmount();
  return transform;
}

describe('playheadSource', () => {
  it('puts the cursor where playheadTick would, and moves it without rendering', async () => {
    const atStart = await drawnAt(BAR + Q);
    const later = await drawnAt(2 * BAR + 2 * Q);
    expect(later).not.toBe(atStart);

    const { source, move } = fakeSource(BAR + Q);
    const p = parts();
    let commits = 0;
    const view = render(
      <Profiler id="staff" onRender={() => (commits += 1)}>
        <StaffView parts={p} playheadSource={source} measuresPerSystem={4} />
      </Profiler>,
    );
    await waitFor(() => expect(cursor(view.container)).not.toBeNull());
    expect(cursor(view.container)!.style.transform).toBe(atStart);

    const committed = commits;
    move(2 * BAR + 2 * Q);
    expect(cursor(view.container)!.style.transform).toBe(later);
    expect(commits).toBe(committed);
  });

  it('scrolls only when the cursor reaches another system', async () => {
    const { source, move } = fakeSource(0);
    const view = render(
      <StaffView
        parts={parts()}
        playheadSource={source}
        measuresPerSystem={4}
        style={{ height: 120 }}
      />,
    );
    await waitFor(() => expect(cursor(view.container)).not.toBeNull());
    const scrolls = scrollTo.mock.calls.length;

    for (let t = Q; t < 4 * BAR; t += Q / 4) move(t);
    expect(scrollTo.mock.calls.length).toBe(scrolls);

    // Into the second system: the container (no layout in jsdom, so 0 tall)
    // has it out of view.
    move(4 * BAR + Q);
    expect(scrollTo.mock.calls.length).toBe(scrolls + 1);
    move(4 * BAR + 2 * Q);
    expect(scrollTo.mock.calls.length).toBe(scrolls + 1);
  });

  it('hides the cursor off the music, and unsubscribes on unmount', async () => {
    const { source, move, listeners } = fakeSource(Q);
    const view = render(
      <StaffView
        parts={parts()}
        playheadSource={source}
        measuresPerSystem={4}
      />,
    );
    await waitFor(() => expect(cursor(view.container)).not.toBeNull());
    expect(listeners.size).toBe(1);
    move(100 * BAR);
    expect(cursor(view.container)!.style.display).toBe('none');
    move(Q);
    expect(cursor(view.container)!.style.display).toBe('');
    view.unmount();
    expect(listeners.size).toBe(0);
  });

  it('leaves a staff without it as it was: no cursor without playheadTick', async () => {
    const view = render(<StaffView parts={parts()} measuresPerSystem={4} />);
    await waitFor(() =>
      expect(view.container.querySelector('svg')).not.toBeNull(),
    );
    expect(cursor(view.container)).toBeNull();
  });
});
