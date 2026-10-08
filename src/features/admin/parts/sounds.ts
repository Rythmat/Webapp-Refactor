import type { PartInstrument } from '@/curriculum/engine/parts/part';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import type { InstrumentType, StudioBassVoice } from '@/daw/store/tracksSlice';

/**
 * A part's `sound`: a Studio InstrumentType, plus a bass voice, GM program or
 * drum kit after a colon — what the Studio track it lands on is set to.
 */
export interface PartSound {
  type: InstrumentType;
  /** Oracle Synth: the factory or Music Atlas patch name. */
  synthPatch?: string;
  bassVoice?: StudioBassVoice;
  gmProgram?: number;
  drumKit?: string;
}

export function parseSound(sound: string): PartSound {
  const [type, arg] = sound.split(':') as [InstrumentType, string | undefined];
  if (type === 'bass-electric' && arg)
    return { type, bassVoice: arg as StudioBassVoice };
  if (type === 'soundfont') return { type, gmProgram: Number(arg ?? 0) };
  if (type === 'drum-machine') return { type, drumKit: arg ?? 'natural' };
  if (type === 'oracle-synth' && arg) return { type, synthPatch: arg };
  return { type };
}

/** Every Oracle Synth patch — built-ins and Music Atlas patches. */
const SYNTH_SOUNDS = FACTORY_PRESETS.filter((p) => p.name !== 'INITIALIZE').map(
  (p) => ({ value: `oracle-synth:${p.name}`, label: `Synth — ${p.name}` }),
);

export const SOUND_OPTIONS: Record<
  PartInstrument,
  { value: string; label: string }[]
> = {
  piano: [
    { value: 'piano-sampler', label: 'Grand piano' },
    { value: 'electric-piano', label: 'Electric piano' },
    { value: 'organ', label: 'Organ' },
    { value: 'tonewheel-organ', label: 'Tonewheel organ' },
    ...SYNTH_SOUNDS,
  ],
  bass: [
    { value: 'bass-electric:finger', label: 'Finger electric' },
    { value: 'bass-electric', label: 'Electric (pick)' },
    { value: 'bass-electric:fretless', label: 'Fretless' },
    { value: 'bass-electric:upright', label: 'Upright' },
    { value: 'bass-electric:808', label: '808' },
    ...SYNTH_SOUNDS,
  ],
  guitar: [
    { value: 'soundfont:27', label: 'Clean electric (GM)' },
    { value: 'soundfont:25', label: 'Steel acoustic (GM)' },
    { value: 'soundfont:24', label: 'Nylon (GM)' },
    { value: 'soundfont:29', label: 'Overdrive (GM)' },
    ...SYNTH_SOUNDS,
  ],
  drums: [
    { value: 'drum-machine:natural', label: 'Natural kit' },
    { value: 'drum-machine:808', label: '808 kit' },
    { value: 'drum-machine:house', label: 'House kit' },
  ],
};
