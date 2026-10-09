import { describe, expect, it } from 'vitest';
import { DEVICE_USER_KEY } from '@/lib/local-store/userScope';
import type { DraftMeta } from '@/lib/studio-projects/drafts/types';
import type { StudioProjectSummary } from '@/lib/studio-projects/projectsClient';
import {
  buildProjectRows,
  foldForSearch,
  relativeWhen,
  type ProjectRowsInput,
} from '../projectRows';

const NOW = Date.UTC(2026, 9, 8, 15, 0, 0);
const MIN = 60_000;
const ME = 'student-a';

function meta(partial: Partial<DraftMeta> & { draftId: string }): DraftMeta {
  return {
    v: 1,
    userKey: ME,
    origin: 'session',
    createdAt: NOW - 60 * MIN,
    updatedAt: NOW - 5 * MIN,
    writeSeq: 1,
    writer: { build: 'test', doc: 'doc' },
    schema: 3,
    name: `Draft ${partial.draftId}`,
    trackCount: 1,
    chars: 1000,
    contentHash: 'h1:c',
    docFingerprint: 'h1:work',
    hasContent: true,
    baseline: { source: 'new', reopenable: true, fingerprint: 'h1:base' },
    media: [],
    mediaMissing: 0,
    ...partial,
  };
}

function cloud(
  id: string,
  partial: Partial<StudioProjectSummary> = {},
): StudioProjectSummary {
  return {
    id,
    name: `Project ${id}`,
    composerName: null,
    bpm: 96,
    createdAt: new Date(NOW - 86_400_000),
    updatedAt: new Date(NOW - 30 * MIN),
    libraryGenre: null,
    libraryStatus: null,
    libraryInstruments: [],
    collaborators: [],
    ...partial,
  };
}

function input(partial: Partial<ProjectRowsInput> = {}): ProjectRowsInput {
  return {
    mine: [],
    device: [],
    cloud: [],
    locked: new Set(),
    activeDraftId: null,
    liveProjectId: null,
    inRoom: false,
    schemaVersion: 3,
    query: '',
    sortBy: 'recent',
    now: NOW,
    ...partial,
  };
}

const pristine = (id: string, extra: Partial<DraftMeta> = {}) =>
  meta({
    draftId: id,
    docFingerprint: 'h1:same',
    baseline: {
      source: 'template',
      ref: 'x',
      reopenable: true,
      fingerprint: 'h1:same',
    },
    ...extra,
  });

const cloudEqual = (id: string, projectId: string) =>
  meta({
    draftId: id,
    projectId,
    docFingerprint: 'h1:saved',
    cloud: {
      projectId,
      updatedAt: '2026-10-08T14:00:00.000Z',
      savedFingerprint: 'h1:saved',
      savedComplete: true,
      savedAt: NOW - 10 * MIN,
    },
  });

describe('buildProjectRows: the device section', () => {
  it('lists drafts with work, and hides pristine, cloud-equal and empty ones', () => {
    const rows = buildProjectRows(
      input({
        mine: [
          meta({ draftId: 'work' }),
          pristine('pristine'),
          cloudEqual('equal', 'p1'),
          meta({ draftId: 'empty', hasContent: false }),
        ],
        cloud: [cloud('p1')],
      }),
    );
    expect(rows.device.map((r) => r.draft?.draftId)).toEqual(['work']);
  });

  it('shows the open draft even when it is pristine or cloud-equal, first', () => {
    const rows = buildProjectRows(
      input({
        mine: [meta({ draftId: 'work', updatedAt: NOW }), pristine('open')],
        activeDraftId: 'open',
      }),
    );
    expect(rows.device.map((r) => r.draft?.draftId)).toEqual(['open', 'work']);
    const open = rows.device[0];
    expect(open.tags).toContain('open-now');
    expect(open.isOpen).toBe(true);
    expect(open.canOpen).toBe(false);
    expect(open.canDelete).toBe(false);
  });

  it('tags kept work, copies and earlier-version imports', () => {
    const rows = buildProjectRows(
      input({
        mine: [
          meta({ draftId: 'k', origin: 'kept', keptAt: NOW - 5 * MIN }),
          meta({ draftId: 'f', origin: 'fork' }),
          meta({ draftId: 'm', origin: 'migrated', docFingerprint: null }),
          meta({ draftId: 'r', origin: 'recovered' }),
        ],
      }),
    );
    const tags = Object.fromEntries(
      rows.device.map((r) => [r.draft?.draftId, r.tags]),
    );
    expect(tags.k).toContain('kept');
    expect(tags.f).toContain('copy');
    expect(tags.m).toContain('from-earlier-version');
    expect(tags.r).toContain('from-earlier-version');
    const kept = rows.device.find((r) => r.draft?.draftId === 'k');
    expect(kept?.subtitle).toBe('Kept 5 min ago');
  });

  it('hides a pristine (unedited) copy, which is a cache', () => {
    const rows = buildProjectRows(
      input({ mine: [pristine('f', { origin: 'fork' })] }),
    );
    expect(rows.device).toEqual([]);
  });

  it('shows a draft a newer version wrote, read-only: Open disabled', () => {
    const rows = buildProjectRows(
      input({ mine: [meta({ draftId: 'n', schema: 4 })] }),
    );
    const [row] = rows.device;
    expect(row.tags).toContain('newer-version');
    expect(row.canOpen).toBe(false);
    expect(row.openIntent).toBeNull();
    expect(row.canDelete).toBe(true);
  });

  it('marks a draft open in another tab, still openable (it forks), not deletable', () => {
    const rows = buildProjectRows(
      input({ mine: [meta({ draftId: 'x' })], locked: new Set(['x']) }),
    );
    const [row] = rows.device;
    expect(row.tags).toContain('other-tab');
    expect(row.canOpen).toBe(true);
    expect(row.canDelete).toBe(false);
    expect(row.openIntent).toEqual({ kind: 'draft', draftId: 'x' });
  });

  it('never lists a ~device draft under this user', () => {
    const rows = buildProjectRows(
      input({ mine: [meta({ draftId: 'd', userKey: DEVICE_USER_KEY })] }),
    );
    expect(rows.device).toEqual([]);
  });
});

