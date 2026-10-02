import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import SLUG_PATTERNS from '@/scripts/apiContract/slugPatterns.generated.json';
import {
  CONTENT_KEY,
  ContentApiError,
  contentRequest,
  noteServerArtifactsVersion,
  type ContentKind,
  type ContentOverviewRow,
  type LegacyContentKind,
} from './useAdminContent';

/**
 * What the content API serves, so the console turns on only that.
 *
 * `GET /capabilities` (docs/console-content-api-contract.md, priority 2) is
 * the source. A server without it answers 404, and the console falls back to
 * the kinds its `/overview` lists, with song at schema level 0, every feature
 * off and nothing authoritative. If `/overview` fails too, it assumes the six
 * kinds the console has always had.
 */

export type ContentFeature =
  | 'export'
  | 'lookup'
  | 'create'
  | 'rename'
  | 'merge'
  | 'asset'
  | 'teachUsage'
  /**
   * `GET /suggestions` and `POST /suggestions/decisions` (contract §10):
   * suggested facts to review, and the decisions log. Off until the API has
   * them; the offline mock serves them in its `all` mode.
   */
  | 'suggestions';

export interface CapabilityKind {
  kind: ContentKind;
  schemaVersion: number;
  /** Its bundle in the CDN manifest; null when it is not published there. */
  bundle: string | null;
  /** Which body field is the slug. */
  identity: 'id' | 'slug';
  /** The store holds the whole set, so no code registry is merged in. */
  authoritative: boolean;
}

/**
 * Where saves land. `api`: the content API (or the offline mock standing
 * in for it). `repo`: the dev repo content server, which writes each save
 * into the repo's data files on this machine; git is the review, and
 * commit plus deploy is the publish. Read from `/capabilities`' `store`, a
 * field only the repo server sends (it is not in the contract).
 */
export type ContentStore = 'api' | 'repo';

export interface ContentCapabilities {
  kinds: CapabilityKind[];
  features: Record<ContentFeature, boolean>;
  artifactsVersion: number | null;
  /** Where this came from, for the console to say so. */
  source: 'capabilities' | 'overview' | 'legacy';
  /** Where saves land; `api` unless the server says otherwise. */
  store: ContentStore;
}

export const LEGACY_KINDS: readonly LegacyContentKind[] = [
  'activity_flow',
  'fundamentals_flow',
  'song',
  'globe_event',
  'artist_location',
  'globe_city',
];

/** Today's bundles, matching what the app fetches. */
const LEGACY_BUNDLES: Partial<Record<ContentKind, string>> = {
  song: 'songs',
  globe_event: 'globe-events',
  activity_flow: 'lessons',
  fundamentals_flow: 'fundamentals',
};

const NO_FEATURES: Record<ContentFeature, boolean> = {
  export: false,
  lookup: false,
  create: false,
  rename: false,
  merge: false,
  asset: false,
  teachUsage: false,
  suggestions: false,
};

type SlugPatternRow = { identity: 'id' | 'slug' };

/** The contract fixes each kind's identity, whether or not it is served. */
export const contractIdentityOf = (kind: string): 'id' | 'slug' =>
  (SLUG_PATTERNS as Record<string, SlugPatternRow>)[kind]?.identity ?? 'id';

/** A kind as an older server implies it: level 0 for song, nothing authoritative. */
const impliedKind = (kind: ContentKind): CapabilityKind => ({
  kind,
  schemaVersion: kind === 'song' ? 0 : 1,
  bundle: LEGACY_BUNDLES[kind] ?? null,
  identity: contractIdentityOf(kind),
  authoritative: false,
});

export const LEGACY_CAPABILITIES: ContentCapabilities = {
  kinds: LEGACY_KINDS.map(impliedKind),
  features: NO_FEATURES,
  artifactsVersion: null,
  source: 'legacy',
  store: 'api',
};

