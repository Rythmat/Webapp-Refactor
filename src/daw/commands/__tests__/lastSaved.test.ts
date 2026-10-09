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
  cloudOpenedRecord,
  cloudRecordFromLastSaved,
  documentOnlyGroups,
  formatGroups,
  groupsFromGaps,
  lastSavedFromDraft,
  projectHoldsDocumentOnlyData,
  stayOnDevicePhrase,
  stayVerb,
} from '../lastSaved';

// What today's cloud copy holds of the project, for the chip and the save
// toast (decision D7): 1.3's cloudSaveGaps, in words a student reads.

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

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

describe('projectHoldsDocumentOnlyData', () => {
  it('is false for tracks and notes only (note ids are derived again)', () => {
    notesOnly();
    expect(projectHoldsDocumentOnlyData()).toBe(false);
    expect(documentOnlyGroups()).toEqual([]);
  });

  it('is true once the project has what only 1.5 carries', () => {
    notesOnly();
    s().setChordRegions([REGION], true);
    s().addMarker(1920, 'Chorus');
    s().setTimeSignature(3, 4);
    s().setMode('dorian');
    expect(projectHoldsDocumentOnlyData()).toBe(true);
    expect(documentOnlyGroups()).toEqual([
      'chord symbols',
      'markers',
      'time signature',
      'mode',
    ]);
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
    });
    expect(record).toMatchObject({
      projectId: 'p1',
      fingerprint: hashFingerprint(documentFingerprint()),
      version: useSaveStatusStore.getState().documentVersion,
      complete: true,
      updatedAt: '2026-10-08T09:00:00.000Z',
      generation: getSessionGeneration(),
    });

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

  it('is nothing without a record, or for another project', () => {
    expect(lastSavedFromDraft(undefined, 'p1')).toBeNull();
    expect(lastSavedFromDraft(cloud, null)).toBeNull();
    expect(lastSavedFromDraft(cloud, 'p2')).toBeNull();
  });
});
