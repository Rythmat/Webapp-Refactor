// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

/**
 * Repo mode's code and data stay out of the app a student downloads, and
 * out of the console's pages until something asks for them.
 *
 *  - `src/scripts/repoContent/**` is Node code: it reads and writes the
 *    repo's files with the TypeScript compiler and prettier. Only the dev
 *    server's plugin (through `ssrLoadModule`) and the bulk import (`npx
 *    tsx`) run it. No app module may import it, at any depth.
 *  - `src/content/data/*.json` holds the console's own records (artists'
 *    fields beyond the globe roster, releases, studios, labels and the
 *    places the globe draws no pin for), which will grow to megabytes with
 *    the import. Students never read them: the globe reads the roster and
 *    the cities, and the song page reads the songs. The console reads them
 *    through a dynamic import, inside the functions that need them (the
 *    mock's `loadSeed` and the graph's `loadRepoSnapshot`), so even a
 *    console page loads without them.
 *
 * Checking import lines cannot see a transitive import or a relative
 * spelling, so here each forbidden module throws the moment anything loads
 * it, whatever the path, as in table/__tests__/eagerBoundary.test.ts. A
 * dynamic `import()` inside a function is not loaded by loading its module,
 * which is exactly the difference this test holds. It runs in jsdom only
 * because App.tsx makes its browser router as it loads.
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`an app module loaded ${what}`);
  },
}));
// The repo store's core, each module by name (vi.mock is hoisted, so it
// cannot run in a loop). Whatever is added to the folder later imports
// these. The adapters' index (`sources/index.ts`) is left out on purpose: it
// only imports the adapters, by relative paths, so it is refused all the
// same, and the last test uses it to show that.
vi.mock('@/scripts/repoContent/literal', forbid('repo mode (literal.ts)'));
vi.mock('@/scripts/repoContent/tsWrite', forbid('repo mode (tsWrite.ts)'));
vi.mock('@/scripts/repoContent/jsonLines', forbid('repo mode (jsonLines.ts)'));
vi.mock('@/scripts/repoContent/repoStore', forbid('repo mode (repoStore.ts)'));
vi.mock('@/scripts/repoContent/repoHttp', forbid('repo mode (repoHttp.ts)'));
vi.mock('@/scripts/repoContent/gitStatus', forbid('repo mode (gitStatus.ts)'));
// The bulk import: its rules are pure, but they are the import's alone.
vi.mock(
  '@/scripts/repoContent/importRules',
  forbid('the bulk import (importRules.ts)'),
);
vi.mock(
  '@/scripts/repoContent/importAll',
  forbid('the bulk import (importAll.ts)'),
);
vi.mock('@/scripts/repoContent/sources/common', forbid('repo mode (sources)'));
vi.mock('@/scripts/repoContent/sources/songs', forbid('repo mode (sources)'));
vi.mock('@/scripts/repoContent/sources/events', forbid('repo mode (sources)'));
vi.mock('@/scripts/repoContent/sources/places', forbid('repo mode (sources)'));
vi.mock('@/scripts/repoContent/sources/artists', forbid('repo mode (sources)'));
vi.mock(
  '@/scripts/repoContent/sources/progressions',
  forbid('repo mode (sources)'),
);
vi.mock('@/scripts/repoContent/sources/records', forbid('repo mode (sources)'));
vi.mock(
  '@/scripts/repoContent/sources/artistLocations',
  forbid('repo mode (sources)'),
);
vi.mock(
  '@/scripts/repoContent/sources/vocabulary',
  forbid('repo mode (sources)'),
);
// What the writer runs on, which nothing in the app needs.
vi.mock('typescript', forbid('the TypeScript compiler'));
vi.mock('prettier', forbid('prettier'));
// The console's record files.
vi.mock('@/content/data/artists.json', forbid('artists.json'));
vi.mock('@/content/data/releases.json', forbid('releases.json'));
vi.mock('@/content/data/studios.json', forbid('studios.json'));
vi.mock('@/content/data/labels.json', forbid('labels.json'));
vi.mock('@/content/data/places.json', forbid('places.json'));

/**
 * The first import transforms most of the app (App.tsx alone reaches every
 * route's eager code), well past vitest's 5 s default when the whole suite
 * runs in parallel.
 */
const IMPORT_TIMEOUT = 120_000;

