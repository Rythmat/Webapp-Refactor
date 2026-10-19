/**
 * Bands: a lesson style's rhythm section as one item — drums, bass, comping,
 * and as many keyboard, guitar or other layers as the style needs, all
 * playing over one chart in one meter.
 *
 * A layer does not hold notes. It names an item from the library it was
 * designed in — a drum groove, a bass line, a comping pattern, a part — and
 * that item's own engine makes the notes: a groove plays as written, a bass
 * line's generator walks the chart, a comping pattern voices each chord. The
 * Band adds what the layer is in this band: its sound, its level, whether it
 * plays. So the formats stay their own, and every layer meets the rest at
 * one contract: a chart in, notes out (`realizeLayer`).
 *
 * Lessons pair a style with one Band (bandAssignments), replacing the three
 * separate drums / bass / comping pairings (ledger D-084, D-087).
 *
 * Variations: a genre's Band is one lineup — its members, their sounds and
 * levels — that plays every style its Learn genre teaches. Each variation
 * says what every member plays in one style (Funk Band 1: The Pocket,
 * Syncopation & Sauce, Deep Groove), and may set its own meter and tempo. A
 * member a variation gives nothing plays as the lesson does: the lesson's
 * own backing for that part. Lessons in a style play the variation made for
 * it. A band without variations is one arrangement, its members' own items.
 */

import type { TimeSignature } from '../bassLines/harmony';
import type { BackingNote } from '../genreGeneration/backingPatterns';
import type { ChordSymbolTones } from '../genreGeneration/chordSymbolTones';

/** What a layer plays: the instrument a student would name. */
export type BandInstrument =
  | 'drums'
  | 'percussion'
  | 'bass'
  | 'keys'
  | 'guitar'
  | 'synth'
  | 'strings'
  | 'horns';

/** The library item a layer plays, by kind and id. */
export type BandSource =
  | { kind: 'groove'; id: string }
  | { kind: 'bassLine'; id: string }
  | { kind: 'comping'; id: string }
  | { kind: 'part'; id: string };

export type BandSourceKind = BandSource['kind'];

/** A band member as it plays: what it plays resolved (bandVariation). */
export interface BandLayer {
  /** Unique within the band; kebab-case. */
  id: string;
  /** What the editor shows: 'Rhodes comp', 'Skank guitar'. */
  name: string;
  instrument: BandInstrument;
  source: BandSource;
  /**
   * The sound it plays on, written as the Parts Library writes one
   * (features/admin/parts/sounds.ts): a Studio instrument with its argument —
   * 'bass-electric:finger', 'soundfont:27', 'drum-machine:808' — or an Oracle
   * Synth patch, 'oracle-synth:PAD'. Left out, the layer plays on the sound
   * its item already plays in lessons (a groove's kit, a bass line's voice,
   * the lesson piano), so it sounds as it did before it joined a band.
   */
  sound?: string;
  /** 0–1, the layer's level in the mix. Defaults to 1. */
  volume?: number;
  /** Left out of the band's playback (the editor's mute, kept on save). */
  muted?: boolean;
  /**
   * Who plays it (console → Players): optional. Their items come first in
   * the layer's picker; the layer plays whatever item it names either way.
   */
  player?: string;
}

/**
 * A member as the band file keeps it. In a band with variations what it
 * plays lives in each variation, so `source` is left out here.
 */
export type BandMember = Omit<BandLayer, 'source'> & { source?: BandSource };

/** What the band's members play in one style. */
export interface BandVariation {
  /** Unique within the band; kebab-case. */
  id: string;
  name: string;
  /** The lesson style it was made for (lessonStyles.ts): its lessons play it. */
  style?: string;
  /** Its own meter, when not the band's (Mariachi's 3/4). */
  timeSignature?: TimeSignature;
  /** Its own preview tempo; lessons keep their own. */
  tempo?: number;
  /**
   * What each member plays, by member id. A member not named plays as the
   * lesson does — its own backing for that part.
   */
  plays: Record<string, BandSource>;
}

export interface Band {
  /** File name and lesson-assignment target: lowercase, digits, _ and -. */
  id: string;
  name: string;
  description?: string;
  /** Genre it was built for ('latin', 'funk') — filtering. */
  genre?: string;
  /** Finer style ('Cumbia') — filtering. */
  style?: string;
  tags?: string[];
  /** Lessons and Practice Tracks only ever play a 'live' band. */
  status: 'draft' | 'live';
  /** Position in the library list; lower first. */
  order?: number;
  timeSignature: TimeSignature;
  /** The tempo it is previewed at; lessons keep their own. */
  tempo: number;
  /** The members, in the order they are stacked. */
  layers: BandMember[];
  /** The styles it plays; left out, it is one arrangement. */
  variations?: BandVariation[];
  /**
   * What the editor plays it over: a preset progression and key, or a typed
   * chart ('| Am | Dm | E7 | Am |'). Editor only; lessons play their own.
   */
  preview?: { progression?: string; key?: number; chart?: string };
}

