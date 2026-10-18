/**
 * items.ts — what the Library lists (milestone 2.14).
 *
 * Music Atlas's own content, as rows of one list:
 * - parts: the published instrumental parts (Parts Library, curated in the
 *   console), with the key, tempo and length they were written in and the
 *   chords they play;
 * - grooves: the Grooves library's drum performances, with the tempo, length
 *   and kit of the designed groove that plays (loadGrooveEvents);
 * - drum kits: the stock and custom kits (there are no one-shots to list);
 * - presets: the Studio's sounds (the keyboard view's presets), Oracle Synth's
 *   factory patches, the SERUM pack and the student's own patches;
 * - templates: the four genre projects, which open as a new project.
 *
 * Each item names its kind first in its id, which favourites and drags carry.
 * The builders take their sources as arguments, so tests can pass their own;
 * useCatalog gathers the live ones. No React and no store here.
 */

import {
  PART_LEVELS,
  PART_ROLES,
  type InstrumentPart,
  type PartKey,
  type PartRole,
} from '@/curriculum/engine/parts/part';
import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import type { GrooveItem as GrooveEntry } from '@/daw/data/groovesLibrary';
import type { Preset as StudioPreset } from '@/daw/data/instrumentPresets';
import type { ProjectTemplate } from '@/daw/data/projectTemplates';
import { shortKeyLabel } from '@/daw/harmony/clipKey';
import type { DrumKitConfig } from '@/daw/instruments/drumKits';
import type { InstrumentType } from '@/daw/store/tracksSlice';
import type { DawTrackRole } from '@/daw/utils/trackRole';
import { chordFunction } from './chordFunction';
import type { BrowserInstrument, BrowserType } from './query';
import type { FitItem, SongRole } from './songFit';

// ── Vocabularies ─────────────────────────────────────────────────────────

export const TYPE_LABEL: Record<BrowserType, string> = {
  part: 'Parts',
  groove: 'Grooves',
  kit: 'Kits',
  preset: 'Presets',
  template: 'Templates',
};

/** The Type filter's and the list's order. */
export const TYPES: readonly BrowserType[] = [
  'part',
  'groove',
  'kit',
  'preset',
  'template',
];

export const INSTRUMENT_LABEL: Record<BrowserInstrument, string> = {
  drums: 'Drums',
  bass: 'Bass',
  keys: 'Keys',
  guitar: 'Guitar',
  synth: 'Synth',
  strings: 'Strings',
  brass: 'Brass',
};

export const INSTRUMENTS = Object.keys(INSTRUMENT_LABEL) as BrowserInstrument[];

/** The Genre filter's labels, in its order. */
export const GENRES = [
  'Hip hop',
  'Trap',
  'R&B',
  'Neo soul',
  'Pop',
  'Rock',
  'Indie',
  'Punk',
  'Funk',
  'Latin',
] as const;

/**
 * Every source's way of writing a genre, to one label: the parts' lesson
 * ids, the groove catalog's labels and the templates'.
 */
const GENRE_ALIASES: Record<string, string> = {
  'hip-hop': 'Hip hop',
  'hip hop': 'Hip hop',
  hiphop: 'Hip hop',
  trap: 'Trap',
  rnb: 'R&B',
  'r&b': 'R&B',
  'neo-soul': 'Neo soul',
  'neo soul': 'Neo soul',
  pop: 'Pop',
  rock: 'Rock',
  indie: 'Indie',
  punk: 'Punk',
  funk: 'Funk',
  latin: 'Latin',
};

export function genreLabel(genre: string | undefined | null): string | null {
  if (!genre) return null;
  return GENRE_ALIASES[genre.trim().toLowerCase()] ?? null;
}

const MODE_WORD: Record<string, string> = {
  ionian: 'Major',
  aeolian: 'Minor',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  locrian: 'Locrian',
};

// ── Items ─────────────────────────────────────────────────────────────────

interface ItemBase extends FitItem {
  /** The tempo it was played at (parts, grooves, templates), or null. */
  bpm: number | null;
  /** Its length in bars, or null (kits, presets, templates). */
  bars: number | null;
  /** Its metre when it has one. */
  timeSignature: [number, number] | null;
}

export interface PartItem extends ItemBase {
  type: 'part';
  part: InstrumentPart;
  /** The key it is written in (a row shows the key it lands in). */
  key: PartKey;
  /** Its chords as numerals, or null ("I–V–vi–IV"). */
  chords: string | null;
  sound: string;
  trackRole: DawTrackRole;
}

export interface GrooveRowItem extends ItemBase {
  type: 'groove';
  grooveId: string;
  /** The kit the designed groove plays on ('natural' until it is loaded). */
  kit: string;
}

export interface KitItem extends ItemBase {
  type: 'kit';
  kitId: string;
  pads: number;
}

export type PresetSource = 'studio' | 'oracle' | 'pack' | 'mine';

