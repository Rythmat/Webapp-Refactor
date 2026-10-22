// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The song at the bottom rail's right (B4a; the Song chip until then) ────
// Key, Tempo and Metre as three controls: the key lock as the old Key
// popover kept it (open frees, close locks a chosen key); the tempo a field
// with Tap, 'transport-bpm' still on it for the Hip Hop lesson; the metre a
// popover that closes on a pick.
//
// Run: npx vitest run src/daw/shell/bottombar/__tests__/songControls.test.tsx

vi.mock('@/daw/components/Prism/CircleOfFifths', () => ({
  CircleOfFifths: () => <div data-testid="circle" />,
}));

import { useStore } from '@/daw/store';
import { keyText, modeWord } from '../../song/keyPopover';
import { SongControls } from '../SongControls';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});
afterEach(cleanup);

describe('keyText', () => {
  it('names the key, long and short', () => {
    expect(keyText({ rootNote: 0, mode: 'ionian' })).toBe('C major');
    expect(keyText({ rootNote: 9, mode: 'aeolian' })).toBe('A minor');
    expect(keyText({ rootNote: 0, mode: 'ionian' }, true)).toBe('C');
    expect(keyText({ rootNote: null, mode: 'ionian' })).toBe('No key');
  });
  it('names the other modes', () => {
    expect(modeWord('dorian')).toBe('Dorian');
  });
});

describe('the song controls', () => {
  const key = () => screen.getByTestId('key-button');

  it('sets the tempo in its field, with the lesson anchor on it', () => {
    render(<SongControls />);
    const anchor = document.querySelector('[data-tutorial-id="transport-bpm"]');
    const field = screen.getByRole('spinbutton', {
      name: 'Tempo in beats per minute',
    });
    expect(anchor?.contains(field)).toBe(true);
    fireEvent.change(field, { target: { value: '95' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(s().bpm).toBe(95);
    // The store clamps.
    fireEvent.change(field, { target: { value: '999' } });
    fireEvent.blur(field);
    expect(s().bpm).toBe(300);
    expect(field).toHaveValue(300);
  });

  it('lists the seven time signatures, picks one and closes', () => {
    render(<SongControls />);
    fireEvent.click(screen.getByTestId('metre-button'));
    const list = screen.getByRole('listbox', { name: 'Time signature' });
    const options = within(list).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      '2/4',
      '3/4',
      '4/4',
      '5/4',
      '6/4',
      '7/4',
      '12/8',
    ]);
    // The current one is marked (selected, with a check), and is the one
    // tab stop; the arrows move between rows.
    const four = within(list).getByRole('option', { name: '4/4' });
    expect(four).toHaveAttribute('aria-selected', 'true');
    expect(options.filter((o) => o.tabIndex === 0)).toEqual([four]);
    act(() => four.focus());
    fireEvent.keyDown(four, { key: 'ArrowDown' });
    expect(within(list).getByRole('option', { name: '5/4' })).toHaveFocus();
    fireEvent.click(screen.getByRole('option', { name: '12/8' }));
    expect([s().timeSignatureNumerator, s().timeSignatureDenominator]).toEqual([
      12, 8,
    ]);
    expect(screen.queryByTestId('metre-popover')).toBeNull();
    expect(screen.getByTestId('metre-button')).toHaveTextContent('12/8');
  });

  it('sets a custom time signature from its two empty boxes', () => {
    render(<SongControls />);
    fireEvent.click(screen.getByTestId('metre-button'));
    const beats = screen.getByTestId('metre-custom-beats');
    const note = screen.getByTestId('metre-custom-note');
    expect(beats).toHaveValue('');
    expect(note).toHaveValue('');
    // A beat note the store can't hold is marked, explained and not set.
    fireEvent.change(beats, { target: { value: '11' } });
    fireEvent.change(note, { target: { value: '3' } });
    fireEvent.keyDown(note, { key: 'Enter' });
    expect(note).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Beat note: 2, 4, 8 or 16',
    );
    expect(screen.getByTestId('metre-custom-set')).toBeDisabled();
    expect(s().timeSignatureNumerator).toBe(4);
    // ✓ sets it (a phone's number pad has no Enter).
    fireEvent.change(note, { target: { value: '8' } });
    fireEvent.click(screen.getByTestId('metre-custom-set'));
    expect([s().timeSignatureNumerator, s().timeSignatureDenominator]).toEqual([
      11, 8,
    ]);
    expect(screen.queryByTestId('metre-popover')).toBeNull();
  });

  it('frees the key while open and locks a chosen one when it closes', () => {
    act(() => {
      s().setRootNote(7);
      s().toggleRootLock();
    });
    render(<SongControls />);
    expect(key().getAttribute('aria-label')).toContain('locked');
    fireEvent.click(key());
    expect(screen.getByTestId('circle')).toBeInTheDocument();
    expect(s().rootLocked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(s().rootLocked).toBe(true);
  });

  it('shows the short key on a narrow rail', () => {
    act(() => s().setRootNote(2));
    render(<SongControls short />);
    expect(key()).toHaveTextContent(/^D$/);
  });
});

describe('in a lesson', () => {
  it('closes the key popover when the step done in it moves the lesson on', () => {
    act(() =>
      useStore.setState({
        activeTutorialId: 'hiphop-build-the-beat',
        tutorialStepIndex: 4,
      }),
    );
    render(<SongControls />);
    fireEvent.click(key());
    expect(screen.getByTestId('key-popover')).toBeInTheDocument();
    act(() => useStore.setState({ tutorialStepIndex: 5 }));
    expect(screen.queryByTestId('key-popover')).toBeNull();
  });

  function key() {
    return screen.getByTestId('key-button');
  }
});
