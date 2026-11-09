// @vitest-environment jsdom
/**
 * The Library's home (owner, 2026-10-24): Audio, Favorites, Stems, Uploads
 * and Projects, in that order, each its newest five; a section's heading
 * opens all of it — the full list, or the Projects window for Projects.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  items: [] as Record<string, unknown>[],
  rows: [] as Record<string, unknown>[],
}));

vi.mock('@/daw/library/audioLibrary', () => ({
  useLibraryAudio: () => ({ items: h.items, loaded: true }),
}));
vi.mock('@/daw/library/useLibraryProjects', () => ({
  useLibraryProjects: () => ({ rows: h.rows, loading: false }),
}));
// A row as the list draws it; its own tests cover the rest.
vi.mock('../LibraryAudioRow', () => ({
  LibraryAudioRow: ({ item }: { item: { name: string } }) => (
    <li data-testid="audio-row">{item.name}</li>
  ),
}));

import { useProjectsDialogStore } from '@/daw/shell/projects/useProjectsDialogStore';
import { LibraryPanel } from '../LibraryPanel';

const stem = (n: number, favorite = false) => ({
  id: `s${n}`,
  kind: 'stem',
  name: `Stem ${n}`,
  tag: 'Drums',
  project: 'Song',
  favorite,
  createdAt: 1000 - n,
});
const project = (n: number) => ({
  key: `p${n}`,
  name: `Project ${n}`,
  updatedAt: 1000 - n,
  canOpen: true,
  isOpen: false,
  openIntent: null,
});

afterEach(() => {
  cleanup();
  h.items = [];
  h.rows = [];
});

const section = (id: string) => screen.getByTestId(`library-section-${id}`);

describe('the Library home', () => {
  it('lists the sections in order, each its newest five', () => {
    h.items = [stem(1, true), ...[2, 3, 4, 5, 6, 7].map((n) => stem(n))];
    h.rows = [1, 2, 3, 4, 5, 6, 7].map(project);
    render(<LibraryPanel />);

    expect(
      screen
        .getAllByTestId(/^library-section-/)
        .map((s) => s.dataset.testid?.replace('library-section-', '')),
    ).toEqual(['all', 'favorites', 'stems', 'uploads', 'projects']);

    const audio = within(section('all')).getAllByTestId('audio-row');
    expect(audio.map((r) => r.textContent)).toEqual([
      'Stem 1',
      'Stem 2',
      'Stem 3',
      'Stem 4',
      'Stem 5',
    ]);
    expect(
      within(section('favorites')).getAllByTestId('audio-row'),
    ).toHaveLength(1);
    expect(within(section('stems')).getAllByTestId('audio-row')).toHaveLength(
      5,
    );
    expect(
      within(section('projects')).getAllByTestId('library-project'),
    ).toHaveLength(5);
    // No Show more: a heading opens the rest.
    expect(screen.queryByText(/Show .*more/)).toBeNull();
  });

  it('says what will come to a section while it has nothing', () => {
    render(<LibraryPanel />);
    expect(section('uploads').textContent).toContain(
      'Audio files you upload into a song will appear here.',
    );
  });

  it('opens a section’s full list, or the Projects window, from its heading', () => {
    h.items = [stem(1)];
    render(<LibraryPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Stems' }));
    expect(screen.getByTestId('library-list-stems')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to the Library' }),
    );

    expect(useProjectsDialogStore.getState().open).toBe(false);
    fireEvent.click(
      screen.getByRole('button', { name: 'Open the Projects window' }),
    );
    expect(useProjectsDialogStore.getState().open).toBe(true);
  });
});
