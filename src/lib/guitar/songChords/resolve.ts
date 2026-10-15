// ── Song chords: choosing the boxes for a song ─────────────────────────────
// Every chord name a song uses → one guitar box, chosen together so the hand
// stays in one place: open chords first (and the open slash chords), then
// movable grips placed near them (first position when any chord is open,
// else the four-fret window the song's grips fit best). A slash chord that
// no shape plays with its bass is shown as its chord, with the bass named.

import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { GUITAR_STANDARD_TUNING, shapeNotes } from '@/lib/guitar/fretboard';
import type {
  FingerNumber,
  GuitarShapeDiagram,
  GuitarStringNumber,
} from '@/lib/guitar/types';
import { songShapeProblems } from './gate';
import {
  OPEN_SHAPES,
  OPEN_SLASH_SHAPES,
  type OpenShapeRow,
} from './openShapes';
import { parseSongChord, type SongChord } from './parse';
import { songToneLabel } from './quality';
import { shapeFromGrip, shapeFromText } from './shapes';
import { SLASH_TEMPLATES, SONG_TEMPLATES } from './templates';

export type SongShapeSource =
  | 'open'
  | 'open-slash'
  | 'movable'
  | 'slash-movable';

export interface SongChordShape {
  chordName: string;
  chord: SongChord;
  shape: GuitarShapeDiagram;
  source: SongShapeSource;
  /** The slash bass the box doesn't play (the bass plays it); else null. */
  bassNote: string | null;
  /** Each sounding string's tone: 'R', '♭3', '♭7', '9'. */
  toneLabels: ReadonlyMap<GuitarStringNumber, string>;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;
/** Movable boxes stay at or below this fret. */
const MAX_FRET = 15;
/** A movable slash shape is used only this close to the song's window. */
const SLASH_REACH = 2;

interface FretWindow {
  fretStart: number;
  fretEnd: number;
}

interface Candidate {
  shape: GuitarShapeDiagram;
  source: SongShapeSource;
  bassInShape: boolean;
  rootString: number;
  rootFret: number;
}

type Offsets = readonly (number | null)[];
type Fingers = readonly (FingerNumber | null)[];

const pcOf = (name: string) => noteNameToPitchClass(name);

function openRowFits(row: OpenShapeRow, chord: SongChord): boolean {
  return (
    row.common &&
    pcOf(row.root) === chord.rootPc &&
    row.quality === chord.quality &&
    (row.bass ? pcOf(row.bass) : null) === chord.bassPc
  );
}

/** The open shape for a chord, with its bass when it has one. */
function openCandidate(chord: SongChord): Candidate | null {
  const bassInShape = chord.bassPc !== null;
  const table = bassInShape ? OPEN_SLASH_SHAPES : OPEN_SHAPES;
  for (const row of table) {
    if (!openRowFits(row, chord)) continue;
    const shape = shapeFromText(row.frets, row.fingers);
    if (songShapeProblems(shape, chord, { open: true, bassInShape }).length) {
      continue;
    }
    return {
      shape,
      source: bassInShape ? 'open-slash' : 'open',
      bassInShape,
      rootString: 0,
      rootFret: 0,
    };
  }
  return null;
}

/** Every placement of a grip whose anchor note (on `anchorString`) is `pc`. */
function placements(
  pc: number,
  anchorString: 5 | 6,
  offsets: Offsets,
  fingers: Fingers,
): { shape: GuitarShapeDiagram; fret: number }[] {
  const base = mod12(pc - GUITAR_STANDARD_TUNING[anchorString]);
  const out: { shape: GuitarShapeDiagram; fret: number }[] = [];
  for (const fret of [base, base + 12]) {
    const frets = offsets.map((o) => (o === null ? null : fret + o));
    const fretted = frets.filter((f): f is number => f !== null);
    if (Math.min(...fretted) < 1 || Math.max(...fretted) > MAX_FRET) continue;
    out.push({ shape: shapeFromGrip(frets, fingers), fret });
  }
  return out;
}

/** Movable boxes for the chord itself (root lowest), gated. */
function movableCandidates(chord: SongChord): Candidate[] {
  const plain: SongChord = { ...chord, bassPc: null, bassName: null };
  return SONG_TEMPLATES.filter((t) => t.quality === chord.quality).flatMap(
    (t) =>
      placements(chord.rootPc, t.rootString, t.offsets, t.fingers)
        .filter(
          ({ shape }) =>
            songShapeProblems(shape, plain, {
              open: false,
              bassInShape: false,
            }).length === 0,
        )
        .map(({ shape, fret }) => ({
          shape,
          source: 'movable' as const,
          bassInShape: false,
          rootString: t.rootString,
          rootFret: fret,
        })),
  );
}

/** Movable boxes that play a slash chord with its bass, gated. */
function slashCandidates(chord: SongChord): Candidate[] {
  if (chord.bassPc === null) return [];
  const bassPc = chord.bassPc;
  const interval = mod12(bassPc - chord.rootPc);
  const grips: { offsets: Offsets; fingers: Fingers; bassString: 5 | 6 }[] =
    SLASH_TEMPLATES.filter(
      (t) => t.quality === chord.quality && t.bassInterval === interval,
    ).map((t) => ({
      offsets: t.offsets,
      fingers: t.fingers,
      bassString: t.bassString,
    }));
  // Symmetric chords (dim7, aug) are their own inversions; a minor 7 over
  // its ♭3 is that note's 6 chord (Am7/C = C6).
  const sameNotes =
    chord.quality === 'dim7' || chord.quality === 'aug'
      ? chord.quality
      : chord.quality === 'min7' && interval === 3
        ? 'maj6'
        : null;
  if (sameNotes) {
    for (const t of SONG_TEMPLATES) {
      if (t.quality === sameNotes) {
        grips.push({
          offsets: t.offsets,
          fingers: t.fingers,
          bassString: t.rootString,
        });
      }
    }
  }
  return grips.flatMap((g) =>
    placements(bassPc, g.bassString, g.offsets, g.fingers)
      .filter(
        ({ shape }) =>
          songShapeProblems(shape, chord, { open: false, bassInShape: true })
            .length === 0,
      )
      .map(({ shape, fret }) => ({
        shape,
        source: 'slash-movable' as const,
        bassInShape: true,
        rootString: g.bassString,
        rootFret: fret,
      })),
  );
}

function fretSpan(shape: GuitarShapeDiagram): [number, number] {
  const frets = shapeNotes(shape.frets)
    .map((n) => n.position.fret)
    .filter((f) => f > 0);
  return frets.length ? [Math.min(...frets), Math.max(...frets)] : [0, 0];
}

function outside(shape: GuitarShapeDiagram, w: FretWindow): number {
  const [lo, hi] = fretSpan(shape);
  return Math.max(0, w.fretStart - lo) + Math.max(0, hi - w.fretEnd);
}

/** Fewest frets outside the window, then nearest its middle, root on 5, lowest. */
function cost(c: Candidate, w: FretWindow): number[] {
  const [lo, hi] = fretSpan(c.shape);
  const centre = Math.abs((lo + hi) / 2 - (w.fretStart + w.fretEnd) / 2);
  return [outside(c.shape, w), centre, c.rootString === 5 ? 0 : 1, lo];
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

function best(
  candidates: readonly Candidate[],
  w: FretWindow,
): Candidate | null {
  let pick: { c: Candidate; cost: number[] } | null = null;
  for (const c of candidates) {
    const k = cost(c, w);
    if (!pick || lexLess(k, pick.cost)) pick = { c, cost: k };
  }
  return pick?.c ?? null;
}

/** The four-fret window the movable boxes fit best (fewest frets outside). */
function bestWindow(options: readonly Candidate[][]): FretWindow {
  let pick: { w: FretWindow; total: number } | null = null;
  for (let start = 1; start <= 11; start++) {
    const w = { fretStart: start, fretEnd: start + 3 };
    const total = options.reduce((sum, list) => {
      const c = best(list, w);
      return sum + (c ? outside(c.shape, w) : 0);
    }, 0);
    if (!pick || total < pick.total) pick = { w, total };
  }
  return pick?.w ?? { fretStart: 1, fretEnd: 4 };
}

function toneLabelsOf(
  shape: GuitarShapeDiagram,
  chord: SongChord,
): Map<GuitarStringNumber, string> {
  return new Map(
    shapeNotes(shape.frets).map((n) => [
      n.position.string,
      songToneLabel(chord.quality, chord.rootPc, n.midi),
    ]),
  );
}

/**
 * The guitar box for each chord name, chosen together, in first-appearance
 * order. A name that can't be read (or played) maps to null; 'N.C.' is left
 * out.
 */
export function resolveSongChords(
  names: readonly string[],
): Map<string, SongChordShape | null> {
  const order: string[] = [];
  const chords: { name: string; chord: SongChord }[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (order.includes(name)) continue;
    const chord = parseSongChord(name);
    if (chord === 'noChord') continue;
    order.push(name);
    if (chord !== null) chords.push({ name, chord });
  }

  const open = new Map(
    chords.map(({ name, chord }) => [name, openCandidate(chord)]),
  );
  const anyOpen = [...open.values()].some(Boolean);
  const window: FretWindow = anyOpen
    ? { fretStart: 1, fretEnd: 5 }
    : bestWindow(
        chords
          .filter(({ name }) => !open.get(name))
          .map(({ chord }) => movableCandidates(chord)),
      );

  /** Roots already placed: a chord on the same root sits where it did. */
  const placedRoots = new Map<
    number,
    { rootString: number; rootFret: number }
  >();
  const results = new Map<string, SongChordShape>();
  for (const { name, chord } of chords) {
    let pick = open.get(name) ?? null;
    if (!pick && chord.bassPc !== null) {
      const slash = best(slashCandidates(chord), window);
      if (slash && outside(slash.shape, window) <= SLASH_REACH) pick = slash;
    }
    if (!pick) {
      const movable = movableCandidates(chord);
      const prior = placedRoots.get(chord.rootPc);
      pick =
        (prior &&
          movable.find(
            (c) =>
              c.rootString === prior.rootString &&
              c.rootFret === prior.rootFret,
          )) ||
        best(movable, window);
      if (pick && !placedRoots.has(chord.rootPc)) {
        placedRoots.set(chord.rootPc, {
          rootString: pick.rootString,
          rootFret: pick.rootFret,
        });
      }
    }
    if (!pick) continue;
    results.set(name, {
      chordName: name,
      chord,
      shape: pick.shape,
      source: pick.source,
      bassNote: chord.bassName && !pick.bassInShape ? chord.bassName : null,
      toneLabels: toneLabelsOf(pick.shape, chord),
    });
  }
  return new Map(order.map((name) => [name, results.get(name) ?? null]));
}
