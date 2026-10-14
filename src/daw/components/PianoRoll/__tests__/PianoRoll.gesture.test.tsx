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
  const lane = view.container.querySelector<HTMLCanvasElement>(
    'canvas[style*="ns-resize"]',
  )!;
  return { onChange, lane };
}

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
