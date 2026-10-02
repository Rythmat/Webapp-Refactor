// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ContentKind,
  ContentOverviewRow,
} from '@/hooks/data/admin/useAdminContent';
import type {
  ContentExport,
  ContentExports,
  ExportOptions,
  ExportRow,
} from '@/hooks/data/admin/useContentExport';
import { PublishKindsSection } from '../PublishKindsSection';
import { resetPublishRunForTests } from '../publishRun';

/**
 * Review & publish before an artist release: the tab lists every song pin
 * the artist publish moves while artists have changes, and "Publish
 * everything that changed" asks first — naming what publishes, in order,
 * with the same list — and waits until the pins are worked out.
 */

const store = vi.hoisted(() => ({
  overview: [] as ContentOverviewRow[],
  published: [] as string[],
  /** The exports, by kind and view; a missing one is still loading. */
  working: new Map<string, ExportRow[]>(),
  live: new Map<string, ExportRow[]>(),
}));

vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useContentOverview: () => ({ data: store.overview, isLoading: false }),
  usePublishContent: () => ({
    mutateAsync: async (kind: string) => {
      store.published.push(kind);
    },
  }),
}));

vi.mock('@/hooks/data/admin/useContentExport', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useContentExports: (
    kinds: readonly ContentKind[],
    options: ExportOptions = {},
  ): ContentExports => {
    const from = options.view === 'published' ? store.live : store.working;
    const byKind = new Map<ContentKind, ContentExport>();
    for (const kind of kinds) {
      const rows = from.get(kind);
      if (rows)
        byKind.set(kind, { kind, source: 'export', rows, fingerprint: kind });
    }
    return {
      byKind,
      ready: byKind.size === kinds.length,
      loading: byKind.size < kinds.length,
      fetching: false,
      error: null,
      fingerprint: kinds
        .map((kind) => `${kind}:${from.get(kind)?.length ?? '-'}`)
        .join(','),
    };
  },
}));

// The bulk-accept counts read the suggestions; not what this is about.
vi.mock('../BulkUnreviewed', () => ({
  BulkUnreviewedFor: () => null,
  BulkUnreviewedLines: () => null,
}));

const overviewRow = (
  kind: ContentKind,
  changedSincePublish: number,
): ContentOverviewRow => ({
  kind,
  total: 10,
  published: 10,
  changedSincePublish,
  pendingReview: 0,
  liveVersion: 1,
  livePublishedAt: null,
});

const row = (slug: string, body: Record<string, unknown>): ExportRow => ({
  id: `db-${slug}`,
  slug,
  status: 'published',
  editState: null,
  updatedAt: null,
  body,
});

const MARVIN = { slug: 'marvin-gaye', name: 'Marvin Gaye' };
const DETROIT = row('detroit', {
  id: 'detroit',
  name: 'Detroit',
  coordinates: [42.3314, -83.0458],
});

/** Marvin Gaye's City set to Detroit; his songs pinned in Washington. */
const marvinMovesToDetroit = () => {
  store.working.set('artist', [
    row('marvin-gaye', { ...MARVIN, basedInPlaceId: 'detroit' }),
  ]);
  store.live.set('artist', [row('marvin-gaye', MARVIN)]);
  store.working.set('globe_city', [DETROIT]);
  store.live.set('globe_city', [DETROIT]);
  store.working.set('song', [
    row('whats-going-on', {
      id: 'whats-going-on',
      title: 'What’s Going On',
      origin: { artistGlobeId: 'marvin-gaye' },
    }),
  ]);
  store.working.set('globe_event', [
    row('song-whats-going-on', {
      id: 'song-whats-going-on',
      location: { city: 'Washington', lat: 38.9072, lng: -77.0369 },
    }),
  ]);
};

beforeEach(() => {
  store.overview = [
    overviewRow('globe_city', 1),
    overviewRow('artist', 1),
    overviewRow('song', 2),
  ];
  store.published = [];
  store.working.clear();
  store.live.clear();
});

afterEach(() => {
  cleanup();
  resetPublishRunForTests();
});

const mount = () =>
  render(
    <MemoryRouter>
      <PublishKindsSection />
    </MemoryRouter>,
  );

