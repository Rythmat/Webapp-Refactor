// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { PianoRoll } from '../PianoRoll';

// ── A drag in the roll is one edit (milestone 1.9) ──────────────────────────
// Every mouse move of a drag used to hand the whole clip to onChange, which
// wrote the store, an undo check and a collab update per move
// (pianoroll-04). A drag now edits a draft the roll draws from, and hands it
// over once, on release.

const getContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof getContext;
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = getContext;
});
afterEach(cleanup);

const note: MidiNoteEvent = {
  note: 60,
  velocity: 100,
  startTick: 0,
  durationTicks: 120,
  channel: 0,
};

function renderRoll() {
  const onChange = vi.fn<(events: MidiNoteEvent[]) => void>();
  const view = render(
    <PianoRoll
      clipId="verse"
      events={[note]}
      clipStartTick={0}
      timelineStartTick={0}
      clipColor="#888"
      onChange={onChange}
    />,
  );
  // The lane opens collapsed (2026-10-22): open it, as a student would.
  fireEvent.click(view.getByTestId('velocity-lane-toggle'));
  const lane = view.container.querySelector<HTMLCanvasElement>(
    'canvas[style*="ns-resize"]',
  )!;
  return { onChange, lane };
}

describe('editing without tools (Suno’s clip editor, 2026-10-22)', () => {
  // Row 60 is (96 − 60) × 18 px down (rows open at 1.5 × 12 px); a tick is
  // 1/12 px at zoom 1, so the
  // note (120 ticks from 0) spans x 0–10.
  const ROW_60_Y = (96 - 60) * 18 + 9;

  function grid() {
    const onChange = vi.fn<(events: MidiNoteEvent[]) => void>();
    const view = render(
      <PianoRoll
        events={[note]}
        clipStartTick={0}
        timelineStartTick={0}
        clipColor="#888"
        onChange={onChange}
      />,
    );
    return { onChange, view, grid: view.getByTestId('piano-roll-grid') };
  }

  it('has no Select, Draw or Erase', () => {
    const { view } = grid();
    for (const name of ['Select', 'Draw', 'Erase', 'Select all']) {
      expect(view.queryByRole('button', { name })).toBeNull();
    }
    expect(view.getByTestId('piano-roll-bar')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Zoom in' })).toBeTruthy();
  });

  it('adds a note on a double-click on empty space, on the grid', () => {
    const { onChange, grid: g } = grid();
    fireEvent.doubleClick(g, { clientX: 205, clientY: ROW_60_Y });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [events] = onChange.mock.calls[0];
    expect(events).toHaveLength(2);
    // 205 px is tick 2460: on the quarter-note grid, 2400.
    expect(events[1]).toMatchObject({
      note: 60,
      startTick: 2400,
      durationTicks: 480,
    });
  });

  it('removes a note on a double-click on it', () => {
    const { onChange, grid: g } = grid();
    fireEvent.doubleClick(g, { clientX: 5, clientY: ROW_60_Y });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([]);
  });

  it('adds nothing on a single click on empty space', () => {
    const { onChange, grid: g } = grid();
    fireEvent.mouseDown(g, { button: 0, clientX: 205, clientY: ROW_60_Y });
    fireEvent.mouseUp(g, { clientX: 205, clientY: ROW_60_Y });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('the velocity lane', () => {
  it('opens collapsed, the bar’s Velocity there to open it', () => {
    const view = render(
      <PianoRoll
        events={[note]}
        clipStartTick={0}
        timelineStartTick={0}
        clipColor="#888"
        onChange={() => {}}
      />,
    );
    const toggle = view.getByTestId('velocity-lane-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      view.container.querySelector('canvas[style*="ns-resize"]'),
    ).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      view.container.querySelector('canvas[style*="ns-resize"]'),
    ).not.toBeNull();
  });
});

describe('PianoRoll velocity drag', () => {
  it('hands the clip over once, on release', () => {
    const { onChange, lane } = renderRoll();
    fireEvent.mouseDown(lane, { button: 0, clientX: 0, clientY: 10 });
    for (let y = 11; y <= 40; y++) {
      fireEvent.mouseMove(lane, { clientX: 0, clientY: y });
    }
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.mouseUp(lane, { clientX: 0, clientY: 40 });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [events] = onChange.mock.calls[0];
    expect(events[0].velocity).toBeLessThan(note.velocity);
  });

  it('ends a drag let go outside the lane', () => {
    const { onChange, lane } = renderRoll();
    fireEvent.mouseDown(lane, { button: 0, clientX: 0, clientY: 10 });
    fireEvent.mouseMove(lane, { clientX: 0, clientY: 30 });
    fireEvent.mouseUp(window);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
