// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TEMPO_MAX,
  TEMPO_MIN,
  TempoStepper,
  clampTempo,
  type TempoStepperProps,
} from '../TempoStepper';

afterEach(cleanup);

/** The stepper over real state, so repeated presses build on each other. */
function Controlled({
  initial,
  onChange,
  effectiveBpm,
}: {
  initial: number;
  onChange: (bpm: number) => void;
  effectiveBpm?: number;
}) {
  const [bpm, setBpm] = useState(initial);
  return (
    <TempoStepper
      bpm={bpm}
      effectiveBpm={effectiveBpm}
      onChange={(next) => {
        onChange(next);
        setBpm(next);
      }}
    />
  );
}

function setup(props: Partial<TempoStepperProps> = {}) {
  const onChange = vi.fn();
  render(<TempoStepper bpm={60} onChange={onChange} {...props} />);
  return { onChange, value: screen.getByRole('spinbutton', { name: 'Tempo' }) };
}

/** jsdom has no PointerEvent; React reads clientY off a MouseEvent. */
function pointer(target: Element, type: string, clientY: number) {
  fireEvent(
    target,
    new MouseEvent(type, { bubbles: true, cancelable: true, clientY }),
  );
}

describe('clampTempo', () => {
  it('holds tempo to 40–200 whole bpm', () => {
    expect(TEMPO_MIN).toBe(40);
    expect(TEMPO_MAX).toBe(200);
    expect(clampTempo(12)).toBe(40);
    expect(clampTempo(260)).toBe(200);
    expect(clampTempo(99.6)).toBe(100);
  });
});

