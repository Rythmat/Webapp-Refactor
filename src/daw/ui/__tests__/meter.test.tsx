// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MINUS } from '../format';
import { Meter, type MeterLevels, type MeterSource } from '../Meter';
import { COLOR } from '../tokens';
import { fakeCanvasContext } from './dom';

// ── Meter: levels straight to a canvas ──────────────────────────────────────
// A meter subscribes to a source (1.7's MeterBus) and paints each reading
// itself. React renders it once; a playing project re-renders nothing here
// (plan 1.7: frame-rate data stays out of React).

let painted: ReturnType<typeof fakeCanvasContext>;

beforeEach(() => {
  painted = fakeCanvasContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => painted.context) as unknown as HTMLCanvasElement['getContext'],
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function fakeSource() {
  let listener: ((levels: MeterLevels) => void) | null = null;
  const unsubscribe = vi.fn(() => {
    listener = null;
  });
  const source: MeterSource = {
    subscribe: vi.fn((callback) => {
      listener = callback;
      return unsubscribe;
    }),
  };
  const push = (...peak: number[]) => act(() => listener?.({ peak }));
  return { source, push, unsubscribe };
}

/** The fills of the last frame painted (each frame starts with clearRect). */
function lastFrame() {
  const start = painted.calls.map((c) => c.method).lastIndexOf('clearRect');
  return painted.calls
    .slice(start + 1)
    .filter((c) => c.method === 'fillRect')
    .map(({ args }) => {
      const [x, y, w, h, color] = args as [
        number,
        number,
        number,
        number,
        string,
      ];
      return { x, y, w, h, color };
    });
}

/** The clip light of the first channel: the top 4 px of a vertical meter. */
const clipLight = () =>
  lastFrame().find((rect) => rect.x === 0 && rect.y === 0 && rect.h === 4);

describe('Meter', () => {
  it('is an image named for what it meters', () => {
    render(<Meter label="Master" source={null} />);
    expect(
      screen.getByRole('img', { name: 'Master peak meter' }),
    ).toBeInTheDocument();
  });

  it('subscribes once and paints every reading without a React render', () => {
    const { source, push } = fakeSource();
    const renders = vi.fn();
    render(
      <Profiler id="meter" onRender={renders}>
        <Meter label="Master" source={source} />
      </Profiler>,
    );
    const rendersAtMount = renders.mock.calls.length;
    const paintsAtMount = painted.calls.length;
    for (let frame = 0; frame < 60; frame++) push(0.2 + frame / 100, 0.3);
    expect(source.subscribe).toHaveBeenCalledOnce();
    expect(renders).toHaveBeenCalledTimes(rendersAtMount);
    expect(painted.calls.length).toBeGreaterThan(paintsAtMount + 60);
  });

  it('runs no animation loop of its own', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const { source, push } = fakeSource();
    render(<Meter label="Master" source={source} />);
    push(0.5, 0.5);
    expect(raf).not.toHaveBeenCalled();
  });

  it('paints the zones: safe, then amber from −12 dBFS, red from 0 dBFS', () => {
    const { source, push } = fakeSource();
    render(<Meter label="Master" source={source} channels={1} />);
    push(0.1); // −20 dBFS: safe only
    let colors = new Set(lastFrame().map((r) => r.color));
    expect(colors).toContain(COLOR['meter-safe'].value);
    expect(colors).not.toContain(COLOR['meter-hot'].value);
    push(1.1); // over: every zone lit
    colors = new Set(lastFrame().map((r) => r.color));
    expect(colors).toContain(COLOR['meter-hot'].value);
    expect(colors).toContain(COLOR['meter-clip'].value);
  });

  it('latches the clip light until the meter is clicked', () => {
    const { source, push } = fakeSource();
    render(<Meter label="Master" source={source} />);
    push(0.5, 0.5);
    expect(clipLight()?.color).toBe(COLOR['meter-track'].value);
    push(1.2, 0.5);
    expect(clipLight()?.color).toBe(COLOR['meter-clip'].value);
    push(0.1, 0.1);
    push(0.1, 0.1);
    expect(clipLight()?.color).toBe(COLOR['meter-clip'].value);
    fireEvent.click(screen.getByRole('img'));
    expect(clipLight()?.color).toBe(COLOR['meter-track'].value);
  });

  it('shows the held peak in dB, under a Peak caption', () => {
    const { source, push } = fakeSource();
    render(<Meter label="Master" source={source} showPeak />);
    expect(screen.getByText('Peak')).toBeInTheDocument();
    push(0.5, 0.25);
    expect(screen.getByText(`${MINUS}6.0`)).toBeInTheDocument();
    // A quieter reading inside the hold time keeps the peak.
    push(0.1, 0.1);
    expect(screen.getByText(`${MINUS}6.0`)).toBeInTheDocument();
  });

  it('lets go of its source on unmount and when the source changes', () => {
    const first = fakeSource();
    const second = fakeSource();
    const { rerender, unmount } = render(
      <Meter label="Master" source={first.source} />,
    );
    rerender(<Meter label="Master" source={second.source} />);
    expect(first.unsubscribe).toHaveBeenCalledOnce();
    expect(second.source.subscribe).toHaveBeenCalledOnce();
    unmount();
    expect(second.unsubscribe).toHaveBeenCalledOnce();
  });

  it('paints a resting meter when there is no source', () => {
    render(<Meter label="Idle" source={null} channels={2} />);
    const colors = new Set(lastFrame().map((r) => r.color));
    expect([...colors]).toEqual([COLOR['meter-track'].value]);
  });
});
