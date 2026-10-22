// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/daw/midi/liveTarget', () => ({
  liveTargetsAreDrums: vi.fn(() => false),
}));

import {
  DEFAULT_TYPING_OCTAVE,
  DEFAULT_TYPING_VELOCITY,
} from '@/daw/commands/musicalTypingMap';
import {
  stepVelocity,
  useMusicalTypingStore,
  VELOCITY_LADDER,
} from '@/daw/commands/musicalTypingStore';
import { liveTargetsAreDrums } from '@/daw/midi/liveTarget';
import {
  TYPING_KEYS_LABEL,
  TYPING_OFF_MESSAGE,
  TYPING_ON_MESSAGE,
  TypingKeys,
} from '../TypingKeys';

// ── Typing keys (the bottom rail, 2026-10-21) ──────────────────────────────
// The computer keyboard's switch: pressed while the letters play notes, its
// hint line saying the octave and velocity, and the live region that is
// there whether it is on or off.
//
// Run: npx vitest run src/daw/shell/bottombar/__tests__/TypingKeys.test.tsx

const typing = () => useMusicalTypingStore.getState();
const live = () => screen.getByTestId('musical-typing-live');
const toggle = () => screen.getByTestId('typing-keys-toggle');

beforeEach(() => {
  vi.mocked(liveTargetsAreDrums).mockReturnValue(false);
  useMusicalTypingStore.setState({
    enabled: false,
    octave: DEFAULT_TYPING_OCTAVE,
    velocity: DEFAULT_TYPING_VELOCITY,
  });
});

afterEach(cleanup);

describe('Typing keys', () => {
  it('is an icon toggle named Typing keys, off, its live region quiet', () => {
    render(<TypingKeys />);
    const button = screen.getByRole('button', { name: TYPING_KEYS_LABEL });
    expect(button).toBe(toggle());
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(live()).toHaveAttribute('aria-live', 'polite');
    expect(live()).toHaveTextContent('');
  });

  it('turns the computer keyboard on and off, and says so', () => {
    render(<TypingKeys />);
    fireEvent.click(toggle());
    expect(typing().enabled).toBe(true);
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(live()).toHaveTextContent(TYPING_ON_MESSAGE);
    fireEvent.click(toggle());
    expect(typing().enabled).toBe(false);
    expect(live()).toHaveTextContent(TYPING_OFF_MESSAGE);
  });

  it('follows ` and the ⋯ switch (the store)', () => {
    render(<TypingKeys />);
    act(() => typing().toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('says the octave and velocity on its hint line while on', () => {
    useMusicalTypingStore.setState({ enabled: true });
    render(<TypingKeys />);
    expect(toggle().dataset.hint).toContain('A plays C4');
    expect(toggle().dataset.hint).toContain('velocity 100');
    act(() => typing().shiftOctave(1));
    expect(toggle().dataset.hint).toContain('A plays C5');
  });

  it('says the letters play the kit on drums', () => {
    vi.mocked(liveTargetsAreDrums).mockReturnValue(true);
    useMusicalTypingStore.setState({ enabled: true });
    render(<TypingKeys />);
    expect(toggle().dataset.hint).toContain('Letters play the kit');
  });

  it('announces octave and velocity changes', () => {
    useMusicalTypingStore.setState({ enabled: true });
    render(<TypingKeys />);
    // Mounted on: nothing said until something changes.
    expect(live()).toHaveTextContent('');
    act(() => typing().shiftOctave(1));
    expect(live()).toHaveTextContent('Octave C5');
    act(() => typing().shiftVelocity(20));
    expect(live()).toHaveTextContent('Velocity 120');
  });

  it('says no octave while the keys play drums', () => {
    vi.mocked(liveTargetsAreDrums).mockReturnValue(true);
    useMusicalTypingStore.setState({ enabled: true });
    render(<TypingKeys />);
    act(() => typing().shiftOctave(1));
    expect(live()).toHaveTextContent('');
    act(() => typing().shiftVelocity(-20));
    expect(live()).toHaveTextContent('Velocity 80');
  });
});

describe('the velocity ladder', () => {
  it('steps by 20 from 100 and comes back to 100 from the top', () => {
    useMusicalTypingStore.setState({ velocity: 100 });
    const seen: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      typing().shiftVelocity(20);
      seen.push(typing().velocity);
    }
    for (let i = 0; i < 2; i += 1) {
      typing().shiftVelocity(-20);
      seen.push(typing().velocity);
    }
    expect(seen).toEqual([120, 127, 127, 120, 100]);
  });

  it('goes down to 1 and back up the same rungs', () => {
    useMusicalTypingStore.setState({ velocity: 100 });
    for (let i = 0; i < 6; i += 1) typing().shiftVelocity(-20);
    expect(typing().velocity).toBe(1);
    typing().shiftVelocity(20);
    expect(typing().velocity).toBe(20);
    for (let i = 0; i < 4; i += 1) typing().shiftVelocity(20);
    expect(typing().velocity).toBe(100);
  });

  it('puts a velocity between rungs on the next rung that way', () => {
    expect(stepVelocity(90, 20)).toBe(100);
    expect(stepVelocity(90, -20)).toBe(80);
    expect(stepVelocity(100, 40)).toBe(127);
    expect(stepVelocity(100, 0)).toBe(100);
    expect(VELOCITY_LADDER).toContain(100);
  });
});