/** A band as one variation plays it: every member with what it plays. */
export type PlayableBand = Omit<Band, 'layers' | 'variations'> & {
  layers: BandLayer[];
  /** The variation it is, when the band has them. */
  variation?: BandVariation;
};

/** The variation a style plays: the one made for it, else the band's first. */
export function variationForStyle(
  band: Pick<Band, 'variations'>,
  styleId: string | undefined,
): BandVariation | undefined {
  const all = band.variations ?? [];
  return all.find((v) => v.style && v.style === styleId) ?? all[0];
}

/**
 * The band as a variation plays it (its first when the id is unknown or left
 * out): members it gives nothing drop out, so the lesson's own backing plays
 * that part. A band without variations plays its members' own items.
 */
export function bandVariation(band: Band, variationId?: string): PlayableBand {
  const { variations, layers, ...rest } = band;
  if (!variations?.length)
    return {
      ...rest,
      layers: layers.filter((l): l is BandLayer => !!l.source),
    };
  const variation =
    variations.find((v) => v.id === variationId) ?? variations[0];
  return {
    ...rest,
    timeSignature: variation.timeSignature ?? band.timeSignature,
    tempo: variation.tempo ?? band.tempo,
    variation,
    layers: layers.flatMap((l) => {
      const source = variation.plays[l.id];
      return source ? [{ ...l, source }] : [];
    }),
  };
}

/** Every item a band plays, in any variation. */
export function bandSources(band: Band): BandSource[] {
  return band.variations?.length
    ? band.variations.flatMap((v) => Object.values(v.plays))
    : band.layers.flatMap((l) => (l.source ? [l.source] : []));
}

export const BAND_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export const BAND_INSTRUMENTS: { id: BandInstrument; label: string }[] = [
  { id: 'drums', label: 'Drums' },
  { id: 'percussion', label: 'Percussion' },
  { id: 'bass', label: 'Bass' },
  { id: 'keys', label: 'Keys' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'synth', label: 'Synth' },
  { id: 'strings', label: 'Strings' },
  { id: 'horns', label: 'Horns' },
];

/** The lesson voice a source kind has always played on. */
export const SOURCE_PART: Record<BandSourceKind, BackingNote['part']> = {
  groove: 'drums',
  bassLine: 'bass',
  comping: 'chords',
  part: 'chords',
};

/** Everything a layer's engine needs to play over a chart. */
export interface RealizeContext {
  /** The chord sounding at a tick (480 per quarter). */
  chordAt: (tick: number) => ChordSymbolTones;
  bars: number;
  timeSignature: TimeSignature;
  /** The genre it plays in: bass lines walk and approach by its rules. */
  genre?: string;
  /**
   * Captured parts follow this chart's chords ("Follows the chords",
   * parts/followChords.ts) instead of playing as written, moved to the key.
   * Set where the chart isn't the one they were captured over: Music
   * Literacy's Hear It with Your Band plays the student's own progression.
   * The key is the chart's (a Part key: tonic pitch class, Prism mode name):
   * passing notes, and the colors a chord doesn't name (a 7th over a triad),
   * come from its scale. Left out, parts play as written.
   */
  followChords?: { tonic: number; mode: string };
}

/** One layer's notes, with the layer they came from. */
export interface RealizedLayer {
  layer: BandLayer;
  notes: BackingNote[];
}

/** A file-safe id from a name: 'Latin L1 · Cumbia' → 'latin-l1-cumbia'. */
export function bandIdFrom(name: string): string {
  const id = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return BAND_ID_PATTERN.test(id) ? id : `band-${id || 'new'}`;
}

/** A new draft band with no layers yet. */
export function blankBand(id: string, name: string): Band {
  return {
    id,
    name,
    status: 'draft',
    timeSignature: [4, 4],
    tempo: 96,
    layers: [],
  };
}

/** A layer id not yet taken in the band: 'keys', 'keys-2'… */
export function layerIdFor(band: Pick<Band, 'layers'>, base: string): string {
  const taken = new Set(band.layers.map((l) => l.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}
