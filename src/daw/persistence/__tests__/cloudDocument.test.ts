// @vitest-environment jsdom
/**
 * The cloud document (milestone 1.5): what a cloud save carries beyond the
 * legacy payload, where it travels (the API's `document` field, or the
 * interim fallback on the first track's settings), and how an open reads it
 * back: from any track, preferring the field, keeping a stale document's
 * parts off notes that changed, and leaving out a document from a later
 * schema.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/cloudDocument.test.ts
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  CLOUD_DOCUMENT_KEYS,
  CLOUD_DOCUMENT_SCHEMA,
  findCloudDocument,
  noteChecksum,
  type CloudDocument,
} from '../projectDocument/cloudDocument';
import { STORE_FIELDS, type StoreDataKey } from '../projectDocument/fields';
import {
  deserializeCloudProject,
  forgetLiveSession,
  resetSessionToEmpty,
  serializeSessionForCloud,
  type CloudProjectDetail,
  type CloudProjectInput,
} from '../SessionSerializer';

const s = () => useStore.getState();
const byName = (name: string) => {
  const found = s().tracks.find((t) => t.name === name);
  if (!found) throw new Error(`No ${name} track`);
  return found;
};

const REGION: ChordRegion = {
  id: 'region-1',
  startTick: 0,
  endTick: 1920,
  name: 'Dm7',
  noteName: 'D',
  color: [120, 90, 200],
};

/** What the server hands back for a body: its row ids, plus `extra`. */
const fromServer = (
  body: CloudProjectInput,
  extra: Partial<CloudProjectDetail> = {},
): CloudProjectDetail => {
  const echoed = structuredClone(body);
  return {
    ...echoed,
    id: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    tracks: echoed.tracks.map((t, i) => ({ ...t, id: `row-${i}`, ordinal: i })),
    ...extra,
  } as CloudProjectDetail;
};

/** Keys and Bass with a clip each, and what only the document carries. */
function buildProject(): void {
  resetSessionToEmpty();
  const keys = s().addTrack('midi', 'soundfont', 'Keys');
  s().addMidiClip(keys, {
    id: 'clip-keys',
    startTick: 0,
    durationTicks: 3840,
    events: [
      { note: 60, velocity: 90, startTick: 0, durationTicks: 480, channel: 0 },
    ],
  });
  const bass = s().addTrack('midi', 'soundfont', 'Bass');
  s().addMidiClip(bass, {
    id: 'clip-bass',
    startTick: 0,
    durationTicks: 1920,
    events: [
      { note: 36, velocity: 90, startTick: 0, durationTicks: 960, channel: 0 },
    ],
  });
  s().setChordRegions([REGION], true);
  s().setMode('dorian');
  s().setTimeSignature(6, 8);
  s().addMarker(1920, 'Chorus');
}

/** The project as it stands, for comparing after an open. */
const content = () => ({
  mode: s().mode,
  metre: [s().timeSignatureNumerator, s().timeSignatureDenominator],
  chords: s().chordRegions.map((r) => r.name),
  markers: s().markers.map((m) => m.name),
  lengths: Object.fromEntries(
    s().tracks.flatMap((t) => t.midiClips.map((c) => [c.id, c.durationTicks])),
  ),
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
});

describe('the cloud document holds', () => {
  it('every field only it carries, and the two copies', () => {
    const documentKeys = (Object.keys(STORE_FIELDS) as StoreDataKey[]).filter(
      (key) => STORE_FIELDS[key].cloud === 'document',
    );
    // The Score's note marks go by note id, in notation.marks.
    const marks = [
      'scoreArticulations',
      'scoreSlurs',
      'scoreSpellings',
      'scoreSlashNotes',
    ];
    expect([...CLOUD_DOCUMENT_KEYS].sort()).toEqual(
      [
        ...documentKeys.filter((key) => !marks.includes(key)),
        'masterAutomation',
        'returns',
      ].sort(),
    );
  });
});

