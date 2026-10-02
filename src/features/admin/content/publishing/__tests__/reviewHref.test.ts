import { describe, expect, it } from 'vitest';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { reviewHref } from '../reviewHref';

/**
 * Where the queue's Review link goes: somewhere the proposal shows against
 * the live body. A song to its page in Edit mode; every other kind a table
 * holds to its row in the Table, whose panel has the review banner; the
 * other records to their editor.
 */

const pending = (kind: ContentKind, slug: string) => ({
  kind,
  slug,
  id: `db-${slug}`,
});

describe('reviewHref', () => {
  it('opens a song on its page, in Edit mode', () => {
    expect(reviewHref(pending('song', 'africa'))).toBe(
      '/console/content/songs/africa?edit=1',
    );
  });

  it.each([
    ['globe_event', 'evt-woodstock', '/console/table/events/evt-woodstock'],
    ['globe_city', 'detroit', '/console/table/locations/detroit'],
    ['artist', 'toto', '/console/table/artists/toto'],
    ['release', 'toto-toto-iv', '/console/table/records/toto-toto-iv'],
    ['studio', 'hitsville', '/console/table/studios/hitsville'],
    ['label', 'motown', '/console/table/labels/motown'],
    ['chord_progression', '12', '/console/table/progressions/12'],
  ] as const)(
    'opens a %s on its row in the Table, where the review banner is',
    (kind, slug, href) => {
      expect(reviewHref(pending(kind, slug))).toBe(href);
    },
  );

  it('opens the other records in their editor', () => {
    expect(reviewHref(pending('artist_location', 'marvin gaye'))).toBe(
      '/console/content/records/artist_location/db-marvin%20gaye',
    );
    expect(reviewHref(pending('activity_flow', 'unit-1'))).toBe(
      '/console/content/records/activity_flow/db-unit-1',
    );
  });
});