const openConfirmation = () => {
  fireEvent.click(
    screen.getByRole('button', { name: /Publish everything that changed/ }),
  );
  return screen.getByRole('alertdialog');
};

describe('the pin-move report on Review & publish', () => {
  it('lists every song pin the artist publish moves, with where from and how far', async () => {
    marvinMovesToDetroit();
    mount();
    const section = await screen.findByRole('region', {
      name: 'Song pins the artist publish moves',
    });
    await waitFor(() =>
      expect(section.textContent).toContain(
        'Moves 1 song pin of 1 act to their new City.',
      ),
    );
    expect(
      within(section).getByRole('link', { name: 'Marvin Gaye' }),
    ).toHaveAttribute('href', '/console/table/artists/marvin-gaye');
    expect(section.textContent).toContain(
      'What’s Going On · Washington → Detroit, 634 km',
    );
  });

  it('is not there while artists have nothing to publish', () => {
    store.overview = [overviewRow('song', 2), overviewRow('artist', 0)];
    marvinMovesToDetroit();
    mount();
    expect(
      screen.queryByRole('region', {
        name: 'Song pins the artist publish moves',
      }),
    ).toBeNull();
  });
});

describe('publishing everything that changed', () => {
  it('asks first, naming the kinds in order and the pins that move', async () => {
    marvinMovesToDetroit();
    mount();
    const dialog = openConfirmation();
    expect(dialog.textContent).toContain(
      'Publishes Globe cities, then Artists, then Songs, in that order',
    );
    await waitFor(() =>
      expect(dialog.textContent).toContain(
        'What’s Going On · Washington → Detroit, 634 km',
      ),
    );
    // Detroit goes live first in this run: nothing holds the pins back. The
    // globe events are not in it, so students see the move later.
    expect(dialog.textContent).not.toContain('is not live yet');
    expect(dialog.textContent).toContain(
      'students see the pins move with the first Globe events publish after it',
    );
    expect(store.published).toEqual([]);

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Publish all' }),
    );
    await waitFor(() =>
      expect(store.published).toEqual(['globe_city', 'artist', 'song']),
    );
  });

  it('waits until the pins are worked out', async () => {
    marvinMovesToDetroit();
    // The songs' pins are still on their way.
    store.working.delete('globe_event');
    mount();
    const dialog = openConfirmation();
    const publish = within(dialog).getByRole('button', { name: 'Publish all' });
    expect(publish).toBeDisabled();
    await waitFor(() =>
      expect(dialog.textContent).toContain(
        'Working out which song pins the artist publish moves',
      ),
    );
    fireEvent.click(publish);
    expect(store.published).toEqual([]);
  });

  it('says the Artists publish is refused where a new City is not live and this run does not publish it', async () => {
    store.overview = [overviewRow('artist', 1)];
    marvinMovesToDetroit();
    store.live.set('globe_city', []);
    mount();
    const dialog = openConfirmation();
    await waitFor(() =>
      expect(dialog.textContent).toContain(
        'The Artists publish will be refused: 1 act names a City that is not live when it runs.',
      ),
    );
    expect(dialog.textContent).toContain(
      'Detroit is not live yet: the Artists publish is refused until Globe cities publish it.',
    );
    // Its pins are not counted as moving.
    expect(dialog.textContent).toContain('No song pin moves.');
    expect(dialog.textContent).not.toContain('Washington → Detroit');
  });

  it('says when students see the pins move: at the Globe events publish', async () => {
    store.overview = [overviewRow('artist', 1), overviewRow('globe_event', 1)];
    marvinMovesToDetroit();
    mount();
    const dialog = openConfirmation();
    await waitFor(() =>
      expect(dialog.textContent).toContain(
        'Moves 1 song pin to Detroit when this run publishes Globe events:',
      ),
    );
  });

  it('asks without a pin report when no artist changed', () => {
    store.overview = [overviewRow('song', 2)];
    mount();
    const dialog = openConfirmation();
    expect(dialog.textContent).toContain(
      'Publishes Songs. Students see it within a minute of it going live.',
    );
    expect(dialog.textContent).not.toContain('song pin');
    const publish = within(dialog).getByRole('button', {
      name: 'Publish Songs',
    });
    expect(publish).toBeEnabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(store.published).toEqual([]);
  });
});
