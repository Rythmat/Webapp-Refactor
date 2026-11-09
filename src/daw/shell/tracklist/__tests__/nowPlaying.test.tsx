// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { LANE_HEADER_PX } from '../rowLayout';
import { NowPlaying } from '../NowPlaying';

// ── Now Playing over the track list (2026-10-21) ───────────────────────────
// The held chord, its notes and its place in the key, in the corner over the
// ruler and the chord lane, at the corner's height so the tracks stay level.

const initial = useStore.getState();
beforeEach(() => {
  useStore.setState({
    rootNote: 0,
    mode: 'ionian',
    audioActiveNotes: [],
    hwActiveNotes: new Set(),
  });
});
afterEach(() => {
  cleanup();
  useStore.setState(initial, true);
});

describe('Now Playing', () => {
  it('waits for a chord, at the corner’s height', () => {
    render(<NowPlaying />);
    const corner = screen.getByTestId('now-playing');
    expect(corner.style.height).toBe(`${LANE_HEADER_PX}px`);
    expect(corner).toHaveTextContent('Play a chord to see it here');
  });

  it('names the held chord and its notes as they are played', () => {
    render(<NowPlaying />);
    // D F A: the 2 chord of C major.
    act(() => useStore.setState({ hwActiveNotes: new Set([62, 65, 69]) }));
    expect(screen.getByTestId('now-playing-chord').textContent).toMatch(/D/);
    expect(screen.getByTestId('now-playing-notes')).toHaveTextContent('D F A');
  });

  it('reads audio notes over MIDI ones', () => {
    useStore.setState({
      hwActiveNotes: new Set([62, 65, 69]),
      audioActiveNotes: [60, 64, 67],
    });
    render(<NowPlaying />);
    expect(screen.getByTestId('now-playing-notes')).toHaveTextContent('C E G');
  });
});
