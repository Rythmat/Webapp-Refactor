// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { resetSessionEntitiesForTests } from '../../entities/sessionEntities';
import {
  clearPicker,
  pick,
  seed,
  type,
} from '../../recordEditors/__tests__/harness';
import { ConnectionsPanel } from '../ConnectionsPanel';

/**
 * The song's connections at each song schema level: below v2 only the v1
 * links, with a note; at v2 the session's studio, label and city by id, the
 * records it appears on, subgenres and sources. Signed out as far as the API
 * goes, so the pickers search the repo's registries plus records seeded as
 * made this session (the repo has no studios, labels or records).
 */

const caps = vi.hoisted(() => ({ songSchemaLevel: 1 }));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: null }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    songSchemaLevel: caps.songSchemaLevel,
    isServed: () => false,
    isAuthoritative: () => false,
    feature: () => false,
    identityOf: () => 'slug',
  }),
}));

beforeAll(() => {
  // cmdk scrolls the active option into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  resetSessionEntitiesForTests();
  caps.songSchemaLevel = 1;
});

const AFRICA = {
  id: 'africa',
  title: 'Africa',
  artist: 'Toto',
  genreTags: ['rock'],
  session: { studio: 'Sunset Sound', city: 'Los Angeles', label: 'Columbia' },
} as Song;

/** The panel over a song held in state, as the song editor holds it. */
function renderPanel(initial: Song, level: number) {
  caps.songSchemaLevel = level;
  const patches: Partial<Song>[] = [];
  let latest = initial;
  const Host = () => {
    const [song, setSong] = useState(initial);
    return (
      <ConnectionsPanel
        song={song}
        onPatch={(p) => {
          patches.push(p);
          latest = { ...latest, ...p };
          setSong(latest);
        }}
      />
    );
  };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <Host />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { patches, song: () => latest };
}

const trigger = (name: string) => screen.getByRole('button', { name });

