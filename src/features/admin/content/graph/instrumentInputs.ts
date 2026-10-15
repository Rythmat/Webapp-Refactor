import type { GrooveInput, PartInput } from '@/content/graph/deriveGraph';
import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import { CUSTOM_DRUM_KITS } from '@/daw/instruments/drumKits';
import { patchFileId } from '@/daw/oracle-synth/store/presets/atlasPatches';

/**
 * Instrument content as the graph reads it: a groove's or part's stored body
 * turned into the graph's input shape — vocabulary ids, not the engine's.
 * Light on purpose (no registries), so the working graph and the Table can
 * project API and repo items with it (workingSnapshot.ts `WORKING_KINDS`).
 */

/**
 * A lesson level's node id: the flow's own key, `<genre>-l<level>`, with the
 * genre's separators folded as the content API folds them (`hip-hop` →
 * `hiphop-l1`; see flowStore's `flowKey`).
 */
export const lessonId = (genre: string, level: number) =>
  `${genre.toLowerCase().replace(/[\s_-]/g, '')}-l${level}`;

/** Ids the graph keeps kebab where a registry's are not (`custom_808_01`). */
export const kebab = (id: string) => id.toLowerCase().replace(/_/g, '-');

/** A key's tonic pitch class → its key node's slug, accidental spelled. */
const KEY_SLUGS = [
  'c',
  'd-flat',
  'd',
  'e-flat',
  'e',
  'f',
  'g-flat',
  'g',
  'a-flat',
  'a',
  'b-flat',
  'b',
];

/** Kits whose sounds are a drum machine's rather than a played kit's. */
const ELECTRONIC_KITS = new Set(['808', 'house']);

const kitBase = (kit: string) =>
  CUSTOM_DRUM_KITS.find((k) => k.id === kit)?.base ?? kit;

/** The instrument vocabulary id a part is written for, from its sound. */
export function partInstrument(
  part: Pick<InstrumentPart, 'instrument' | 'sound'>,
) {
  const [type, arg] = part.sound.split(':');
  switch (part.instrument) {
    case 'bass':
      if (arg === 'upright') return 'upright-bass';
      if (arg === '808' || type === 'oracle-synth') return 'synth-bass';
      return 'electric-bass';
    case 'guitar':
      return type === 'soundfont' && ['24', '25'].includes(arg ?? '')
        ? 'acoustic-guitar'
        : 'electric-guitar';
    case 'drums':
      return 'drum-kit';
    default:
      if (type === 'electric-piano') return 'electric-piano';
      if (type === 'tonewheel-organ') return 'hammond-organ';
      if (type === 'organ') return 'organ';
      if (type === 'oracle-synth') return 'synthesizer';
      return 'piano';
  }
}

export function grooveInput(groove: DrumGroove): GrooveInput {
  return {
    id: groove.id,
    name: groove.name,
    genre: groove.genre,
    style: groove.style,
    instrument: ELECTRONIC_KITS.has(kitBase(groove.kit))
      ? 'drum-machine'
      : 'drum-kit',
    kit: kebab(groove.kit),
  };
}

export function partInput(part: InstrumentPart): PartInput {
  const [type, patch] = part.sound.split(':');
  return {
    id: part.id,
    name: part.name,
    instrument: partInstrument(part),
    genre: part.genre,
    style: part.style,
    key: KEY_SLUGS[((part.key.tonic % 12) + 12) % 12],
    mode: part.key.mode,
    feel: part.feel,
    patch: type === 'oracle-synth' && patch ? patchFileId(patch) : undefined,
    lessonId:
      part.source.kind === 'lesson'
        ? lessonId(part.source.genre, part.source.level)
        : undefined,
  };
}
