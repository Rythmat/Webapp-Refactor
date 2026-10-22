import { PRESETS } from '@/daw/data/instrumentPresets';
import type {
  InstrumentType,
  StudioBassVoice,
  Track,
} from '@/daw/store/tracksSlice';
import { DRUM_KITS } from './drumKits';
import { getGMProgram } from './gmPrograms';

// ── The simple instrument picker's catalog ──────────────────────────────────
//
// The plain instruments a beginner chooses from, in families a music teacher
// would name: the sampled pianos, guitars, basses and cello, the electric
// piano and the tonewheel organ, the General MIDI (SoundFont) instruments
// that are instruments rather than synth sounds or effects, and the drum
// machine's stock kits. No Oracle Synth and no audio tracks: those stay in
// the full Add Track menu. Each instrument is a sound string
// (soundString.ts), so a track plays it exactly as a part or a lesson
// naming the same string would.
//
// Pure data and small lookups, with no store and no audio: the track header
// reads a track's label from here on every page, and tests load it alone.

export type InstrumentFamilyId =
  | 'piano'
  | 'electric-piano'
  | 'organ'
  | 'guitar'
  | 'bass'
  | 'strings'
  | 'brass'
  | 'woodwinds'
  | 'mallets'
  | 'voice'
  | 'world'
  | 'drums';

export interface InstrumentFamily {
  id: InstrumentFamilyId;
  label: string;
}

export interface SimpleInstrument {
  /** Stable kebab-case id: the picker's anchor is `instrument-<id>`. */
  id: string;
  label: string;
  family: InstrumentFamilyId;
  /** What the track plays, as a sound string ('soundfont:56'). */
  sound: string;
}

export const INSTRUMENT_FAMILIES: readonly InstrumentFamily[] = [
  { id: 'piano', label: 'Piano' },
  { id: 'electric-piano', label: 'Electric Piano' },
  { id: 'organ', label: 'Organ' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'bass', label: 'Bass' },
  { id: 'strings', label: 'Strings' },
  { id: 'brass', label: 'Brass' },
  { id: 'woodwinds', label: 'Woodwinds' },
  { id: 'mallets', label: 'Mallets' },
  { id: 'voice', label: 'Choir & Voice' },
  { id: 'world', label: 'World' },
  { id: 'drums', label: 'Drums' },
];

const gm = (
  id: string,
  label: string,
  family: InstrumentFamilyId,
  program: number,
): SimpleInstrument => ({ id, label, family, sound: `soundfont:${program}` });

const own = (
  id: string,
  label: string,
  family: InstrumentFamilyId,
  sound: string,
): SimpleInstrument => ({ id, label, family, sound });

