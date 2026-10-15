/**
 * Notes that reach this client through the room sharing an id.
 *
 * An older peer keeps each note's `_cid` on its store's notes and copies it
 * along when it duplicates a clip or pastes notes, so one update from it can
 * hold two notes with the same `_cid`. The store must come out of it with
 * every id whole and unique, settled without minting (yjsToZustand's
 * settleNoteIds): the same edits give the same ids on every client. The note
 * this client already held keeps its id, wherever the copy lands, as with a
 * copy made here; a repeat it never held stays with the first note in the
 * doc's order.
 *
 * Run: npx vitest run src/daw/collab/__tests__/remoteNoteIdRepeats.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import type { MidiNoteEvent } from '@prism/engine';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import {
  assertNoteIds,
  legacyNoteId,
  mintNoteIds,
  noteIdFromCid,
} from '@/daw/model/noteIds';
import type { AllSlices } from '@/daw/store';
import type { MidiClip, Track } from '@/daw/store/tracksSlice';
import { getYTracks, trackToYMap } from '../YjsDocManager';
import { observeYjsAndPushToStore, pullDocIntoStore } from '../yjsToZustand';

const note = (
  startTick: number,
  pitch: number,
  id?: string,
): MidiNoteEvent => ({
  ...(id === undefined ? {} : { id }),
  note: pitch,
  velocity: 100,
  startTick,
  durationTicks: 240,
  channel: 0,
});

function track(id: string, midiClips: MidiClip[]): Track {
  return {
    id,
    name: id,
    type: 'midi',
    instrument: 'piano-sampler',
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
    midiClips,
    audioClips: [],
    trackRole: 'auto',
  };
}

/** A note as an older peer writes it: `_cid` is whatever its note held. */
function olderPeerNote(
  cid: string,
  startTick: number,
  pitch: number,
): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('_cid', cid);
  m.set('note', pitch);
  m.set('velocity', 100);
  m.set('startTick', startTick);
  m.set('durationTicks', 240);
  m.set('channel', 0);
  return m;
}

/** The events of clip `clip` of track `trackIndex` in `doc`. */
const yEventsOf = (doc: Y.Doc, trackIndex: number, clip = 0) =>
  (getYTracks(doc).get(trackIndex).get('midiClips') as Y.Array<Y.Map<unknown>>)
    .get(clip)
    .get('events') as Y.Array<Y.Map<unknown>>;

/** A tiny store: the state the bridge reads, and what it was handed. */
function fakeStore(tracks: Track[]) {
  let state = { tracks, isRecording: false } as unknown as AllSlices;
  return {
    get: () => state,
    set: (patch: Partial<AllSlices>) => {
      state = { ...state, ...patch };
    },
  };
}

/**
 * A client in the room: its store holds `tracks`, and its doc mirrors them,
 * as the one that made the room (or as a copy of `room`'s doc, synced).
 */
function client(tracks: Track[], room?: Y.Doc) {
  const doc = new Y.Doc();
  if (room) Y.applyUpdate(doc, Y.encodeStateAsUpdate(room), 'network');
  else getYTracks(doc).push(tracks.map(trackToYMap));
  const store = fakeStore(tracks);
  const stop = observeYjsAndPushToStore(
    doc,
    store.set,
    () => false,
    store.get,
    () => () => {},
  );
  return { doc, store, stop };
}

/** An older peer that has synced `doc`. */
function olderPeerOf(doc: Y.Doc): Y.Doc {
  const peer = new Y.Doc();
  Y.applyUpdate(peer, Y.encodeStateAsUpdate(doc), 'network');
  return peer;
}

/** What `edit` on `peer` sends to the room: one update. */
function updateFrom(peer: Y.Doc, edit: () => void): Uint8Array {
  const before = Y.encodeStateVector(peer);
  peer.transact(edit, 'older-peer');
  return Y.encodeStateAsUpdate(peer, before);
}

/** Every random draw while `run` runs: a mint would make one. */
function randomDrawsDuring(run: () => void): number {
  const values = vi.spyOn(crypto, 'getRandomValues');
  const uuids = vi.spyOn(crypto, 'randomUUID');
  run();
  const draws = values.mock.calls.length + uuids.mock.calls.length;
  values.mockRestore();
  uuids.mockRestore();
  return draws;
}