describe('buildProjectRows: cloud links', () => {
  it('tags changes-on-device on both the draft and its cloud row', () => {
    const rows = buildProjectRows(
      input({
        mine: [meta({ draftId: 'w', projectId: 'p1' })],
        cloud: [cloud('p1'), cloud('p2')],
      }),
    );
    expect(rows.device[0].tags).toContain('changes-on-device');
    const p1 = rows.account.find((r) => r.cloud?.id === 'p1');
    const p2 = rows.account.find((r) => r.cloud?.id === 'p2');
    expect(p1?.tags).toContain('changes-on-device');
    expect(p1?.openSavedIntent).toEqual({
      kind: 'project',
      projectId: 'p1',
      fromCloud: true,
    });
    expect(p2?.tags).not.toContain('changes-on-device');
    expect(p2?.openSavedIntent).toBeNull();
  });

  it('marks not-in-account only against a loaded, fresh list', () => {
    const mine = [meta({ draftId: 'w', projectId: 'gone' })];
    const loaded = buildProjectRows(input({ mine, cloud: [cloud('p1')] }));
    expect(loaded.device[0].tags).toContain('not-in-account');
    expect(loaded.device[0].tags).not.toContain('changes-on-device');

    const missing = buildProjectRows(input({ mine, cloud: null }));
    expect(missing.device[0].tags).not.toContain('not-in-account');
    expect(missing.device[0].tags).toContain('changes-on-device');

    const stale = buildProjectRows(
      input({ mine, cloud: [cloud('p1')], cloudFresh: false }),
    );
    expect(stale.device[0].tags).not.toContain('not-in-account');
  });

  it('ignores the last save’s project once the draft’s projectId is cleared', () => {
    const rows = buildProjectRows(
      input({
        mine: [
          meta({
            draftId: 'w',
            cloud: {
              projectId: 'p1',
              updatedAt: null,
              savedFingerprint: 'h1:old',
              savedComplete: true,
              savedAt: 1,
            },
          }),
        ],
        cloud: [cloud('p1'), cloud('p2')],
      }),
    );
    expect(rows.device[0].tags).not.toContain('changes-on-device');
    expect(rows.device[0].tags).not.toContain('not-in-account');
    const p1 = rows.account.find((r) => r.cloud?.id === 'p1');
    expect(p1?.tags).not.toContain('changes-on-device');
    expect(p1?.openSavedIntent).toBeNull();
  });

  it('tags the live project’s cloud row open-now, not openable', () => {
    const rows = buildProjectRows(
      input({ cloud: [cloud('p1'), cloud('p2')], liveProjectId: 'p1' }),
    );
    const p1 = rows.account.find((r) => r.cloud?.id === 'p1');
    expect(p1?.tags).toEqual(['open-now']);
    expect(p1?.canOpen).toBe(false);
    expect(rows.account[0].cloud?.id).toBe('p1');
    const p2 = rows.account.find((r) => r.cloud?.id === 'p2');
    expect(p2?.canOpen).toBe(true);
    expect(p2?.openIntent).toEqual({ kind: 'project', projectId: 'p2' });
    expect(p2?.canDelete).toBe(false);
    expect(p2?.subtitle).toBe('96 BPM · Edited 30 min ago');
  });
});

