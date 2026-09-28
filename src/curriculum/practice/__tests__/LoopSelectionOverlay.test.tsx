// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { MeasureBox, StaffLayout } from '@/components/notation/StaffView';
import {
  LoopSelectionOverlay,
  type LoopSelectionOverlayProps,
} from '../LoopSelectionOverlay';
import type { LoopRange } from '../sliceStepForLoop';

afterEach(cleanup);

// jsdom has no PointerEvent; without one fireEvent drops `button` and the
// coordinates, which the drag reads.
beforeAll(() => {
  if (window.PointerEvent) return;
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = TestPointerEvent as typeof PointerEvent;
});

const BAR = 1920;
const WIDTH = 200;
const HEIGHT = 128;
const SYSTEM = 168;

/**
 * An in-time drawing: the count-in bar and the step's bars 1-2 on the first
 * system, bars 3-4 on the second.
 */
function fakeLayout(): StaffLayout {
  const measures: MeasureBox[] = [0, 1, 2, 3, 4].map((measureIndex) => {
    const system = measureIndex < 3 ? 0 : 1;
    const column = system === 0 ? measureIndex : measureIndex - 3;
    return {
      measureIndex,
      partIndex: 0,
      system,
      x: 20 + column * WIDTH,
      y: 28 + system * SYSTEM,
      width: WIDTH,
      height: HEIGHT,
      startTick: measureIndex * BAR,
      endTick: (measureIndex + 1) * BAR,
    };
  });
  return {
    barlines: [],
    measures,
    notes: [],
    rests: [],
    scale: 1,
    systemHeight: SYSTEM,
    stepPx: 6.5,
    topLineDrop: 13,
  };
}

/** The point in the middle of a step bar (0-based) on the fake drawing. */
function centreOf(bar: number) {
  const box = fakeLayout().measures[bar + 1];
  return { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
}

function Harness({
  onChange,
  initial = null,
  ...over
}: Partial<LoopSelectionOverlayProps> & { initial?: LoopRange | null }) {
  const [loop, setLoop] = useState<LoopRange | null>(initial);
  return (
    <LoopSelectionOverlay
      layout={fakeLayout()}
      bars={4}
      loop={loop}
      keyColor="#D2404A"
      countInOffset={BAR}
      {...over}
      onChange={(next) => {
        onChange?.(next);
        setLoop(next);
      }}
    />
  );
}

const bar = (n: number) => screen.getByRole('button', { name: `Bar ${n}` });
const pressed = () =>
  screen
    .getAllByRole('button', { name: /^Bar / })
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.getAttribute('aria-label'));