describe('ConnectionsPanel below song schema v2', () => {
  it('keeps the v2 fields out and says when they come', () => {
    const { patches } = renderPanel(AFRICA, 1);
    expect(screen.getByText(/comes with song schema v2/)).toBeTruthy();
    for (const name of [
      "Studio's record",
      "Label's record",
      'Where it was recorded',
      'Add a record',
    ]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByText('Appears on')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Subgenres' })).toBeNull();
    // A v1 server refuses `source`, so there is nowhere to type one.
    expect(screen.queryByLabelText('Source')).toBeNull();
    // The text is still edited as it always was.
    type(screen.getByLabelText('Studio'), 'Sunset Sound Recorders');
    expect(patches.at(-1)).toEqual({
      session: { ...AFRICA.session, studio: 'Sunset Sound Recorders' },
    });
    // Nothing of v2 in it, so nothing to remove.
    expect(screen.queryByText(/Remove the v2 fields/)).toBeNull();
  });

  it('offers to remove the v2 fields a song already holds', () => {
    const { song } = renderPanel(
      {
        ...AFRICA,
        releases: [{ releaseId: 'toto-toto-iv', track: 1 }],
        subgenreIds: ['soft-rock'],
        session: { ...AFRICA.session, studioId: 'sunset-sound' },
        credits: [
          { name: 'Jeff Porcaro', role: 'performer', source: 'liner notes' },
        ],
        relatedRecordings: [
          { artist: 'Weezer', relation: 'cover', source: 'discogs' },
        ],
      },
      1,
    );
    expect(screen.getByRole('status').textContent).toContain(
      'the records it appears on, subgenres, the session’s record links or source, credit sources, recording sources',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove the v2 fields' }),
    );
    const now = song();
    expect(now.releases).toBeUndefined();
    expect(now.subgenreIds).toBeUndefined();
    expect(now.session).toEqual(AFRICA.session);
    expect(now.credits).toEqual([{ name: 'Jeff Porcaro', role: 'performer' }]);
    expect(now.relatedRecordings).toEqual([
      { artist: 'Weezer', relation: 'cover' },
    ]);
    expect(screen.queryByText(/Remove the v2 fields/)).toBeNull();
  });
});

describe('ConnectionsPanel at song schema v2', () => {
  it('links the studio, label and city by id and keeps their text', async () => {
    seed('studio', 'sunset-sound', 'Sunset Sound');
    seed('label', 'columbia', 'Columbia');
    const { song } = renderPanel(AFRICA, 2);
    expect(screen.queryByText(/comes with song schema v2/)).toBeNull();

    await pick(trigger("Studio's record"), 'Sunset', /Sunset Sound/);
    await pick(trigger("Label's record"), 'Columbia', /Columbia/);
    await pick(trigger('Where it was recorded'), 'Los Angeles', /Los Angeles/);
    expect(song().session).toEqual({
      ...AFRICA.session,
      studioId: 'sunset-sound',
      labelId: 'columbia',
      placeId: 'los-angeles',
    });
  });

  it('fills empty text from the record it links, and never overwrites text', async () => {
    seed('studio', 'hitsville-u-s-a', 'Hitsville U.S.A.');
    seed('label', 'tamla', 'Tamla');
    const { song } = renderPanel(
      { ...AFRICA, session: { label: 'Tamla Records' } },
      2,
    );
    await pick(trigger("Studio's record"), 'Hitsville', /Hitsville U\.S\.A\./);
    await pick(trigger("Label's record"), 'Tamla', /Tamla/);
    expect(song().session).toEqual({
      studio: 'Hitsville U.S.A.',
      studioId: 'hitsville-u-s-a',
      label: 'Tamla Records',
      labelId: 'tamla',
    });
  });

  it('keeps the text in step with the record while it is the record’s name', async () => {
    seed('studio', 'sunset-sound', 'Sunset Sound');
    seed('studio', 'record-plant', 'Record Plant');
    const { song } = renderPanel({ ...AFRICA, session: {} }, 2);

    await pick(trigger("Studio's record"), 'Sunset', /Sunset Sound/);
    expect(song().session).toEqual({
      studio: 'Sunset Sound',
      studioId: 'sunset-sound',
    });
    // Picked again: the text was the old record's name, so it follows.
    await pick(trigger("Studio's record"), 'Record Plant', /Record Plant/);
    expect(song().session).toEqual({
      studio: 'Record Plant',
      studioId: 'record-plant',
    });

    // Text someone wrote stays, whatever is picked.
    type(screen.getByLabelText('Studio'), 'The Plant, Sausalito');
    await pick(trigger("Studio's record"), 'Sunset', /Sunset Sound/);
    expect(song().session).toEqual({
      studio: 'The Plant, Sausalito',
      studioId: 'sunset-sound',
    });

    // Clearing the link leaves the text, which is read as a guess again.
    await clearPicker(trigger("Studio's record"));
    expect(song().session).toEqual({ studio: 'The Plant, Sausalito' });
  });

  it('adds the records it appears on, with a track, and removes them', async () => {
    seed('release', 'toto-toto-iv', 'Toto IV');
    seed('release', 'toto-past-to-present', 'Past to Present');
    const { song } = renderPanel(AFRICA, 2);
    expect(screen.getByText('Appears on')).toBeTruthy();

    await pick(trigger('Add a record'), 'Toto IV', /Toto IV/);
    await pick(trigger('Add a record'), 'Past', /Past to Present/);
    // Picking one already listed adds nothing.
    await pick(trigger('Add a record'), 'Toto IV', /Toto IV/);
    type(screen.getByLabelText('Track on record 1'), '10');
    expect(song().releases).toEqual([
      { releaseId: 'toto-toto-iv', track: 10 },
      { releaseId: 'toto-past-to-present' },
    ]);

    // On a record, the song's label is the record's.
    expect(screen.getByText(/the label record here is not read/)).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove toto-past-to-present' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove toto-toto-iv' }),
    );
    // The last one gone, the field goes too: never an empty list.
    expect(song().releases).toBeUndefined();
    expect(screen.queryByText(/the label record here is not read/)).toBeNull();
  });

  it('refuses a record twice, and a track that is not a whole number from 1', async () => {
    seed('release', 'toto-toto-iv', 'Toto IV');
    seed('release', 'toto-past-to-present', 'Past to Present');
    const { song } = renderPanel(AFRICA, 2);
    await pick(trigger('Add a record'), 'Toto IV', /Toto IV/);
    await pick(trigger('Add a record'), 'Past', /Past to Present/);
    // Changing the second row to the first's record is refused, and said.
    await pick(trigger('Record 2'), 'Toto IV', /Toto IV/);
    expect(song().releases).toEqual([
      { releaseId: 'toto-toto-iv' },
      { releaseId: 'toto-past-to-present' },
    ]);
    expect(screen.getByText('That record is listed already.')).toBeTruthy();

    const track = screen.getByLabelText('Track on record 1');
    for (const bad of ['0', '-2', '1.5']) {
      type(track, bad);
      expect(song().releases?.[0], bad).toEqual({ releaseId: 'toto-toto-iv' });
    }
    type(track, '3');
    expect(song().releases?.[0]).toEqual({
      releaseId: 'toto-toto-iv',
      track: 3,
    });
  });

  it('files the song under subgenres, its own genres first', async () => {
    const { song } = renderPanel(AFRICA, 2);
    const group = screen.getByRole('group', { name: 'Subgenres' });
    const adder = group.querySelector('button')!;
    await pick(adder, 'soft rock', /Soft Rock/);
    expect(song().subgenreIds).toEqual(['soft-rock']);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Soft Rock' }));
    expect(song().subgenreIds).toBeUndefined();
  });

  it('writes a source beside each unconfirmed flag', () => {
    const { song } = renderPanel(
      {
        ...AFRICA,
        credits: [{ name: 'Jeff Porcaro', role: 'performer' }],
      },
      2,
    );
    const [creditSource, sessionSource] = screen.getAllByLabelText('Source');
    type(creditSource, 'liner notes');
    type(sessionSource, 'discogs');
    expect(song().credits).toEqual([
      { name: 'Jeff Porcaro', role: 'performer', source: 'liner notes' },
    ]);
    expect(song().session).toEqual({ ...AFRICA.session, source: 'discogs' });
  });

  it('shows what the v2 fields connect, as stated', async () => {
    seed('studio', 'sunset-sound', 'Sunset Sound');
    renderPanel(AFRICA, 2);
    // Toto, and the studio, city and label as text: all four are guesses.
    const counts = () => screen.getByText(/stated/).textContent;
    expect(counts()).toBe('5 stated, 4 guessed from a name');
    await pick(trigger("Studio's record"), 'Sunset', /Sunset Sound/);
    // The studio is the stored one now, and its text no longer guessed at.
    expect(counts()).toBe('5 stated, 3 guessed from a name');
    const studio = screen.getByText('sunset-sound').closest('li')!;
    expect(studio.textContent).toBe('recorded at sunset-sound');
    expect(studio.getAttribute('title')).toBe('from session.studioId');
  });
});
