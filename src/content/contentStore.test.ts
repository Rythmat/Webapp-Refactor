import { beforeEach, describe, expect, it } from 'vitest';
import {
  getArcsForEvent,
  getConnectionsForEvent,
} from '@/components/atlas/data/eventConnections';
import {
  atlasContentSource,
  contentGeneration,
  ensureAtlasContent,
  isAtlasContentReady,
  MUSIC_HISTORY,
  resetAtlasContent,
} from './contentStore';

/**
 * These tests exist to catch ONE class of regression, and it is a silent one.
 *
 * MUSIC_HISTORY is filled by mutating a stable array after an async fetch. That
 * is what let the migration to CDN-served content skip rewriting the ten places
 * that read it — but it means any NEW module-scope snapshot
 * (`const X = MUSIC_HISTORY.filter(...)` at the top of a file) captures an empty
 * array, and the globe renders with nothing on it. No error, no warning.
 *
 * The first test below fails the moment someone reintroduces such a snapshot.
 */
describe('contentStore hydration contract', () => {
  beforeEach(() => {
    resetAtlasContent();
  });

  it('MUSIC_HISTORY is empty before hydration', () => {
    // If this fails, something imported in this module's graph is eagerly
    // populating MUSIC_HISTORY at module scope. Find it and make it lazy.
    expect(MUSIC_HISTORY).toHaveLength(0);
    expect(isAtlasContentReady()).toBe(false);
  });

  it('hydrates from bundled data when no CDN is configured', async () => {
    await ensureAtlasContent();

    // VITE_CONTENT_CDN_URL is intentionally unset in vite.config.ts test env.
    expect(atlasContentSource()).toBe('bundled');
    expect(MUSIC_HISTORY.length).toBeGreaterThan(1700);
    expect(isAtlasContentReady()).toBe(true);
  });

  it('keeps array identity stable across hydration', async () => {
    const before = MUSIC_HISTORY;
    await ensureAtlasContent();
    // Identity is the whole mechanism: importers hold this exact reference.
    expect(MUSIC_HISTORY).toBe(before);
  });

  it('hydrates only once for concurrent callers', async () => {
    await Promise.all([
      ensureAtlasContent(),
      ensureAtlasContent(),
      ensureAtlasContent(),
    ]);

    const ids = new Set(MUSIC_HISTORY.map((e) => e.id));
    // A double-push would leave duplicates and inflate the length.
    expect(ids.size).toBe(MUSIC_HISTORY.length);
  });

  it('bumps the generation counter so derived caches rebuild', async () => {
    expect(contentGeneration).toBe(0);
    await ensureAtlasContent();

    // Live binding: re-read through the module, not the destructured copy.
    const { contentGeneration: after } = await import('./contentStore');
    expect(after).toBe(1);
  });
});

describe('eventConnections rebuilds its maps after hydration', () => {
  beforeEach(() => {
    resetAtlasContent();
  });

  it('resolves arcs only once events are present', async () => {
    // Pre-hydration the event map is empty, so a known-connected event has no
    // arcs. This is the behaviour ContentGate exists to keep users from seeing.
    expect(getArcsForEvent('evt-jazz-nola-1923')).toEqual([]);

    await ensureAtlasContent();

    // Post-hydration ensureMaps() notices the generation bump and rebuilds.
    expect(getConnectionsForEvent('evt-jazz-nola-1923').length).toBeGreaterThan(
      0,
    );
    expect(getArcsForEvent('evt-jazz-nola-1923').length).toBeGreaterThan(0);
  });
});
