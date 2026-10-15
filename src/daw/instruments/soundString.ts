/**
 * A sound written as one string, the way parts, band layers and lessons name
 * one: a Studio instrument with its argument after a colon —
 * 'piano-sampler', 'soundfont:27', 'bass-electric:finger',
 * 'drum-machine:salsa_kit', 'oracle-synth:WARM KEYS' — or an instrument
 * sampled from uploads, 'sample:<id>' (sampleInstruments.ts). This reads one
 * and makes its instrument, with no Studio store: lessons, Practice Tracks
 * and the console all play a sound the same way.
 */

import type { InstrumentType, StudioBassVoice } from '@/daw/store/tracksSlice';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import {
  applySynthStateToEngine,
  synthTrackStateFromPreset,
} from '@/daw/oracle-synth/synthTrackState';
import type { InstrumentAdapter } from './InstrumentAdapter';
import { createInstrument } from './instrumentFactory';
import { OracleSynthAdapter } from './OracleSynthAdapter';
import { SamplerInstrument } from './SamplerInstrument';
import {
  getSampleInstrument,
  sampleInstrumentConfig,
} from './sampleInstruments';

export const SAMPLE_PREFIX = 'sample:';
export const SYNTH_PREFIX = 'oracle-synth:';

/** A sound string, read. */
export interface PartSound {
  type: InstrumentType;
  /** Oracle Synth: the factory or Music Atlas patch name. */
  synthPatch?: string;
  bassVoice?: StudioBassVoice;
  gmProgram?: number;
  drumKit?: string;
  /** A sampled instrument's id ('sample:<id>'); `type` is 'sampler'. */
  sampleId?: string;
}

export function parseSound(sound: string): PartSound {
  if (sound.startsWith(SAMPLE_PREFIX))
    return { type: 'sampler', sampleId: sound.slice(SAMPLE_PREFIX.length) };
  const [type, arg] = sound.split(':') as [InstrumentType, string | undefined];
  if (type === 'bass-electric' && arg)
    return { type, bassVoice: arg as StudioBassVoice };
  if (type === 'soundfont') return { type, gmProgram: Number(arg ?? 0) };
  if (type === 'drum-machine') return { type, drumKit: arg ?? 'natural' };
  if (type === 'oracle-synth' && arg) return { type, synthPatch: arg };
  return { type };
}

/** The instrument a sound string plays on, or null when it names none. */
export function createSoundInstrument(sound: string): InstrumentAdapter | null {
  const parsed = parseSound(sound);
  if (parsed.sampleId !== undefined) {
    const file = getSampleInstrument(parsed.sampleId);
    return file ? new SamplerInstrument(sampleInstrumentConfig(file)) : null;
  }
  return createInstrument(
    parsed.type,
    parsed.gmProgram,
    parsed.drumKit,
    parsed.bassVoice,
  );
}

/** A synth patch by name: a factory patch or a Music Atlas one. */
export const synthPreset = (name: string | undefined) =>
  FACTORY_PRESETS.find((p) => p.name === name);

/** The patch a synth sound names, put on its (initialised) instrument. */
export function applySynthSound(adapter: InstrumentAdapter, sound: string) {
  if (!(adapter instanceof OracleSynthAdapter)) return;
  const preset = synthPreset(parseSound(sound).synthPatch);
  const engine = adapter.getEngine();
  if (preset && engine)
    applySynthStateToEngine(engine, synthTrackStateFromPreset(preset, 120));
}
