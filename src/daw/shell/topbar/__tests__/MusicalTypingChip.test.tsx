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
  MusicalTypingChip,
  TYPING_CHIP_LABEL,
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
  document.body.innerHTML = '';
});

/** The chip beside a stand-in for the top bar's '⋯'. */
function renderWithMore() {
  render(
    <>
      <MusicalTypingChip />
      <button type="button" data-testid="top-bar-overflow">
        More
      </button>
    </>,
  );
  return screen.getByTestId('top-bar-overflow');
}

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

  it('is named from its visible word, and keeps its test id and pressed state', () => {
    useMusicalTypingStore.setState({ enabled: true });
    render(<MusicalTypingChip />);
    const chip = screen.getByRole('button', { name: TYPING_CHIP_LABEL });
    expect(TYPING_CHIP_LABEL.startsWith('Typing')).toBe(true);
    expect(chip).toBe(screen.getByTestId('musical-typing-chip'));
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it("hands the focus to '⋯' when it is turned off from the keyboard", () => {
    useMusicalTypingStore.setState({ enabled: true });
    const more = renderWithMore();
    const off = screen.getByTestId('musical-typing-off');
    off.focus();
    fireEvent.click(off);
    expect(typing().enabled).toBe(false);
    expect(document.activeElement).toBe(more);

    // The words, and ` while the focus is on them, too.
    act(() => typing().setEnabled(true));
    screen.getByTestId('musical-typing-chip').focus();
    act(() => typing().toggle());
    expect(document.activeElement).toBe(more);
  });

  it("leaves the focus alone when it wasn't in the chip", () => {
    useMusicalTypingStore.setState({ enabled: true });
    renderWithMore();
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    act(() => typing().setEnabled(false));
    expect(document.activeElement).toBe(elsewhere);
  });

  it('says no octave while the keys play drums', () => {
    vi.mocked(liveTargetsAreDrums).mockReturnValue(true);
    useMusicalTypingStore.setState({ enabled: true });
    render(<MusicalTypingChip />);
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
