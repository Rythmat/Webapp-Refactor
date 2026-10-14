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
  layers: BandLayer[];
  /**
   * What the editor plays it over: a preset progression and key, or a typed
   * chart ('| Am | Dm | E7 | Am |'). Editor only; lessons play their own.
   */
  preview?: { progression?: string; key?: number; chart?: string };
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
