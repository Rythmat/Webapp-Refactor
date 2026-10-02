import { describe, expect, it } from 'vitest';
import * as AppRoutes from '@/constants/routes';
import {
  AdminRoutes,
  AtlasRoutes,
  ClassroomRoutes,
  CurriculumRoutes,
  GameRoutes,
  LearnRoutes,
  OfficeRoutes,
  ProfileRoutes,
  SearchRoutes,
  SongRoutes,
  StudioRoutes,
} from '@/constants/routes';
import {
  consoleAppPath,
  isMirroredPrefix,
  LEGACY_KIND_SEGMENTS,
  MIRROR_BASE,
  MIRRORED_PREFIXES,
  RESERVED_CONSOLE_SEGMENTS,
  segmentForKind,
  toAppLocation,
  toAppPathname,
  toConsolePath,
} from '../mirrorPaths';

describe('translating between app and console paths', () => {
  it('prefixes an app path, keeping its search and hash', () => {
    expect(toConsolePath('/songs/africa')).toBe(
      '/console/content/songs/africa',
    );
    expect(toConsolePath('/learn?tab=Theory#x')).toBe(
      '/console/content/learn?tab=Theory#x',
    );
  });

  it('leaves console paths and non-paths alone', () => {
    expect(toConsolePath('/console/users')).toBe('/console/users');
    expect(toConsolePath('/console')).toBe('/console');
    expect(toConsolePath('https://example.com')).toBe('https://example.com');
  });

  it('sends the app root to Home', () => {
    expect(toConsolePath('/')).toBe('/console/content/home');
  });

  it('reads the app path back out, but not from a console page', () => {
    expect(toAppPathname('/console/content/songs/africa')).toBe(
      '/songs/africa',
    );
    expect(toAppPathname('/console/content')).toBe('/');
    expect(toAppPathname('/console/content/office')).toBe('/office');
    expect(toAppPathname('/console/content/records/song')).toBeNull();
    expect(toAppPathname('/console/content/graph')).toBeNull();
    expect(toAppPathname('/console/content/publishing')).toBeNull();
    expect(toAppPathname('/console/users')).toBeNull();
  });

  it('round-trips', () => {
    for (const path of ['/songs/africa', '/atlas/globe', '/learn', '/office']) {
      expect(toAppPathname(toConsolePath(path))).toBe(path);
    }
  });

  it('carries key and state across', () => {
    expect(
      toAppLocation({
        pathname: '/console/content/atlas/globe',
        search: '?event=evt-x',
        hash: '',
        state: { from: 1 },
        key: 'k1',
      }),
    ).toEqual({
      pathname: '/atlas/globe',
      search: '?event=evt-x',
      hash: '',
      state: { from: 1 },
      key: 'k1',
    });
  });

  it('knows which app paths it mirrors', () => {
    expect(isMirroredPrefix('/songs/africa')).toBe(true);
    expect(isMirroredPrefix('/learn')).toBe(true);
    expect(isMirroredPrefix('/learners')).toBe(false);
    expect(isMirroredPrefix('/settings')).toBe(false);
    expect(isMirroredPrefix('/office')).toBe(true);
    expect(isMirroredPrefix('/classrooms/abc')).toBe(true);
    expect(isMirroredPrefix('/search')).toBe(true);
    expect(isMirroredPrefix('/teach')).toBe(false);
  });

  it('knows which app section each console page belongs to', () => {
    expect(consoleAppPath('/console/content/songs/africa')).toBe(
      '/songs/africa',
    );
    expect(consoleAppPath('/console/content/records/song')).toBe('/learn');
    expect(consoleAppPath('/console/content/records/globe_event/x')).toBe(
      '/atlas',
    );
    expect(consoleAppPath('/console/content/records/vocabulary')).toBeNull();
    expect(consoleAppPath('/console/lessons/pop')).toBe('/learn');
    expect(consoleAppPath('/console/content/publishing')).toBeNull();
    expect(consoleAppPath('/console/users')).toBeNull();
    expect(segmentForKind('artist')).toBe('/atlas');
    expect(segmentForKind('nonsense')).toBeNull();
  });
});

describe('the mirror namespace', () => {
  const segment = (path: string) => path.split('/')[1];

  /**
   * Every top-level segment of every route group in routes.ts, not just the
   * mirrored ones.
   */
  const appRootSegments = () => {
    const segments = new Set<string>();
    for (const group of Object.values(AppRoutes) as unknown[]) {
      const root = (group as { root?: unknown } | null)?.root;
      if (typeof root !== 'function') continue;
      segments.add(segment((root as () => string)()));
    }
    return segments;
  };

  it('mirrors the app segments the route constants define', () => {
    // If a segment moves in routes.ts, the mirror must move with it.
    expect([...MIRRORED_PREFIXES].sort()).toEqual(
      [
        ProfileRoutes.root(),
        LearnRoutes.root(),
        SongRoutes.root(),
        CurriculumRoutes.root(),
        StudioRoutes.root(),
        AtlasRoutes.root(),
        GameRoutes.root(),
        SearchRoutes.root(),
        ClassroomRoutes.root(),
        OfficeRoutes.root(),
      ].sort(),
    );
  });

  it('keeps console pages, old kind URLs and app segments apart', () => {
    // A collision would make a mirrored link open a console page, or an old
    // table link open the app.
    const app = MIRRORED_PREFIXES.map(segment);
    const reserved = [...RESERVED_CONSOLE_SEGMENTS];
    const legacy = [...LEGACY_KIND_SEGMENTS];
    const all = [...app, ...reserved, ...legacy];
    expect(all.length).toBe(new Set(all).size);
  });

  it('reserves no segment any app route uses', () => {
    // A reserved name must never shadow an app page.
    const appSegments = appRootSegments();
    expect(appSegments.size).toBeGreaterThan(8);
    for (const name of [
      ...RESERVED_CONSOLE_SEGMENTS,
      ...LEGACY_KIND_SEGMENTS,
    ]) {
      expect(appSegments.has(name), name).toBe(false);
    }
  });

  it('keeps the Table beside the mirror, clear of every app segment', () => {
    // The Table is a console section of its own: an app link never becomes a
    // table URL, a table URL is never read as an app page, and no app
    // section claims it in the sidebar.
    const table = AdminRoutes.table();
    expect(table).toBe('/console/table');
    expect(table.startsWith(`${MIRROR_BASE}/`)).toBe(false);
    expect(appRootSegments().has(table.split('/')[2])).toBe(false);
    expect(toConsolePath(`${table}/songs`)).toBe(`${table}/songs`);
    expect(toConsolePath('/table')).toBe(`${MIRROR_BASE}/table`);
    expect(toAppPathname(`${table}/songs/africa`)).toBeNull();
    expect(consoleAppPath(`${table}/songs/africa`)).toBeNull();
  });

  it('lives under the console content route', () => {
    expect(MIRROR_BASE).toBe('/console/content');
  });
});
