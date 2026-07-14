/**
 * mspTokenStore — pure store for MSP tokens minted client-side while Ryan's
 * real /msp/token endpoint is pending. Ryan swaps mintTokenForUser to a POST
 * in Sprint 5; the store becomes a dedup cache and this file's public
 * signature is unchanged.
 */
import type { AtlasExpects, AtlasModule } from './capabilities';

export const STORAGE_KEY = 'ma-teacher:msp-tokens:v1';
export const SCHEMA_VERSION = 1;

export interface MspClaims {
  sub: string;
  ctx: {
    interactionId: string;
    enrollmentId: string;
    sessionId?: string;
    assignmentId?: string;
  };
  module: AtlasModule;
  activityRef: string;
  expects: AtlasExpects;
  returnUrl: string;
  exp: number;
}

export interface MspTokenRecord {
  token: string;
  iat: number;
  exp: number;
  claims: MspClaims;
}

export interface MspTokenStore {
  schemaVersion: number;
  tokens: Record<string, MspTokenRecord>;
}

const EMPTY_STORE: MspTokenStore = {
  schemaVersion: SCHEMA_VERSION,
  tokens: {},
};

const isBrowser = typeof window !== 'undefined';

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

const base64url = (input: string): string => {
  if (typeof btoa === 'undefined') return input;
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const nowSec = (): number => Math.floor(Date.now() / 1000);

const readStore = (userId: string | null | undefined): MspTokenStore => {
  if (!isBrowser) return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as MspTokenStore;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(`${keyFor(userId)}.bak`, raw);
      return EMPTY_STORE;
    }
    const tokens: Record<string, MspTokenRecord> = {};
    const now = nowSec();
    for (const [id, rec] of Object.entries(parsed.tokens ?? {})) {
      if (rec.exp > now) tokens[id] = rec;
    }
    return { schemaVersion: SCHEMA_VERSION, tokens };
  } catch {
    return EMPTY_STORE;
  }
};

const writeStore = (
  userId: string | null | undefined,
  store: MspTokenStore,
): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(store));
    window.dispatchEvent(new Event(`${keyFor(userId)}:changed`));
  } catch {
    // No-op on quota / privacy mode.
  }
};

export interface MintTokenInput {
  interactionId: string;
  enrollmentId: string;
  module: AtlasModule;
  activityRef: string;
  expects: AtlasExpects;
  sessionId?: string;
  assignmentId?: string;
}

export interface MintTokenResult {
  token: string;
  claims: MspClaims;
}

export const mintTokenForUser = (
  userId: string | null,
  input: MintTokenInput,
): MintTokenResult => {
  const iat = nowSec();
  const exp = iat + 300;
  const returnUrl = isBrowser
    ? `${window.location.origin}/msp/return`
    : 'https://musicatlas.io/msp/return';
  const claims: MspClaims = {
    sub: userId ?? 'anon',
    ctx: {
      interactionId: input.interactionId,
      enrollmentId: input.enrollmentId,
      sessionId: input.sessionId,
      assignmentId: input.assignmentId,
    },
    module: input.module,
    activityRef: input.activityRef,
    expects: input.expects,
    returnUrl,
    exp,
  };
  const header = base64url(JSON.stringify({ alg: 'MOCK', typ: 'JWT' }));
  const body = base64url(JSON.stringify(claims));
  const token = `${header}.${body}.mock`;
  const record: MspTokenRecord = { token, iat, exp, claims };
  const current = readStore(userId);
  const next: MspTokenStore = {
    ...current,
    tokens: { ...current.tokens, [input.interactionId]: record },
  };
  writeStore(userId, next);
  return { token, claims };
};

export const readMspTokenStoreForUser = (
  userId: string | null,
): MspTokenStore => readStore(userId);

export const readMspClaimsForUser = (
  userId: string | null,
  token: string,
): MspClaims | undefined => {
  const store = readStore(userId);
  for (const rec of Object.values(store.tokens)) {
    if (rec.token === token) return rec.claims;
  }
  return undefined;
};

/** Decode base64url body of a mock token — no signature verification. */
export const decodeMockMspToken = (token: string): MspClaims | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const body = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    if (typeof atob === 'undefined') return null;
    return JSON.parse(atob(body)) as MspClaims;
  } catch {
    return null;
  }
};
