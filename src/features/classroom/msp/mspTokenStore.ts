/**
 * mspTokenStore — local cache for MSP tokens minted via
 * `POST ${VITE_MUSIC_ATLAS_API_URL}/msp/token`. The token itself is opaque
 * (server-signed HS256 JWT) and NEVER decoded client-side; the cache is
 * keyed by `interactionId` so opening the same interaction twice reuses one
 * mint. Cache also carries the input-side context (module, activityRef,
 * enrollmentId, etc.) so consumers that need to reason about a token
 * without a fresh input can look it up.
 *
 * Entries auto-prune on read once `exp` is in the past. TTL matches the
 * backend's 30 min token lifetime.
 */
import type { AtlasExpects, AtlasModule } from './capabilities';

export const STORAGE_KEY = 'ma-teacher:msp-tokens:v1';
export const SCHEMA_VERSION = 1;

/**
 * Local echo of a mint request + the server-issued token. The server's real
 * JWT claims live inside `token` and are opaque to the client. Everything
 * here except `expects` / `ctx.interactionId` is optional because we may
 * cache tokens we didn't mint (edge case) — the fields are just bookkeeping
 * for consumers that want extra context without re-mint.
 */
export interface MspClaims {
  sub?: string;
  ctx: {
    interactionId: string;
    enrollmentId?: string;
    sessionId?: string;
    assignmentId?: string;
  };
  module?: AtlasModule;
  activityRef?: string;
  expects: AtlasExpects;
  /** Return URL passed to the backend. Corresponds to the payload's `return` field. */
  return?: string;
  /** Local expiry estimate (unix-seconds) — server-authoritative window is inside the JWT. */
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

export const nowSec = (): number => Math.floor(Date.now() / 1000);

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

/**
 * Look up a cached mint record by interactionId. Returns undefined if none
 * or if the cached record is past its local TTL (the read prunes automatically).
 */
export const readCachedTokenForInteraction = (
  userId: string | null,
  interactionId: string,
): MspTokenRecord | undefined => {
  const store = readStore(userId);
  return store.tokens[interactionId];
};

/**
 * Cache a freshly-minted token record keyed by `interactionId`. Overwrites
 * any existing entry (per-interaction upsert). No-op on non-browser.
 */
export const writeCachedTokenForInteraction = (
  userId: string | null,
  interactionId: string,
  record: MspTokenRecord,
): void => {
  const current = readStore(userId);
  const next: MspTokenStore = {
    ...current,
    tokens: { ...current.tokens, [interactionId]: record },
  };
  writeStore(userId, next);
};

export const readMspTokenStoreForUser = (
  userId: string | null,
): MspTokenStore => readStore(userId);
