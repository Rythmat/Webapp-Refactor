// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ValidationProblem } from '@/hooks/data/admin/useAdminContent';
import { ValidationNotice } from '../ValidationNotice';
import { TABLES } from '../model/categories';

/**
 * What would block a publish, above a table's rows: each problem links to
 * where it is fixed — its row, or for a song's globe event whose song is
 * gone, the event's full editor, since its row is the missing song.
 */

const problems = vi.hoisted(() => ({ list: [] as ValidationProblem[] }));

vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useValidateContent: () => ({
    data: { ok: problems.list.length === 0, problems: problems.list },
  }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({ isServed: () => true }),
}));
vi.mock('@/hooks/data/admin/useContentExport', () => ({
  useContentExports: (kinds: readonly string[]) => ({
    byKind: new Map(
      kinds.map((kind) => [
        kind,
        {
          kind,
          source: 'export',
          fingerprint: kind,
          rows: [
            {
              id: 'db-no-such-song',
              slug: 'song-no_such_song',
              status: 'published',
              editState: null,
              updatedAt: null,
              body: {},
            },
          ],
        },
      ]),
    ),
    ready: true,
  }),
}));

afterEach(() => {
  cleanup();
  problems.list = [];
});

const mount = () =>
  render(
    <MemoryRouter>
      <ValidationNotice def={TABLES.events} />
    </MemoryRouter>,
  );

describe('the problems that would block a publish', () => {
  it('sends a song’s globe event whose song is gone to the event’s own editor', () => {
    problems.list = [
      {
        code: 'DANGLING_REFERENCE',
        slug: 'song-no_such_song',
        detail: 'Derived from the song "no_such_song", which does not exist.',
        severity: 'error',
        target: 'song:no_such_song',
      },
    ];
    mount();
    expect(
      screen.getByRole('link', { name: 'song-no_such_song' }),
    ).toHaveAttribute(
      'href',
      '/console/content/records/globe_event/db-no-such-song',
    );
    expect(
      screen.getByText(/Open it to archive or delete it\./),
    ).toBeInTheDocument();
  });

  it('lists the same problem twice on one item, each once', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const twice = (path: string): ValidationProblem => ({
      code: 'DANGLING_REFERENCE',
      slug: 'evt-motown-detroit-1966',
      detail: `${path} names a record not in the live release.`,
      severity: 'error',
      path,
    });
    problems.list = [twice('artistIds[0]'), twice('artistIds[1]')];
    mount();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(
      errors.mock.calls.some((call) => String(call[0]).includes('same key')),
    ).toBe(false);
    errors.mockRestore();
  });
});