describe('a cloud save writes the document', () => {
  it('on the first track until the API has the field', () => {
    buildProject();
    const body = serializeSessionForCloud(undefined, 'interim');
    expect(body.document).toBeUndefined();
    const doc = body.tracks[0].settings?.projectDoc as CloudDocument;
    expect(doc.schema).toBe(CLOUD_DOCUMENT_SCHEMA);
    expect(body.tracks[0].settings?.projectDocSchema).toBe(
      CLOUD_DOCUMENT_SCHEMA,
    );
    expect(body.tracks[1].settings?.projectDoc).toBeUndefined();
    expect(doc.clips['clip-keys'].durationTicks).toBe(3840);
  });

  it('in its own field once the API has it, and nowhere else', () => {
    buildProject();
    const body = serializeSessionForCloud(undefined, 'document');
    expect(body.documentSchema).toBe(CLOUD_DOCUMENT_SCHEMA);
    // With the identity the lane read from its labels (D, 'Dm7').
    expect(body.document?.chordRegions).toEqual([
      {
        ...REGION,
        identity: {
          rootPc: 2,
          quality: 'minor7',
          bassPc: 2,
          source: 'derived',
          label: 'Dm7',
        },
      },
    ]);
    expect(body.tracks.some((t) => t.settings?.projectDoc)).toBe(false);
  });

  it('nowhere in a project with no tracks, until the API has the field', () => {
    resetSessionToEmpty();
    s().setMode('dorian');
    const body = serializeSessionForCloud(undefined, 'interim');
    expect(body.tracks).toEqual([]);
    expect(body.document).toBeUndefined();
  });

  it('on the new first track once the old one is deleted', () => {
    buildProject();
    s().removeTrack(byName('Keys').id);
    const body = serializeSessionForCloud();
    expect(body.tracks[0].name).toBe('Bass');
    expect(body.tracks[0].settings?.projectDoc).toBeDefined();
  });

  it('the same way every time', () => {
    buildProject();
    expect(JSON.stringify(serializeSessionForCloud())).toBe(
      JSON.stringify(serializeSessionForCloud()),
    );
  });
});

