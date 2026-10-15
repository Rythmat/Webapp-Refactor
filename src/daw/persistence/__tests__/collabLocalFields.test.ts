// @vitest-environment jsdom
/**
 * What a collaborative session's shared doc must leave alone in each user's
 * store, and what joining repairs in it.
 *
 * The doc never holds a user's own device and monitoring state (yMapToTrack
 * fills in defaults), so a remote edit to any track, or the pull on joining,
 * must carry each track's local values over by id. It used to carry only
 * mute/solo/arm/monitoring, so a collaborator's edit disconnected everyone's
 * live input (audit live-input-02, state-reload-11, collab-08).
 *
 * Chord ids used to come from a per-page counter, so a room can hold two
 * regions with one id; joining gives the repeat a fresh id in the doc itself,
 * so every peer agrees (state-reload-05).
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { ORIGIN_LOCAL } from '@/daw/collab/types';
import {
  chordRegionToYMap,
  getYChordRegions,
  getYTracks,
  trackToYMap,
} from '@/daw/collab/YjsDocManager';
import {
  observeYjsAndPushToStore,
  pullDocIntoStore,
} from '@/daw/collab/yjsToZustand';
import type { AllSlices } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Track } from '@/daw/store/tracksSlice';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'g1',
    name: 'Guitar',
    type: 'audio',
    instrument: 'guitar-fx',
    color: '#ff0000',
    mute: false,
    solo: false,
    volume: 0.8,
    pan: 0,
    recordArmed: false,
    monitoring: false,
    midiInputId: null,
    audioInputId: null,
    audioInputChannel: { mode: 'mono', channel: 0 },
    effects: structuredClone(DEFAULT_EFFECTS),
    activeEffects: [],
    midiClips: [],
    audioClips: [],
    trackRole: 'auto',
    ...overrides,
  };
}

/** This user's own state on the guitar: none of it is in the doc. */
const MINE: Partial<Track> = {
  mute: true,
  recordArmed: true,
  monitoring: true,
  midiInputId: 'keyboard-1',
  audioInputId: 'interface-1',
  audioInputChannel: { mode: 'stereo', left: 2, right: 3 },
  audioMidiSource: { enabled: true, sourceTrackId: null, mode: 'poly' },
};

/** A tiny store: the state the bridge reads, and what it was handed. */
function fakeStore(initial: Partial<AllSlices>) {
  let state = initial as AllSlices;
  return {
    get: () => state,
    set: (patch: Partial<AllSlices>) => {
      state = { ...state, ...patch };
    },
  };
}

const chord = (id: string, startTick: number): ChordRegion => ({
  id,
  startTick,
  endTick: startTick + 1920,
  name: '1 major',
  noteName: 'C',
  color: [255, 0, 0],
});

describe('joining a room (pullDocIntoStore)', () => {
  it('keeps this user’s routing and monitoring on every track', () => {
    const doc = new Y.Doc();
    getYTracks(doc).push([trackToYMap(makeTrack({ volume: 0.5 }))]);
    const store = fakeStore({ tracks: [makeTrack(MINE)] });

    pullDocIntoStore(doc, store.set, store.get);

    expect(store.get().tracks[0]).toMatchObject({ ...MINE, volume: 0.5 });
  });

  it('a track new to this user gets the doc’s defaults', () => {
    const doc = new Y.Doc();
    getYTracks(doc).push([trackToYMap(makeTrack({ id: 'other' }))]);
    const store = fakeStore({ tracks: [makeTrack(MINE)] });

    pullDocIntoStore(doc, store.set, store.get);

    expect(store.get().tracks[0]).toMatchObject({
      id: 'other',
      audioInputChannel: null,
      monitoring: false,
    });
  });

  it('reads a role missing from an older peer’s doc as auto', () => {
    const doc = new Y.Doc();
    const yTrack = trackToYMap(makeTrack({ trackRole: 'melody' }));
    getYTracks(doc).push([yTrack]);
    getYTracks(doc).get(0).delete('trackRole');
    const store = fakeStore({ tracks: [] });

    pullDocIntoStore(doc, store.set, store.get);

    expect(store.get().tracks[0].trackRole).toBe('auto');
  });

  it('gives a repeated chord id a fresh one, in the doc too', () => {
    const doc = new Y.Doc();
    const undo = new Y.UndoManager(getYChordRegions(doc), {
      trackedOrigins: new Set([ORIGIN_LOCAL]),
    });
    getYChordRegions(doc).push([
      chordRegionToYMap(chord('cr-1', 0)),
      chordRegionToYMap(chord('cr-1', 1920)),
    ]);
    const store = fakeStore({ tracks: [], chordRegions: [] });

    pullDocIntoStore(doc, store.set, store.get);

    const docIds = getYChordRegions(doc)
      .toArray()
      .map((m) => m.get('id'));
    expect(docIds[0]).toBe('cr-1');
    expect(new Set(docIds).size).toBe(2);
    expect(store.get().chordRegions.map((r) => r.id)).toEqual(docIds);
    // The repair is not the student's edit, so undo never reverts it.
    expect(undo.canUndo()).toBe(false);
  });
});

describe('a collaborator edits a track', () => {
  it('leaves this user’s routing and monitoring as they were', () => {
    const doc = new Y.Doc();
    getYTracks(doc).push([trackToYMap(makeTrack())]);
    const store = fakeStore({
      tracks: [makeTrack(MINE)],
      isRecording: false,
    });
    const dispose = observeYjsAndPushToStore(
      doc,
      store.set,
      () => false,
      store.get,
      () => () => {},
    );

    // A remote transaction: any origin but the local bridge's.
    doc.transact(() => getYTracks(doc).get(0).set('volume', 0.25), 'remote');
    dispose();

    expect(store.get().tracks[0]).toMatchObject({ ...MINE, volume: 0.25 });
  });
});
