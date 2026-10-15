/**
 * Note ids in a collaborative session.
 *
 * A note's stored id rides in the Y key `_cid`, which every version of the
 * doc has used for a note's identity, so the doc keeps its shape and needs no
 * schema bump. Older (v1) peers stay in the room: they mint a random UUID
 * `_cid` for every note of their own on every edit, carry a `_cid` they read
 * along unchanged, and copy it when they duplicate a clip. None of that may
 * leave this client's store with a note lacking an id, or two notes sharing
 * one; and ids this client wrote must survive a v1 peer's edits.
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { MidiNoteEvent } from '@prism/engine';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import {
  assertNoteIds,
  isNoteId,
  legacyNoteId,
  mintNoteId,
  noteIdFromCid,
} from '@/daw/model/noteIds';
import type { AllSlices } from '@/daw/store';
import type { MidiClip, Track } from '@/daw/store/tracksSlice';
import { diffAndApply } from '../diffEngine';
import { ORIGIN_LOCAL } from '../types';
import {
  getYTracks,
  midiEventToYMap,
  trackToYMap,
  yMapToMidiEvent,
} from '../YjsDocManager';
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

function makeTrack(midiClips: MidiClip[], id = 'keys'): Track {
  return {
    id,
    name: 'Keys',
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
    trackRole: 'chords',
  };
}

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

/** Two docs that pass every update to each other, as the room does. */
function room() {
  const mine = new Y.Doc();
  const theirs = new Y.Doc();
  mine.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'network') Y.applyUpdate(theirs, update, 'network');
  });
  theirs.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'network') Y.applyUpdate(mine, update, 'network');
  });
  return { mine, theirs };
}

// ── A v1 peer, as it shipped before note ids ───────────────────────────────

type V1Event = MidiNoteEvent & { _cid?: string };

/** v1 midiEventToYMap: `_cid` from the event, else a random UUID. */
function v1EventToYMap(ev: V1Event): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('_cid', ev._cid ?? crypto.randomUUID());
  m.set('note', ev.note);
  m.set('velocity', ev.velocity);
  m.set('startTick', ev.startTick);
  m.set('durationTicks', ev.durationTicks);
  m.set('channel', ev.channel);
  return m;
}

/** v1 yMapToMidiEvent: puts `_cid` onto the store's events. */
function v1EventFromYMap(m: Y.Map<unknown>): V1Event {
  return {
    _cid: m.get('_cid') as string,
    note: m.get('note') as number,
    velocity: m.get('velocity') as number,
    startTick: m.get('startTick') as number,
    durationTicks: m.get('durationTicks') as number,
    channel: m.get('channel') as number,
  };
}

const clipAt = (doc: Y.Doc, clip: number) =>
  (getYTracks(doc).get(0).get('midiClips') as Y.Array<Y.Map<unknown>>).get(
    clip,
  );

/** What v1's diff does to a clip whose events changed: delete all, push all. */
function v1WriteEvents(doc: Y.Doc, clip: number, events: V1Event[]): void {
  doc.transact(() => {
    const yEvents = clipAt(doc, clip).get('events') as Y.Array<Y.Map<unknown>>;
    yEvents.delete(0, yEvents.length);
    yEvents.push(events.map(v1EventToYMap));
  }, 'v1-local');
}

/** v1's store copy of a clip's events, read back from its doc. */
function v1ReadEvents(doc: Y.Doc, clip: number): V1Event[] {
  return (clipAt(doc, clip).get('events') as Y.Array<Y.Map<unknown>>)
    .toArray()
    .map(v1EventFromYMap);
}

const eventsOf = (state: AllSlices, clip = 0) =>
  state.tracks[0].midiClips[clip].events;

describe('a note in the doc', () => {
  const integrated = (m: Y.Map<unknown>) => {
    const doc = new Y.Doc();
    const arr = doc.getArray<Y.Map<unknown>>('notes');
    arr.push([m]);
    return arr.get(0);
  };

  it('carries its id in _cid, and nothing else changes shape', () => {
    const id = mintNoteId();
    const m = integrated(midiEventToYMap(note(480, 64, id)));
    expect(m.get('_cid')).toBe(id);
    expect([...m.keys()].sort()).toEqual([
      '_cid',
      'channel',
      'durationTicks',
      'note',
      'startTick',
      'velocity',
    ]);
    const back = yMapToMidiEvent(m);
    expect(back).toEqual(note(480, 64, id));
    expect(back).not.toHaveProperty('_cid');
  });

  it('gets a fresh id in the doc when the store gave it none', () => {
    const m = integrated(midiEventToYMap(note(0, 60)));
    expect(isNoteId(m.get('_cid'))).toBe(true);
  });

  it('reads an older peer’s UUID _cid as the same derived id every time', () => {
    const uuid = '6f0c1a52-2c1e-4c8e-9f6a-0d5a1c9e7b11';
    const m = integrated(v1EventToYMap({ ...note(0, 60), _cid: uuid }));
    expect(yMapToMidiEvent(m).id).toBe(noteIdFromCid(uuid));
    expect(yMapToMidiEvent(m).id).toBe(yMapToMidiEvent(m).id);
  });
});