export interface PresetItem extends ItemBase {
  type: 'preset';
  source: PresetSource;
  /** The preset's own name (the synth's menu name for Oracle patches). */
  presetName: string;
  /** What it is: 'Pad', 'Strings' … */
  category: string;
  /** The Studio sound's instrument; Oracle patches play on 'oracle-synth'. */
  instrumentType: InstrumentType;
  gmProgram?: number;
  trackRole: DawTrackRole;
}

export interface TemplateItem extends ItemBase {
  type: 'template';
  templateId: string;
  trackNames: string[];
}

export type BrowserItem =
  | PartItem
  | GrooveRowItem
  | KitItem
  | PresetItem
  | TemplateItem;

const searchOf = (...words: (string | null | undefined | false)[]) =>
  words.filter(Boolean).join(' ').toLowerCase();

const base = {
  role: null,
  level: null,
  keyFits: null,
  bpm: null,
  bars: null,
  timeSignature: null,
} satisfies Partial<ItemBase>;

// ── Parts ─────────────────────────────────────────────────────────────────

/** What a part does in a band, for "Fits your song" and the track's role. */
const PART_SONG_ROLE: Record<PartRole, SongRole | 'melody' | null> = {
  bassline: 'bass',
  comping: 'chords',
  'two-hand': 'chords',
  melody: 'melody',
  riff: 'melody',
  groove: 'drums',
  fill: 'drums',
};

const PART_INSTRUMENT: Record<InstrumentPart['instrument'], BrowserInstrument> =
  {
    piano: 'keys',
    bass: 'bass',
    guitar: 'guitar',
    drums: 'drums',
  };

const roleLabel = (role: PartRole) =>
  PART_ROLES.find((r) => r.id === role)?.label.replace(' / chords', '') ?? role;

export function partItem(part: InstrumentPart): PartItem {
  const songRole = PART_SONG_ROLE[part.role] ?? null;
  const level = PART_LEVELS.find((l) => l.id === part.level)?.label;
  const mode = MODE_WORD[part.key.mode] ?? part.key.mode;
  const genre = genreLabel(part.genre);
  const tags = [roleLabel(part.role), level, mode].filter(
    (t): t is string => !!t,
  );
  return {
    ...base,
    id: `part:${part.id}`,
    type: 'part',
    name: part.name,
    instrument: PART_INSTRUMENT[part.instrument],
    genre,
    tags,
    search: searchOf(
      part.name,
      'part',
      INSTRUMENT_LABEL[PART_INSTRUMENT[part.instrument]],
      genre,
      ...tags,
      shortKeyLabel(part.key.tonic, part.key.mode),
      ...(part.chordSymbols ?? []),
      part.description,
    ),
    bpm: part.tempo,
    bars: part.bars,
    timeSignature: part.timeSignature,
    role: songRole,
    level: part.level,
    part,
    key: part.key,
    chords: chordFunction(part),
    sound: part.sound,
    trackRole: songRole ?? 'auto',
  };
}

// ── Grooves ───────────────────────────────────────────────────────────────

/**
 * A groove from the catalog, with the designed groove that plays it when it
 * has loaded: its tempo, length, metre and kit win (the catalog's tempo for
 * groove-latin-2 says 90; the groove that plays is 3/4 at 120).
 */
export function grooveItem(
  groove: GrooveEntry,
  designed?: DrumGroove,
): GrooveRowItem {
  const genre = genreLabel(groove.genre);
  const ts = designed?.timeSignature ?? null;
  const metre =
    ts && !(ts[0] === 4 && ts[1] === 4) ? `${ts[0]}/${ts[1]}` : null;
  const tags = [...groove.tags, ...(metre ? [metre] : [])];
  return {
    ...base,
    id: `groove:${groove.id}`,
    type: 'groove',
    name: groove.name,
    instrument: 'drums',
    genre,
    tags,
    search: searchOf(
      groove.name,
      designed?.name,
      'groove drums beat',
      genre,
      ...tags,
    ),
    bpm: designed?.tempo ?? groove.bpm,
    bars: designed?.bars ?? null,
    timeSignature: ts,
    role: 'drums',
    grooveId: groove.id,
    kit: designed?.kit ?? 'natural',
  };
}

// ── Drum kits ─────────────────────────────────────────────────────────────

export function kitItem(kit: DrumKitConfig): KitItem {
  const acoustic = kit.baseUrl.includes('/natural/');
  const tags = [acoustic ? 'Acoustic' : 'Electronic'];
  return {
    ...base,
    id: `kit:${kit.id}`,
    type: 'kit',
    name: kit.label,
    instrument: 'drums',
    genre: null,
    tags,
    search: searchOf(kit.label, 'drum kit drums', ...tags),
    role: 'drums',
    kitId: kit.id,
    pads: Object.keys(kit.samples).length,
  };
}

// ── Presets ───────────────────────────────────────────────────────────────

const STUDIO_CATEGORY: Record<string, BrowserInstrument> = {
  Brass: 'brass',
  'Electric Basses': 'bass',
  Guitars: 'guitar',
  Keyboards: 'keys',
  Organs: 'keys',
  Strings: 'strings',
};