/** The app's entry, and what a student opens: the globe and the songs. */
const STUDENT: Record<string, () => Promise<unknown>> = {
  App: () => import('@/App'),
  'the globe (atlas.tsx)': () => import('@/components/atlas/atlas'),
  'the globe’s events': () => import('@/components/atlas/data/events'),
  'the globe’s cities': () => import('@/components/atlas/data/cities'),
  'the globe’s artists': () => import('@/components/atlas/data/artists'),
  'the content store': () => import('@/content/contentStore'),
  'the song store': () => import('@/content/songStore'),
  'the bundled songs': () => import('@/curriculum/data/songs/bundled'),
  SongDetailPage: () => import('@/components/songLibrary/SongDetailPage'),
  SongLibraryPage: () => import('@/components/songLibrary/SongLibraryPage'),
};

/**
 * The console's lazy pages (AdminPages.tsx's `lazy()` routes that show
 * content), and the two modules that read the record files, which must
 * read them only when called.
 */
const CONSOLE: Record<string, () => Promise<unknown>> = {
  AdminContentListPage: () =>
    import('@/features/admin/content/AdminContentListPage'),
  AdminContentEditPage: () =>
    import('@/features/admin/content/AdminContentEditPage'),
  AdminVocabularyPage: () =>
    import('@/features/admin/content/AdminVocabularyPage'),
  AdminSongImportPage: () =>
    import('@/features/admin/content/songImport/AdminSongImportPage'),
  MindMapPage: () => import('@/features/admin/content/graph/MindMapPage'),
  IntegrityPage: () => import('@/features/admin/content/graph/IntegrityPage'),
  LegacyLinkPage: () => import('@/features/admin/content/graph/LegacyLinkPage'),
  ConsoleMirrorShell: () =>
    import('@/features/admin/content/mirror/ConsoleMirrorShell'),
  TableLayout: () => import('@/features/admin/table/TableLayout'),
  TablePage: () => import('@/features/admin/table/TablePage'),
  PublishingLayout: () =>
    import('@/features/admin/content/publishing/PublishingLayout'),
  PublishingOverview: () =>
    import('@/features/admin/content/publishing/PublishingOverview'),
  'the repo snapshot (graph/repoSnapshot.ts)': () =>
    import('@/features/admin/content/graph/repoSnapshot'),
  'the mock’s seed (mock/seed.ts)': () =>
    import('@/features/admin/content/mock/seed'),
  // Repo mode's console side: it fetches the dev server, and never loads
  // the server's code.
  'the repo routes’ hooks (useRepoContent.ts)': () =>
    import('@/hooks/data/admin/useRepoContent'),
  'the repo reload listener (repo/useRepoContentSync.ts)': () =>
    import('@/features/admin/content/repo/useRepoContentSync'),
  'the roster toggle (repo/RosterToggle.tsx)': () =>
    import('@/features/admin/content/repo/RosterToggle'),
  'Commit and deploy (publishing/RepoCommitSection.tsx)': () =>
    import('@/features/admin/content/publishing/RepoCommitSection'),
};

describe('repo mode’s code and the console’s record files', () => {
  it.each(Object.keys(STUDENT))(
    'are not loaded by %s',
    async (name) => {
      await expect(STUDENT[name]()).resolves.toBeDefined();
    },
    IMPORT_TIMEOUT,
  );

  it.each(Object.keys(CONSOLE))(
    'are not loaded by the console’s %s until it asks for them',
    async (name) => {
      await expect(CONSOLE[name]()).resolves.toBeDefined();
    },
    IMPORT_TIMEOUT,
  );

  it('would notice if one did', async () => {
    // The guard itself: a forbidden module really does refuse to load
    // (vitest wraps the factory's error in its own mocking message).
    await expect(import('@/scripts/repoContent/repoStore')).rejects.toThrow();
    await expect(import('@/scripts/repoContent/repoHttp')).rejects.toThrow();
    await expect(import('@/scripts/repoContent/importRules')).rejects.toThrow();
    await expect(import('@/scripts/repoContent/importAll')).rejects.toThrow();
    await expect(import('@/content/data/studios.json')).rejects.toThrow();
    await expect(import('prettier')).rejects.toThrow();
    // And one import away, by relative paths: the adapters' index imports
    // `./artistLocations` and the rest, and is refused by their own guards,
    // not some other failure on the way.
    await expect(
      import('@/scripts/repoContent/sources'),
    ).rejects.toHaveProperty(
      'cause.message',
      'an app module loaded repo mode (sources)',
    );
  });
});
