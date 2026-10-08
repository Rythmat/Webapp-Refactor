/**
 * What a track read from the room's doc holds where the doc says nothing.
 * Like every decoder, yMapToTrack takes the registry's plain track defaults
 * (trackFieldDefault with no new-track context): this person's own state on
 * the track, which never travels in the doc, and whatever an older peer
 * didn't write. Not a new track's defaults: those would switch an older
 * peer's drum machine compressor on and freeze a guessed role where 'auto'
 * follows the track's name.
 *
 * Run: npx vitest run src/daw/collab/__tests__/yMapToTrackDefaults.test.ts
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import {
  TRACK_PER_USER_FIELDS,
  trackFieldDefault,
} from '@/daw/persistence/projectDocument/fields';
import { initialTrackDefaults } from '@/daw/persistence/projectDocument/trackDefaults';
import type { AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { getYTracks, trackToYMap, yMapToTrack } from '../YjsDocManager';
import { pullDocIntoStore } from '../yjsToZustand';

/** A guitar track as its owner has it: armed, monitoring, on input 3/4. */
const guitar = (): Track => ({
  id: 'gtr',
  ...initialTrackDefaults('guitar-fx', 'Guitar'),
  color: '#f94144',
  mute: true,
  solo: true,
  recordArmed: true,
  monitoring: true,
  audioInputId: 'interface',
  audioInputChannel: { mode: 'stereo', left: 2, right: 3 },
});

/** `track` as the doc holds it, read back. */
function throughDoc(track: Track, edit?: (m: Y.Map<unknown>) => void): Track {
  const doc = new Y.Doc();
  const tracks = getYTracks(doc);
  tracks.push([trackToYMap(track)]);
  const m = tracks.get(0);
  edit?.(m);
  return yMapToTrack(m);
}

describe('a track read from the doc', () => {
  it("holds the plain defaults for this person's own state", () => {
    const read = throughDoc(guitar());
    for (const key of [...TRACK_PER_USER_FIELDS, 'mute', 'solo'] as const) {
      const expected = trackFieldDefault(key);
      if (expected === undefined) continue;
      expect({ key, value: read[key] }).toEqual({ key, value: expected });
    }
    // Not the new-track channel a live guitar starts on.
    expect(read.audioInputChannel).toBeNull();
  });

  it('keeps what the doc carries', () => {
    const track = guitar();
    const read = throughDoc(track);
    for (const key of [
      'id',
      'name',
      'type',
      'instrument',
      'color',
      'volume',
      'pan',
      'trackRole',
      'effects',
      'activeEffects',
      'midiClips',
      'audioClips',
    ] as const) {
      expect({ key, value: read[key] }).toEqual({ key, value: track[key] });
    }
  });

  it("reads an older peer's missing role as 'auto', not a guess", () => {
    const bass = { ...guitar(), name: 'Bass', instrument: 'bass-fx' as const };
    const read = throughDoc(bass, (m) => m.delete('trackRole'));
    expect(read.trackRole).toBe('auto');
    const blank = throughDoc(bass, (m) => m.set('trackRole', ''));
    expect(blank.trackRole).toBe('auto');
  });

  it("gives an older peer's drum machine plain effects, its compressor as it was", () => {
    const drums: Track = {
      id: 'drums',
      ...initialTrackDefaults('drum-machine', 'Drums'),
      color: '#f59e0b',
    };
    const read = throughDoc(drums, (m) => {
      m.delete('activeEffects');
      // An older peer's effects without the newest slot.
      const effects = JSON.parse(m.get('effects') as string);
      delete effects.multiband;
      m.set('effects', JSON.stringify(effects));
    });
    expect(read.activeEffects).toEqual([]);
    expect(read.effects.compressor.enabled).toBe(true); // as the doc says
    expect(read.effects.multiband).toEqual(DEFAULT_EFFECTS.multiband);
  });

  it('leaves the role to the name through a join, as before', () => {
    const doc = new Y.Doc();
    const ym = trackToYMap(guitar());
    ym.delete('trackRole');
    getYTracks(doc).push([ym]);
    let tracks: Track[] = [];
    pullDocIntoStore(
      doc,
      (patch) => {
        tracks = patch.tracks ?? tracks;
      },
      () => ({ tracks: [] }) as unknown as AllSlices,
    );
    expect(tracks.map((t) => t.trackRole)).toEqual(['auto']);
  });
});