const idsOf = (tracks: readonly Track[]) =>
  tracks.map((t) => t.midiClips.map((c) => c.events.map((e) => e.id)));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('an update holding two notes with the same _cid', () => {
  it('keeps the original its ids when an older peer pastes a copy on a track above', () => {
    const ids = mintNoteIds(2);
    const keys = track('keys', [
      {
        id: 'verse',
        startTick: 0,
        events: [note(0, 60, ids[0]), note(480, 62, ids[1])],
      },
    ]);
    const me = client([keys]);
    const peer = olderPeerOf(me.doc);
    const update = updateFrom(peer, () => {
      getYTracks(peer).insert(0, [
        trackToYMap(
          track('pad', [{ id: 'verse-copy', startTick: 0, events: [] }]),
        ),
      ]);
      yEventsOf(peer, 0).push([
        olderPeerNote(ids[0], 0, 60),
        olderPeerNote(ids[1], 480, 62),
      ]);
    });

    expect(
      randomDrawsDuring(() => Y.applyUpdate(me.doc, update, 'network')),
    ).toBe(0);
    const tracks = me.store.get().tracks;
    expect(tracks.map((t) => t.id)).toEqual(['pad', 'keys']);
    expect(assertNoteIds(tracks)).toEqual([]);
    // By the doc's order alone the copy, on the first track, would have kept
    // them.
    expect(idsOf(tracks)).toEqual([
      [[legacyNoteId('verse-copy', 0), legacyNoteId('verse-copy', 1)]],
      [ids],
    ]);
    me.stop();
  });

  it('keeps the id with the note where it was when an older peer pastes a note into its clip', () => {
    const ids = mintNoteIds(2);
    const me = client([
      track('keys', [
        {
          id: 'verse',
          startTick: 0,
          events: [note(0, 60, ids[0]), note(480, 62, ids[1])],
        },
      ]),
    ]);
    const peer = olderPeerOf(me.doc);
    // An older peer rewrites a clip's whole events array, here with the
    // pasted copy of the first note ahead of it.
    const update = updateFrom(peer, () => {
      const events = yEventsOf(peer, 0);
      events.delete(0, events.length);
      events.push([
        olderPeerNote(ids[0], 960, 60),
        olderPeerNote(ids[0], 0, 60),
        olderPeerNote(ids[1], 480, 62),
      ]);
    });

    expect(
      randomDrawsDuring(() => Y.applyUpdate(me.doc, update, 'network')),
    ).toBe(0);
    const tracks = me.store.get().tracks;
    expect(assertNoteIds(tracks)).toEqual([]);
    // The paste is third in the clip's (startTick, note) order.
    expect(idsOf(tracks)).toEqual([[[legacyNoteId('verse', 2), ...ids]]]);
    me.stop();
  });

  it('gives the first note in the doc a repeat this client never held', () => {
    const uuid = '6f0c1a52-2c1e-4c8e-9f6a-0d5a1c9e7b11';
    const me = client([]);
    const peer = olderPeerOf(me.doc);
    const update = updateFrom(peer, () => {
      getYTracks(peer).push([
        trackToYMap(track('bass', [{ id: 'riff', startTick: 0, events: [] }])),
      ]);
      yEventsOf(peer, 0).push([
        olderPeerNote(uuid, 0, 40),
        olderPeerNote(uuid, 480, 43),
      ]);
    });

    expect(
      randomDrawsDuring(() => Y.applyUpdate(me.doc, update, 'network')),
    ).toBe(0);
    expect(idsOf(me.store.get().tracks)).toEqual([
      [[noteIdFromCid(uuid), legacyNoteId('riff', 1)]],
    ]);
    me.stop();
  });

  it('settles on the same ids on every client that saw the same edits', () => {
    const ids = mintNoteIds(2);
    const keys = track('keys', [
      {
        id: 'verse',
        startTick: 0,
        events: [note(0, 60, ids[0]), note(480, 62, ids[1])],
      },
    ]);
    const first = client([keys]);
    const second = client([keys], first.doc);
    const peer = olderPeerOf(first.doc);
    const update = updateFrom(peer, () => {
      getYTracks(peer).insert(0, [
        trackToYMap(
          track('pad', [{ id: 'verse-copy', startTick: 0, events: [] }]),
        ),
      ]);
      yEventsOf(peer, 0).push([
        olderPeerNote(ids[0], 0, 60),
        olderPeerNote(ids[1], 480, 62),
      ]);
    });
    Y.applyUpdate(first.doc, update, 'network');
    Y.applyUpdate(second.doc, update, 'network');

    expect(idsOf(second.store.get().tracks)).toEqual(
      idsOf(first.store.get().tracks),
    );
    first.stop();
    second.stop();
  });

  it('holds the settled ids still through the room’s next edits', () => {
    const ids = mintNoteIds(2);
    const me = client([
      track('keys', [
        {
          id: 'verse',
          startTick: 0,
          events: [note(0, 60, ids[0]), note(480, 62, ids[1])],
        },
      ]),
    ]);
    const peer = olderPeerOf(me.doc);
    Y.applyUpdate(
      me.doc,
      updateFrom(peer, () => {
        getYTracks(peer).insert(0, [
          trackToYMap(
            track('pad', [{ id: 'verse-copy', startTick: 0, events: [] }]),
          ),
        ]);
        yEventsOf(peer, 0).push([
          olderPeerNote(ids[0], 0, 60),
          olderPeerNote(ids[1], 480, 62),
        ]);
      }),
      'network',
    );
    const settled = idsOf(me.store.get().tracks);

    // The doc still holds the repeats: the next rebuild settles them the
    // same way.
    Y.applyUpdate(
      me.doc,
      updateFrom(peer, () => getYTracks(peer).get(1).set('volume', 0.5)),
      'network',
    );
    expect(me.store.get().tracks[1].volume).toBe(0.5);
    expect(idsOf(me.store.get().tracks)).toEqual(settled);
    me.stop();
  });
});

describe('a joiner’s first read', () => {
  it('settles repeats by the doc’s order, the same for every joiner, minting nothing', () => {
    const uuid = '0b6d7c3e-5d0f-4b8a-a2a4-8f1e2d3c4b5a';
    const doc = new Y.Doc();
    getYTracks(doc).push([
      trackToYMap(track('keys', [{ id: 'verse', startTick: 0, events: [] }])),
    ]);
    yEventsOf(doc, 0).push([
      olderPeerNote(uuid, 0, 60),
      olderPeerNote(uuid, 480, 62),
    ]);

    const a = fakeStore([]);
    const b = fakeStore([]);
    expect(
      randomDrawsDuring(() => {
        pullDocIntoStore(doc, a.set, a.get);
        pullDocIntoStore(doc, b.set, b.get);
      }),
    ).toBe(0);
    expect(idsOf(a.get().tracks)).toEqual([
      [[noteIdFromCid(uuid), legacyNoteId('verse', 1)]],
    ]);
    expect(idsOf(b.get().tracks)).toEqual(idsOf(a.get().tracks));
  });
});
