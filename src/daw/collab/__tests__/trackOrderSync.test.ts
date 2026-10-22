import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import type { AllSlices } from '@/daw/store/index';
import type { Track } from '@/daw/store/tracksSlice';
import { diffAndApply } from '../diffEngine';
import { getYTracks, trackToYMap } from '../YjsDocManager';

// ── An added track keeps its place in the room (milestone 2.15) ────────────
// A peer builds its track list in the doc's order. Every added track used to
// be pushed at the end, so a duplicate put right after its source showed last
// for a partner, and jumped there here on the next remote edit. It now goes
// in after the nearest earlier track the doc holds.

function makeTrack(id: string): Track {
  return {
    id,
    name: id.toUpperCase(),
    type: 'midi',
    instrument: 'soundfont',
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
    trackRole: 'auto',
  };
}

/** A doc holding `ids`, and the list as the store had it. */
function room(ids: string[]): { doc: Y.Doc; tracks: Track[] } {
  const doc = new Y.Doc();
  const tracks = ids.map(makeTrack);
  getYTracks(doc).push(tracks.map(trackToYMap));
  return { doc, tracks };
}

/** Writes the store's change from `prev` to `next` to the doc. */
function write(doc: Y.Doc, prev: Track[], next: Track[]): void {
  doc.transact(() =>
    diffAndApply(
      doc,
      { tracks: prev } as unknown as AllSlices,
      { tracks: next } as unknown as AllSlices,
    ),
  );
}

const docOrder = (doc: Y.Doc) =>
  getYTracks(doc)
    .toArray()
    .map((m) => m.get('id'));

describe('diffTracks: where an added track goes', () => {
  it('puts a track added between two others between them', () => {
    const { doc, tracks } = room(['a', 'b', 'c']);
    const next = [tracks[0], makeTrack('a2'), tracks[1], tracks[2]];
    write(doc, tracks, next);
    expect(docOrder(doc)).toEqual(['a', 'a2', 'b', 'c']);
  });

  it('keeps the order of tracks added in a row', () => {
    const { doc, tracks } = room(['a', 'b']);
    const next = [tracks[0], makeTrack('x'), makeTrack('y'), tracks[1]];
    write(doc, tracks, next);
    expect(docOrder(doc)).toEqual(['a', 'x', 'y', 'b']);
  });

  it('puts a track added at the start first', () => {
    const { doc, tracks } = room(['a', 'b']);
    write(doc, tracks, [makeTrack('z'), makeTrack('z2'), ...tracks]);
    expect(docOrder(doc)).toEqual(['z', 'z2', 'a', 'b']);
  });

  it('still appends a track added at the end', () => {
    const { doc, tracks } = room(['a', 'b']);
    write(doc, tracks, [...tracks, makeTrack('c')]);
    expect(docOrder(doc)).toEqual(['a', 'b', 'c']);
  });

  it('follows the doc where its order differs from the list', () => {
    // Moving a track isn't synced, so the doc can hold another order: the
    // new track still lands after the one it follows here.
    const { doc, tracks } = room(['b', 'a']);
    const [b, a] = tracks;
    write(doc, [a, b], [a, makeTrack('a2'), b]);
    expect(docOrder(doc)).toEqual(['b', 'a', 'a2']);
  });

  it('places an added track among a removal', () => {
    const { doc, tracks } = room(['a', 'b', 'c']);
    const next = [tracks[0], makeTrack('n'), tracks[2]];
    write(doc, tracks, next);
    expect(docOrder(doc)).toEqual(['a', 'n', 'c']);
  });

  it('starts an empty room with the tracks in order', () => {
    const { doc } = room([]);
    write(doc, [], [makeTrack('a'), makeTrack('b')]);
    expect(docOrder(doc)).toEqual(['a', 'b']);
  });
});
