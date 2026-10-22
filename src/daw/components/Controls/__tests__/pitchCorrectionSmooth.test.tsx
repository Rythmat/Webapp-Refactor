// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  MAX_RETUNE_MS,
  retuneMs,
  smoothFromSpeed,
  speedFromSmooth,
} from '../pitchCorrectionSmooth';
import { PitchCorrectionControls } from '../PitchCorrectionControls';

// ── Pitch Correction's Smooth control means smooth (live-input-10) ─────────
// The worklet's `speed` is 100 = instant, 0 = a 400 ms glide. The control is
// labelled Smooth but was bound to speed directly, so turning it up made the
// correction faster and more robotic. It now shows the scale reversed: the
// mapping, and the Smooth knob of an Audio track's pitch correction card
// (PitchCorrectionControls, in AudioFxCards).

beforeAll(() => {
  // jsdom has no PointerEvent; without one a knob drag loses its clientY.
  if (!window.PointerEvent) {
    class TestPointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    }
    window.PointerEvent = TestPointerEvent as typeof PointerEvent;
  }
  Element.prototype.setPointerCapture = () => {};
});

afterEach(cleanup);

/**
 * Pitch correction's controls on a block at this saved speed, keeping the
 * params as the card's chain does. Returns the latest saved speed.
 */
function pitchCorrectionAt(speed: number) {
  const saved = { speed };
  function Card() {
    const [params, setParams] = useState<Record<string, number>>({
      rootNote: -1,
      scaleType: 2,
      correction: 80,
      speed,
    });
    return (
      <PitchCorrectionControls
        params={params}
        color="white"
        onParam={(key, value) => {
          if (key === 'speed') saved.speed = value;
          setParams((p) => ({ ...p, [key]: value }));
        }}
      />
    );
  }
  render(<Card />);
  return () => saved.speed;
}

/** The Smooth knob's readout, under its label. */
const smoothKnobReadout = () =>
  screen.getByText('Smooth').nextElementSibling?.textContent;

describe('Smooth mapping', () => {
  it('is the worklet speed reversed, and round-trips', () => {
    expect(smoothFromSpeed(100)).toBe(0);
    expect(smoothFromSpeed(0)).toBe(100);
    for (const speed of [0, 25, 50, 80, 100]) {
      expect(speedFromSmooth(smoothFromSpeed(speed))).toBe(speed);
    }
  });

  it('gives a longer retune as Smooth goes up', () => {
    expect(retuneMs(0)).toBe(0);
    expect(retuneMs(50)).toBe(MAX_RETUNE_MS / 2);
    expect(retuneMs(100)).toBe(MAX_RETUNE_MS);
    // The worklet: (1 - speed / 100) × 400 ms.
    for (const speed of [0, 30, 100]) {
      expect(retuneMs(smoothFromSpeed(speed))).toBeCloseTo(
        (1 - speed / 100) * 400,
      );
    }
  });
});

describe('PitchCorrectionControls Smooth knob', () => {
  it('reads a saved speed as the same retune time as before', () => {
    pitchCorrectionAt(80);
    // Speed 80 retunes in 80 ms, as it always did; only the knob's
    // direction changed.
    expect(smoothKnobReadout()).toBe('80 ms');
  });

  it('turning the Smooth knob up slows the retune', () => {
    const savedSpeed = pitchCorrectionAt(80);
    const knob = screen.getByText('Smooth').previousElementSibling!;

    fireEvent.pointerDown(knob, { clientY: 300, pointerId: 1 });
    fireEvent.pointerMove(knob, { clientY: 270, pointerId: 1 });
    fireEvent.pointerUp(knob, { pointerId: 1 });

    // Up 30 px is a fifth of the knob's travel: Smooth 20 → 40.
    expect(savedSpeed()).toBe(60);
    expect(smoothKnobReadout()).toBe('160 ms');
  });
});