describe('TempoStepper', () => {
  it('shows the tempo as a spin button with its limits', () => {
    const { value } = setup();
    expect(value).toHaveTextContent('60 bpm');
    expect(value).toHaveAttribute('aria-valuenow', '60');
    expect(value).toHaveAttribute('aria-valuemin', '40');
    expect(value).toHaveAttribute('aria-valuemax', '200');
    expect(value).toHaveAttribute('aria-valuetext', '60 bpm');
    expect(screen.getByRole('group', { name: 'Tempo' })).toBeInTheDocument();
  });

  it('− and + step by one, Shift by five', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Faster' }));
    expect(onChange).toHaveBeenLastCalledWith(61);
    fireEvent.click(screen.getByRole('button', { name: 'Slower' }));
    expect(onChange).toHaveBeenLastCalledWith(59);
    fireEvent.click(screen.getByRole('button', { name: 'Faster' }), {
      shiftKey: true,
    });
    expect(onChange).toHaveBeenLastCalledWith(65);
  });

  it('↑ ↓ step by one, Shift by five; Home and End go to the limits', () => {
    const { onChange, value } = setup();
    fireEvent.keyDown(value, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(61);
    fireEvent.keyDown(value, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(59);
    fireEvent.keyDown(value, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(65);
    fireEvent.keyDown(value, { key: 'ArrowDown', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(55);
    fireEvent.keyDown(value, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(40);
    fireEvent.keyDown(value, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(200);
  });

  it('marks the arrow keys handled, so the page and the step keys leave them', () => {
    const { value } = setup();
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    });
    value.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('never leaves 40–200', () => {
    const low = setup({ bpm: 40 });
    expect(screen.getByRole('button', { name: 'Slower' })).toBeDisabled();
    fireEvent.keyDown(low.value, { key: 'ArrowDown' });
    fireEvent.keyDown(low.value, { key: 'ArrowDown', shiftKey: true });
    expect(low.onChange).not.toHaveBeenCalled();
    cleanup();

    const high = setup({ bpm: 198 });
    fireEvent.keyDown(high.value, { key: 'ArrowUp', shiftKey: true });
    expect(high.onChange).toHaveBeenLastCalledWith(200);
    cleanup();

    const top = setup({ bpm: 200 });
    expect(screen.getByRole('button', { name: 'Faster' })).toBeDisabled();
    fireEvent.keyDown(top.value, { key: 'ArrowUp' });
    expect(top.onChange).not.toHaveBeenCalled();
  });

  it('repeated presses build on the new tempo', () => {
    const onChange = vi.fn();
    render(<Controlled initial={60} onChange={onChange} />);
    const value = screen.getByRole('spinbutton', { name: 'Tempo' });
    fireEvent.keyDown(value, { key: 'ArrowUp' });
    fireEvent.keyDown(value, { key: 'ArrowUp' });
    fireEvent.keyDown(value, { key: 'ArrowUp', shiftKey: true });
    expect(onChange.mock.calls.map(([bpm]) => bpm)).toEqual([61, 62, 67]);
    expect(value).toHaveTextContent('67 bpm');
  });

  it('a click opens a field to type the tempo; Enter sets it, clamped', () => {
    const { onChange, value } = setup();
    fireEvent.click(value);
    const field = screen.getByRole('spinbutton', { name: 'Tempo in bpm' });
    expect(field).toHaveValue(60);
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: '250' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(200);
    // Back to the value, with focus.
    const back = screen.getByRole('spinbutton', { name: 'Tempo' });
    expect(back).toHaveFocus();
  });

  it('Escape leaves the typed tempo unset; blur sets it', () => {
    const { onChange, value } = setup();
    fireEvent.click(value);
    let field = screen.getByRole('spinbutton', { name: 'Tempo in bpm' });
    fireEvent.change(field, { target: { value: '90' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Tempo' }), {
      key: 'Enter',
    });
    field = screen.getByRole('spinbutton', { name: 'Tempo in bpm' });
    fireEvent.change(field, { target: { value: '90' } });
    fireEvent.blur(field);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(90);
  });

  it('ignores a field left empty or unchanged', () => {
    const { onChange, value } = setup();
    fireEvent.click(value);
    const field = screen.getByRole('spinbutton', { name: 'Tempo in bpm' });
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.click(screen.getByRole('spinbutton', { name: 'Tempo' }));
    fireEvent.keyDown(
      screen.getByRole('spinbutton', { name: 'Tempo in bpm' }),
      { key: 'Enter' },
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dragging up speeds up, dragging down slows down — and is not a click', () => {
    const onChange = vi.fn();
    render(<Controlled initial={60} onChange={onChange} />);
    const value = screen.getByRole('spinbutton', { name: 'Tempo' });
    pointer(value, 'pointerdown', 300);
    pointer(value, 'pointermove', 299); // under the threshold: nothing yet
    expect(onChange).not.toHaveBeenCalled();
    pointer(value, 'pointermove', 280); // 20px up → +10
    expect(onChange).toHaveBeenLastCalledWith(70);
    pointer(value, 'pointermove', 340); // 40px down from the start → −20
    expect(onChange).toHaveBeenLastCalledWith(40);
    pointer(value, 'pointerup', 340);
    fireEvent.click(value);
    // The click that ends a drag doesn't open the field.
    expect(
      screen.queryByRole('spinbutton', { name: 'Tempo in bpm' }),
    ).toBeNull();
    // Moving without a press does nothing.
    onChange.mockClear();
    pointer(value, 'pointermove', 100);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('while the speed trainer runs it shows the tempo playing, and sets the step’s', () => {
    const onChange = vi.fn();
    render(<TempoStepper bpm={60} effectiveBpm={42} onChange={onChange} />);
    const value = screen.getByRole('spinbutton', { name: 'Tempo' });
    expect(value).toHaveTextContent('42 bpm');
    expect(value).toHaveAttribute('aria-valuenow', '60');
    expect(value.getAttribute('aria-valuetext')).toMatch(
      /42 bpm with the speed trainer, step tempo 60 bpm/,
    );
    fireEvent.keyDown(value, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(61);
    fireEvent.click(value);
    expect(
      screen.getByRole('spinbutton', { name: 'Tempo in bpm' }),
    ).toHaveValue(60);
  });
});
