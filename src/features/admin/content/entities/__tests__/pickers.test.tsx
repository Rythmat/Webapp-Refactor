// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetSessionEntitiesForTests } from '../sessionEntities';

/**
 * The pickers over the real artist registry, with the content API stubbed:
 * artists are served, `create` is on, `export` is off (so the index reads the
 * list endpoint), one artist exists only on the server, and two are archived
 * there — one of the registry's, and one only the server ever had.
 *
 * The registry holds no aliases today (old spellings were removed, not
 * aliased), so one entry is given a fixture alias to keep that path tested.
 */

const api = vi.hoisted(() => ({
  saves: [] as unknown[],
  taken: false,
}));

vi.mock('@/components/atlas/data/artistRegistry', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/components/atlas/data/artistRegistry')
    >();
  return {
    ...actual,
    ARTIST_REGISTRY: actual.ARTIST_REGISTRY.map((artist) =>
      artist.slug === 'andy-grammer'
        ? { ...artist, aliases: ['Andy Grammar'] }
        : artist,
    ),
  };
});
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: 'test' }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    isServed: (kind: string) => kind === 'artist',
    isAuthoritative: () => false,
    feature: (name: string) => name === 'create',
    identityOf: () => 'slug',
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  return {
    ...actual,
    contentRequest: async (path: string) => {
      if (path.startsWith('/items?kind=artist')) {
        return {
          items: [
            {
              slug: 'the-wrecking-crew',
              title: 'The Wrecking Crew',
              status: 'draft',
              editState: null,
            },
            {
              slug: 'marvin-gaye',
              title: 'Marvin Gaye',
              status: 'archived',
              editState: null,
            },
            {
              slug: 'gone-band',
              title: 'Gone Band',
              status: 'archived',
              editState: null,
            },
          ],
          nextCursor: null,
        };
      }
      throw new Error(`unexpected ${path}`);
    },
    useSaveContentItem: () => ({
      isPending: false,
      error: null,
      mutateAsync: async (input: unknown) => {
        if (api.taken) {
          throw new actual.ContentApiError(409, {
            error: 'Taken',
            code: 'SLUG_TAKEN',
          });
        }
        api.saves.push(input);
        return { item: {}, warnings: [] };
      },
    }),
  };
});

// Imported after the mocks.
let EntityPicker: typeof import('../EntityPicker').EntityPicker;
let EntityMultiPicker: typeof import('../EntityMultiPicker').EntityMultiPicker;
beforeAll(async () => {
  // cmdk scrolls the active item into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
  ({ EntityPicker } = await import('../EntityPicker'));
  ({ EntityMultiPicker } = await import('../EntityMultiPicker'));
});

afterEach(() => {
  cleanup();
  resetSessionEntitiesForTests();
  api.saves = [];
  api.taken = false;
});

const wrap = (node: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>
);

const openAndType = async (text: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Choose artist' }));
  const input = await screen.findByPlaceholderText('Find artist…');
  fireEvent.change(input, { target: { value: text } });
  return input;
};

/** Type a name no record has, and wait for Create to be offered. */
const typeNew = async (text: string) => {
  const input = await openAndType(text);
  await screen.findByRole('option', { name: new RegExp(`^Create “${text}”`) });
  return input;
};

