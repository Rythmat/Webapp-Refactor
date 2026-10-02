/**
 * The mock core behind msw: the console's real client (contentRequest →
 * fetch) against the contract's semantics, with no stub written for the test.
 * This is the harness §3.6 asks for, so hook tests can use it too.
 */
import { describe, expect, it } from 'vitest';
import { CITIES } from '@/components/atlas/data/cities';
import {
  ContentApiError,
  contentRequest,
  unwrapSaveResponse,
  type ContentListItem,
  type PendingEdit,
} from '@/hooks/data/admin/useAdminContent';
import { API_BASE, mockApi, startMockApi } from '@/test/mockApi';
import {
  createContentMockServer,
  type MockSeed,
  type MockViewer,
} from '../contentMockServer';
import { contentMockHandlers } from '../mswHandlers';
import { sessionToken } from './sessionToken';

const city = (id: string) =>
  JSON.parse(JSON.stringify(CITIES.find((entry) => entry.id === id)));

const SEED: MockSeed = {
  items: [
    { kind: 'globe_city', slug: 'london', body: city('london') },
    { kind: 'globe_city', slug: 'detroit', body: city('detroit') },
    {
      kind: 'studio',
      slug: 'abbey-road-studios',
      body: {
        slug: 'abbey-road-studios',
        name: 'Abbey Road Studios',
        placeId: 'london',
      },
    },
  ],
};

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };

const failure = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('Expected the request to fail');
    },
    (caught: unknown) => caught as ContentApiError,
  );

describe('contentMockHandlers', () => {
  const server = createContentMockServer({ seed: SEED, mode: 'all' });
  startMockApi(
    ...contentMockHandlers(server, { apiBase: API_BASE, viewer: ADMIN }),
  );

  it('answers the console’s client with the contract’s shapes and errors', async () => {
    const found = await contentRequest<ContentListItem>(
      '/items/lookup?kind=studio&slug=abbey-road-studios',
      'any-token',
    );
    expect(found).toMatchObject({
      title: 'Abbey Road Studios',
      kind: 'studio',
    });
    // SuperJSON revived the dates, as it does for the real API.
    expect(found.updatedAt).toBeInstanceOf(Date);

    const taken = await failure(
      contentRequest('/items', 'any-token', {
        method: 'PUT',
        body: JSON.stringify({
          kind: 'studio',
          slug: 'abbey-road-studios',
          body: { slug: 'abbey-road-studios', name: 'Again' },
          create: true,
        }),
      }),
    );
    expect(taken).toBeInstanceOf(ContentApiError);
    expect(taken.status).toBe(409);
    expect(taken.code).toBe('SLUG_TAKEN');
    expect(taken.body.id).toBe(found.id);

    const invalid = await failure(
      contentRequest('/items', 'any-token', {
        method: 'PUT',
        body: JSON.stringify({
          kind: 'studio',
          slug: 'sunset-sound',
          body: {
            slug: 'sunset-sound',
            name: 'Sunset Sound',
            placeId: 'place:los-angeles',
          },
        }),
      }),
    );
    expect(invalid.status).toBe(422);
    expect(invalid.code).toBe('VALIDATION_FAILED');
    // The message a page shows says what is wrong.
    expect(invalid.message).toMatch(
      /^Invalid studio body — placeId must be a place slug/,
    );
    expect(invalid.body.problems).toEqual([
      expect.objectContaining({ code: 'INVALID_REFERENCE', path: 'placeId' }),
    ]);
  });

  it('takes the caller’s role from the session token when no viewer is fixed', async () => {
    mockApi.use(...contentMockHandlers(server, { apiBase: API_BASE }));
    const editor = sessionToken({ role: 'editor', user_id: 'ed-1' });
    const admin = sessionToken({ role: 'admin', user_id: 'admin-1' });

    const saved = unwrapSaveResponse(
      await contentRequest('/items', editor, {
        method: 'PUT',
        body: JSON.stringify({
          kind: 'studio',
          slug: 'abbey-road-studios',
          body: {
            slug: 'abbey-road-studios',
            name: 'Abbey Road',
            placeId: 'london',
          },
        }),
      }),
    );
    // An editor's save is a proposal; the live body stays.
    expect(saved.item.editState).toBe('pending');
    expect(saved.item.body.name).toBe('Abbey Road Studios');

    const queue = await contentRequest<PendingEdit[]>('/pending', admin);
    expect(queue.map((row) => row.submittedBy?.id)).toEqual(['ed-1']);
    expect((await failure(contentRequest('/pending', editor))).status).toBe(
      403,
    );

    const teacher = sessionToken({ role: 'teacher', user_id: 't-1' });
    expect((await failure(contentRequest('/overview', teacher))).status).toBe(
      403,
    );
    expect(
      (await failure(contentRequest('/overview', 'not-a-session'))).status,
    ).toBe(401);
  });
});
