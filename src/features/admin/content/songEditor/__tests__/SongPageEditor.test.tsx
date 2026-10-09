// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ensureSongContent, getSong } from '@/content/songStore';
import { SongPageEditor } from '../SongPageEditor';

/**
 * The song editor is the song page with inputs in it. These pin the two
 * promises that make that safe: a half-written song still draws, and every
 * edit lands on the raw body — never on the defaults the page drew with.
 */

// Signed out as far as the API goes: the pickers use the repo's registries
// and send nothing.
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: null }),
}));
// Uploads and the video embed reach the network; neither is under test.
vi.mock('../ArtistImageUpload', () => ({
  ArtistImageUpload: () => <div data-testid="artwork-upload" />,
}));
vi.mock('../YouTubeField', () => ({
  YouTubeField: () => <div data-testid="video-field" />,
}));
// The page's student-only controls are replaced in the editor, but the
// module still imports them.
vi.mock('@/features/setlists/useSetLists', () => ({
  useSetListFavorite: () => ({
    isFavorite: false,
    toggleFavorite: () => {},
    canFavorite: true,
  }),
}));
vi.mock('@/features/songs/useSongActions', () => ({
  useSongActions: () => ({
    openInLesson: () => {},
    openInStudio: () => {},
    openInGlobe: () => {},
  }),
}));

beforeAll(async () => {
  await ensureSongContent();
  // cmdk scrolls the active item into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

const renderEditor = (body: Record<string, unknown>) => {
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SongPageEditor body={body} onChange={onChange} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onChange;
};

describe('the song page editor', () => {
  it('draws a new, empty song', () => {
    renderEditor({});
    expect(screen.getByLabelText('Title')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Chord chart' })).toBeTruthy();
  });

  it('edits the raw body, not the page’s defaults', () => {
    const onChange = renderEditor({ title: 'Draft' });
    fireEvent.change(screen.getByLabelText('Artist'), {
      target: { value: 'Toto' },
    });
    const next = onChange.mock.calls.at(-1)?.[0];
    // The page drew a tempo and a metre (120, 4/4); neither is written.
    expect(next).toEqual({ title: 'Draft', artist: 'Toto' });
  });

  it('slugs a new song’s id from its title until the id is set', () => {
    const onChange = renderEditor({});
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: "(Sittin' On) The Dock" },
    });
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({
      title: "(Sittin' On) The Dock",
      id: 'sittin_on_the_dock',
    });
  });

  it('keeps an existing song’s id when the title changes', () => {
    const africa = getSong('africa')!;
    const onChange = renderEditor({ ...africa });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Africa (live)' },
    });
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({
      id: 'africa',
      title: 'Africa (live)',
    });
  });

  it('links a credit to its record, keeping the name as credited', async () => {
    const africa = getSong('africa')!;
    const onChange = renderEditor({ ...africa });
    // Jeff Porcaro is credited on Africa more than once (drums, writing):
    // each credit has its own picker. Link the first.
    const index = africa.credits!.findIndex((c) => c.name === 'Jeff Porcaro');
    fireEvent.click(
      screen.getAllByRole('button', { name: "Jeff Porcaro's record" })[0],
    );
    // The search opens on the credited name; Tab takes the top match.
    const search = (await screen.findByPlaceholderText(
      'Find artist…',
    )) as HTMLInputElement;
    expect(search.value).toBe('Jeff Porcaro');
    fireEvent.keyDown(search, { key: 'Tab' });
    const credits = onChange.mock.calls.at(-1)?.[0].credits;
    expect(credits[index]).toEqual({
      ...africa.credits![index],
      artistGlobeId: 'jeff-porcaro',
    });
  });

  it('shows the credits line students see, drawn from the draft', () => {
    const africa = getSong('africa')!;
    renderEditor({ ...africa });
    // SongCredits' own labels, above the credits form.
    expect(screen.getAllByText('Jeff Porcaro').length).toBeGreaterThan(0);
  });
});