describe('ids across a room', () => {
  it('survive hydrate and a joiner’s pull exactly', () => {
    const ids = [mintNoteId(), mintNoteId()];
    const track = makeTrack([
      {
        id: 'clip',
        startTick: 0,
        events: [note(0, 60, ids[0]), note(480, 62, ids[1])],
      },
    ]);
    const { mine, theirs } = room();
    // What the owner's hydrate writes for the tracks.
    getYTracks(mine).push([trackToYMap(track)]);

    const joiner = fakeStore({ tracks: [] });
    pullDocIntoStore(theirs, joiner.set, joiner.get);
    expect(eventsOf(joiner.get()).map((e) => e.id)).toEqual(ids);
  });

  it('stay whole and stable through a v1 peer’s edits', () => {
    const { mine, theirs } = room();
    const store = fakeStore({ tracks: [], isRecording: false });
    const stop = observeYjsAndPushToStore(
      mine,
      store.set,
      () => false,
      store.get,
      () => () => {},
    );

    // The v1 peer starts the room with a clip of its own notes: random
    // UUIDs, re-minted on its every edit (its store never holds them).
    theirs.transact(() => {
      getYTracks(theirs).push([
        trackToYMap(makeTrack([{ id: 'clip', startTick: 0, events: [] }])),
      ]);
    }, 'v1-local');
    const v1Notes = [note(0, 60), note(480, 62), note(960, 64)];
    v1WriteEvents(theirs, 0, v1Notes);
    expect(assertNoteIds(store.get().tracks)).toEqual([]);
    const firstIds = eventsOf(store.get()).map((e) => e.id);
    expect(eventsOf(store.get()).some((e) => '_cid' in e)).toBe(false);

    // v1 moves a note: every `_cid` in the clip is new, and so is every id
    // read from them, but they are still whole.
    v1WriteEvents(theirs, 0, [note(0, 60), note(600, 62), note(960, 64)]);
    expect(assertNoteIds(store.get().tracks)).toEqual([]);
    expect(eventsOf(store.get()).map((e) => e.id)).not.toEqual(firstIds);

    // This client edits the clip: its ids go into `_cid`.
    const before = store.get();
    const edited = eventsOf(before).map((e, i) =>
      i === 0 ? { ...e, note: 61 } : e,
    );
    const after = {
      ...before,
      tracks: [
        {
          ...before.tracks[0],
          midiClips: [{ ...before.tracks[0].midiClips[0], events: edited }],
        },
      ],
    } as AllSlices;
    mine.transact(() => diffAndApply(mine, before, after), ORIGIN_LOCAL);
    store.set({ tracks: after.tracks });
    const myIds = edited.map((e) => e.id);
    expect(v1ReadEvents(theirs, 0).map((e) => e._cid)).toEqual(myIds);

    // v1 reads them onto its notes and writes them back on its next edit,
    // so they hold still here.
    const v1Store = v1ReadEvents(theirs, 0);
    v1WriteEvents(
      theirs,
      0,
      v1Store.map((e, i) => (i === 2 ? { ...e, velocity: 50 } : e)),
    );
    expect(eventsOf(store.get()).map((e) => e.id)).toEqual(myIds);
    expect(eventsOf(store.get())[2].velocity).toBe(50);

    // v1 duplicates the clip (structuredClone copies `_cid`): the copy's
    // notes get ids of their own, the original's keep theirs.
    theirs.transact(() => {
      const yClips = getYTracks(theirs).get(0).get('midiClips') as Y.Array<
        Y.Map<unknown>
      >;
      const copy = new Y.Map<unknown>();
      copy.set('id', 'clip-copy');
      copy.set('name', '');
      copy.set('startTick', 1920);
      copy.set('durationTicks', 0);
      const events = new Y.Array<Y.Map<unknown>>();
      events.push(structuredClone(v1ReadEvents(theirs, 0)).map(v1EventToYMap));
      copy.set('events', events);
      yClips.push([copy]);
    }, 'v1-local');
    const tracks = store.get().tracks;
    expect(assertNoteIds(tracks)).toEqual([]);
    expect(eventsOf(store.get(), 0).map((e) => e.id)).toEqual(myIds);
    expect(eventsOf(store.get(), 1).map((e) => e.id)).toEqual([
      legacyNoteId('clip-copy', 0),
      legacyNoteId('clip-copy', 1),
      legacyNoteId('clip-copy', 2),
    ]);

    // A second new client reading the same doc settles on the same ids.
    const other = fakeStore({ tracks: [] });
    pullDocIntoStore(mine, other.set, other.get);
    expect(
      other.get().tracks[0].midiClips.map((c) => c.events.map((e) => e.id)),
    ).toEqual(tracks[0].midiClips.map((c) => c.events.map((e) => e.id)));
    stop();
  });
});
