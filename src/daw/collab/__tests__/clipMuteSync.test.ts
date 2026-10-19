import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import type { AllSlices } from '@/daw/store/index';
import type { AudioClip, MidiClip, Track } from '@/daw/store/tracksSlice';
import { COLLAB_DOC_SCHEMA_VERSION } from '../types';
import { diffAndApply } from '../diffEngine';
import { getYTracks, trackToYMap, yMapToTrack } from '../YjsDocManager';

// ── A clip's mute and an audio clip's name in the room (milestone 2.12) ────
// Doc schema 2: clips carry `muted` (only while muted) and audio clips their
// own `name`, both ways, and a change to either reaches the doc. A clip from
// an older peer has neither, and reads as playing and unnamed. Run:
// npx vitest run src/daw/collab/__tests__/clipMuteSync.test.ts

const midiClip: MidiClip = {
  id: 'm1',
  name: 'Riff',
  startTick: 0,
  events: [
    { note: 60, velocity: 100, startTick: 0, durationTicks: 480, channel: 0 },
  ],
};
const audioClip: AudioClip = {
  id: 'a1',
  startTick: 1920,
  duration: 1920,
  fadeInTicks: 0,
  fadeOutTicks: 0,
  assetId: 'asset-1',
};

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 't1',
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
    midiClips: [],
    audioClips: [],
    trackRole: 'auto',
    ...overrides,
  };
}

/** A doc holding `track`, and the track as the doc gives it back. */
function roundTrip(track: Track): Track {
  const doc = new Y.Doc();
  getYTracks(doc).push([trackToYMap(track)]);
  return yMapToTrack(getYTracks(doc).get(0));
}

describe('clip mute and name in the doc', () => {
  it('needs doc schema 2 or later', () => {
    expect(COLLAB_DOC_SCHEMA_VERSION).toBeGreaterThanOrEqual(2);
  });

  it('round-trips a muted MIDI clip and a named, muted audio clip', () => {
    const track = makeTrack({
      midiClips: [{ ...midiClip, muted: true }],
      audioClips: [{ ...audioClip, name: 'Take 2', muted: true }],
    });
    const back = roundTrip(track);
    expect(back.midiClips[0].muted).toBe(true);
    expect(back.audioClips[0]).toMatchObject({ name: 'Take 2', muted: true });
  });

  it('writes no key for a playing, unnamed clip, and reads one as such', () => {
    const doc = new Y.Doc();
    getYTracks(doc).push([
      trackToYMap(
        makeTrack({ midiClips: [midiClip], audioClips: [audioClip] }),
      ),
    ]);
    const yTrack = getYTracks(doc).get(0);
    const yMidi = (yTrack.get('midiClips') as Y.Array<Y.Map<unknown>>).get(0);
    const yAudio = (yTrack.get('audioClips') as Y.Array<Y.Map<unknown>>).get(0);
    expect(yMidi.has('muted')).toBe(false);
    expect(yAudio.has('muted')).toBe(false);
    expect(yAudio.has('name')).toBe(false);
    const back = yMapToTrack(yTrack);
    expect(back.midiClips[0].muted).toBeUndefined();
    expect(back.audioClips[0].muted).toBeUndefined();
    expect(back.audioClips[0].name).toBeUndefined();
  });

  it('sends a mute, an unmute and a rename to the room', () => {
    const doc = new Y.Doc();
    const before = makeTrack({
      midiClips: [midiClip],
      audioClips: [audioClip],
    });
    getYTracks(doc).push([trackToYMap(before)]);
    const apply = (prev: Track, next: Track) =>
      doc.transact(() =>
        diffAndApply(
          doc,
          { tracks: [prev] } as unknown as AllSlices,
          { tracks: [next] } as unknown as AllSlices,
        ),
      );

    const muted = makeTrack({
      midiClips: [{ ...midiClip, muted: true }],
      audioClips: [{ ...audioClip, name: 'Take 2', muted: true }],
    });
    apply(before, muted);
    let back = yMapToTrack(getYTracks(doc).get(0));
    expect(back.midiClips[0].muted).toBe(true);
    expect(back.audioClips[0]).toMatchObject({ name: 'Take 2', muted: true });

    const unmuted = makeTrack({
      midiClips: [{ ...midiClip, muted: undefined }],
      audioClips: [{ ...audioClip, name: undefined, muted: undefined }],
    });
    apply(muted, unmuted);
    back = yMapToTrack(getYTracks(doc).get(0));
    expect(back.midiClips[0].muted).toBeUndefined();
    expect(back.audioClips[0].muted).toBeUndefined();
    expect(back.audioClips[0].name).toBeUndefined();
  });
});
