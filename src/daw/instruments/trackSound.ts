/**
 * A sound string (soundString.ts) as a Studio track's settings: its
 * instrument, and the bass voice, General MIDI program, drum kit or synth
 * patch that goes with it. A synth patch is seeded into the track's synth
 * cache first, so the engine the instrument change creates starts on it.
 *
 * An instrument sampled from uploads ('sample:<id>') is not a Studio track
 * type yet, so its track opens on the nearest built-in sound for its family.
 */

import {
  setTrackSynthState,
  synthTrackStateFromPreset,
} from '@/daw/oracle-synth/synthTrackState';
import type { PresetData } from '@/daw/oracle-synth/store/presets/PresetData';
import type { Track } from '@/daw/store/tracksSlice';
import type { DrumKitId } from './drumKits';
import { getSampleInstrument } from './sampleInstruments';
import { parseSound, synthPreset } from './soundString';

/** The built-in sound a sampled instrument's family stands in for. */
const SAMPLED_STAND_IN: Record<string, string> = {
  bass: 'bass-electric',
  guitar: 'soundfont:27',
  strings: 'soundfont:48',
  horns: 'soundfont:61',
};

export interface TrackSound {
  /** What the track is set to (`updateTrack`). */
  settings: Partial<Track>;
  /** A kit to load (`setDrumKit`), for a drum machine. */
  drumKit?: DrumKitId;
}

/**
 * What a sound string makes a track: its settings and kit, and the synth
 * patch it names, with nothing written anywhere. A new track takes them in
 * the write that adds it (addTrack's init), so its first engine is right.
 */
export function soundSettings(sound: string): TrackSound & {
  synthPatch?: PresetData;
} {
  const parsed = parseSound(sound);
  if (parsed.sampleId !== undefined) {
    const family = getSampleInstrument(parsed.sampleId)?.family ?? 'keys';
    return soundSettings(SAMPLED_STAND_IN[family] ?? 'electric-piano');
  }
  const { type } = parsed;
  if (type === 'oracle-synth') {
    const preset = synthPreset(parsed.synthPatch);
    if (!preset) return { settings: { instrument: type } };
    return {
      settings: { instrument: type, presetName: preset.name },
      synthPatch: preset,
    };
  }
  if (type === 'bass-electric')
    return { settings: { instrument: type, bassVoice: parsed.bassVoice } };
  if (type === 'soundfont')
    return { settings: { instrument: type, gmProgram: parsed.gmProgram ?? 0 } };
  if (type === 'drum-machine')
    return {
      settings: { instrument: type },
      drumKit: (parsed.drumKit ?? 'natural') as DrumKitId,
    };
  return { settings: { instrument: type } };
}

export function trackSound(
  trackId: string,
  sound: string,
  bpm: number,
): TrackSound {
  const { synthPatch, ...made } = soundSettings(sound);
  if (synthPatch) {
    setTrackSynthState(trackId, synthTrackStateFromPreset(synthPatch, bpm));
  }
  return made;
}
