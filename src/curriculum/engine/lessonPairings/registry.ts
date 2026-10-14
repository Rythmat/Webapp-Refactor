/**
 * Lesson pairings: which Band each lesson style plays. One file per style
 * in src/curriculum/data/lessonPairings/ — a genre · level · style chunk of
 * steps (lessonStyles.ts) — so one assignment covers every play-along step in
 * the style and that level's Practice Track, never step by step. An override
 * gives a section, or a run of steps, a different band where the lesson
 * genuinely changes within the style.
 *
 * A pairing wins over the steps' own groove and bass; an unpaired style
 * keeps them. Only a published band (and published items inside it) reaches
 * students — a pairing to a draft waits.
 *
 * Before Bands (ledger D-084, D-087) a pairing named a drum groove, a bass
 * line and a comping pattern separately. A file still written that way plays
 * as the band those three make.
 *
 * Repo files for now, written by the dev server (scripts/vite/devContentWriter.ts);
 * commit a file to ship it.
 */

import {
  getLessonStyle,
  lessonStyleFor,
  type LessonStyle,
} from '../../data/lessonStyles';
import type { Band, BandLayer, BandSourceKind } from '../band/band';
import { getBand, getLiveBand, LIVE_ITEMS } from '../band/registry';
import type { BassLine } from '../bassLines/bassLine';
import type { ChordComping } from '../chordComping/chordComping';
import type { DrumGroove } from '../drumGrooves/drumGroove';
import { preloadStudioGroove } from '../drumGrooves/registry';

/** The legacy single-item pairings, by the kind of item they named. */
export type PairingKind = 'drums' | 'bass' | 'comping';

/** A section, or a run of steps, within a style that plays another band. */
export interface PairingOverride {
  /** 'A' | 'B' | 'C' | 'D'; every section when left out. */
  section?: string;
  /** Step numbers it covers; every step of the section when left out. */
  steps?: number[];
  band: string;
}

export interface LessonPairing {
  /** The lesson style's id (lessonStyles.ts) — also the file name. */
  id: string;
  /** The Band the style plays. */
  band?: string;
  /** Narrower chunks that play another band; the first that fits wins. */
  overrides?: PairingOverride[];
  /** Legacy: a drum groove id, read as a band layer. */
  drums?: string;
  /** Legacy: a bass line id. */
  bass?: string;
  /** Legacy: a chord comping pattern id. */
  comping?: string;
}

/** Where in a style a step sits, for overrides. */
export interface PairingPlace {
  section?: string;
  stepNumber?: number;
}

const files = import.meta.glob<LessonPairing>(
  '../../data/lessonPairings/*.json',
  { eager: true, import: 'default' },
);

const PAIRINGS = new Map<string, LessonPairing>(
  Object.values(files).map((p) => [p.id, p]),
);

const isEmpty = (p: LessonPairing) =>
  !p.band && !p.overrides?.length && !p.drums && !p.bass && !p.comping;

/** Every pairing file, by style id. */
export function listPairings(): readonly LessonPairing[] {
  return [...PAIRINGS.values()];
}

export function getPairing(styleId: string): LessonPairing | undefined {
  return PAIRINGS.get(styleId);
}

/**
 * The band a legacy pairing's three items make. Live as a band; each item in
 * it still has to be published to play.
 */
export function legacyBand(pairing: LessonPairing): Band | undefined {
  const layer = (
    id: string | undefined,
    kind: BandSourceKind,
    instrument: BandLayer['instrument'],
    name: string,
  ): BandLayer[] =>
    id
      ? [
          {
            id: kind,
            name,
            instrument,
            source: { kind, id } as BandLayer['source'],
          },
        ]
      : [];
  const layers = [
    ...layer(pairing.drums, 'groove', 'drums', 'Drums'),
    ...layer(pairing.bass, 'bassLine', 'bass', 'Bass'),
    ...layer(pairing.comping, 'comping', 'keys', 'Comping'),
  ];
  if (!layers.length) return undefined;
  return {
    id: pairing.id,
    name: pairing.id,
    status: 'live',
    timeSignature: [4, 4],
    tempo: 100,
    layers,
  };
}

/** The band id a pairing gives a place in its style. */
export function bandIdAt(
  pairing: LessonPairing,
  place: PairingPlace = {},
): string | undefined {
  const override = pairing.overrides?.find(
    (o) =>
      (!o.section || o.section === place.section) &&
      (!o.steps?.length ||
        (place.stepNumber !== undefined && o.steps.includes(place.stepNumber))),
  );
  return override?.band ?? pairing.band;
}

