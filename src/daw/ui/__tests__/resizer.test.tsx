// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Resizer } from '../Resizer';

// ── The Resizer primitive (milestone 2.4) ──────────────────────────────────
// A drag reports every size to onPreview (no React render needed) and
// commits once, on release; the keyboard moves it ±step, Home and End go to
// the limits, Enter is the caller's toggle.
//
// Run: npx vitest run src/daw/ui/__tests__/resizer.test.tsx

// jsdom has no PointerEvent: without one, the coordinates of a fired
// pointer event are dropped.
if (typeof window.PointerEvent === 'undefined') {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
}

afterEach(cleanup);

function setup(direction: 1 | -1 = -1) {
  const onPreview = vi.fn();
  const onCommit = vi.fn();
  const onToggle = vi.fn();
  render(
    <Resizer
      label="Resize the dock"
      orientation="horizontal"
      direction={direction}
      value={220}
      min={120}
      max={500}
      onPreview={onPreview}
      onCommit={onCommit}
      onToggle={onToggle}
    />,
  );
  const edge = screen.getByRole('separator', { name: 'Resize the dock' });
  // jsdom has no pointer capture.
  edge.setPointerCapture = () => {};
  edge.hasPointerCapture = () => true;
  edge.releasePointerCapture = () => {};
  return { edge, onPreview, onCommit, onToggle };
}

describe('Resizer', () => {
  it('is a separator with its value and limits', () => {
    const { edge } = setup();
    expect(edge).toHaveAttribute('aria-orientation', 'horizontal');
    expect(edge).toHaveAttribute('aria-valuenow', '220');
    expect(edge).toHaveAttribute('aria-valuemin', '120');
    expect(edge).toHaveAttribute('aria-valuemax', '500');
  });

  it('previews every move of a drag and commits once on release', () => {
    const { edge, onPreview, onCommit } = setup();
    fireEvent.pointerDown(edge, { button: 0, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(edge, { clientY: 380, pointerId: 1 });
    fireEvent.pointerMove(edge, { clientY: 300, pointerId: 1 });
    // Dragged up 100 px: an edge above its panel grows it.
    expect(onPreview).toHaveBeenLastCalledWith(320);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(edge, { clientY: 300, pointerId: 1 });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(320);
  });

  it('stays within its limits while dragging', () => {
    const { edge, onPreview } = setup();
    fireEvent.pointerDown(edge, { button: 0, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(edge, { clientY: -500, pointerId: 1 });
    expect(onPreview).toHaveBeenLastCalledWith(500);
  });

  it('moves with the keyboard', () => {
    const { edge, onCommit, onToggle } = setup();
    fireEvent.keyDown(edge, { key: 'ArrowUp' });
    expect(onCommit).toHaveBeenLastCalledWith(236);
    fireEvent.keyDown(edge, { key: 'ArrowDown' });
    expect(onCommit).toHaveBeenLastCalledWith(204);
    fireEvent.keyDown(edge, { key: 'End' });
    expect(onCommit).toHaveBeenLastCalledWith(500);
    fireEvent.keyDown(edge, { key: 'Home' });
    expect(onCommit).toHaveBeenLastCalledWith(120);
    fireEvent.keyDown(edge, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