describe('the entity picker', () => {
  it('writes the canonical slug for an alias', async () => {
    const onChange = vi.fn();
    render(
      wrap(<EntityPicker kind="artist" value={null} onChange={onChange} />),
    );
    const input = await openAndType('Andy Grammar');
    expect(await screen.findByText(/\(alias\)/)).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(onChange).toHaveBeenCalledWith(
      'andy-grammer',
      expect.objectContaining({ slug: 'andy-grammer', name: 'Andy Grammer' }),
    );
  });

  it('offers what only the server has', async () => {
    const onChange = vi.fn();
    render(
      wrap(<EntityPicker kind="artist" value={null} onChange={onChange} />),
    );
    const input = await openAndType('wrecking');
    await screen.findByText('The Wrecking Crew');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(onChange).toHaveBeenCalledWith(
      'the-wrecking-crew',
      expect.objectContaining({ source: 'draft' }),
    );
  });

  it('offers nothing the server has archived, the registry’s copy included', async () => {
    render(
      wrap(<EntityPicker kind="artist" value={null} onChange={vi.fn()} />),
    );
    await openAndType('wrecking');
    // The list has arrived.
    await screen.findByText('The Wrecking Crew');
    fireEvent.change(screen.getByPlaceholderText('Find artist…'), {
      target: { value: 'marvin gaye' },
    });
    expect(screen.queryByText('Marvin Gaye')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Find artist…'), {
      target: { value: 'gone band' },
    });
    expect(screen.queryByText('Gone Band')).toBeNull();
  });

  it('flags a value no record has, rather than hiding it', () => {
    render(
      wrap(
        <EntityPicker kind="artist" value="nobody-at-all" onChange={vi.fn()} />,
      ),
    );
    expect(screen.getByText('nobody-at-all (not found)')).toBeTruthy();
  });

  it('creates a record, create-only, and picks it', async () => {
    const onChange = vi.fn();
    render(
      wrap(
        <EntityPicker
          kind="artist"
          value={null}
          onChange={onChange}
          allowCreate
        />,
      ),
    );
    const input = await typeNew('Sunset Sound Players');
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Create artist' }),
    );
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        'sunset-sound-players',
        expect.objectContaining({ source: 'draft' }),
      ),
    );
    expect(api.saves).toEqual([
      {
        kind: 'artist',
        slug: 'sunset-sound-players',
        body: { slug: 'sunset-sound-players', name: 'Sunset Sound Players' },
        status: 'draft',
        create: true,
      },
    ]);
  });

  it('will not create a record whose id is taken; it offers that record', async () => {
    const onChange = vi.fn();
    render(
      wrap(
        <EntityPicker
          kind="artist"
          value={null}
          onChange={onChange}
          allowCreate
        />,
      ),
    );
    // The picker itself never offers to create a folded match of a record
    // ("Toto!" lists Toto). The dialog is the second line: rename the new
    // record there to an id that exists, and it refuses.
    const input = await typeNew('Brand New Band');
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    fireEvent.change(await screen.findByDisplayValue('Brand New Band'), {
      target: { value: 'Toto' },
    });
    expect(await screen.findByText(/already has this id/)).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Create artist',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Use existing' }));
    expect(onChange).toHaveBeenCalledWith(
      'toto',
      expect.objectContaining({ name: 'Toto' }),
    );
    expect(api.saves).toEqual([]);
  });

  it('switches to the existing record when the server says the id is taken', async () => {
    api.taken = true;
    render(
      wrap(
        <EntityPicker
          kind="artist"
          value={null}
          onChange={vi.fn()}
          allowCreate
        />,
      ),
    );
    const input = await typeNew('Brand New Band');
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Create artist' }),
    );
    expect(await screen.findByText(/created this id meanwhile/)).toBeTruthy();
  });
});

describe('the multi picker over several kinds', () => {
  it('searches genres and subgenres as one list, and says a subgenre’s genre', async () => {
    const onChange = vi.fn();
    render(
      wrap(
        <EntityMultiPicker
          kind={['genre', 'subgenre']}
          aria-label="Genres"
          value={['rnb', 'kwaito']}
          onChange={onChange}
        />,
      ),
    );
    const group = screen.getByRole('group', { name: 'Genres' });
    // A genre is itself; a subgenre names the genre it is filed under, by
    // that genre's own name.
    expect(group.textContent).toContain('R&B');
    expect(group.textContent).toContain('Kwaito· Southern African');

    fireEvent.click(screen.getByRole('button', { name: 'Add genre' }));
    const input = await screen.findByPlaceholderText('Find genre…');
    fireEvent.change(input, { target: { value: 'acid ro' } });
    await screen.findByRole('option', { name: /Acid Rock/ });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(onChange).toHaveBeenLastCalledWith(['rnb', 'kwaito', 'acid-rock']);
    // Nothing to create among vocabularies.
    fireEvent.change(input, { target: { value: 'nothing like it' } });
    expect(screen.queryByRole('option', { name: /^Create/ })).toBeNull();
  });

  it('is read-only when disabled: no adder, and None for an empty list', () => {
    render(
      wrap(
        <EntityMultiPicker
          kind={['genre', 'subgenre']}
          aria-label="Genres"
          value={[]}
          onChange={vi.fn()}
          disabled
        />,
      ),
    );
    expect(screen.queryByRole('button', { name: 'Add genre' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Genres' }).textContent).toBe(
      'None',
    );
  });
});
