// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Fader, type FaderProps } from '../Fader';
import { Knob, type KnobProps } from '../Knob';
import { installDomShims } from './dom';

// ── Knob and Fader: keyboard and pointer operable sliders ───────────────────
// role="slider" with a name and a value text; arrows step 1% (Shift 0.1%),
// PageUp/PageDown 10%, Home/End the ends, Enter or a double-click resets;
// a drag moves relative to where it started, a tenth as far with Shift.
// onChange previews every move; onCommit fires once per gesture or key
// press, which is what becomes one store write and one undo step (1.9).

beforeAll(installDomShims);
afterEach(cleanup);

type Spies = { onChange?: (v: number) => void; onCommit?: (v: number) => void };

/** A knob wired to state, as the editor wires it to the store. */
function LiveKnob({
  onChange,
  onCommit,
  value: initial = 0.5,
  ...props
}: Partial<Omit<KnobProps, 'onChange' | 'onCommit'>> & Spies) {
  const [value, setValue] = useState(initial);
  return (
    <Knob
      label="Cutoff"
      min={0}
      max={1}
      format={(v) => `${Math.round(v * 1000) / 10}%`}
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      onCommit={onCommit}
    />
  );
}

function LiveFader({
  onChange,
  onCommit,
  value: initial = 0.5,
  ...props
}: Partial<Omit<FaderProps, 'onChange' | 'onCommit'>> & Spies) {
  const [value, setValue] = useState(initial);
  return (
    <Fader
      label="Volume"
      min={0}
      max={1}
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      onCommit={onCommit}
    />
  );
}

