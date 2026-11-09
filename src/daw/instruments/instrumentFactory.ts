/**
 * The instrument a Studio track type plays on, made from its classes alone —
 * no store, no playback engine — so lessons, Practice Tracks and the console
 * make the same instruments the Studio does. usePlaybackEngine's
 * `createInstrument` is this.
 */

import type { SoundType, StudioBassVoice } from '@/daw/store/tracksSlice';
import type { DrumKitId } from './drumKits';
import { DrumMachineEngine } from './DrumMachineEngine';
import { EightOhEightInstrument } from './EightOhEightInstrument';
import { GuitarFxAdapter } from './GuitarFxAdapter';
import type { InstrumentAdapter } from './InstrumentAdapter';
import { OracleSynthAdapter } from './OracleSynthAdapter';
import { PianoSampler } from './PianoSampler';
import {
  BASS_ELECTRIC_CONFIG,
  CELLO_CONFIG,
  ELECTRIC_PIANO_CONFIG,
  GUITAR_ACOUSTIC_CONFIG,
  ORGAN_CONFIG,
  bassVoiceSamplerConfig,
} from './sampleConfigs';
import { SamplerInstrument } from './SamplerInstrument';
import { SoundFontAdapter } from './SoundFontAdapter';
import { TonewheelOrganEngine } from './TonewheelOrganEngine';

/**
 * The instrument a sound plays on: a Studio track's (its InstrumentType),
 * or one of the sampled and modelled sounds lessons, Practice Tracks and the
 * console play (SoundType).
 */
export function createInstrument(
  type: SoundType,
  gmProgram?: number,
  drumKit?: DrumKitId,
  bassVoice?: StudioBassVoice,
): InstrumentAdapter | null {
  switch (type) {
    case 'oracle-synth':
      return new OracleSynthAdapter();
    case 'piano-sampler':
      return new PianoSampler();
    case 'electric-piano':
      return new SamplerInstrument(ELECTRIC_PIANO_CONFIG);
    case 'bass-electric':
      if (bassVoice === '808') return new EightOhEightInstrument();
      return new SamplerInstrument(
        bassVoice ? bassVoiceSamplerConfig(bassVoice) : BASS_ELECTRIC_CONFIG,
      );
    case 'guitar-acoustic':
      return new SamplerInstrument(GUITAR_ACOUSTIC_CONFIG);
    case 'cello':
      return new SamplerInstrument(CELLO_CONFIG);
    case 'organ':
      return new SamplerInstrument(ORGAN_CONFIG);
    case 'tonewheel-organ':
      return new TonewheelOrganEngine();
    case 'drum-machine':
      return new DrumMachineEngine(drumKit);
    case 'soundfont':
      return new SoundFontAdapter(gmProgram ?? 0);
    // An Audio track: live input through its chain (amp, pitch correction).
    case 'audio-input':
      return new GuitarFxAdapter();
    default:
      return null;
  }
}
