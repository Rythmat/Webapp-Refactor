import { beforeEach, describe, expect, it } from 'vitest';
import { resetSessionToEmpty } from '@/daw/persistence/SessionSerializer';
import {
  documentFingerprint,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import {
  noteCloudDocumentSupport,
  resetCloudDocumentSupport,
} from '@/lib/studio-projects/cloudDocumentSupport';
import {
  cloudGapMode,
  cloudOpenedRecord,
  cloudRecordFromLastSaved,
  cloudWriteMode,
  documentOnlyGroups,
  formatGroups,
  groupsFromGaps,
  lastSavedFromDraft,
  projectHoldsDocumentOnlyData,
  stayOnDevicePhrase,
  stayVerb,
} from '../lastSaved';

// What the cloud copy holds of the project, for the chip and the save toast
// (decision D7): 1.3's cloudSaveGaps in the mode a save writes (milestone
// 1.5: the cloud document in the API's field, or on the first track until
// the API has one), in words a student reads.

const s = () => useStore.getState();

const REGION: ChordRegion = {
  id: 'region-1',
  startTick: 0,
  endTick: 1920,
  name: 'Dm7',
  noteName: 'D',
  color: [120, 90, 200],
};

function notesOnly(): void {
  resetSessionToEmpty();
  const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keys, {
    id: 'clip-1',
    startTick: 0,
    events: [
      { note: 60, velocity: 90, startTick: 0, durationTicks: 480, channel: 0 },
      {
        note: 64,
        velocity: 90,
        startTick: 480,
        durationTicks: 480,
        channel: 0,
      },
    ],
  });
}

/** Everything only the cloud document carries, in a few kinds. */
function documentContent(): void {
  s().setChordRegions([REGION], true);
  s().addMarker(1920, 'Chorus');
  s().setTimeSignature(3, 4);
  s().setMode('dorian');
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  resetCloudDocumentSupport();
});

describe('where a save puts the cloud document', () => {
  it('on the first track until a project comes back with the field', () => {
    expect(cloudWriteMode()).toBe('interim');
    noteCloudDocumentSupport({ id: 'p1', tracks: [] });
    expect(cloudWriteMode()).toBe('interim');
    noteCloudDocumentSupport({ id: 'p1', tracks: [], document: null });
    expect(cloudWriteMode()).toBe('document');
    // A summary says nothing.
    noteCloudDocumentSupport({ id: 'p1', name: 'Song' });
    expect(cloudWriteMode()).toBe('document');
  });

  it('holds all of it, unless the fallback has no track to ride on', () => {
    resetSessionToEmpty();
    expect(cloudGapMode(s(), 'interim')).toBe('legacy');
    expect(cloudGapMode(s(), 'document')).toBe('document');
    notesOnly();
    expect(cloudGapMode(s(), 'interim')).toBe('document');
  });
});

describe('projectHoldsDocumentOnlyData', () => {
  it('is false for tracks and notes only (note ids are derived again)', () => {
    notesOnly();
    expect(projectHoldsDocumentOnlyData()).toBe(false);
    expect(documentOnlyGroups()).toEqual([]);
  });

  it('is false for what only the cloud document carries, with a track to carry it', () => {
    notesOnly();
    documentContent();
    expect(projectHoldsDocumentOnlyData()).toBe(false);
    expect(documentOnlyGroups()).toEqual([]);
  });

  it('is true for it in a project with no track, until the API has the field', () => {
    resetSessionToEmpty();
    documentContent();
    expect(projectHoldsDocumentOnlyData()).toBe(true);
    expect(documentOnlyGroups()).toEqual([
      'chord symbols',
      'markers',
      'time signature',
      'mode',
    ]);
    noteCloudDocumentSupport({ id: 'p1', tracks: [], document: null });
    expect(projectHoldsDocumentOnlyData()).toBe(false);
  });

  it('counts audio not uploaded, which the groups leave to their own warning', () => {
    notesOnly();
    const vox = s().addTrack('audio', 'vocal-fx', 'Vox');
    s().addAudioClip(vox, {
      id: 'take',
      startTick: 0,
      duration: 960,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: null,
    });
    expect(projectHoldsDocumentOnlyData()).toBe(true);
    expect(documentOnlyGroups()).toEqual([]);
  });
});

