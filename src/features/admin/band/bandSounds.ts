/**
 * Every sound a band layer can play on, and how to make one.
 *
 * A sound is written as the Parts Library writes one (parts/sounds.ts): a
 * Studio instrument with its argument — 'piano-sampler', 'soundfont:27',
 * 'bass-electric:finger', 'drum-machine:salsa_kit', 'oracle-synth:WARM KEYS'
 * — or, for an instrument sampled from uploads, 'sample:<id>'
 * (daw/instruments/sampleInstruments.ts). The picker offers all of them:
 * the Studio's own sounds by family, the full General MIDI set, the bass
 * voices lessons play, every Oracle Synth patch (Music Atlas patches
 * included), stock and custom drum kits, and the sampled instruments.
 */

import type { BandInstrument } from '@/curriculum/engine/band/band';
import { PRESETS } from '@/daw/data/instrumentPresets';
import type { InstrumentAdapter } from '@/daw/instruments/InstrumentAdapter';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';
import { GM_PROGRAMS } from '@/daw/instruments/gmPrograms';
import { listSampleInstruments } from '@/daw/instruments/sampleInstruments';
import { SAMPLE_PREFIX, SYNTH_PREFIX } from '@/daw/instruments/soundString';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';

export {
  SAMPLE_PREFIX,
  SYNTH_PREFIX,
  applySynthSound,
  createSoundInstrument as createBandInstrument,
} from '@/daw/instruments/soundString';

/** A synth layer's live engine, for the synth panel. */
export const synthEngineOf = (
  adapter: InstrumentAdapter | undefined,
): SynthEngine | null =>
  adapter instanceof OracleSynthAdapter ? adapter.getEngine() : null;

export interface SoundGroup {
  label: string;
  options: { value: string; label: string }[];
}

/** The Studio's own sounds, by family, as a picker writes them. */
const studioSounds = (): SoundGroup[] => {
  const groups = new Map<string, SoundGroup['options']>();
  for (const p of PRESETS) {
    const value =
      p.instrumentType === 'soundfont'
        ? `soundfont:${p.gmProgram ?? 0}`
        : p.instrumentType;
    groups.set(p.category, [
      ...(groups.get(p.category) ?? []),
      { value, label: p.name },
    ]);
  }
  return [...groups].map(([category, options]) => ({
    label: `Studio · ${category}`,
    options,
  }));
};

/** The Studio family each band instrument looks for first. */
const FIRST_FAMILY: Partial<Record<BandInstrument, string[]>> = {
  bass: ['Electric Basses'],
  keys: ['Keyboards', 'Organs'],
  synth: ['Keyboards'],
  guitar: ['Guitars'],
  strings: ['Strings'],
  horns: ['Brass'],
};

const BASS_VOICES: SoundGroup = {
  label: 'Bass voices (as lessons play them)',
  options: [
    { value: 'bass-electric:finger', label: 'Finger electric' },
    { value: 'bass-electric', label: 'Electric (pick)' },
    { value: 'bass-electric:fretless', label: 'Fretless' },
    { value: 'bass-electric:upright', label: 'Upright' },
    { value: 'bass-electric:808', label: '808' },
  ],
};

const synthGroup = (): SoundGroup => ({
  label: 'Oracle Synth',
  options: FACTORY_PRESETS.filter((p) => p.name !== 'INITIALIZE').map((p) => ({
    value: `${SYNTH_PREFIX}${p.name}`,
    label: p.name,
  })),
});

const gmGroups = (): SoundGroup[] => {
  const groups = new Map<string, SoundGroup['options']>();
  for (const p of GM_PROGRAMS)
    groups.set(p.category, [
      ...(groups.get(p.category) ?? []),
      { value: `soundfont:${p.number}`, label: p.name },
    ]);
  return [...groups].map(([category, options]) => ({
    label: `General MIDI · ${category}`,
    options,
  }));
};

const sampledGroup = (): SoundGroup => ({
  label: 'Sampled from uploads',
  options: listSampleInstruments().map((f) => ({
    value: `${SAMPLE_PREFIX}${f.id}`,
    label: f.name,
  })),
});

/** Every sound a layer of this instrument can pick, its own family first. */
export function soundGroups(instrument: BandInstrument): SoundGroup[] {
  if (instrument === 'drums' || instrument === 'percussion')
    return [
      {
        label: 'Drum kits',
        options: DRUM_KIT_CONFIGS.map((k) => ({
          value: `drum-machine:${k.id}`,
          label: k.label,
        })),
      },
    ];
  const studio = studioSounds();
  const first = FIRST_FAMILY[instrument] ?? [];
  const own = studio.filter((g) =>
    first.some((f) => g.label === `Studio · ${f}`),
  );
  const rest = studio.filter((g) => !own.includes(g));
  return [
    ...(instrument === 'bass' ? [BASS_VOICES] : []),
    ...own,
    synthGroup(),
    sampledGroup(),
    ...rest,
    ...gmGroups(),
  ].filter((g) => g.options.length);
}

/** A sound's name for people: 'Oracle Synth — PAD', 'Salsa kit'. */
export function soundLabel(sound: string, instrument: BandInstrument): string {
  for (const group of soundGroups(instrument))
    for (const o of group.options) if (o.value === sound) return `${o.label}`;
  return sound;
}
