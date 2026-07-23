// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostMspTokenPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';
import {
  readCachedTokenForInteraction,
  writeCachedTokenForInteraction,
  type MintTokenInput,
  type MspTokenRecord,
} from './mspTokenStore';
import {
  mintTokenViaBackend,
  type MspTokenMintClient,
} from './useMspTokenMint';

const USER_ID = 'test-user';
const RETURN_URL = 'https://app.example/msp/return';

const baseInput = (): MintTokenInput => ({
  interactionId: 'ix-1',
  enrollmentId: 'enr-1',
  module: 'learn',
  activityRef: 'lesson-1',
  expects: 'score',
  sessionId: 'sess-42',
});

const clientOk = (token: string): MspTokenMintClient => ({
  postMspToken: vi.fn(async () => ({ msp: token })),
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('mintTokenViaBackend', () => {
  it("maps enrollmentId → student and returnUrl → return in the payload", async () => {
    const client = clientOk('server.issued.jwt.1');
    await mintTokenViaBackend(USER_ID, baseInput(), client, RETURN_URL);
    expect(client.postMspToken).toHaveBeenCalledTimes(1);
    const payload: PostMspTokenPayload = (client.postMspToken as ReturnType<
      typeof vi.fn
    >).mock.calls[0][0];
    expect(payload.student).toBe('enr-1');
    expect(payload.return).toBe(RETURN_URL);
    expect(payload.ctx.interactionId).toBe('ix-1');
    expect(payload.ctx.sessionId).toBe('sess-42');
    expect(payload.expects).toBe('score');
    // Explicitly NOT part of the wire payload.
    expect(payload).not.toHaveProperty('module');
    expect(payload).not.toHaveProperty('activityRef');
    expect(payload).not.toHaveProperty('enrollmentId');
    expect(payload).not.toHaveProperty('returnUrl');
  });

  it('returns the msp token string from the response body', async () => {
    const client = clientOk('server.issued.jwt.2');
    const token = await mintTokenViaBackend(
      USER_ID,
      baseInput(),
      client,
      RETURN_URL,
    );
    expect(token).toBe('server.issued.jwt.2');
  });

  it('caches by interactionId — second call with the same interactionId does not re-mint', async () => {
    const client = clientOk('server.issued.jwt.3');
    const first = await mintTokenViaBackend(
      USER_ID,
      baseInput(),
      client,
      RETURN_URL,
    );
    const second = await mintTokenViaBackend(
      USER_ID,
      baseInput(),
      client,
      RETURN_URL,
    );
    expect(second).toBe(first);
    expect(client.postMspToken).toHaveBeenCalledTimes(1);
  });

  it('cache miss re-mints when the cached record has expired', async () => {
    // Seed an already-expired record.
    const stale: MspTokenRecord = {
      token: 'stale.jwt',
      iat: 0,
      exp: 0,
      claims: {
        ctx: { interactionId: 'ix-1' },
        expects: 'completion',
        exp: 0,
      },
    };
    writeCachedTokenForInteraction(USER_ID, 'ix-1', stale);
    // The store's TTL prune drops stale on read.
    expect(readCachedTokenForInteraction(USER_ID, 'ix-1')).toBeUndefined();

    const client = clientOk('fresh.jwt');
    const token = await mintTokenViaBackend(
      USER_ID,
      baseInput(),
      client,
      RETURN_URL,
    );
    expect(token).toBe('fresh.jwt');
    expect(client.postMspToken).toHaveBeenCalledTimes(1);
  });

  it('writes the cache with local context (module, activityRef, enrollmentId)', async () => {
    await mintTokenViaBackend(
      USER_ID,
      baseInput(),
      clientOk('cached.jwt'),
      RETURN_URL,
    );
    const cached = readCachedTokenForInteraction(USER_ID, 'ix-1');
    expect(cached?.token).toBe('cached.jwt');
    expect(cached?.claims.module).toBe('learn');
    expect(cached?.claims.activityRef).toBe('lesson-1');
    expect(cached?.claims.ctx.enrollmentId).toBe('enr-1');
    expect(cached?.claims.return).toBe(RETURN_URL);
  });

  it('accepts both { data: body } (axios) and raw body (fetch) response shapes', async () => {
    const axiosLike: MspTokenMintClient = {
      postMspToken: vi.fn(async () => ({ data: { msp: 'axios.jwt' } })),
    };
    const t1 = await mintTokenViaBackend(
      'user-a',
      baseInput(),
      axiosLike,
      RETURN_URL,
    );
    expect(t1).toBe('axios.jwt');

    const fetchLike: MspTokenMintClient = {
      postMspToken: vi.fn(async () => ({ msp: 'fetch.jwt' })),
    };
    const t2 = await mintTokenViaBackend(
      'user-b',
      baseInput(),
      fetchLike,
      RETURN_URL,
    );
    expect(t2).toBe('fetch.jwt');
  });
});
