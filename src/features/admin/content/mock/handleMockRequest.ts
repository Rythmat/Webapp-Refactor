import {
  isAtlasContentReady,
  refreshAtlasContent,
} from '@/content/contentStore';
import { isFlowContentReady, refreshFlowContent } from '@/content/flowStore';
import { resetManifestCache } from '@/content/manifest';
import { isSongContentReady, refreshSongContent } from '@/content/songStore';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeed,
  type MockSuggestionSources,
  type MockViewer,
} from './contentMockServer';
import { jsonResponse, serveContentRequest } from './mockHttp';
import { CONTENT_MOCK_MODE, MOCK_CDN_URL } from './mockSwitch';
import { createMockPersistence, type MockPersistence } from './persist';
import { loadSeed, loadSuggestionSeed } from './seed';

/**
 * The browser side of the offline mock: turns the app's fetches into calls on
 * the pure server, keeps it saved, and plays the CDN for the content stores.
 *
 * Only ever loaded through a dynamic import behind `CONTENT_MOCK`
 * (useAdminContent.ts, useAdminAssetUpload.ts, manifest.ts), so a production
 * build never contains it.
 */

interface Runtime {
  seed: MockSeed;
  suggestions: MockSuggestionSources;
  server: ContentMockServer;
  persistence: MockPersistence;
  unsubscribe: () => void;
}

let runtime: Promise<Runtime> | null = null;

const browserStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const startServer = (
  seed: MockSeed,
  suggestions: MockSuggestionSources,
): Runtime => {
  const server = createContentMockServer({
    seed,
    mode: CONTENT_MOCK_MODE,
    suggestions,
  });
  const persistence = createMockPersistence({
    server,
    storage: browserStorage(),
  });
  persistence.load();
  const unsubscribe = server.subscribe(() => persistence.schedule());
  // After the saved changes, the committed decisions: whatever the saved
  // state lost (a seed change made its patches stale, or a Reset) is written
  // again, and saved like any other change (decisions.ts, design §5.3).
  server.replayCommittedDecisions();
  return { seed, suggestions, server, persistence, unsubscribe };
};

const getRuntime = (): Promise<Runtime> => {
  runtime ??= Promise.all([
    loadSeed(CONTENT_MOCK_MODE),
    loadSuggestionSeed(CONTENT_MOCK_MODE),
  ]).then(([seed, suggestions]) => {
    const started = startServer(seed, suggestions);
    if (typeof window !== 'undefined') {
      // A debounced save still pending when the tab closes would be lost.
      window.addEventListener('pagehide', () => {
        void runtime?.then((current) => current.persistence.flush());
      });
    }
    return started;
  });
  // A failed seed load must not stick; the next request tries again.
  runtime.catch(() => {
    runtime = null;
  });
  return runtime;
};

/** For tests and the console's dev tools: the live server. */
export const getContentMockServer = async () => (await getRuntime()).server;

interface Store {
  ready: () => boolean;
  refresh: () => Promise<void>;
}

const SONGS_STORE: Store = {
  ready: isSongContentReady,
  refresh: refreshSongContent,
};
const ATLAS_STORE: Store = {
  ready: isAtlasContentReady,
  refresh: refreshAtlasContent,
};
// Both flow kinds live in one store: one refresh covers either.
const FLOW_STORE: Store = {
  ready: isFlowContentReady,
  refresh: refreshFlowContent,
};

const STORE_FOR_KIND: Record<string, Store> = {
  song: SONGS_STORE,
  globe_event: ATLAS_STORE,
  activity_flow: FLOW_STORE,
  fundamentals_flow: FLOW_STORE,
};

/**
 * After a publish or a rollback, what the app reads has changed. Drop the
 * memoised manifest and rehydrate the stores that had loaded, so the mirror
 * and the app show the new release without a reload. Stores that never
 * loaded are left alone rather than loaded for nothing.
 *
 * Each store refreshes in place (`refresh…Content`): it swaps the new
 * release in and raises its generation, so the caches built from it — the
 * globe's connections, the artist index, search, the influence panel —
 * rebuild on their next read.
 */
export const refreshPublishedContent = async (kinds: string[]) => {
  resetManifestCache();
  const stores = new Set(
    kinds.map((kind) => STORE_FOR_KIND[kind]).filter(Boolean),
  );
  await Promise.all(
    [...stores].map((store) =>
      store.ready() ? store.refresh() : Promise.resolve(),
    ),
  );
};

/**
 * The mock's `fetch` for /api/admin/content/*: same URL, same init, and a
 * Response shaped like the real API's. The caller is whoever the request's
 * bearer token says (mockHttp.ts); `viewer` overrides that, for tests.
 */
export async function handleMockRequest(
  url: string,
  init?: RequestInit,
  viewer?: MockViewer,
): Promise<Response> {
  const { server } = await getRuntime();
  const served = serveContentRequest(server, url, init, viewer);
  if (served.published) await refreshPublishedContent([served.published]);
  return served.response;
}

/** The mock CDN: `mock://cdn/content/manifest.json` and the bundle objects. */
export async function handleMockCdnRequest(url: string): Promise<Response> {
  const { server } = await getRuntime();
  const key = url.slice((MOCK_CDN_URL ?? '').length).replace(/^\/+/, '');
  if (key === 'content/manifest.json')
    return jsonResponse(200, server.cdnManifest());
  const text = server.cdnObjectText(key);
  if (text === null) return jsonResponse(404, { error: `No object "${key}".` });
  return new Response(text, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Throw away every change and start again from the seed. For the mirror
 * bar's "Reset mock" button; the caller should also invalidate its content
 * queries.
 */
export async function resetContentMock(): Promise<void> {
  const current = await getRuntime();
  current.unsubscribe();
  current.persistence.dispose();
  current.persistence.reset();
  const fresh = startServer(current.seed, current.suggestions);
  runtime = Promise.resolve(fresh);
  await refreshPublishedContent(Object.keys(STORE_FOR_KIND));
}