export const SIMPLE_INSTRUMENTS: readonly SimpleInstrument[] = [
  own('grand-piano', 'Grand Piano', 'piano', 'piano-sampler'),
  gm('bright-piano', 'Bright Piano', 'piano', 1),
  gm('honky-tonk-piano', 'Honky-Tonk Piano', 'piano', 3),
  gm('harpsichord', 'Harpsichord', 'piano', 6),

  own('electric-piano', 'Electric Piano', 'electric-piano', 'electric-piano'),
  gm('soft-electric-piano', 'Soft Electric Piano', 'electric-piano', 4),
  gm('bell-electric-piano', 'Bell Electric Piano', 'electric-piano', 5),
  gm('electric-grand', 'Electric Grand', 'electric-piano', 2),
  gm('clavinet', 'Clavinet', 'electric-piano', 7),

  own('tonewheel-organ', 'Tonewheel Organ', 'organ', 'tonewheel-organ'),
  own('church-organ', 'Church Organ', 'organ', 'organ'),
  gm('drawbar-organ', 'Drawbar Organ', 'organ', 16),
  gm('rock-organ', 'Rock Organ', 'organ', 18),
  gm('accordion', 'Accordion', 'organ', 21),
  gm('harmonica', 'Harmonica', 'organ', 22),

  own('acoustic-guitar', 'Acoustic Guitar', 'guitar', 'guitar-acoustic'),
  gm('nylon-guitar', 'Nylon Guitar', 'guitar', 24),
  gm('steel-guitar', 'Steel Guitar', 'guitar', 25),
  gm('jazz-guitar', 'Jazz Guitar', 'guitar', 26),
  gm('clean-electric-guitar', 'Clean Electric Guitar', 'guitar', 27),
  gm('muted-guitar', 'Muted Guitar', 'guitar', 28),
  gm('overdrive-guitar', 'Overdrive Guitar', 'guitar', 29),
  gm('distortion-guitar', 'Distortion Guitar', 'guitar', 30),

  own('bass-guitar', 'Bass Guitar', 'bass', 'bass-electric'),
  gm('electric-bass', 'Electric Bass', 'bass', 33),
  own('finger-bass', 'Finger Bass', 'bass', 'bass-electric:finger'),
  own('upright-bass', 'Upright Bass', 'bass', 'bass-electric:upright'),
  own('fretless-bass', 'Fretless Bass', 'bass', 'bass-electric:fretless'),
  gm('pick-bass', 'Pick Bass', 'bass', 34),
  gm('slap-bass', 'Slap Bass', 'bass', 36),
  gm('synth-bass', 'Synth Bass', 'bass', 38),
  own('bass-808', '808 Bass', 'bass', 'bass-electric:808'),

  gm('violin', 'Violin', 'strings', 40),
  gm('viola', 'Viola', 'strings', 41),
  own('cello', 'Cello', 'strings', 'cello'),
  gm('double-bass', 'Double Bass', 'strings', 43),
  gm('string-section', 'String Section', 'strings', 48),
  gm('pizzicato-strings', 'Pizzicato Strings', 'strings', 45),
  gm('tremolo-strings', 'Tremolo Strings', 'strings', 44),
  gm('harp', 'Harp', 'strings', 46),

  gm('trumpet', 'Trumpet', 'brass', 56),
  gm('muted-trumpet', 'Muted Trumpet', 'brass', 59),
  gm('trombone', 'Trombone', 'brass', 57),
  gm('french-horn', 'French Horn', 'brass', 60),
  gm('tuba', 'Tuba', 'brass', 58),
  gm('brass-section', 'Brass Section', 'brass', 61),

  gm('flute', 'Flute', 'woodwinds', 73),
  gm('piccolo', 'Piccolo', 'woodwinds', 72),
  gm('clarinet', 'Clarinet', 'woodwinds', 71),
  gm('oboe', 'Oboe', 'woodwinds', 68),
  gm('bassoon', 'Bassoon', 'woodwinds', 70),
  gm('recorder', 'Recorder', 'woodwinds', 74),
  gm('pan-flute', 'Pan Flute', 'woodwinds', 75),
  gm('soprano-sax', 'Soprano Sax', 'woodwinds', 64),
  gm('alto-sax', 'Alto Sax', 'woodwinds', 65),
  gm('tenor-sax', 'Tenor Sax', 'woodwinds', 66),
  gm('baritone-sax', 'Baritone Sax', 'woodwinds', 67),

  gm('vibraphone', 'Vibraphone', 'mallets', 11),
  gm('marimba', 'Marimba', 'mallets', 12),
  gm('xylophone', 'Xylophone', 'mallets', 13),
  gm('glockenspiel', 'Glockenspiel', 'mallets', 9),
  gm('celesta', 'Celesta', 'mallets', 8),
  gm('music-box', 'Music Box', 'mallets', 10),
  gm('tubular-bells', 'Tubular Bells', 'mallets', 14),

  gm('choir', 'Choir', 'voice', 52),
  gm('voice-oohs', 'Voice Oohs', 'voice', 53),

  gm('steel-drums', 'Steel Drums', 'world', 114),
  gm('kalimba', 'Kalimba', 'world', 108),
  gm('banjo', 'Banjo', 'world', 105),
  gm('sitar', 'Sitar', 'world', 104),
  gm('koto', 'Koto', 'world', 107),
  gm('bagpipe', 'Bagpipe', 'world', 109),

  own('acoustic-kit', 'Acoustic Kit', 'drums', 'drum-machine:natural'),
  own('kit-808', '808 Kit', 'drums', 'drum-machine:808'),
  own('house-kit', 'House Kit', 'drums', 'drum-machine:house'),
];

const BY_ID = new Map(SIMPLE_INSTRUMENTS.map((item) => [item.id, item]));
const BY_SOUND = new Map(SIMPLE_INSTRUMENTS.map((item) => [item.sound, item]));

export function simpleInstrument(id: string): SimpleInstrument | undefined {
  return BY_ID.get(id);
}

export function familyOf(id: InstrumentFamilyId): InstrumentFamily {
  return INSTRUMENT_FAMILIES.find((f) => f.id === id)!;
}

export function instrumentsIn(
  family: InstrumentFamilyId,
): readonly SimpleInstrument[] {
  return SIMPLE_INSTRUMENTS.filter((item) => item.family === family);
}

type SoundFields = Pick<
  Track,
  'instrument' | 'gmProgram' | 'bassVoice' | 'drumKit'
>;

/** What a track plays now, as the sound string the catalog would name. */
export function trackSoundString(track: SoundFields): string {
  switch (track.instrument) {
    case 'soundfont':
      return `soundfont:${track.gmProgram ?? 0}`;
    case 'bass-electric':
      return track.bassVoice
        ? `bass-electric:${track.bassVoice}`
        : 'bass-electric';
    case 'drum-machine':
      return `drum-machine:${track.drumKit ?? 'natural'}`;
    default:
      return track.instrument;
  }
}