describe('a cloud open reads the document', () => {
  it('from whichever track carries it, after a reorder', () => {
    buildProject();
    const before = content();
    const body = serializeSessionForCloud();
    body.tracks.reverse();
    deserializeCloudProject(fromServer(body));
    expect(s().tracks.map((t) => t.name)).toEqual(['Bass', 'Keys']);
    expect(content()).toEqual(before);
  });

  it('from the API’s field over a track’s', () => {
    buildProject();
    const body = serializeSessionForCloud(undefined, 'document');
    const older = serializeSessionForCloud(undefined, 'interim');
    (older.tracks[0].settings!.projectDoc as CloudDocument).prism = {
      mode: 'lydian',
    };
    body.tracks[0].settings = older.tracks[0].settings;
    const report = deserializeCloudProject(
      fromServer(body, { revision: 2, writtenAtRevision: 2 }),
    );
    expect(report).toMatchObject({ document: 'field', stale: false });
    expect(s().mode).toBe('dorian');
  });

  it('and opens what the rows carry when there is none', () => {
    buildProject();
    const body = serializeSessionForCloud();
    delete body.tracks[0].settings?.projectDoc;
    const report = deserializeCloudProject(fromServer(body));
    expect(report).toMatchObject({ document: null, stale: false });
    expect(s().mode).toBe('ionian');
    expect(s().chordRegions).toEqual([]);
    expect(s().tracks.map((t) => t.name)).toEqual(['Keys', 'Bass']);
  });

  it('keeping a part off notes an older app changed since', () => {
    buildProject();
    const body = serializeSessionForCloud(undefined, 'document');
    // An app from before 1.5 saved after it: it moved the Bass note and
    // renamed a return, and the API kept the document as it was.
    const bass = body.tracks[1].midiClips[0];
    bass.events = { ...bass.events, notes: [38] };
    body.returns = body.returns?.map((bus, i) =>
      i === 0 ? { ...bus, label: 'Older app' } : bus,
    );
    const report = deserializeCloudProject(
      fromServer(body, { revision: 5, writtenAtRevision: 3 }),
    );
    expect(report).toMatchObject({
      document: 'field',
      stale: true,
      partsSkipped: 1,
    });
    // The project-wide parts still apply; the rows win for the copies.
    expect(s().mode).toBe('dorian');
    expect(s().returns[0].label).toBe('Older app');
    // The changed clip's length is gone, the untouched one's kept.
    expect(byName('Bass').midiClips[0].durationTicks).toBeUndefined();
    expect(byName('Keys').midiClips[0].durationTicks).toBe(3840);
  });

  it('with each clip’s mute, and an audio clip’s name by its row (2.12)', () => {
    buildProject();
    s().updateMidiClip(byName('Keys').id, 'clip-keys', { muted: true });
    const vocal = s().addTrack('audio', 'audio-input', 'Vocal');
    for (const [id, startTick] of [
      ['take-1', 0],
      ['take-2', 3840],
    ] as const) {
      s().addAudioClip(vocal, {
        id,
        startTick,
        duration: 1920,
        fadeInTicks: 0,
        fadeOutTicks: 0,
        assetId: `asset-${id}`,
      });
    }
    s().updateAudioClip(vocal, 'take-1', { name: 'Verse take', muted: true });
    s().updateAudioClip(vocal, 'take-2', { name: 'Chorus take' });

    const body = serializeSessionForCloud(undefined, 'document');
    // The rows have no place for either.
    expect(JSON.stringify(body.tracks)).not.toMatch(/Verse take|"muted"/);
    expect(body.document!.audioClips).toEqual({
      'take-1': {
        row: 'asset-take-1:0:1920',
        name: 'Verse take',
        muted: true,
      },
      'take-2': { row: 'asset-take-2:3840:1920', name: 'Chorus take' },
    });

    // An older app since moved the second take: its part stays off it.
    body.tracks[2].audioClips![1].startTick = 5760;
    const report = deserializeCloudProject(
      fromServer(body, { revision: 4, writtenAtRevision: 3 }),
    );
    expect(report).toMatchObject({ stale: true, partsSkipped: 1 });
    expect(byName('Keys').midiClips[0].muted).toBe(true);
    const [first, second] = byName('Vocal').audioClips;
    expect(first).toMatchObject({ name: 'Verse take', muted: true });
    expect(second.name).toBeUndefined();
    expect(second.startTick).toBe(5760);
  });

  it('leaving out a document from a later schema it can’t read', () => {
    buildProject();
    const body = serializeSessionForCloud(undefined, 'document');
    body.document = { ...body.document!, schema: 9, compat: 9 };
    const report = deserializeCloudProject(fromServer(body));
    expect(report).toMatchObject({ document: null, newer: true });
    expect(s().mode).toBe('ionian');
  });

  it('reading a later schema that says this build may', () => {
    buildProject();
    const body = serializeSessionForCloud(undefined, 'document');
    body.document = {
      ...body.document!,
      schema: CLOUD_DOCUMENT_SCHEMA + 1,
      compat: 3,
      later: 1,
    };
    const report = deserializeCloudProject(fromServer(body));
    expect(report).toMatchObject({ document: 'field', newer: false });
    expect(s().mode).toBe('dorian');
  });
});

describe('findCloudDocument', () => {
  it('reads a document as stale only when the rows moved past it', () => {
    const project = {
      id: 'p',
      tracks: [],
      document: { schema: 3, compat: 3, trackIds: [], clips: {} },
    };
    expect(findCloudDocument(project).stale).toBe(false);
    expect(
      findCloudDocument({ ...project, revision: 4, writtenAtRevision: 4 })
        .stale,
    ).toBe(false);
    expect(
      findCloudDocument({ ...project, revision: 5, writtenAtRevision: 4 })
        .stale,
    ).toBe(true);
  });

  it('sums the same columns the same way', () => {
    const columns = {
      notes: [60],
      velocities: [90],
      startTickDeltas: [0],
      durations: [480],
      channels: [0],
    };
    expect(noteChecksum(columns)).toBe(noteChecksum({ ...columns }));
    expect(noteChecksum(columns)).not.toBe(
      noteChecksum({ ...columns, notes: [61] }),
    );
  });
});