const slider = () => screen.getByRole('slider');
const now = () => Number(slider().getAttribute('aria-valuenow'));
const key = (k: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(slider(), { key: k, ...init });

describe('Knob: what a screen reader gets', () => {
  it('is a slider named by its label, with its range and value text', () => {
    render(<LiveKnob />);
    const knob = screen.getByRole('slider', { name: 'Cutoff' });
    expect(knob).toHaveAttribute('aria-valuemin', '0');
    expect(knob).toHaveAttribute('aria-valuemax', '1');
    expect(knob).toHaveAttribute('aria-valuenow', '0.5');
    expect(knob).toHaveAttribute('aria-valuetext', '50%');
    expect(knob).toHaveAttribute('tabindex', '0');
  });

  it('shows the value and label without reading them twice', () => {
    render(<LiveKnob />);
    // Visible, but hidden from the accessibility tree: the slider says both.
    expect(screen.getByText('Cutoff')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('slider', { name: '50%' })).toBeNull();
  });

  it('keeps a hidden label as the name', () => {
    render(<LiveKnob hideLabel />);
    expect(screen.queryByText('Cutoff')).toBeNull();
    expect(screen.getByRole('slider', { name: 'Cutoff' })).toBeInTheDocument();
  });
});

describe('Knob: keyboard', () => {
  it('steps 1% per arrow and 0.1% with Shift, one commit per press', () => {
    const onCommit = vi.fn();
    render(<LiveKnob onCommit={onCommit} />);
    key('ArrowUp');
    expect(now()).toBeCloseTo(0.51);
    key('ArrowRight', { shiftKey: true });
    expect(now()).toBeCloseTo(0.511);
    key('ArrowDown');
    key('ArrowLeft', { shiftKey: true });
    expect(now()).toBeCloseTo(0.5);
    expect(onCommit).toHaveBeenCalledTimes(4);
    expect(onCommit.mock.calls[0][0]).toBeCloseTo(0.51);
  });

  it('moves 10% per page and goes to the ends with Home and End', () => {
    render(<LiveKnob />);
    key('PageUp');
    expect(now()).toBeCloseTo(0.6);
    key('PageDown');
    key('PageDown');
    expect(now()).toBeCloseTo(0.4);
    key('End');
    expect(now()).toBe(1);
    key('Home');
    expect(now()).toBe(0);
  });

  it('resets to its reset value with Enter, as one commit', () => {
    const onCommit = vi.fn();
    render(<LiveKnob value={0.9} resetValue={0.25} onCommit={onCommit} />);
    key('Enter');
    expect(now()).toBe(0.25);
    expect(onCommit).toHaveBeenCalledOnce();
    // Already there: nothing to commit.
    key('Enter');
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it('changes and commits nothing at the end of its range', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<LiveKnob value={1} onChange={onChange} onCommit={onCommit} />);
    key('ArrowUp');
    key('End');
    expect(onChange).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("keeps its keys from the editor's shortcuts, and lets others through", () => {
    const shortcuts = vi.fn();
    render(
      <div onKeyDown={shortcuts}>
        <LiveKnob />
      </div>,
    );
    for (const k of ['ArrowUp', 'ArrowLeft', 'PageUp', 'Home', 'End']) key(k);
    expect(shortcuts).not.toHaveBeenCalled();
    key(' ');
    key('Delete');
    expect(shortcuts).toHaveBeenCalledTimes(2);
  });

  it('moves a stepped knob at least one step per press', () => {
    render(<LiveKnob min={-24} max={24} step={1} value={0} format={String} />);
    key('ArrowUp');
    expect(now()).toBe(1);
    key('ArrowUp', { shiftKey: true });
    expect(now()).toBe(2);
    expect(slider()).toHaveAttribute('aria-valuetext', '2');
  });
});

describe('Knob: pointer', () => {
  const press = (y: number, init: Partial<PointerEventInit> = {}) =>
    fireEvent.pointerDown(slider(), { button: 0, clientY: y, ...init });
  const move = (y: number, init: Partial<PointerEventInit> = {}) =>
    fireEvent.pointerMove(slider(), { clientY: y, ...init });
  const release = (y: number) => fireEvent.pointerUp(slider(), { clientY: y });

  it('raises the value as it is dragged up: 15 px is 10% of the range', () => {
    const onChange = vi.fn();
    render(<LiveKnob onChange={onChange} />);
    press(100);
    expect(slider()).toHaveFocus();
    move(85);
    expect(now()).toBeCloseTo(0.6);
    move(100);
    expect(now()).toBeCloseTo(0.5);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('moves a tenth as far while Shift is held, without a jump when it changes', () => {
    render(<LiveKnob />);
    press(100);
    move(85); // +10%
    move(70, { shiftKey: true }); // +1%
    expect(now()).toBeCloseTo(0.61);
    move(55); // +10% again, from where it was
    expect(now()).toBeCloseTo(0.71);
  });

  it('commits once, on release, with where it ended', () => {
    const onCommit = vi.fn();
    render(<LiveKnob onCommit={onCommit} />);
    press(100);
    move(90);
    move(80);
    move(70);
    expect(onCommit).not.toHaveBeenCalled();
    release(70);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit.mock.calls[0][0]).toBeCloseTo(0.7);
  });

  it('commits nothing for a press without a move', () => {
    const onCommit = vi.fn();
    render(<LiveKnob onCommit={onCommit} />);
    press(100);
    release(100);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('ends the gesture on pointercancel, keeping what it reached', () => {
    const onCommit = vi.fn();
    render(<LiveKnob onCommit={onCommit} />);
    press(100);
    move(85);
    fireEvent.pointerCancel(slider());
    expect(onCommit).toHaveBeenCalledOnce();
    move(40);
    expect(now()).toBeCloseTo(0.6);
  });

  it('ignores a pointer that did not start the drag', () => {
    render(<LiveKnob />);
    press(100, { pointerId: 1 });
    move(50, { pointerId: 2 });
    expect(now()).toBe(0.5);
  });

  it('snaps a stepped knob while dragging', () => {
    render(<LiveKnob min={-24} max={24} step={1} value={0} format={String} />);
    press(100);
    move(97); // 3 px of 150 is 0.96 semitones
    expect(now()).toBe(1);
  });

  it('resets on double-click, as one commit', () => {
    const onCommit = vi.fn();
    render(<LiveKnob value={0.8} resetValue={0.5} onCommit={onCommit} />);
    fireEvent.doubleClick(slider());
    expect(now()).toBe(0.5);
    expect(onCommit).toHaveBeenCalledOnce();
  });
});

describe('Knob: disabled', () => {
  it('leaves the tab order and ignores keys and drags', () => {
    const onChange = vi.fn();
    render(<LiveKnob disabled onChange={onChange} resetValue={0} />);
    expect(slider()).toHaveAttribute('tabindex', '-1');
    expect(slider()).toHaveAttribute('aria-disabled', 'true');
    key('ArrowUp');
    fireEvent.pointerDown(slider(), { button: 0, clientY: 100 });
    fireEvent.pointerMove(slider(), { clientY: 50 });
    fireEvent.doubleClick(slider());
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Fader', () => {
  it('is a named slider with its orientation', () => {
    render(
      <>
        <LiveFader />
        <LiveFader label="Send A" orientation="horizontal" />
      </>,
    );
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
    expect(screen.getByRole('slider', { name: 'Send A' })).toHaveAttribute(
      'aria-orientation',
      'horizontal',
    );
  });

  it('has the same keys as the knob', () => {
    const onCommit = vi.fn();
    render(<LiveFader onCommit={onCommit} resetValue={0.8} />);
    key('ArrowUp');
    key('ArrowUp', { shiftKey: true });
    expect(now()).toBeCloseTo(0.511);
    key('Home');
    expect(now()).toBe(0);
    key('Enter');
    expect(now()).toBe(0.8);
    expect(onCommit).toHaveBeenCalledTimes(4);
  });

  it('follows the pointer one to one: its length less the cap is the range', () => {
    // 120 px long with a 12 px cap: 108 px of travel.
    render(<LiveFader value={0} length={120} />);
    fireEvent.pointerDown(slider(), { button: 0, clientY: 200 });
    fireEvent.pointerMove(slider(), { clientY: 146 });
    expect(now()).toBeCloseTo(0.5);
    fireEvent.pointerMove(slider(), { clientY: 92 });
    expect(now()).toBe(1);
  });

  it('drags right to raise when horizontal, a tenth as far with Shift', () => {
    const onCommit = vi.fn();
    render(
      <LiveFader
        orientation="horizontal"
        value={0.5}
        length={112}
        onCommit={onCommit}
      />,
    );
    fireEvent.pointerDown(slider(), { button: 0, clientX: 10 });
    fireEvent.pointerMove(slider(), { clientX: 60, shiftKey: true });
    expect(now()).toBeCloseTo(0.55);
    fireEvent.pointerUp(slider(), { clientX: 60 });
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it('never jumps to where the press landed', () => {
    render(<LiveFader value={0.25} />);
    fireEvent.pointerDown(slider(), { button: 0, clientY: 5 });
    fireEvent.pointerUp(slider(), { clientY: 5 });
    expect(now()).toBe(0.25);
  });
});
