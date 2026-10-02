// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ArtistFields } from '../ArtistFields';
import { LabelFields } from '../LabelFields';
import { type Body, pick, renderEditor } from './harness';

/**
 * The loops REF_PATHS forbids (`acyclic`): a label under its own imprint, a
 * group inside one of its own members. The editors walk the bodies the
 * console has loaded; here the export loader serves a few.
 */

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: null }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    isServed: () => false,
    isAuthoritative: () => false,
    feature: () => false,
    identityOf: () => 'slug',
    // A server that takes an artist's Born (artist body level 2).
    schemaVersionOf: () => 2,
  }),
}));
vi.mock('@/hooks/data/admin/useContentExport', () => {
  const row = (slug: string, body: Record<string, unknown>) => ({
    id: slug,
    slug,
    status: 'published',
    editState: null,
    updatedAt: null,
    body: { slug, ...body },
  });
  const rows: Record<string, unknown[]> = {
    label: [
      row('motown', { name: 'Motown' }),
      row('tamla', { name: 'Tamla', parentLabelId: 'motown' }),
      row('tamla-soul', { name: 'Tamla Soul', parentLabelId: 'tamla' }),
      row('stax', { name: 'Stax' }),
    ],
    artist: [
      row('the-temptations', { name: 'The Temptations', group: true }),
      row('temptations-revue', {
        name: 'The Temptations Revue',
        group: true,
        members: [{ artistId: 'the-temptations' }],
      }),
      row('otis-williams', { name: 'Otis Williams' }),
    ],
  };
  const useContentExports = (kinds: readonly string[]) => ({
    byKind: new Map(
      kinds
        .filter((kind) => rows[kind])
        .map((kind) => [
          kind,
          { kind, source: 'export', rows: rows[kind], fingerprint: kind },
        ]),
    ),
    ready: true,
    loading: false,
    fetching: false,
    error: null,
    fingerprint: kinds.join(','),
  });
  return {
    useContentExports,
    useContentExport: (kind: string) => {
      const all = useContentExports([kind]);
      return { ...all, data: all.byKind.get(kind) };
    },
  };
});

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

describe('LabelFields', () => {
  const MOTOWN: Body = { slug: 'motown', name: 'Motown' };

  it('refuses a parent that is already under it, however far down', async () => {
    const { onChange, last } = renderEditor(LabelFields, MOTOWN);
    await pick(
      screen.getByRole('button', { name: 'Imprint of' }),
      'Tamla Soul',
      /Tamla Soul/,
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText('That label is an imprint of this one: it would loop.'),
    ).toBeTruthy();

    await pick(
      screen.getByRole('button', { name: 'Imprint of' }),
      'Stax',
      /Stax/,
    );
    expect(last()).toStrictEqual({ ...MOTOWN, parentLabelId: 'stax' });
    expect(screen.queryByText(/it would loop/)).toBeNull();
  });
});

describe('ArtistFields', () => {
  const TEMPTATIONS: Body = {
    slug: 'the-temptations',
    name: 'The Temptations',
    group: true,
  };

  it('refuses a member that already has the group among its members', async () => {
    const { onChange, last } = renderEditor(ArtistFields, TEMPTATIONS);
    await pick(
      screen.getByRole('button', { name: 'Add a member' }),
      'The Temptations Revue',
      /The Temptations Revue/,
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'That artist already has this group among its members: it would loop.',
      ),
    ).toBeTruthy();

    await pick(
      screen.getByRole('button', { name: 'Add a member' }),
      'Otis Williams',
      /Otis Williams/,
    );
    expect(last()).toStrictEqual({
      ...TEMPTATIONS,
      members: [{ artistId: 'otis-williams' }],
    });
  });
});
