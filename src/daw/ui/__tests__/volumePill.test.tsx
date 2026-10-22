// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gainAtPosition, positionOfGain, UNITY_AT } from '../faderTaper';
import type { MeterLevels } from '../Meter';
import { formatPan } from '../format';
import { pillDbText, VolumePill } from '../VolumePill';

// ── Suno's track header controls (2026-10-21) ──────────────────────────────
// The volume pill (a fader over the track's stereo meter, on the fader's
// own scale); the pan is the Mix strips' Knob since 2026-10-22.

afterEach(cleanup);

describe('the fader’s scale', () => {
  it('puts unity at four-fifths, +6 dB at the top and silence at the left', () => {
    expect(positionOfGain(1)).toBeCloseTo(UNITY_AT, 6);
    expect(gainAtPosition(1)).toBeCloseTo(2, 6);
    expect(gainAtPosition(0)).toBe(0);
    expect(positionOfGain(0)).toBe(0);
    for (const p of [0.1, 0.4, 0.7, 0.95]) {
      expect(positionOfGain(gainAtPosition(p))).toBeCloseTo(p, 6);
    }
  });
});

describe('VolumePill', () => {
  const pill = () => screen.getByRole('slider', { name: 'Volume of Bass' });

  it('is a slider that says its level in decibels', () => {
    render(
      <VolumePill
        label="Volume of Bass"
        value={1}
        onChange={() => {}}
        resetValue={0.8}
        color="#3b82f6"
      />,
    );
    expect(pill()).toHaveAttribute('aria-valuetext', '+0.00dB');
    expect(pillDbText(0.5)).toBe('−6.02dB');
    expect(pillDbText(0)).toBe('−∞dB');
  });

  it('moves by as much as the pointer does, as one gesture', () => {
    const onChange = vi.fn();
    const onBegin = vi.fn();
    const onEnd = vi.fn();
    render(
      <VolumePill
        label="Volume of Bass"
        value={1}
        onChange={onChange}
        onBegin={onBegin}
        onEnd={onEnd}
        resetValue={0.8}
        color="#3b82f6"
      />,
    );
    pill().setPointerCapture = () => {};
    const at = (type: string, clientX: number) =>
      Object.assign(
        new MouseEvent(type, { bubbles: true, button: 0, clientX }),
        {
          pointerId: 1,
        },
      );
    act(() => {
      pill().dispatchEvent(at('pointerdown', 100));
    });
    expect(onBegin).toHaveBeenCalled();
    // A click alone changes nothing.
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      pill().dispatchEvent(at('pointermove', 100 + 168 * 0.2));
    });
    // A fifth of the travel up from unity: the top, +6 dB.
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(2, 3));
    act(() => {
      pill().dispatchEvent(at('pointerup', 134));
    });
    expect(onEnd).toHaveBeenCalled();
  });

  it('steps with the keys, resets on a double-click and shows its level', () => {
    const onChange = vi.fn();
    render(
      <VolumePill
        label="Volume of Bass"
        value={1}
        onChange={onChange}
        resetValue={0.8}
        color="#3b82f6"
      />,
    );
    fireEvent.keyDown(pill(), { key: 'ArrowLeft' });
    expect(onChange.mock.calls[0][0]).toBeLessThan(1);
    expect(screen.getByTestId('volume-pill-value')).toHaveTextContent(
      '+0.00dB',
    );
    fireEvent.doubleClick(pill());
    expect(onChange).toHaveBeenLastCalledWith(0.8);
  });

  it('shows its level under the thumb, or over it where asked (Master)', () => {
    const { rerender } = render(
      <VolumePill
        label="Volume of Bass"
        value={1}
        onChange={() => {}}
        resetValue={0.8}
        color="#3b82f6"
      />,
    );
    fireEvent.keyDown(pill(), { key: 'ArrowLeft' });
    expect(screen.getByTestId('volume-pill-value')).toHaveClass('top-full');
    rerender(
      <VolumePill
        label="Volume of Bass"
        value={1}
        onChange={() => {}}
        resetValue={0.8}
        color="#3b82f6"
        chipSide="above"
      />,
    );
    const chip = screen.getByTestId('volume-pill-value');
    expect(chip).toHaveClass('bottom-full');
    expect(chip).not.toHaveClass('top-full');
  });

  it('draws the left and right levels from its meter', () => {
    let send: (levels: MeterLevels) => void = () => {};
    const meter = {
      subscribe: (cb: (levels: MeterLevels) => void) => {
        send = cb;
        return () => {};
      },
    };
    render(
      <VolumePill
        label="Volume of Bass"
        value={1}
        onChange={() => {}}
        resetValue={0.8}
        color="#3b82f6"
        meter={meter}
      />,
    );
    act(() => send({ peak: [1, 0.5] }));
    const [left, right] = document.querySelectorAll<HTMLElement>(
      '[data-meter-channel]',
    );
    expect(parseFloat(left.style.width)).toBeCloseTo(UNITY_AT * 100, 1);
    expect(parseFloat(right.style.width)).toBeCloseTo(
      positionOfGain(0.5) * 100,
      1,
    );

    // A hover re-renders the pill; a steady level the bus sends no new
    // reading for stays drawn.
    fireEvent.pointerEnter(
      screen.getByRole('slider', { name: 'Volume of Bass' }),
    );
    expect(parseFloat(left.style.width)).toBeCloseTo(UNITY_AT * 100, 1);
  });
});

