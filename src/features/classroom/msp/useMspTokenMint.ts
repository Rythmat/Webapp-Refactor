/**
 * useMspTokenMint — mints an MSP token via the real backend endpoint
 * `POST ${VITE_MUSIC_ATLAS_API_URL}/msp/token`, with per-interactionId
 * caching so opening the same interaction twice reuses a single mint.
 *
 * Field mapping between the frontend input (which still carries `module` +
 * `activityRef` for URL construction and `enrollmentId` for local scoping)
 * and the backend payload:
 *   - `enrollmentId` → payload's `student`
 *   - computed `${origin}/msp/return` → payload's `return`
 *   - `module` + `activityRef` are NOT sent (backend doesn't need them; the
 *     frontend uses them to build the Atlas module URL via
 *     `resolveMspModuleBaseUrl(module)`).
 *
 * The actual mint work lives in the pure `mintTokenViaBackend` function
 * so it can be tested without a React render harness.
 */
import { useCallback } from 'react';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import type {
  PostMspTokenData,
  PostMspTokenPayload,
} from '@/contexts/MusicAtlasContext/musicAtlas.generated';
import { useMe } from '@/hooks/data';
import {
  nowSec,
  readCachedTokenForInteraction,
  writeCachedTokenForInteraction,
  type MintTokenInput,
  type MspClaims,
  type MspTokenRecord,
} from './mspTokenStore';

/** Local TTL — matches the backend's 30 min token lifetime. */
const TOKEN_TTL_SECS = 30 * 60;

const isBrowser = typeof window !== 'undefined';

const defaultReturnUrl = (): string =>
  isBrowser
    ? `${window.location.origin}/msp/return`
    : 'https://musicatlas.io/msp/return';

/**
 * The backend-mint contract used by `useMspTokenMint`. Structural, so
 * tests can pass a plain vitest-mock without touching the axios-based
 * generated client.
 */
export interface MspTokenMintClient {
  postMspToken: (
    data: PostMspTokenPayload,
  ) => Promise<{ data: PostMspTokenData } | PostMspTokenData>;
}

/**
 * Pure mint helper — cache-first, HTTP on miss, writes back to cache.
 * Accepts a structural `client` so it's testable without React or axios.
 */
export const mintTokenViaBackend = async (
  userId: string | null,
  input: MintTokenInput,
  client: MspTokenMintClient,
  returnUrl: string,
): Promise<string> => {
  const cached = readCachedTokenForInteraction(userId, input.interactionId);
  if (cached) return cached.token;

  const response = await client.postMspToken({
    ctx: {
      interactionId: input.interactionId,
      sessionId: input.sessionId,
      assignmentId: input.assignmentId,
    },
    expects: input.expects,
    return: returnUrl,
    student: input.enrollmentId,
  });
  // The generated axios client returns AxiosResponse-like {data}; a raw
  // fetch/mocked client may return the body directly. Handle both.
  const body: PostMspTokenData =
    response && typeof response === 'object' && 'data' in response
      ? (response.data as PostMspTokenData)
      : (response as PostMspTokenData);
  const token = body.msp;

  const iat = nowSec();
  const exp = iat + TOKEN_TTL_SECS;
  const claims: MspClaims = {
    sub: userId ?? undefined,
    ctx: {
      interactionId: input.interactionId,
      enrollmentId: input.enrollmentId,
      sessionId: input.sessionId,
      assignmentId: input.assignmentId,
    },
    module: input.module,
    activityRef: input.activityRef,
    expects: input.expects,
    return: returnUrl,
    exp,
  };
  const record: MspTokenRecord = { token, iat, exp, claims };
  writeCachedTokenForInteraction(userId, input.interactionId, record);
  return token;
};

export interface UseMspTokenMint {
  mintToken: (input: MintTokenInput) => Promise<string>;
}

export const useMspTokenMint = (): UseMspTokenMint => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const musicAtlas = useMusicAtlas();

  const mintToken = useCallback(
    (input: MintTokenInput) =>
      mintTokenViaBackend(userId, input, musicAtlas.msp, defaultReturnUrl()),
    [musicAtlas, userId],
  );

  return { mintToken };
};