/** The catalog's instrument a track plays now, if it plays one. */
export function simpleInstrumentOf(
  track: SoundFields,
): SimpleInstrument | undefined {
  return BY_SOUND.get(trackSoundString(track));
}

/** Whether the picker can change this track's instrument: MIDI tracks only. */
export function hasInstrumentPicker(track: Pick<Track, 'type'>): boolean {
  return track.type === 'midi';
}

/**
 * The families the picker offers. A drum track swaps kits; a melodic track
 * changes to another melodic instrument, since its notes would play random
 * drums (or a melody on a kit) otherwise. A new track can be anything.
 */
export function pickerFamilies(
  track: Pick<Track, 'instrument'> | null,
): readonly InstrumentFamilyId[] {
  const all = INSTRUMENT_FAMILIES.map((f) => f.id);
  if (!track) return all;
  if (track.instrument === 'drum-machine') return ['drums'];
  return all.filter((id) => id !== 'drums');
}

const AUDIO_LABELS: Partial<Record<InstrumentType, string>> = {
  'guitar-fx': 'Guitar (Audio)',
  'bass-fx': 'Bass (Audio)',
  'vocal-fx': 'Vocal (Audio)',
};

/** What a track header calls the track's instrument. */
export function instrumentLabel(
  track: SoundFields & Pick<Track, 'type'>,
): string {
  if (track.type === 'audio') return AUDIO_LABELS[track.instrument] ?? 'Audio';
  const item = simpleInstrumentOf(track);
  if (item) return item.label;
  switch (track.instrument) {
    case 'oracle-synth':
      return 'Synth';
    case 'sampler':
      return 'Sampler';
    case 'soundfont':
      return getGMProgram(track.gmProgram ?? 0)?.name ?? 'Instrument';
    case 'drum-machine': {
      const kit = DRUM_KITS.find((k) => k.id === (track.drumKit ?? 'natural'));
      return kit ? `${kit.label} Kit` : 'Drums';
    }
    case 'none':
      return 'No Instrument';
    default:
      return 'Instrument';
  }
}

/**
 * The names the Studio gives a track for what it plays (the Add Track
 * cards, the New Track dialog), which a change of instrument replaces.
 */
const GENERIC_NAMES = [
  'Instrument',
  'Instruments',
  'Synth',
  'Oracle Synth',
  'Organ',
  'Tonewheel Organ',
  'Drums',
  'Drum Machine',
  'Sampler',
  'Import',
  'Import Audio/MIDI',
];

const plainName = (name: string) =>
  name
    .trim()
    .replace(/\s+\d+$/, '')
    .toLowerCase();

/**
 * Whether a track's name only says what it plays ('Grand Piano', 'Bass',
 * 'Synth', 'Drums 2'), so a new instrument renames it. A name of the
 * student's own ('Rhodes', 'Lead', 'Verse Keys') stays.
 */
export function nameFollowsInstrument(
  track: SoundFields & Pick<Track, 'name' | 'type' | 'presetName'>,
): boolean {
  const name = plainName(track.name);
  if (!name) return true;
  const item = simpleInstrumentOf(track);
  const names = [
    ...GENERIC_NAMES,
    instrumentLabel(track),
    item ? familyOf(item.family).label : '',
    track.instrument === 'soundfont'
      ? (getGMProgram(track.gmProgram ?? 0)?.name ?? '')
      : '',
    track.presetName ?? '',
  ];
  return names.some((candidate) => candidate && plainName(candidate) === name);
}

/** What a track is set to so it plays `item`: its update and its drum kit. */
export interface InstrumentSettings {
  settings: Partial<Track>;
  /** The kit to load (setDrumKit), for a drum machine. */
  drumKit?: string;
}

export function instrumentSettings(item: SimpleInstrument): InstrumentSettings {
  const [type, arg] = item.sound.split(':') as [InstrumentType, string?];
  // The keyboard view's preset name, when one names this very sound.
  const preset = PRESETS.find(
    (p) =>
      p.instrumentType === type &&
      (type !== 'soundfont' || p.gmProgram === Number(arg)),
  );
  const presetName = type === 'bass-electric' && arg ? undefined : preset?.name;
  switch (type) {
    case 'soundfont':
      return {
        settings: { instrument: type, gmProgram: Number(arg), presetName },
      };
    case 'bass-electric':
      return {
        settings: {
          instrument: type,
          bassVoice: arg as StudioBassVoice | undefined,
          presetName,
        },
      };
    case 'drum-machine':
      return {
        settings: { instrument: type, presetName },
        drumKit: arg ?? 'natural',
      };
    default:
      return { settings: { instrument: type, presetName } };
  }
}
