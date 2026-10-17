// @vitest-environment jsdom
/**
 * The song's sections in a draft and in the cloud document (milestone
 * 2.13): kept whole, written with the Lead Sheet's marks they imply in the
 * marks' old place (for builds from before 2.13), read back from those marks
 * when a draft or a document holds no sections, and repaired, never thrown
 * on, when damaged.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/sectionsDocument.test.ts
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { SongSection } from '@/daw/model/sections';
import { useStore } from '@/daw/store';
import {
  cloudProjectDraft,
  encodeCloudDocument,
  findCloudDocument,
  type CloudPayload,
} from '../projectDocument/cloudDocument';
import {
  decodeSession,
  encodeSession,
  type ProjectSnapshot,
  type StoredSession,
} from '../projectDocument/codec';
import { migrateSession } from '../projectDocument/migrations';
import { resetSessionToEmpty } from '../SessionSerializer';

const s = () => useStore.getState();
const noPatches = () => undefined;

const verse: SongSection = {
  id: 'section-verse01',
  type: 'verse',
  label: 'Verse 1',
  startTick: 0,
  endTick: 15360,
};
const chorus: SongSection = {
  id: 'section-chorus1',
  type: 'chorus',
  label: 'Chorus',
  startTick: 15360,
  endTick: 30720,
};

function draftOf(sections: SongSection[]): StoredSession {
  resetSessionToEmpty();
  s().setSections(sections);
  return JSON.parse(
    JSON.stringify(encodeSession(s() as ProjectSnapshot, noPatches, 1)),
  ) as StoredSession;
}

function decoded(stored: unknown) {
  const migrated = migrateSession(stored);
  if (!migrated.ok) throw new Error(migrated.detail);
  return decodeSession(migrated.session);
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

describe('a draft', () => {
  it('keeps the sections whole, and writes the marks they imply', () => {
    const stored = draftOf([verse, chorus]);
    expect(stored.data.sections).toEqual([verse, chorus]);
    expect(stored.data.notation?.leadSheetSections).toEqual([
      { measureIdx: 0, label: 'Verse 1' },
      { measureIdx: 8, label: 'Chorus' },
    ]);
    const { project, repaired } = decoded(stored);
    expect(project.sections).toEqual([verse, chorus]);
    expect(repaired).toBe(0);
  });

  it('with no sections writes an empty list, and reads it back as none', () => {
    const stored = draftOf([]);
    expect(stored.data.sections).toEqual([]);
    // The (empty) sections win over any marks an older build left.
    stored.data.notation!.leadSheetSections = [{ measureIdx: 2, label: 'A' }];
    expect(decoded(stored).project.sections).toEqual([]);
  });

  it('without sections reads them from the Lead Sheet marks, the same every time', () => {
    const stored = draftOf([]);
    delete (stored.data as Partial<StoredSession['data']>).sections;
    stored.data.notation!.leadSheetSections = [
      { measureIdx: 4, label: 'Chorus 2' },
      { measureIdx: 0, label: 'Intro' },
      { measureIdx: 4, label: 'Ignored: one per bar' },
    ];
    const first = decoded(stored).project.sections;
    expect(first).toEqual([
      {
        id: 'section-bar-0',
        type: 'intro',
        label: 'Intro',
        startTick: 0,
        endTick: 4 * 1920,
      },
      {
        id: 'section-bar-4',
        type: 'chorus',
        label: 'Chorus 2',
        startTick: 4 * 1920,
        // The chart of an empty project is a blank sheet of four bars, so
        // the last section runs a bar past its start.
        endTick: 5 * 1920,
      },
    ]);
    expect(decoded(stored).project.sections).toEqual(first);
  });

  it('repairs damaged sections rather than losing the draft', () => {
    const stored = draftOf([]);
    stored.data.sections = [
      // No id: one from where it starts. An unknown type: custom.
      { type: 'refrain-x', label: 'R', startTick: 1920, endTick: 3840 },
      // No name: its type's.
      { id: 'sec-b', type: 'bridge', startTick: 3840, endTick: 5760 },
      // No length: dropped.
      {
        id: 'sec-c',
        type: 'verse',
        label: 'V',
        startTick: 9600,
        endTick: 9600,
      },
      // The same id again, overlapping the one before: moved after it and
      // given an id of its own.
      {
        id: 'sec-b',
        type: 'outro',
        label: 'O',
        startTick: 4800,
        endTick: 6720,
      },
    ] as unknown as SongSection[];
    const { project, repaired } = decoded(stored);
    expect(project.sections).toEqual([
      {
        id: 'section-at-1920',
        type: 'custom',
        label: 'R',
        startTick: 1920,
        endTick: 3840,
      },
      {
        id: 'sec-b',
        type: 'bridge',
        label: 'Bridge',
        startTick: 3840,
        endTick: 5760,
      },
      {
        id: 'sec-b-3',
        type: 'outro',
        label: 'O',
        startTick: 5760,
        endTick: 7680,
      },
    ]);
    expect(repaired).toBeGreaterThanOrEqual(4);
  });

  it('reads anything but a list of sections as none', () => {
    const stored = draftOf([]);
    (stored.data as unknown as Record<string, unknown>).sections = 'verse';
    const { project, repaired } = decoded(stored);
    expect(project.sections).toEqual([]);
    expect(repaired).toBe(1);
  });
});

describe('the cloud document', () => {
  function payload(document: unknown): CloudPayload {
    return {
      id: 'project-1',
      name: 'Song',
      composerName: '',
      bpm: 120,
      prism: {},
      tracks: [],
      document,
      documentSchema: 7,
      revision: 1,
      writtenAtRevision: 1,
    };
  }

  it('carries the sections, and the marks for older builds', () => {
    resetSessionToEmpty();
    s().setSections([verse, chorus]);
    const doc = encodeCloudDocument(s() as ProjectSnapshot);
    expect(doc.sections).toEqual([verse, chorus]);
    expect(doc.notation?.leadSheetSections).toEqual([
      { measureIdx: 0, label: 'Verse 1' },
      { measureIdx: 8, label: 'Chorus' },
    ]);
    const project = payload(JSON.parse(JSON.stringify(doc)));
    const draft = cloudProjectDraft(project, findCloudDocument(project), () =>
      crypto.randomUUID(),
    );
    expect(decodeSession(draft.session).project.sections).toEqual([
      verse,
      chorus,
    ]);
  });

  it('from before 2.13 opens with its Lead Sheet marks as sections', () => {
    resetSessionToEmpty();
    const doc = JSON.parse(
      JSON.stringify(encodeCloudDocument(s() as ProjectSnapshot)),
    );
    delete doc.sections;
    doc.schema = 6;
    doc.notation = {
      ...doc.notation,
      leadSheetSections: [{ measureIdx: 0, label: 'Verse' }],
    };
    const project = payload(doc);
    const draft = cloudProjectDraft(project, findCloudDocument(project), () =>
      crypto.randomUUID(),
    );
    expect(decodeSession(draft.session).project.sections).toEqual([
      {
        id: 'section-bar-0',
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: 4 * 1920,
      },
    ]);
  });
});
