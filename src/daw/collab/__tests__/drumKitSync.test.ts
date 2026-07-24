import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import type { AllSlices } from '@/daw/store/index';
import type { Track } from '@/daw/store/tracksSlice';
import { diffAndApply } from '../diffEngine';
import { getYTracks, trackToYMap, yMapToTrack } from '../YjsDocManager';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'd1',
    name: 'Drums',
    type: 'midi',
    instrument: 'drum-machine',
    color: '#ff0000',
    mute: false,
    solo: false,
    volume: 0.8,
    pan: 0,
    recordArmed: false,
    monitoring: false,
    midiInputId: null,
    audioInputId: null,
    audioInputChannel: null,
    effects: structuredClone(DEFAULT_EFFECTS),
    activeEffects: [],
    midiClips: [],
    audioClips: [],
    trackRole: 'drums',
    ...overrides,
  };
}

/** Integrate a preliminary track Y.Map into a doc so it becomes readable. */
function integrated(m: Y.Map<unknown>): Y.Map<unknown> {
  const doc = new Y.Doc();
  getYTracks(doc).push([m]);
  return getYTracks(doc).get(0);
}

describe('drumKit collab sync', () => {
  it('round-trips drumKit through trackToYMap → yMapToTrack', () => {
    const track = makeTrack({ drumKit: '808' });
    const restored = yMapToTrack(integrated(trackToYMap(track)));
    expect(restored.drumKit).toBe('808');
  });

  it('leaves drumKit undefined when unset', () => {
    const restored = yMapToTrack(integrated(trackToYMap(makeTrack())));
    expect(restored.drumKit).toBeUndefined();
  });

  it('diffAndApply writes a kit-only change to the shared doc', () => {
    const doc = new Y.Doc();
    const before = makeTrack();
    getYTracks(doc).push([trackToYMap(before)]);

    const after = makeTrack({ drumKit: 'house' });
    const prev = { tracks: [before] } as unknown as AllSlices;
    const next = { tracks: [after] } as unknown as AllSlices;
    doc.transact(() => diffAndApply(doc, prev, next));

    const yTrack = getYTracks(doc).get(0);
    expect(yTrack.get('drumKit')).toBe('house');
    expect(yMapToTrack(yTrack).drumKit).toBe('house');
  });
});

describe('samplerSample collab sync', () => {
  const sample = {
    sampleId: 'smp-1',
    assetId: 'asset-1',
    rootNote: 'C4',
    attack: 0.005,
    release: 0.25,
    name: 'vox.wav',
  };

  it('round-trips samplerSample through trackToYMap → yMapToTrack', () => {
    const restored = yMapToTrack(
      integrated(trackToYMap(makeTrack({ samplerSample: sample }))),
    );
    expect(restored.samplerSample).toEqual(sample);
  });

  it('leaves samplerSample undefined when unset', () => {
    const restored = yMapToTrack(integrated(trackToYMap(makeTrack())));
    expect(restored.samplerSample).toBeUndefined();
  });

  it('backfills a deterministic sampleId for pre-sampleId docs', () => {
    // Simulate a doc written before the sampleId field existed
    const m = trackToYMap(makeTrack());
    m.set(
      'samplerSample',
      JSON.stringify({
        assetId: 'a9',
        rootNote: 'C4',
        attack: 0,
        release: 0.2,
      }),
    );
    const yTrack = integrated(m);
    expect(yMapToTrack(yTrack).samplerSample?.sampleId).toBe('legacy-a9');
    // Re-reading must produce the SAME id — random backfill would churn
    // track identity on every remote update.
    expect(yMapToTrack(yTrack).samplerSample?.sampleId).toBe('legacy-a9');
  });

  it('diffAndApply writes a sample-only change and a clear', () => {
    const doc = new Y.Doc();
    const before = makeTrack();
    getYTracks(doc).push([trackToYMap(before)]);

    const after = makeTrack({ samplerSample: sample });
    doc.transact(() =>
      diffAndApply(
        doc,
        { tracks: [before] } as unknown as AllSlices,
        { tracks: [after] } as unknown as AllSlices,
      ),
    );
    const yTrack = getYTracks(doc).get(0);
    expect(JSON.parse(yTrack.get('samplerSample') as string)).toEqual(sample);
    expect(yMapToTrack(yTrack).samplerSample).toEqual(sample);

    // Clearing the sample propagates as null → undefined on read
    doc.transact(() =>
      diffAndApply(
        doc,
        { tracks: [after] } as unknown as AllSlices,
        { tracks: [makeTrack()] } as unknown as AllSlices,
      ),
    );
    expect(yMapToTrack(getYTracks(doc).get(0)).samplerSample).toBeUndefined();
  });
});

describe('automation collab sync', () => {
  const lanes = {
    volume: [
      { tick: 0, value: 1 },
      { tick: 480, value: 0.2 },
    ],
    'effect.reverb.wet': [{ tick: 240, value: 0.6 }],
  };

  it('round-trips automation through trackToYMap → yMapToTrack', () => {
    const restored = yMapToTrack(
      integrated(trackToYMap(makeTrack({ automation: lanes }))),
    );
    expect(restored.automation).toEqual(lanes);
  });

  it('leaves automation undefined when unset', () => {
    const restored = yMapToTrack(integrated(trackToYMap(makeTrack())));
    expect(restored.automation).toBeUndefined();
  });

  it('diffAndApply writes an automation-only change and a clear', () => {
    const doc = new Y.Doc();
    const before = makeTrack();
    getYTracks(doc).push([trackToYMap(before)]);

    const after = makeTrack({ automation: lanes });
    doc.transact(() =>
      diffAndApply(
        doc,
        { tracks: [before] } as unknown as AllSlices,
        { tracks: [after] } as unknown as AllSlices,
      ),
    );
    const yTrack = getYTracks(doc).get(0);
    expect(JSON.parse(yTrack.get('automation') as string)).toEqual(lanes);
    expect(yMapToTrack(yTrack).automation).toEqual(lanes);

    // Removing all lanes propagates as null → undefined on read
    doc.transact(() =>
      diffAndApply(
        doc,
        { tracks: [after] } as unknown as AllSlices,
        { tracks: [makeTrack()] } as unknown as AllSlices,
      ),
    );
    expect(yMapToTrack(getYTracks(doc).get(0)).automation).toBeUndefined();
  });
});