describe('buildProjectRows: found on this device', () => {
  it('lists ~device drafts under found, tagged', () => {
    const rows = buildProjectRows(
      input({
        device: [
          meta({
            draftId: 'd',
            userKey: DEVICE_USER_KEY,
            origin: 'migrated',
            docFingerprint: null,
          }),
        ],
      }),
    );
    expect(rows.found).toHaveLength(1);
    expect(rows.found[0].tags).toEqual(
      expect.arrayContaining(['found-on-device', 'from-earlier-version']),
    );
    // Nobody's yet: perhaps another student's only copy (E6).
    expect(rows.found[0].canDelete).toBe(false);
    expect(rows.found[0].canOpen).toBe(true);
    expect(rows.found[0].section).toBe('found');
  });
});

describe('buildProjectRows: in a room', () => {
  it('opens nothing, and offers no saved version', () => {
    const rows = buildProjectRows(
      input({
        mine: [meta({ draftId: 'w', projectId: 'p1' })],
        cloud: [cloud('p1')],
        inRoom: true,
      }),
    );
    expect(rows.device[0].canOpen).toBe(false);
    expect(rows.account[0].canOpen).toBe(false);
    expect(rows.account[0].openSavedIntent).toBeNull();
    // Deleting a device draft stays possible.
    expect(rows.device[0].canDelete).toBe(true);
  });
});

describe('buildProjectRows: search and sort', () => {
  it('matches case- and accent-insensitively, in every section', () => {
    const rows = buildProjectRows(
      input({
        mine: [
          meta({ draftId: 'a', name: 'Canción de Cuna' }),
          meta({ draftId: 'b', name: 'Blues' }),
        ],
        cloud: [cloud('p1', { name: 'CANCION final' }), cloud('p2')],
        query: '  cancion ',
      }),
    );
    expect(rows.device.map((r) => r.name)).toEqual(['Canción de Cuna']);
    expect(rows.account.map((r) => r.name)).toEqual(['CANCION final']);
    expect(foldForSearch('Ñandú')).toBe('nandu');
  });

  it('sorts by recent work, or by size (chars + media) when asked', () => {
    const mine = [
      meta({ draftId: 'old-big', updatedAt: NOW - 50 * MIN, chars: 9000 }),
      meta({ draftId: 'new-small', updatedAt: NOW - MIN, chars: 100 }),
      meta({
        draftId: 'mid-media',
        updatedAt: NOW - 20 * MIN,
        chars: 100,
        media: [
          {
            mediaId: 'm',
            contentType: 'audio/wav',
            size: 50_000,
            clipIds: ['c'],
            samplerSampleIds: [],
          },
        ],
      }),
    ];
    const recent = buildProjectRows(input({ mine }));
    expect(recent.device.map((r) => r.draft?.draftId)).toEqual([
      'new-small',
      'mid-media',
      'old-big',
    ]);
    const bySize = buildProjectRows(input({ mine, sortBy: 'size' }));
    expect(bySize.device.map((r) => r.draft?.draftId)).toEqual([
      'mid-media',
      'old-big',
      'new-small',
    ]);
    expect(bySize.device[0].sizeChars).toBe(50_100);
  });

  it('names untitled work and describes where it came from', () => {
    const rows = buildProjectRows(
      input({
        mine: [
          meta({
            draftId: 't',
            name: '  ',
            baseline: {
              source: 'template',
              ref: 'nope',
              reopenable: true,
              fingerprint: 'h1:x',
            },
          }),
          meta({
            draftId: 'l',
            updatedAt: NOW - 2 * MIN,
            baseline: {
              source: 'tutorial',
              reopenable: true,
              fingerprint: 'h1:x',
            },
          }),
        ],
      }),
    );
    const t = rows.device.find((r) => r.draft?.draftId === 't');
    expect(t?.name).toBe('Untitled Project');
    expect(t?.subtitle).toBe('From a template · Edited 5 min ago');
    const l = rows.device.find((r) => r.draft?.draftId === 'l');
    expect(l?.subtitle).toBe('Lesson · Edited 2 min ago');
  });
});

describe('relativeWhen', () => {
  it('says just now, minutes, hours, yesterday, then a date', () => {
    const noon = new Date(2026, 9, 8, 12, 0, 0).getTime();
    expect(relativeWhen(noon - 10_000, noon)).toBe('just now');
    expect(relativeWhen(noon - 5 * MIN, noon)).toBe('5 min ago');
    expect(relativeWhen(noon - 125 * MIN, noon)).toBe('2 h ago');
    expect(relativeWhen(noon - 24 * 60 * MIN, noon)).toBe('yesterday');
    expect(relativeWhen(noon - 5 * 24 * 60 * MIN, noon)).toMatch(/Oct/);
  });
});
