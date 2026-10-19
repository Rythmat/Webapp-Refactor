// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GROOVES } from '@/daw/data/groovesLibrary';

// ── A groove's ♡ is the student's favourite, kept (milestone 2.14) ─────────
// The heart lived in the Grooves tab's own state, so it went with every
// remount (dock-instruments-11). It is now the per-user libraryFavourites
// pref the Library's ♡ shares, under the groove's item id.

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: new Map(),
}));

import { useStore } from '@/daw/store';
import { GroovesBrowser } from '../GroovesBrowser';

beforeEach(() => {
  useStore.setState({ libraryFavourites: [] });
});
afterEach(cleanup);

describe('a groove’s heart', () => {
  it('marks the groove in the student’s favourites and survives a remount', () => {
    const groove = GROOVES[0];
    const { unmount } = render(<GroovesBrowser trackId="drums" />);
    const heart = screen.getByRole('button', {
      name: `Favorite ${groove.name}`,
    });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(heart);
    expect(useStore.getState().libraryFavourites).toEqual([
      `groove:${groove.id}`,
    ]);
    unmount();

    render(<GroovesBrowser trackId="drums" />);
    expect(
      screen.getByRole('button', { name: `Favorite ${groove.name}` }),
    ).toHaveAttribute('aria-pressed', 'true');
    // Saved lists it, and only it.
    fireEvent.click(screen.getByRole('button', { name: /Saved/ }));
    expect(screen.getAllByTitle('Add to track')).toHaveLength(1);
  });
});
