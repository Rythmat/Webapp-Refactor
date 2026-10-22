/**
 * A sound string (soundString.ts) as a Studio track's settings: its
 * instrument, and the bass voice, General MIDI program, drum kit or synth
 * patch that goes with it. A synth patch is seeded into the track's synth
 * cache first, so the engine the instrument change creates starts on it.
 *
 * An instrument sampled from uploads ('sample:<id>') is not a Studio track
 * type yet, so its track opens on the nearest built-in sound for its family;
 * a sampled or modelled sound that is no longer a Studio track type (piano,
 * electric piano, organ, bass, acoustic guitar, cello) opens as an
 * Instruments track playing the same instrument (studioProgramFor).
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
  bass: 'soundfont:33',
  guitar: 'soundfont:27',
  strings: 'soundfont:48',
  horns: 'soundfont:61',
};

/**
 * The General MIDI program of each sound that is no longer a Studio track
 * type (owner, 2026-10-22): a track made from one is an Instruments track
 * (SoundFont) playing the same instrument.
 */
const STUDIO_PROGRAM: Readonly<Record<string, number>> = {
  'piano-sampler': 0, // Acoustic Grand Piano
  'electric-piano': 4, // Electric Piano 1
  organ: 16, // Drawbar Organ
  'tonewheel-organ': 16, // Drawbar Organ
  'bass-electric': 33, // Electric Bass (finger)
  'guitar-acoustic': 25, // Acoustic Guitar (steel)
  cello: 42, // Cello
};

/** A bass voice's General MIDI program, on an Instruments track. */
const BASS_VOICE_PROGRAM: Readonly<Record<string, number>> = {
  finger: 33, // Electric Bass (finger)
  fretless: 35, // Fretless Bass
  upright: 32, // Acoustic Bass
  '808': 38, // Synth Bass 1
};

/** The General MIDI program a removed sound plays as, or undefined. */
export function studioProgramFor(
  type: string,
  bassVoice?: string,
): number | undefined {
  if (type === 'bass-electric' && bassVoice) {
    return BASS_VOICE_PROGRAM[bassVoice] ?? STUDIO_PROGRAM[type];
  }
  return STUDIO_PROGRAM[type];
}

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
    return soundSettings(SAMPLED_STAND_IN[family] ?? 'soundfont:4');
  }
  const { type = 'none' } = parsed;
  // A sound no Studio track plays: an Instruments track with the same one.
  const program = studioProgramFor(type, parsed.bassVoice);
  if (program !== undefined) {
    return { settings: { instrument: 'soundfont', gmProgram: program } };
  }
  if (type === 'oracle-synth') {
    const preset = synthPreset(parsed.synthPatch);
    if (!preset) return { settings: { instrument: type } };
    return {
      settings: { instrument: type, presetName: preset.name },
      synthPatch: preset,
    };
  }
  if (type === 'soundfont')
    return { settings: { instrument: type, gmProgram: parsed.gmProgram ?? 0 } };
  if (type === 'drum-machine')
    return {
      settings: { instrument: type },
      drumKit: (parsed.drumKit ?? 'natural') as DrumKitId,
    };
  return {
    settings: { instrument: type === 'audio-input' ? type : 'none' },
  };
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