/** Oracle's factory patches by name: what each is. */
const FACTORY_CATEGORY: Record<string, string> = {
  PAD: 'Pad',
  BASS: 'Bass',
  LEAD: 'Lead',
  PLUCK: 'Pluck',
  WOBBLE: 'Bass',
  DRIFT: 'Pad',
  TRANCE: 'Lead',
  SEQUENCE: 'Sequence',
  CHORDS: 'Chords',
  STAB: 'Stab',
};

/** The SERUM pack's categories, as the Library names them. */
const PACK_CATEGORY: Record<string, string> = {
  Keyboard: 'Keys',
  Seq: 'Sequence',
};

function synthInstrument(category: string): BrowserInstrument {
  if (category === 'Bass') return 'bass';
  if (category === 'Keys' || category === 'Organ') return 'keys';
  if (category === 'Drum') return 'drums';
  return 'synth';
}

function presetRole(category: string): DawTrackRole {
  if (category === 'Bass' || category === 'Electric Basses') return 'bass';
  if (category === 'Lead') return 'melody';
  if (
    ['Pad', 'Chords', 'Keys', 'Organ', 'Keyboards', 'Organs'].includes(category)
  ) {
    return 'chords';
  }
  return 'auto';
}

const SOURCE_LABEL: Record<PresetSource, string> = {
  studio: 'Studio sound',
  oracle: 'Oracle Synth',
  pack: 'SERUM pack',
  mine: 'My preset',
};

export const presetSourceLabel = (source: PresetSource) => SOURCE_LABEL[source];

function presetItem(
  source: PresetSource,
  name: string,
  category: string,
  instrument: BrowserInstrument,
  instrumentType: InstrumentType,
  gmProgram?: number,
): PresetItem {
  const trackRole = presetRole(category);
  const tags = [category];
  return {
    ...base,
    id: `preset:${source}:${name}`,
    type: 'preset',
    name: name.trim(),
    instrument,
    genre: null,
    tags,
    search: searchOf(
      name,
      'preset sound',
      SOURCE_LABEL[source],
      INSTRUMENT_LABEL[instrument],
      category,
    ),
    role: trackRole === 'auto' ? null : trackRole,
    source,
    presetName: name,
    category,
    instrumentType,
    gmProgram,
    trackRole,
  };
}

export function studioPresetItem(preset: StudioPreset): PresetItem {
  return presetItem(
    'studio',
    preset.name,
    preset.category,
    STUDIO_CATEGORY[preset.category] ?? 'keys',
    preset.instrumentType,
    preset.gmProgram,
  );
}

/** An Oracle patch: a factory one (INITIALIZE is left out), the pack's or the student's. */
export function synthPresetItem(
  source: 'oracle' | 'pack' | 'mine',
  name: string,
  packCategory?: string,
): PresetItem {
  const category =
    source === 'oracle'
      ? (FACTORY_CATEGORY[name] ?? 'Synth')
      : source === 'pack'
        ? (PACK_CATEGORY[packCategory ?? ''] ?? packCategory ?? 'Synth')
        : 'Mine';
  return presetItem(
    source,
    name,
    category,
    synthInstrument(category),
    'oracle-synth',
  );
}

// ── Templates ─────────────────────────────────────────────────────────────

export function templateItem(template: ProjectTemplate): TemplateItem {
  const genre = genreLabel(template.genre);
  const trackNames = template.tracks.map((t) => t.name);
  return {
    ...base,
    id: `template:${template.id}`,
    type: 'template',
    name: template.label,
    instrument: null,
    genre,
    tags: [],
    search: searchOf(template.label, 'template project', genre, ...trackNames),
    bpm: template.bpm,
    templateId: template.id,
    trackNames,
  };
}

// ── The meta line ─────────────────────────────────────────────────────────

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * What a row says under its name. A part says the key it lands in (`key`,
 * from moveForSong), its tempo, length and chords; a groove its tempo and
 * length; a kit and a sound, which play in any key and tempo, what they are;
 * a template its tempo and tracks.
 */
export function metaOf(item: BrowserItem, key?: PartKey): string {
  switch (item.type) {
    case 'part': {
      const k = key ?? item.key;
      return [
        shortKeyLabel(k.tonic, k.mode),
        `${item.bpm} BPM`,
        plural(item.bars ?? 0, 'bar'),
        item.chords,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'groove':
      return [
        `${item.bpm} BPM`,
        item.bars !== null ? plural(item.bars, 'bar') : null,
        item.timeSignature &&
        !(item.timeSignature[0] === 4 && item.timeSignature[1] === 4)
          ? `${item.timeSignature[0]}/${item.timeSignature[1]}`
          : null,
        item.genre,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'kit':
      return `Drum kit · ${plural(item.pads, 'pad')}`;
    case 'preset':
      return `${item.category} · ${SOURCE_LABEL[item.source]}`;
    case 'template':
      return `${item.bpm} BPM · ${plural(item.trackNames.length, 'track')}`;
  }
}
