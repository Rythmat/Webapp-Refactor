// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The Song chip (milestone 2.5) ──────────────────────────────────────────
// Key, metre and tempo in one chip, one popover to change them; the key
// lock as the old Key popover kept it (open frees, close locks a chosen
// key); 'transport-bpm' still on the tempo for the Hip Hop lesson.
//
// Run: npx vitest run src/daw/shell/topbar/__tests__/songChip.test.tsx

vi.mock('@/daw/components/Prism/CircleOfFifths', () => ({
  CircleOfFifths: () => <div data-testid="circle" />,
}));

import { useStore } from '@/daw/store';
import { modeWord, SongChip, songChipText } from '../SongChip';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});
afterEach(cleanup);

describe('songChipText', () => {
  const song = {
    rootNote: 0,
    mode: 'ionian',
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    bpm: 92,
  };
  it('reads like the plan’s chip, long and short', () => {
    expect(songChipText(song, false)).toBe('C major · 4/4 · 92');
    expect(songChipText(song, true)).toBe('C · 92');
    expect(songChipText({ ...song, rootNote: 9, mode: 'aeolian' }, false)).toBe(
      'A minor · 4/4 · 92',
    );
    expect(songChipText({ ...song, rootNote: null }, false)).toBe(
      'No key · 4/4 · 92',
    );
  });
  it('names the other modes', () => {
    expect(modeWord('dorian')).toBe('Dorian');
  });
});

describe('the popover', () => {
  const chip = () => screen.getByTestId('song-chip');

  it('changes the metre and the tempo, and keeps the tempo’s lesson anchor', () => {
    render(<SongChip />);
    fireEvent.click(chip());
    expect(
      document.querySelector('[data-tutorial-id="transport-bpm"]'),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '6/8' }));
    expect([s().timeSignatureNumerator, s().timeSignatureDenominator]).toEqual([
      6, 8,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Faster' }));
    expect(s().bpm).toBe(121);
    const field = screen.getByRole('spinbutton', {
      name: 'Tempo in beats per minute',
    });
    fireEvent.change(field, { target: { value: '95' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(s().bpm).toBe(95);
    expect(chip()).toHaveAttribute('aria-label', 'Song: No key · 6/8 · 95');
  });

  it('frees the key while open and locks a chosen one when it closes', () => {
    act(() => {
      s().setRootNote(7);
      s().toggleRootLock();
    });
    render(<SongChip />);
    expect(chip().getAttribute('aria-label')).toContain('key locked');
    fireEvent.click(chip());
    expect(s().rootLocked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(s().rootLocked).toBe(true);
  });
});

describe('in a lesson', () => {
  it('closes when the step done in it moves the lesson on', () => {
    act(() =>
      useStore.setState({
        activeTutorialId: 'hiphop-build-the-beat',
        tutorialStepIndex: 4,
      }),
    );
    render(<SongChip />);
    fireEvent.click(screen.getByTestId('song-chip'));
    expect(screen.getByTestId('song-popover')).toBeInTheDocument();
    act(() => useStore.setState({ tutorialStepIndex: 5 }));
    expect(screen.queryByTestId('song-popover')).toBeNull();
  });
});
