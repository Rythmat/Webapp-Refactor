// @vitest-environment jsdom
/**
 * The song's sections in a draft and in the cloud document (milestone
 * 2.13): kept whole, written with the Lead Sheet's marks they imply in the
 * marks' old place (for builds from before 2.13), each mark carrying its
 * section, read back from those marks when a draft or a document holds no
 * readable sections (so a rollback and back keeps them as they were), and
 * repaired, never thrown on, when damaged.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/sectionsDocument.test.ts
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { SongSection } from '@/daw/model/sections';
import type { MidiClip } from '@/daw/store/tracksSlice';
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
/** The marks a draft writes for [verse, chorus]. */
const verseChorusMarks = [
  {
    measureIdx: 0,
    label: 'Verse 1',
    id: 'section-verse01',
    type: 'verse',
    startTick: 0,
    endTick: 15360,
    joined: true,
  },
  {
    measureIdx: 8,
    label: 'Chorus',
    id: 'section-chorus1',
    type: 'chorus',
    startTick: 15360,
    endTick: 30720,
  },
];
const BAR = 1920; // a bar of 4/4

/** The draft read back as a build from before 2.13 leaves it: marks only. */
function withoutSections(stored: StoredSession): StoredSession {
  delete (stored.data as Partial<StoredSession['data']>).sections;
  stored.schema = 6;
  return stored;
}

/** Each section as `label type from-to`, in bars of 4/4. */
const spans = (list: readonly SongSection[]) =>
  list.map(
    (x) => `${x.label} ${x.type} ${x.startTick / BAR}-${x.endTick / BAR}`,
  );

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
    expect(stored.data.notation?.leadSheetSections).toEqual(verseChorusMarks);
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

  it('reads unreadable sections from the marks written beside them', () => {
    for (const broken of ['verse', null, { 0: verse }, [7, 'x', null]]) {
      const stored = draftOf([verse, chorus]);
      (stored.data as unknown as Record<string, unknown>).sections = broken;
      const { project, repaired } = decoded(stored);
      expect(project.sections).toEqual([verse, chorus]);
      expect(repaired).toBeGreaterThanOrEqual(1);
    }
  });

  it('reads unreadable sections as none when there are no marks', () => {
    const stored = draftOf([]);
    (stored.data as unknown as Record<string, unknown>).sections = 'verse';
    const { project, repaired } = decoded(stored);
    expect(project.sections).toEqual([]);
    expect(repaired).toBe(1);
  });

  it('without sections runs the last mark to the end of the last clip, past the chord chart', () => {
    resetSessionToEmpty();
    const clip: MidiClip = {
      id: 'melody',
      startTick: 0,
      durationTicks: 16 * BAR,
      events: [],
    };
    const keys = s().addTrack('midi', 'piano-sampler', 'Melody');
    s().addMidiClip(keys, clip);
    const stored = JSON.parse(
      JSON.stringify(encodeSession(s() as ProjectSnapshot, noPatches, 1)),
    ) as StoredSession;
    withoutSections(stored);
    stored.data.notation!.leadSheetSections = [
      { measureIdx: 0, label: 'A' },
      { measureIdx: 8, label: 'B' },
    ];
    expect(spans(decoded(stored).project.sections)).toEqual([
      'A custom 0-8',
      'B custom 8-16',
    ]);
  });
});

describe('rolling back to a build from before 2.13 and forward again', () => {
  const intro: SongSection = {
    id: 'section-aaaa0001',
    type: 'intro',
    label: 'Intro',
    startTick: 0,
    endTick: 4 * BAR,
  };
  // Bars 4 to 8 are left unnamed.
  const drop: SongSection = {
    id: 'section-aaaa0002',
    type: 'drop',
    label: 'Big drop',
    startTick: 8 * BAR,
    endTick: 16 * BAR,
  };
  const outro: SongSection = {
    id: 'section-aaaa0003',
    type: 'outro',
    label: 'Outro',
    startTick: 16 * BAR,
    endTick: 24 * BAR,
  };

  it('brings the sections back as they were', () => {
    const stored = withoutSections(draftOf([intro, drop, outro]));
    const { project, repaired } = decoded(stored);
    expect(project.sections).toEqual([intro, drop, outro]);
    expect(repaired).toBe(0);
  });

  it('keeps the edits made in the older build, and the rest as it was', () => {
    const chorus2: SongSection = {
      id: 'section-aaaa0004',
      type: 'chorus',
      label: 'Chorus',
      startTick: 24 * BAR,
      endTick: 32 * BAR,
    };
    const tag: SongSection = {
      id: 'section-aaaa0005',
      type: 'tag',
      label: 'Tag',
      startTick: 32 * BAR,
      endTick: 34 * BAR,
    };
    const stored = withoutSections(draftOf([intro, drop, outro, chorus2, tag]));
    // What the older build does: it keeps the mark objects as they are,
    // renames one by writing a plain mark in its place, adds one without a
    // section, and removes one, which gives its bars to the mark before.
    const marks = stored.data.notation!.leadSheetSections!;
    expect(marks.map((m) => m.measureIdx)).toEqual([0, 8, 16, 24, 32]);
    stored.data.notation!.leadSheetSections = [
      marks[0],
      { measureIdx: 5, label: 'Build Up' },
      marks[1],
      // The Outro removed.
      { measureIdx: 24, label: 'Last chorus' },
      marks[4],
    ];
    const { project } = decoded(stored);
    expect(spans(project.sections)).toEqual([
      'Intro intro 0-4',
      // Up to the next mark.
      'Build Up build-up 5-8',
      // It met the Outro, so it takes the Outro's bars.
      'Big drop drop 8-24',
      // Renamed to a name that names no kind: its section is gone, so it
      // runs to the next mark.
      'Last chorus custom 24-32',
      'Tag tag 32-34',
    ]);
    expect(project.sections.map((x) => x.id)).toEqual([
      intro.id,
      'section-bar-5',
      drop.id,
      'section-bar-24',
      tag.id,
    ]);
  });

  it('reads a section moved with the bars by its mark alone', () => {
    const stored = withoutSections(draftOf([intro, drop]));
    // The older build's + Measure at bar 2 moves the Big drop's mark a bar
    // on, not the section it carries.
    const marks = stored.data.notation!.leadSheetSections!;
    stored.data.notation!.leadSheetSections = [
      marks[0],
      { ...marks[1], measureIdx: 9 },
    ];
    const { project } = decoded(stored);
    expect(spans(project.sections)).toEqual([
      'Intro intro 0-4',
      // The chart of an empty project is four bars, so the last mark runs a
      // bar; its kind is still the section's.
      'Big drop drop 9-10',
    ]);
    expect(project.sections[1].id).toBe('section-bar-9');
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
    expect(doc.notation?.leadSheetSections).toEqual(verseChorusMarks);
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
