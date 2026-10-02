// @vitest-environment jsdom
import { cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useGuitarStepKeys,
  type GuitarStepKeysOptions,
} from '../useGuitarStepKeys';

afterEach(cleanup);

function setup(overrides: Partial<GuitarStepKeysOptions> = {}) {
  const goToStep = vi.fn();
  const options: GuitarStepKeysOptions = {
    enabled: true,
    index: 2,
    count: 5,
    goToStep,
    ...overrides,
  };
  const hook = renderHook(
    (props: GuitarStepKeysOptions) => useGuitarStepKeys(props),
    { initialProps: options },
  );
  return { goToStep, options, hook };
}

describe('useGuitarStepKeys', () => {
  it('← and → open the previous and next step in the preview', () => {
    const { goToStep } = setup();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(goToStep).toHaveBeenLastCalledWith(3);
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(goToStep).toHaveBeenLastCalledWith(1);
    expect(goToStep).toHaveBeenCalledTimes(2);
  });

  it('marks the key handled', () => {
    setup();
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('stops at the first and last step', () => {
    const first = setup({ index: 0 });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(first.goToStep).not.toHaveBeenCalled();
    cleanup();
    const last = setup({ index: 4 });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(last.goToStep).not.toHaveBeenCalled();
  });

  it('does nothing when not enabled (not the preview, or a sheet open)', () => {
    const { goToStep, hook, options } = setup({ enabled: false });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(goToStep).not.toHaveBeenCalled();
    // …and follows the latest props without re-subscribing.
    hook.rerender({ ...options, enabled: true });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(goToStep).toHaveBeenCalledWith(3);
    hook.rerender({ ...options, enabled: false });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(goToStep).toHaveBeenCalledTimes(1);
  });

  it('ignores a key another control already handled', () => {
    const { goToStep } = setup();
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();
    window.dispatchEvent(event);
    expect(goToStep).not.toHaveBeenCalled();
  });

  it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])(
    'ignores the arrows with %s',
    (modifier) => {
      const { goToStep } = setup();
      fireEvent.keyDown(window, { key: 'ArrowRight', [modifier]: true });
      expect(goToStep).not.toHaveBeenCalled();
    },
  );

  it('ignores other keys', () => {
    const { goToStep } = setup();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(goToStep).not.toHaveBeenCalled();
  });

  it.each([
    ['a text field', <input key="i" data-testid="target" />],
    ['a number field', <input key="n" type="number" data-testid="target" />],
    ['a textarea', <textarea key="t" data-testid="target" />],
    [
      'a select',
      <select key="s" data-testid="target">
        <option>1</option>
      </select>,
    ],
    [
      'editable text',
      <div key="c" contentEditable suppressContentEditableWarning>
        <span data-testid="target">x</span>
      </div>,
    ],
    [
      'a radio',
      <button key="r" role="radio" aria-checked data-testid="target" />,
    ],
    [
      'a radio group',
      <div key="rg" role="radiogroup">
        <button data-testid="target" />
      </div>,
    ],
    ['a slider', <span key="sl" role="slider" data-testid="target" />],
    ['a spin button', <span key="sp" role="spinbutton" data-testid="target" />],
    [
      'a switch',
      <button key="sw" role="switch" aria-checked data-testid="target" />,
    ],
    [
      'a menu',
      <div key="m" role="menu">
        <div role="menuitem" tabIndex={-1} data-testid="target" />
      </div>,
    ],
    [
      'a dialog (a sheet, the step list)',
      <div key="d" role="dialog">
        <button data-testid="target" />
      </div>,
    ],
  ])('ignores the arrows inside %s', (_name, element) => {
    const { goToStep } = setup();
    const { getByTestId } = render(<>{element}</>);
    fireEvent.keyDown(getByTestId('target'), { key: 'ArrowRight' });
    fireEvent.keyDown(getByTestId('target'), { key: 'ArrowLeft' });
    expect(goToStep).not.toHaveBeenCalled();
  });

  it('still works from an ordinary button', () => {
    const { goToStep } = setup();
    const { getByRole } = render(<button type="button">Demo</button>);
    fireEvent.keyDown(getByRole('button'), { key: 'ArrowRight' });
    expect(goToStep).toHaveBeenCalledWith(3);
  });

  it('stops listening on unmount', () => {
    const { goToStep, hook } = setup();
    hook.unmount();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(goToStep).not.toHaveBeenCalled();
  });
});
