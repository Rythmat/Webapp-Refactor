// @vitest-environment jsdom
/**
 * The Song page's Open in Studio carries the key the student is looking at:
 * transpose the chart, press the pill, and the editor link names the song
 * and that offset (`?song=<id>&transpose=<n>`), which the editor rebuilds
 * from the song's id (1.4). This checks the value that actually reaches the
 * link, through the page's own wiring (SongDetailView → SongActionPills →
 * useSongActions), not a helper compared with itself.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ensureSongContent, getSong } from '@/content/songStore';
import { SongDetailPage } from '../SongDetailPage';

vi.mock('@/features/setlists/useSetLists', () => ({
  useSetListFavorite: () => ({
    isFavorite: false,
    toggleFavorite: () => {},
    canFavorite: true,
  }),
}));
vi.mock('@/features/setlists/SaveVersionDialog', () => ({
  SaveVersionDialog: () => null,
}));
vi.mock('@/hooks/useUISound', () => ({
  useUISound: () => ({ play: () => {} }),
}));
// The key wheel is a popover; what matters here is the offset it hands the
// page, so a plain button steps it.
vi.mock('../TransposeKeyButton', () => ({
  TransposeKeyButton: ({
    semitones,
    onChange,
  }: {
    semitones: number;
    onChange: (n: number) => void;
  }) => (
    <button type="button" onClick={() => onChange(semitones + 1)}>
      Transpose up
    </button>
  ),
}));

function EditorProbe() {
  const location = useLocation();
  return <p data-testid="editor-url">{location.search}</p>;
}

function renderSongPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/songs/${id}`]}>
      <Routes>
        <Route path="/songs/:songId" element={<SongDetailPage />} />
        <Route path="/studio/editor" element={<EditorProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  localStorage.clear();
  await ensureSongContent();
});

afterEach(cleanup);

describe('Song page → Open in Studio', () => {
  it('opens the song in its own key when not transposed', () => {
    expect(getSong('africa')).not.toBeNull();
    renderSongPage('africa');
    fireEvent.click(screen.getByRole('button', { name: 'Open in Studio' }));
    expect(screen.getByTestId('editor-url').textContent).toBe('?song=africa');
  });

  it('carries the transposition the page shows', () => {
    renderSongPage('africa');
    const up = screen.getByRole('button', { name: 'Transpose up' });
    fireEvent.click(up);
    fireEvent.click(up);
    fireEvent.click(screen.getByRole('button', { name: 'Open in Studio' }));
    expect(screen.getByTestId('editor-url').textContent).toBe(
      '?song=africa&transpose=2',
    );
  });
});