/** Accept what a server sends without trusting its shape. */
const normalize = (raw: unknown): ContentCapabilities => {
  const value = (raw ?? {}) as {
    kinds?: unknown;
    features?: Record<string, unknown>;
    artifactsVersion?: unknown;
    store?: unknown;
  };
  const kinds = Array.isArray(value.kinds)
    ? value.kinds
        .filter(
          (entry): entry is Record<string, unknown> =>
            !!entry && typeof entry.kind === 'string',
        )
        .map(
          (entry): CapabilityKind => ({
            kind: entry.kind as ContentKind,
            schemaVersion:
              typeof entry.schemaVersion === 'number' ? entry.schemaVersion : 1,
            bundle: typeof entry.bundle === 'string' ? entry.bundle : null,
            identity:
              entry.identity === 'slug' || entry.identity === 'id'
                ? entry.identity
                : contractIdentityOf(entry.kind as string),
            authoritative: entry.authoritative === true,
          }),
        )
    : [];
  const features = { ...NO_FEATURES };
  for (const name of Object.keys(NO_FEATURES) as ContentFeature[])
    features[name] = value.features?.[name] === true;
  return {
    kinds,
    features,
    artifactsVersion:
      typeof value.artifactsVersion === 'number'
        ? value.artifactsVersion
        : null,
    source: 'capabilities',
    // Repo mode is a dev server's: a production build never takes a
    // server's word for it, so its console never switches into repo UI.
    store: import.meta.env.DEV && value.store === 'repo' ? 'repo' : 'api',
  };
};

/**
 * The capabilities query, outside React so it can be tested and reused. A
 * 404 means an older server; any other failure of `/capabilities` is a real
 * error and surfaces as one.
 */
export async function loadCapabilities(
  token: string,
): Promise<ContentCapabilities> {
  try {
    const capabilities = normalize(
      await contentRequest<unknown>('/capabilities', token),
    );
    noteServerArtifactsVersion(capabilities.artifactsVersion);
    return capabilities;
  } catch (caught) {
    if (!(caught instanceof ContentApiError && caught.status === 404))
      throw caught;
  }

  noteServerArtifactsVersion(null);
  try {
    const rows = await contentRequest<ContentOverviewRow[]>('/overview', token);
    if (!Array.isArray(rows) || rows.length === 0) return LEGACY_CAPABILITIES;
    return {
      kinds: rows.map((row) => impliedKind(row.kind)),
      features: NO_FEATURES,
      artifactsVersion: null,
      source: 'overview',
      store: 'api',
    };
  } catch {
    return LEGACY_CAPABILITIES;
  }
}

/** The helpers, over a capabilities object (null while it loads). */
export function capabilityHelpers(capabilities: ContentCapabilities | null) {
  const byKind = new Map(
    (capabilities?.kinds ?? []).map((entry) => [entry.kind as string, entry]),
  );
  return {
    /** Whether the server serves this kind; false while unknown. */
    isServed: (kind: string) => byKind.has(kind),
    /** Which body field is the slug: the server's word, else the contract's. */
    identityOf: (kind: string): 'id' | 'slug' =>
      byKind.get(kind)?.identity ?? contractIdentityOf(kind),
    isAuthoritative: (kind: string) => byKind.get(kind)?.authoritative === true,
    feature: (name: ContentFeature) => capabilities?.features[name] === true,
    /** The song schema level the server validates against; 0 when unknown. */
    songSchemaLevel: byKind.get('song')?.schemaVersion ?? 0,
    /**
     * A kind's body level (contract, priority 2): `globe_event` 2 is the
     * event body v2, `globe_city` 2 the place body, `artist` 2 the body with
     * `born`. 0 when not served.
     */
    schemaVersionOf: (kind: string) => byKind.get(kind)?.schemaVersion ?? 0,
    servedKinds: (capabilities?.kinds ?? []).map((entry) => entry.kind),
    /** Where saves land; `api` while unknown. */
    store: capabilities?.store ?? ('api' as ContentStore),
  };
}

export const useCapabilities = () => {
  const { token } = useAuthContext();
  const query = useQuery<ContentCapabilities>({
    queryKey: [...CONTENT_KEY, 'capabilities'],
    queryFn: () => loadCapabilities(token!),
    enabled: !!token,
    // What a server serves changes with a deploy, not while someone edits.
    staleTime: 5 * 60 * 1000,
  });

  // While loading nothing counts as served, so no link appears and then
  // vanishes. If /capabilities itself errors (not a 404), the six kinds every
  // version of the API has are the safe floor.
  const capabilities =
    query.data ?? (query.isError ? LEGACY_CAPABILITIES : null);
  const helpers = useMemo(
    () => capabilityHelpers(capabilities),
    [capabilities],
  );

  return { ...query, capabilities, ...helpers };
};
