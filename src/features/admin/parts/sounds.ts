import type { PartInstrument } from '@/curriculum/engine/parts/part';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';

// A part's `sound` is a sound string (daw/instruments/soundString.ts): what
// the Studio track it lands on is set to.
export { parseSound, type PartSound } from '@/daw/instruments/soundString';

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
