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
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { liveTargetsAreDrums } from '@/daw/midi/liveTarget';
import {
  MusicalTypingChip,
  TYPING_OFF_MESSAGE,
  TYPING_ON_MESSAGE,
} from '../MusicalTypingChip';

// ── The computer keyboard's chip (milestones 1.6 and 2.11) ─────────────────
// Its words with the velocity, the × that turns it off, and the live region
// that is there whether it is on or off.
//
// Run: npx vitest run src/daw/shell/topbar/__tests__/MusicalTypingChip.test.tsx

const typing = () => useMusicalTypingStore.getState();
const live = () => screen.getByTestId('musical-typing-live');

beforeEach(() => {
  vi.mocked(liveTargetsAreDrums).mockReturnValue(false);
  useMusicalTypingStore.setState({
    enabled: false,
    octave: DEFAULT_TYPING_OCTAVE,
    velocity: DEFAULT_TYPING_VELOCITY,
  });
});

afterEach(() => {
  cleanup();
});

describe('MusicalTypingChip', () => {
  it('is absent while off, its live region there and quiet', () => {
    render(<MusicalTypingChip />);
    expect(screen.queryByTestId('musical-typing-chip')).toBeNull();
    expect(live()).toHaveAttribute('aria-live', 'polite');
    expect(live()).toHaveTextContent('');
  });

  it('shows the octave and velocity once on, and says it is on', () => {
    render(<MusicalTypingChip />);
    act(() => typing().setEnabled(true));
    const chip = screen.getByTestId('musical-typing-chip');
    expect(chip).toHaveTextContent('Typing · C4 · vel 100');
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(live()).toHaveTextContent(TYPING_ON_MESSAGE);
  });

  it('says Drums while the keys play a kit', () => {
    vi.mocked(liveTargetsAreDrums).mockReturnValue(true);
    useMusicalTypingStore.setState({ enabled: true });
    render(<MusicalTypingChip />);
    expect(screen.getByTestId('musical-typing-chip')).toHaveTextContent(
      'Typing · Drums · vel 100',
    );
  });

  it('announces octave and velocity changes', () => {
    useMusicalTypingStore.setState({ enabled: true });
    render(<MusicalTypingChip />);
    // Mounted on: nothing said until something changes.
    expect(live()).toHaveTextContent('');
    act(() => typing().shiftOctave(1));
    expect(live()).toHaveTextContent('Octave C5');
    expect(screen.getByTestId('musical-typing-chip')).toHaveTextContent(
      'Typing · C5 · vel 100',
    );
    act(() => typing().shiftVelocity(20));
    expect(live()).toHaveTextContent('Velocity 120');
    expect(screen.getByTestId('musical-typing-chip')).toHaveTextContent(
      'vel 120',
    );
  });

  it('turns off from its ×, and says so', () => {
    useMusicalTypingStore.setState({ enabled: true });
    render(<MusicalTypingChip />);
    const off = screen.getByRole('button', {
      name: 'Turn off the computer keyboard',
    });
    expect(screen.getByTestId('musical-typing-pill')).toContainElement(off);
    fireEvent.click(off);
    expect(typing().enabled).toBe(false);
    expect(screen.queryByTestId('musical-typing-chip')).toBeNull();
    expect(live()).toHaveTextContent(TYPING_OFF_MESSAGE);
  });

  it('turns off from a click on its words too', () => {
    useMusicalTypingStore.setState({ enabled: true });
    render(<MusicalTypingChip />);
    fireEvent.click(screen.getByTestId('musical-typing-chip'));
    expect(typing().enabled).toBe(false);
  });
});
