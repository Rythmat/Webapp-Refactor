// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ensureSongContent, getSong } from '@/content/songStore';
import { SongCredits } from '../SongCredits';
import { SongDetailPage } from '../SongDetailPage';
import { SongLibraryBody } from '../SongLibraryPage';

/**
 * Characterization of what a student sees on the song surfaces, pinned BEFORE
 * the console's WYSIWYG work refactors them (SongDetailPage → a container plus
 * a props-driven SongDetailView; opt-in edit props on SongCredits; an opt-in
 * preview source in SongLibraryBody).
 *
 * Those refactors promise the student path stays byte-identical. This file is
 * how that promise is checked: if a refactor changes a student's markup, a
 * snapshot or a hash here changes with it, and the diff has to be explained.
 *
 * Headers and credits are snapshotted as markup, so a change reads as a diff.
 * The chord chart and the full song list are large, so they are pinned by hash
 * — they pass straight through the refactors and only need to be identical.
 *
 * Collaborators that reach user data (set-list favourites, save-version,
 * open-in-Studio's session check) are stubbed: they are not what the refactor
 * touches, and they would otherwise need a signed-in API.
 */

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
vi.mock('@/features/songs/useSongActions', () => ({
  useSongActions: () => ({
    openInLesson: () => {},
    openInStudio: () => {},
    openInGlobe: () => {},
    toggleSaved: () => {},
    isSaved: false,
  }),
}));

const sha = (text: string) =>
  createHash('sha256').update(text).digest('hex').slice(0, 16);

/**
 * React's `useId` values (`:r3:`, surfacing as Radix `aria-controls`) come from
 * a counter shared by every render in the file, so they depend on which tests
 * ran first. Renumber them by first appearance within one render: the pairing
 * of ids and references is kept, the test order stops mattering.
 */
const stableIds = (html: string) => {
  const seen = new Map<string, string>();
  return html.replace(/:r[0-9a-z]+:/g, (id) => {
    if (!seen.has(id)) seen.set(id, `:id${seen.size}:`);
    return seen.get(id)!;
  });
};

beforeAll(async () => {
  localStorage.clear();
  await ensureSongContent();
});

afterEach(cleanup);

/**
 * A fully credited song, a credited song with covers, and one with neither.
 * Dreams was the one with neither until the bulk import of 30 September 2026
 * credited it (and 560 other songs): its snapshots now pin those credits as
 * a student sees them, and Cold Sweat, still uncredited, is the empty case.
 * Since the review of that import, a person holding several credits in one
 * row is one pill whose tooltip lists them all (Jeff Porcaro: "Drum Kit,
 * Cowbell, Gong"; Richard Dashut: "Engineered by, Produced by"), where each
 * credit was a pill of its own.
 */
const SONG_IDS = ['africa', 'something', 'dreams', 'cold_sweat'] as const;

describe('the song page a student sees', () => {
  it.each(SONG_IDS)('%s', (id) => {
    const { container } = render(
      <MemoryRouter initialEntries={[`/songs/${id}`]}>
        <Routes>
          <Route path="/songs/:songId" element={<SongDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const header = container.querySelector('header');
    expect(header, 'the page renders its header').not.toBeNull();
    expect(stableIds(header!.outerHTML)).toMatchSnapshot('header');

    // Everything after the header: the chart and its scroller.
    const page = container.firstElementChild!;
    const rest = [...page.children]
      .filter((el) => el !== header)
      .map((el) => el.outerHTML)
      .join('');
    expect(rest.length).toBeGreaterThan(1000);
    expect(sha(stableIds(rest))).toMatchSnapshot('chart hash');
  });
});

describe('the credits a student sees', () => {
  it.each(['africa', 'aint_no_mountain_high_enough', 'dreams', 'cold_sweat'])(
    '%s',
    (id) => {
      const song = getSong(id);
      expect(song, id).not.toBeNull();
      const { container } = render(
        <MemoryRouter>
          <SongCredits song={song!} />
        </MemoryRouter>,
      );
      expect(stableIds(container.innerHTML)).toMatchSnapshot();
    },
  );
});

describe('the credits a student sees of a session the console linked', () => {
  // Song v2 lets a session hold record ids and a source beside its text. A
  // student sees the text; a session with nothing else shows no "Recorded".
  const render_ = (session: Record<string, unknown>, credited = true) => {
    const song = getSong('africa')!;
    return render(
      <MemoryRouter>
        <SongCredits
          song={{
            ...song,
            credits: credited ? song.credits : undefined,
            relatedRecordings: undefined,
            session,
          }}
        />
      </MemoryRouter>,
    ).container;
  };

  it.each([
    [{ source: 'discogs' }],
    [{ studioId: 'sunset-sound' }],
    [{ placeId: 'los-angeles', labelId: 'columbia', unverified: true }],
  ])('draws no empty Recorded for %j', (session) => {
    expect(render_(session).textContent).not.toContain('Recorded');
    cleanup();
    // With no credits either, there is nothing to show at all.
    expect(render_(session, false).innerHTML).toBe('');
  });

  it('draws the text beside the ids as before', () => {
    const container = render_({
      studio: 'Sunset Sound',
      studioId: 'sunset-sound',
      source: 'discogs',
    });
    expect(container.textContent).toContain('RecordedSunset Sound');
    expect(container.textContent).not.toContain('sunset-sound');
  });
});

describe('the song list a student sees', () => {
  it('renders every published song, in the same order and markup', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/learn?tab=Songs']}>
        <SongLibraryBody />
      </MemoryRouter>,
    );
    const html = stableIds(container.innerHTML);
    const links = [...container.querySelectorAll('a[href^="/songs/"]')].map(
      (a) => a.getAttribute('href'),
    );
    expect(links.length).toBeGreaterThan(100);
    expect(links.slice(0, 5)).toMatchSnapshot('first song links');
    // Re-pinned 30 Sep 2026 for the owner's duplicate-artist merge, which
    // dropped "The" from four billings: Brick House and Easy (Commodores),
    // Californication (Red Hot Chili Peppers) and Pick Up The Pieces
    // (Average White Band). Putting those four back gives the earlier hash,
    // 0c3cbc87c39865cd; nothing else in the list changed.
    expect({ songLinks: links.length, hash: sha(html) }).toMatchSnapshot(
      'full list',
    );
  });
});
