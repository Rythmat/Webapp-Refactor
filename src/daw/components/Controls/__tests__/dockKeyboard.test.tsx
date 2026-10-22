// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import {
  DockKeyboard,
  dockKeyboardRange,
  octavesThatFit,
} from '../DockKeyboard';

// ── The dock's piano, after Soundtrap's (owner, 2026-10-22) ────────────────
// ‹ Octave › over the keys; each key the computer keyboard plays carries its
// letter, every C its name; the octaves shown fit the dock's width. Run:
// npx vitest run src/daw/components/Controls/__tests__/dockKeyboard.test.tsx

beforeEach(() => {
  useMusicalTypingStore.setState({ octave: 4, enabled: true });
});
afterEach(cleanup);

function renderKeys() {
  return render(
    <DockKeyboard
      activeNotes={new Set()}
      onNoteOn={vi.fn()}
      onNoteOff={vi.fn()}
    />,
  );
}

describe('the dock’s piano', () => {
  it('shows the octave under the computer keyboard’s and on, to a C', () => {
    expect(dockKeyboardRange(4, 3)).toEqual({ startNote: 48, endNote: 84 });
    expect(dockKeyboardRange(4, 1)).toEqual({ startNote: 60, endNote: 72 });
  });

  it('fits as many octaves as leave room for each key’s letter', () => {
    expect(octavesThatFit(300)).toBe(1);
    expect(octavesThatFit(580)).toBe(2);
    expect(octavesThatFit(900)).toBe(3);
    expect(octavesThatFit(4000)).toBe(4);
  });

  it('puts the computer keyboard’s letters on the keys only while Typing keys is on', () => {
    useMusicalTypingStore.setState({ enabled: false });
    const { unmount } = renderKeys();
    expect(screen.getByTestId('dock-keyboard')).not.toHaveTextContent(';');
    expect(screen.getByTestId('dock-keyboard')).toHaveTextContent('C4');
    unmount();

    useMusicalTypingStore.setState({ enabled: true });
    renderKeys();
    const keys = screen.getByTestId('dock-keyboard');
    for (const letter of ['A', 'W', 'S', 'K', ';']) {
      expect(keys).toHaveTextContent(letter);
    }
    expect(keys).toHaveTextContent('C3');
    expect(keys).toHaveTextContent('C4');
  });

  it('moves the keys and the letters an octave with ‹ and ›', () => {
    renderKeys();
    fireEvent.click(screen.getByRole('button', { name: 'Show higher keys' }));
    expect(useMusicalTypingStore.getState().octave).toBe(5);
    expect(screen.getByTestId('dock-keyboard')).toHaveTextContent('C6');
    fireEvent.click(screen.getByRole('button', { name: 'Show lower keys' }));
    expect(useMusicalTypingStore.getState().octave).toBe(4);
  });
});
