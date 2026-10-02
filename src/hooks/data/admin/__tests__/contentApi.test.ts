/**
 * The content API client's error and save shapes, over a real fetch (msw).
 *
 * The console now branches on status and code (a 404 from /capabilities, a
 * 409 SLUG_TAKEN), so what fetchWithAuth throws has to carry both, while its
 * message stays the `error` string users have always been shown.
 */
import { http, HttpResponse } from 'msw';
import SuperJSON from 'superjson';
import { describe, expect, it } from 'vitest';
import { API_BASE, mockApi, startMockApi } from '@/test/mockApi';
import {
  ContentApiError,
  contentRequest,
  unwrapSaveResponse,
  type ContentItemDetail,
} from '../useAdminContent';

const url = (path: string) => `${API_BASE}/api/admin/content${path}`;

describe('fetchWithAuth errors', () => {
  startMockApi();

  it('throws a ContentApiError with the status, code and every detail', async () => {
    mockApi.use(
      http.put(url('/items'), () =>
        HttpResponse.json(
          {
            error: 'A song with the slug "africa" exists.',
            code: 'SLUG_TAKEN',
            kind: 'song',
            slug: 'africa',
            id: 'item-1',
          },
          { status: 409 },
        ),
      ),
    );

    const caught = await contentRequest('/items', 'token', {
      method: 'PUT',
      body: '{}',
    }).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(ContentApiError);
    expect(caught).toBeInstanceOf(Error);
    const error = caught as ContentApiError;
    expect(error.status).toBe(409);
    expect(error.code).toBe('SLUG_TAKEN');
    expect(error.message).toBe('A song with the slug "africa" exists.');
    expect(error.body).toMatchObject({
      kind: 'song',
      slug: 'africa',
      id: 'item-1',
    });
  });

  it('keeps the old fallback message when the body is not JSON', async () => {
    mockApi.use(
      http.get(
        url('/overview'),
        () => new HttpResponse('<html>Bad gateway</html>', { status: 502 }),
      ),
    );
    const error = (await contentRequest('/overview', 'token').catch(
      (caught: unknown) => caught,
    )) as ContentApiError;
    expect(error.status).toBe(502);
    expect(error.body).toEqual({});
    expect(error.code).toBeUndefined();
    expect(error.message).toBe('Request failed: 502');
  });

  it('carries validation problems on a 422', async () => {
    const problems = [
      {
        code: 'INVALID_REFERENCE',
        slug: 'toto',
        detail: 'x',
        path: 'labelIds[0]',
      },
    ];
    mockApi.use(
      http.put(url('/items'), () =>
        HttpResponse.json(
          { error: 'Invalid', code: 'VALIDATION_FAILED', problems },
          { status: 422 },
        ),
      ),
    );
    const error = (await contentRequest('/items', 'token', {
      method: 'PUT',
      body: '{}',
    }).catch((caught: unknown) => caught)) as ContentApiError;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.body.problems).toEqual(problems);
  });

  it('still parses a 2xx as SuperJSON', async () => {
    const updatedAt = new Date('2026-09-29T12:00:00.000Z');
    mockApi.use(
      http.get(
        url('/items/abc'),
        () => new HttpResponse(SuperJSON.stringify({ id: 'abc', updatedAt })),
      ),
    );
    const item = await contentRequest<{ updatedAt: Date }>(
      '/items/abc',
      'token',
    );
    expect(item.updatedAt).toEqual(updatedAt);
  });
});

describe('unwrapSaveResponse', () => {
  const item = { id: 'abc', slug: 'africa' } as ContentItemDetail;

  it('reads the contract shape', () => {
    const warning = {
      code: 'UNPUBLISHED_REFERENCE' as const,
      slug: 'africa',
      detail: 'x',
      severity: 'warning' as const,
    };
    expect(unwrapSaveResponse({ item, warnings: [warning] })).toEqual({
      item,
      warnings: [warning],
    });
  });

  it('treats today’s bare item as an item with no warnings', () => {
    expect(unwrapSaveResponse(item)).toEqual({ item, warnings: [] });
  });
});
