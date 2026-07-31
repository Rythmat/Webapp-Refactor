import { Env } from '@/constants/env';

/**
 * Client for the published content bundles on the CDN.
 *
 * Bundles are compiled from the admin console's Postgres authoring store and
 * uploaded under immutable versioned keys; `manifest.json` is the only mutable
 * object and points at the current version of each kind. That asymmetry is what
 * lets an admin roll back by rewriting one small file, and it is why bundle
 * responses can be cached forever while the manifest is cached for 60s.
 */

export type BundleObject = { key: string; bytes: number; sha256: string };

export type ContentManifest = {
  schemaVersion: 1;
  generatedAt: string;
  kinds: Partial<
    Record<
      string,
      {
        version: number;
        itemCount: number;
        objects: BundleObject[];
        publishedAt: string | null;
      }
    >
  >;
};

/** Absent in local dev and in tests, which is the signal to use bundled data. */
export const contentCdnUrl = (): string | undefined =>
  Env.get('VITE_CONTENT_CDN_URL', { nullable: true });

export const isContentCdnEnabled = (): boolean => Boolean(contentCdnUrl());

let manifestPromise: Promise<ContentManifest> | null = null;

export const fetchManifest = (): Promise<ContentManifest> => {
  manifestPromise ??= (async () => {
    const base = contentCdnUrl();
    if (!base) throw new Error('VITE_CONTENT_CDN_URL is not set');

    const response = await fetch(`${base}/content/manifest.json`, {
      // The manifest carries its own short max-age; let the HTTP cache honour
      // it rather than forcing a revalidation on every page load.
      credentials: 'omit',
    });
    if (!response.ok) {
      throw new Error(`Content manifest fetch failed: ${response.status}`);
    }

    const manifest = (await response.json()) as ContentManifest;
    if (manifest.schemaVersion !== 1) {
      throw new Error(
        `Unsupported content manifest schemaVersion ${manifest.schemaVersion}`,
      );
    }
    return manifest;
  })();

  // A failed manifest fetch must not poison every later attempt, or a single
  // blip would keep the app on bundled data until a reload.
  manifestPromise.catch(() => {
    manifestPromise = null;
  });

  return manifestPromise;
};

/**
 * Read a bundle object, preferring the Cache Storage copy.
 *
 * Correctness here is free: object keys embed the version and are never
 * rewritten, so a cache hit can never be stale and there is no invalidation
 * logic to get wrong. The practical payoff is that repeat loads — including
 * offline ones, which the classroom live-session flow depends on — skip the
 * network entirely.
 */
const CACHE_NAME = 'ma-content-v1';

const fetchObject = async (base: string, key: string): Promise<unknown> => {
  const url = `${base}/${key}`;

  const cache =
    typeof caches !== 'undefined'
      ? await caches.open(CACHE_NAME).catch(() => null)
      : null;

  if (cache) {
    const hit = await cache.match(url).catch(() => undefined);
    if (hit) return hit.json();
  }

  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Content bundle fetch failed (${key}): ${response.status}`);
  }

  if (cache) {
    // Store a clone before reading the body, and never let a quota failure
    // break the load.
    cache.put(url, response.clone()).catch(() => undefined);
  }

  return response.json();
};

/**
 * Fetch every shard of a kind and concatenate them in manifest order.
 *
 * Shards are independent JSON arrays, so they are fetched in parallel; the
 * manifest's object order defines the final sequence.
 */
export const fetchBundle = async <T>(kindSlug: string): Promise<T[]> => {
  const base = contentCdnUrl();
  if (!base) throw new Error('VITE_CONTENT_CDN_URL is not set');

  const manifest = await fetchManifest();
  const entry = manifest.kinds[kindSlug];
  if (!entry || entry.objects.length === 0) {
    throw new Error(`No published content for "${kindSlug}"`);
  }

  const parts = await Promise.all(
    entry.objects.map(
      (object) => fetchObject(base, object.key) as Promise<T[]>,
    ),
  );

  return parts.flat();
};

/** Test seam — drops the memoised manifest. */
export const resetManifestCache = () => {
  manifestPromise = null;
};