describe('LoopSelectionOverlay', () => {
  it('draws one button per step bar over its measure, skipping the count-in', () => {
    render(<Harness />);
    const buttons = screen.getAllByRole('button', { name: /^Bar / });
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Bar 1',
      'Bar 2',
      'Bar 3',
      'Bar 4',
    ]);
    expect(bar(1).style.left).toBe(`${20 + WIDTH}px`);
    expect(bar(3).style.top).toBe(`${28 + SYSTEM}px`);
    expect(bar(3).style.width).toBe(`${WIDTH}px`);
  });

  it('leaves out an empty bar the drawing adds past the step', () => {
    render(<Harness bars={3} />);
    expect(screen.queryByRole('button', { name: 'Bar 4' })).toBeNull();
  });

  it('selects whole bars by dragging across them', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(bar(2), { button: 0, pointerId: 1, ...centreOf(1) });
    fireEvent.pointerMove(bar(2), { pointerId: 1, ...centreOf(1) });
    expect(onChange).not.toHaveBeenCalled();
    // Onto bar 4, on the next system.
    fireEvent.pointerMove(bar(2), { pointerId: 1, ...centreOf(3) });
    expect(onChange).toHaveBeenLastCalledWith({ startBar: 1, endBar: 3 });
    // Back to the first bar, then past it: the loop turns around the anchor.
    fireEvent.pointerMove(bar(2), { pointerId: 1, ...centreOf(1) });
    expect(onChange).toHaveBeenLastCalledWith({ startBar: 1, endBar: 1 });
    fireEvent.pointerMove(bar(2), { pointerId: 1, ...centreOf(0) });
    expect(onChange).toHaveBeenLastCalledWith({ startBar: 0, endBar: 1 });
    fireEvent.pointerUp(bar(2), { pointerId: 1 });
    // The drag's own click doesn't shrink it back to one bar.
    fireEvent.click(bar(2), { detail: 1 });
    fireEvent.pointerMove(bar(2), { pointerId: 1, ...centreOf(3) });
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(pressed()).toEqual(['Bar 1', 'Bar 2']);
  });

  it('loops one bar on a tap or click', () => {
    const onChange = vi.fn();
    render(
      <Harness onChange={onChange} initial={{ startBar: 0, endBar: 3 }} />,
    );
    fireEvent.pointerDown(bar(3), { button: 0, pointerId: 1, ...centreOf(2) });
    fireEvent.pointerUp(bar(3), { pointerId: 1 });
    fireEvent.click(bar(3), { detail: 1 });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenLastCalledWith({ startBar: 2, endBar: 2 });
  });

  it('leaves the loop alone when a touch turns into a scroll', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(bar(2), {
      button: 0,
      pointerId: 1,
      pointerType: 'touch',
      ...centreOf(1),
    });
    const { clientX, clientY } = centreOf(1);
    fireEvent.pointerMove(bar(2), {
      pointerId: 1,
      clientX,
      clientY: clientY + 8,
    });
    // The browser takes the gesture over to scroll, and no click follows.
    fireEvent.pointerCancel(bar(2), { pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('snaps a point between bars to the nearest bar', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(bar(1), { button: 0, pointerId: 1, ...centreOf(0) });
    // Just past the right end of the first system, level with it.
    fireEvent.pointerMove(bar(1), {
      pointerId: 1,
      clientX: 20 + 3 * WIDTH + 30,
      clientY: 60,
    });
    expect(onChange).toHaveBeenLastCalledWith({ startBar: 0, endBar: 1 });
  });

  it('ignores presses other than the primary button', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(bar(2), { button: 2, pointerId: 1, ...centreOf(1) });
    fireEvent.pointerMove(bar(2), { pointerId: 1, ...centreOf(3) });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('drags a handle to move that end of the loop', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Harness onChange={onChange} initial={{ startBar: 1, endBar: 2 }} />,
    );
    const end = container.querySelector('[data-loop-handle="end"]')!;
    fireEvent.pointerDown(end, { button: 0, pointerId: 1, ...centreOf(2) });
    fireEvent.pointerMove(end, { pointerId: 1, ...centreOf(3) });
    expect(onChange).toHaveBeenLastCalledWith({ startBar: 1, endBar: 3 });
  });

  it('is keyboard accessible: arrows move, Shift+Arrow extends', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    // One tab stop, on the first bar.
    expect(bar(1).tabIndex).toBe(0);
    expect(bar(2).tabIndex).toBe(-1);

    bar(1).focus();
    fireEvent.keyDown(bar(1), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(bar(2));
    expect(bar(2).tabIndex).toBe(0);
    expect(onChange).not.toHaveBeenCalled();

    // Enter, Space and a screen reader press the button: a click, detail 0.
    fireEvent.click(bar(2));
    expect(onChange).toHaveBeenLastCalledWith({ startBar: 1, endBar: 1 });
    fireEvent.keyDown(bar(2), { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ startBar: 1, endBar: 2 });
    expect(document.activeElement).toBe(bar(3));
    fireEvent.keyDown(bar(3), { key: 'ArrowRight', shiftKey: true });
    expect(pressed()).toEqual(['Bar 2', 'Bar 3', 'Bar 4']);
    // Back the other way shrinks toward the anchor, then passes it.
    fireEvent.keyDown(bar(4), { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(bar(3), { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(bar(2), { key: 'ArrowLeft', shiftKey: true });
    expect(pressed()).toEqual(['Bar 1', 'Bar 2']);

    fireEvent.keyDown(bar(1), { key: 'End' });
    expect(document.activeElement).toBe(bar(4));
    fireEvent.keyDown(bar(4), { key: 'Escape' });
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(pressed()).toEqual([]);
  });

  it('keeps a tab stop on a drawn bar when the step gets shorter', () => {
    const { rerender } = render(<Harness />);
    act(() => bar(4).focus());
    expect(bar(4).tabIndex).toBe(0);
    rerender(<Harness bars={2} />);
    expect(
      screen.getAllByRole('button', { name: /^Bar / }).map((b) => b.tabIndex),
    ).toEqual([0, -1]);
  });

  it('Shift+Arrow with no loop starts one at the focused bar', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(bar(1), { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ startBar: 0, endBar: 1 });
  });

  it('shades the loop and shows its chip', () => {
    const { container } = render(
      <Harness initial={{ startBar: 2, endBar: 3 }} padBars={1} />,
    );
    const shades = container.querySelectorAll('[data-loop-shade]');
    expect([...shades].map((s) => s.getAttribute('data-loop-shade'))).toEqual([
      '2',
      '3',
    ]);
    expect(container.querySelectorAll('[data-loop-handle]')).toHaveLength(2);
    const chip = container.querySelector<HTMLElement>('[data-loop-chip]')!;
    expect(chip.textContent).toBe('Loop bars 3–4·pad 1 bar·✕');
    // Right-aligned to the end of bar 4; on the last system it is kept
    // inside the drawing rather than under it.
    expect(chip.style.right).toBe(`calc(100% - ${20 + 2 * WIDTH}px)`);
    expect(chip.style.top).toBe(`${2 * SYSTEM - 20}px`);
  });

  it('hangs the chip under a loop on an earlier system', () => {
    const { container } = render(
      <Harness initial={{ startBar: 0, endBar: 1 }} />,
    );
    const chip = container.querySelector<HTMLElement>('[data-loop-chip]')!;
    expect(chip.style.top).toBe(`${28 + HEIGHT}px`);
    expect(chip.textContent).toBe('Loop bars 1–2·✕');
  });

  it('clears the loop from the chip, and toggles the pad', () => {
    const onChange = vi.fn();
    const onPadChange = vi.fn();
    render(
      <Harness
        onChange={onChange}
        onPadChange={onPadChange}
        initial={{ startBar: 1, endBar: 1 }}
      />,
    );
    expect(screen.getByText('Loop bar 2')).toBeTruthy();
    const pad = screen.getByRole('button', { name: 'pad 1 bar' });
    expect(pad.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(pad);
    expect(onPadChange).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear loop' }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.queryByText('Loop bar 2')).toBeNull();
  });

  it('fades the loop in only for users who allow motion', () => {
    const { container } = render(
      <Harness initial={{ startBar: 0, endBar: 0 }} />,
    );
    const animated = container.querySelectorAll('[class*="animate-in"]');
    // The shade and the chip.
    expect(animated).toHaveLength(2);
    for (const el of animated) {
      expect(el.getAttribute('class')).toMatch(/motion-safe:animate-in/);
      expect(el.getAttribute('class')).not.toMatch(/(^|\s)animate-in/);
    }
  });

  it('draws nothing without a layout', () => {
    const { container } = render(<Harness layout={null} />);
    expect(container.innerHTML).toBe('');
  });
});