/** The band a pairing plays at a place: published bands only. */
function bandAt(
  pairing: LessonPairing,
  place: PairingPlace = {},
): Band | undefined {
  const id = bandIdAt(pairing, place);
  return id ? getLiveBand(id) : legacyBand(pairing);
}

/**
 * The console's edit, applied here at once so lessons opened in the same
 * session hear it before the dev server's reload.
 */
export function rememberPairing(pairing: LessonPairing): void {
  if (isEmpty(pairing)) PAIRINGS.delete(pairing.id);
  else PAIRINGS.set(pairing.id, pairing);
  void preloadPairing(pairing);
}

const SOURCE_FOR: Record<PairingKind, BandSourceKind> = {
  drums: 'groove',
  bass: 'bassLine',
  comping: 'comping',
};

/** The band ids a pairing names, its own and its overrides'. */
const bandIdsOf = (p: LessonPairing) =>
  [p.band, ...(p.overrides ?? []).map((o) => o.band)].filter(
    (id): id is string => !!id,
  );

/** The styles an item plays in (directly or in a band), in lessonStyles order. */
export function stylesUsing(kind: PairingKind, itemId: string): LessonStyle[] {
  const source = SOURCE_FOR[kind];
  return listPairings()
    .filter(
      (p) =>
        p[kind] === itemId ||
        bandIdsOf(p).some((id) =>
          getBand(id)?.layers.some(
            (l) => l.source.kind === source && l.source.id === itemId,
          ),
        ),
    )
    .map((p) => getLessonStyle(p.id))
    .filter((s): s is LessonStyle => !!s);
}

/** The styles a band plays in, whole or in part, in lessonStyles order. */
export function stylesUsingBand(bandId: string): LessonStyle[] {
  return listPairings()
    .filter((p) => bandIdsOf(p).includes(bandId))
    .map((p) => getLessonStyle(p.id))
    .filter((s): s is LessonStyle => !!s);
}

/** Loads the Studio grooves a pairing's bands play. */
function preloadPairing(pairing: LessonPairing): Promise<unknown> {
  const grooves = [
    pairing.drums,
    ...bandIdsOf(pairing).flatMap((id) =>
      (getBand(id)?.layers ?? [])
        .filter((l) => l.source.kind === 'groove')
        .map((l) => l.source.id),
    ),
  ].filter((id): id is string => !!id);
  return Promise.all(grooves.map((id) => preloadStudioGroove(id)));
}

/**
 * Resolves once every Studio groove a pairing names is loaded, so the
 * synchronous lesson and Practice Track paths can read it. Started when this
 * module loads; startBacking awaits it.
 */
export const pairingsReady: Promise<void> = Promise.all(
  listPairings().map(preloadPairing),
).then(() => undefined);

export interface ResolvedPairing {
  style: LessonStyle;
  /** The band the place plays. */
  band: Band;
  /** Its drums: the first playing groove layer, published. */
  drums?: DrumGroove;
  /** Its bass: the first playing bass-line layer, published. */
  bass?: BassLine;
  /** Its comping: the first playing comping layer, published. */
  comping?: ChordComping;
}

/** A band's first playing layer of a kind. */
const firstOf = (band: Band, kind: BandSourceKind) =>
  band.layers.find((l) => !l.muted && l.source.kind === kind)?.source.id;

/** What a step's place in its style is paired with, published items only. */
export function pairingFor(
  genre: string,
  level: number,
  styleRef: string | undefined,
  place: PairingPlace = {},
): ResolvedPairing | undefined {
  const style = lessonStyleFor(genre, level, styleRef);
  if (!style) return undefined;
  return pairingForStyle(style, place);
}

export function pairingForStyle(
  style: LessonStyle,
  place: PairingPlace = {},
): ResolvedPairing | undefined {
  const pairing = PAIRINGS.get(style.id);
  if (!pairing) return undefined;
  const band = bandAt(pairing, place);
  if (!band) return undefined;
  const groove = firstOf(band, 'groove');
  const line = firstOf(band, 'bassLine');
  const pattern = firstOf(band, 'comping');
  const drums = groove ? LIVE_ITEMS.groove(groove) : undefined;
  const bass = line ? LIVE_ITEMS.bassLine(line) : undefined;
  const comping = pattern ? LIVE_ITEMS.comping(pattern) : undefined;
  if (!drums && !bass && !comping) return undefined;
  return { style, band, drums, bass, comping };
}