describe('VolumePill, stood on end (the Mix view)', () => {
  const pill = () => screen.getByRole('slider', { name: 'Volume of Bass' });

  it('is as tall as its length and rises with a drag up', () => {
    const onChange = vi.fn();
    render(
      <VolumePill
        label="Volume of Bass"
        orientation="vertical"
        length={172}
        value={1}
        onChange={onChange}
        resetValue={0.8}
        color="#3b82f6"
      />,
    );
    expect(pill()).toHaveAttribute('aria-orientation', 'vertical');
    expect(pill().style.height).toBe('172px');
    expect(pill().style.width).toBe('26px');
    pill().setPointerCapture = () => {};
    const at = (type: string, clientY: number) =>
      Object.assign(
        new MouseEvent(type, { bubbles: true, button: 0, clientY }),
        { pointerId: 1 },
      );
    act(() => {
      pill().dispatchEvent(at('pointerdown', 300));
      pill().dispatchEvent(at('pointermove', 300 - 168 * 0.2));
    });
    // A fifth of the travel up from unity: the top, +6 dB.
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(2, 3));
  });

  it('draws the levels from the bottom', () => {
    let send: (levels: MeterLevels) => void = () => {};
    const meter = {
      subscribe: (cb: (levels: MeterLevels) => void) => {
        send = cb;
        return () => {};
      },
    };
    render(
      <VolumePill
        label="Volume of Bass"
        orientation="vertical"
        value={1}
        onChange={() => {}}
        resetValue={0.8}
        color="#3b82f6"
        meter={meter}
      />,
    );
    act(() => send({ peak: [1, 0.5] }));
    const [left, right] = document.querySelectorAll<HTMLElement>(
      '[data-meter-channel]',
    );
    expect(parseFloat(left.style.height)).toBeCloseTo(UNITY_AT * 100, 1);
    expect(parseFloat(right.style.height)).toBeCloseTo(
      positionOfGain(0.5) * 100,
      1,
    );
    expect(left.style.width).toBe('');
  });

  it('can’t be moved while disabled', () => {
    const onChange = vi.fn();
    render(
      <VolumePill
        label="Volume of Bass"
        orientation="vertical"
        value={1}
        onChange={onChange}
        resetValue={0.8}
        color="#3b82f6"
        disabled
      />,
    );
    fireEvent.keyDown(pill(), { key: 'ArrowUp' });
    fireEvent.doubleClick(pill());
    expect(onChange).not.toHaveBeenCalled();
    expect(pill()).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('formatPan', () => {
  it('says where a pan sits: Centre, or a side and how far', () => {
    expect(formatPan(0)).toBe('Centre');
    expect(formatPan(-0.4)).toBe('L40');
    expect(formatPan(1)).toBe('R100');
  });
});