describe('formatGroups', () => {
  it('reads as a phrase', () => {
    expect(formatGroups([])).toBe('');
    expect(formatGroups(['chord symbols'])).toBe('chord symbols');
    expect(formatGroups(['chord symbols', 'notation'])).toBe(
      'chord symbols and notation',
    );
    expect(formatGroups(['chord symbols', 'notation', 'markers'])).toBe(
      'chord symbols, notation and markers',
    );
    expect(
      formatGroups([
        'chord symbols',
        'notation',
        'markers',
        'mode',
        'mastering',
      ]),
    ).toBe('chord symbols, notation and 3 more');
  });
});

describe('groupsFromGaps and stayOnDevicePhrase', () => {
  it('words the gaps a save took, in order, without audio', () => {
    expect(
      groupsFromGaps(['mode', 'AudioClip.assetId', 'chordRegions', 'markers']),
    ).toEqual(['chord symbols', 'markers', 'mode']);
  });

  it('agrees with its groups: one singular group “stays”', () => {
    expect(stayOnDevicePhrase([])).toBe('');
    expect(stayOnDevicePhrase(['notation'])).toBe(
      ' — notation stays on this device for now',
    );
    expect(stayOnDevicePhrase(['chord symbols'])).toBe(
      ' — chord symbols stay on this device for now',
    );
    expect(stayOnDevicePhrase(['notation', 'mode'])).toBe(
      ' — notation and mode stay on this device for now',
    );
  });

  it('picks the verb: one singular group “stays”, else “stay”', () => {
    expect(stayVerb(['notation'])).toBe('stays');
    expect(stayVerb(['chord symbols'])).toBe('stay');
    expect(stayVerb(['notation', 'mode'])).toBe('stay');
    expect(stayVerb([])).toBe('stay');
  });
});

describe('cloudOpenedRecord', () => {
  it('is the document as it stands, complete when the cloud holds it all', () => {
    notesOnly();
    const record = cloudOpenedRecord({
      id: 'p1',
      updatedAt: new Date('2026-10-08T09:00:00Z'),
      revision: 7,
    });
    expect(record).toMatchObject({
      projectId: 'p1',
      fingerprint: hashFingerprint(documentFingerprint()),
      version: useSaveStatusStore.getState().documentVersion,
      complete: true,
      updatedAt: '2026-10-08T09:00:00.000Z',
      revision: 7,
      generation: getSessionGeneration(),
    });
    expect(cloudOpenedRecord({ id: 'p1', updatedAt: null }).revision).toBe(
      null,
    );

    resetSessionToEmpty();
    s().setChordRegions([REGION], true);
    expect(cloudOpenedRecord({ id: 'p1', updatedAt: null }).complete).toBe(
      false,
    );
  });
});

describe('lastSavedFromDraft', () => {
  const cloud = {
    projectId: 'p1',
    updatedAt: '2026-10-08T09:00:00.000Z',
    savedFingerprint: 'h1:0123456789abcdef',
    savedComplete: true,
    savedAt: 1234,
  };

  it('is the draft’s last save, for the project the session is linked to', () => {
    const record = lastSavedFromDraft(cloud, 'p1');
    expect(record).toMatchObject({
      projectId: 'p1',
      fingerprint: cloud.savedFingerprint,
      version: -1,
      complete: true,
      updatedAt: cloud.updatedAt,
      at: 1234,
    });
    expect(cloudRecordFromLastSaved(record!)).toEqual(cloud);
  });

  it('carries the revision a save is based on, both ways', () => {
    const withRevision = { ...cloud, revision: 4 };
    const record = lastSavedFromDraft(withRevision, 'p1');
    expect(record?.revision).toBe(4);
    expect(cloudRecordFromLastSaved(record!)).toEqual(withRevision);
  });

  it('is nothing without a record, or for another project', () => {
    expect(lastSavedFromDraft(undefined, 'p1')).toBeNull();
    expect(lastSavedFromDraft(cloud, null)).toBeNull();
    expect(lastSavedFromDraft(cloud, 'p2')).toBeNull();
  });
});
