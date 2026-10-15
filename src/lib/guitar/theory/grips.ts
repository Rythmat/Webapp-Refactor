// ── Grips: generated chord boxes ───────────────────────────────────────────
// The chord boxes the rest of Theory teaches, where no book key lends its
// shapes. Every grip is one guitarists actually use, in root position:
//
// - four-note chords as Drop 2, R-5-7-3 from the bass, on strings 6-3 or
//   5-2 (Book One's own 7th-chord family on 5-2): never a close stack of
//   thirds, which no hand can reach on a guitar neck;
// - triads as Book One's four-string grips, R-5-R-3, on strings 6-3 or 5-2.
//
// A 6 or 𝄫7 stands in the 7th's place and a sus2's 2 in the 3rd's, so min6,
// dim7 and sus2(♭5)add6 are Drop 2 grips like the rest. Every grip passes
// gripProblems (no stretch past four frets, a finger for every note, real
// barres only, no muted string between played ones, the root in the bass);
// a quality with no comfortable grip on a string set simply has no template
// there, and placeGrip uses the other set.

import type { BookChordQuality } from '@/curriculum/data/guitar/types';
import {
  GUITAR_STANDARD_TUNING,
  GUITAR_STRINGS_LOW_TO_HIGH,
  defaultDiagramStart,
  formatShape,
  parseShape,
  shapeNotes,
} from '@/lib/guitar/fretboard';
import type {
  FingerNumber,
  GuitarBarre,
  GuitarFingerPlacement,
  GuitarShapeDiagram,
  GuitarStringNumber,
} from '@/lib/guitar/types';
import { chordSemitones } from './chordTones';

export type GripFamily = 'drop2' | 'root6-four-string' | 'root5-four-string';

export interface GripTemplate {
  family: GripFamily;
  quality: BookChordQuality;
  rootString: 5 | 6;
  /** Frets relative to the root fret, string 6 first; null = muted. */
  offsets: readonly (number | null)[];
  /** The finger on each string, string 6 first; null = muted. */
  fingers: readonly (FingerNumber | null)[];
}

const X = null;

function drop2(
  quality: BookChordQuality,
  rootString: 5 | 6,
  offsets: readonly (number | null)[],
  fingers: readonly (FingerNumber | null)[],
): GripTemplate {
  return { family: 'drop2', quality, rootString, offsets, fingers };
}

function triad(
  quality: BookChordQuality,
  rootString: 5 | 6,
  offsets: readonly (number | null)[],
  fingers: readonly (FingerNumber | null)[],
): GripTemplate {
  const family = rootString === 6 ? 'root6-four-string' : 'root5-four-string';
  return { family, quality, rootString, offsets, fingers };
}

/** Every generated grip. Offsets and fingers run string 6 → string 1. */
export const GRIP_TEMPLATES: readonly GripTemplate[] = [
  // Four-note chords, Drop 2, root on string 6 (strings 6-3).
  drop2('maj7', 6, [0, 2, 1, 1, X, X], [1, 4, 2, 3, X, X]),
  drop2('dom7', 6, [0, 2, 0, 1, X, X], [1, 4, 2, 3, X, X]),
  drop2('min7', 6, [0, 2, 0, 0, X, X], [1, 3, 1, 1, X, X]),
  drop2('min7b5', 6, [0, 1, 0, 0, X, X], [1, 2, 1, 1, X, X]),
  drop2('dim7', 6, [0, 1, -1, 0, X, X], [2, 4, 1, 3, X, X]),
  drop2('minMaj7', 6, [0, 2, 1, 0, X, X], [1, 4, 3, 2, X, X]),
  drop2('maj7#5', 6, [0, 3, 1, 1, X, X], [1, 4, 2, 3, X, X]),
  drop2('dom7b5', 6, [0, 1, 0, 1, X, X], [1, 3, 2, 4, X, X]),
  drop2('min6', 6, [0, 2, -1, 0, X, X], [2, 4, 1, 3, X, X]),
  drop2('sus2b5add6', 6, [0, 1, -1, -1, X, X], [2, 3, 1, 1, X, X]),
  // Four-note chords, Drop 2, root on string 5 (strings 5-2).
  drop2('maj7', 5, [X, 0, 2, 1, 2, X], [X, 1, 3, 2, 4, X]),
  drop2('dom7', 5, [X, 0, 2, 0, 2, X], [X, 1, 3, 1, 4, X]),
  drop2('min7', 5, [X, 0, 2, 0, 1, X], [X, 1, 3, 1, 2, X]),
  drop2('min7b5', 5, [X, 0, 1, 0, 1, X], [X, 1, 3, 2, 4, X]),
  drop2('dim7', 5, [X, 0, 1, -1, 1, X], [X, 2, 3, 1, 4, X]),
  drop2('minMaj7', 5, [X, 0, 2, 1, 1, X], [X, 1, 4, 2, 3, X]),
  drop2('maj7#5', 5, [X, 0, 3, 1, 2, X], [X, 1, 4, 2, 3, X]),
  drop2('dom7b5', 5, [X, 0, 1, 0, 2, X], [X, 1, 3, 2, 4, X]),
  drop2('min6', 5, [X, 0, 2, -1, 1, X], [X, 2, 4, 1, 3, X]),
  drop2('sus2b5add6', 5, [X, 0, 1, -1, 0, X], [X, 2, 4, 1, 3, X]),
  // Triads, R-5-R-3, root on string 6 (strings 6-3).
  triad('maj', 6, [0, 2, 2, 1, X, X], [1, 3, 4, 2, X, X]),
  triad('min', 6, [0, 2, 2, 0, X, X], [1, 3, 4, 1, X, X]),
  triad('dim', 6, [0, 1, 2, 0, X, X], [1, 2, 3, 1, X, X]),
  triad('aug', 6, [0, 3, 2, 1, X, X], [1, 4, 3, 2, X, X]),
  triad('majb5', 6, [0, 1, 2, 1, X, X], [1, 2, 4, 3, X, X]),
  // No sus2(♭5) here: its 2 on string 3 sits a fret below the root, a
  // backwards four-fret reach.
  // Triads, R-5-R-3, root on string 5 (strings 5-2).
  triad('maj', 5, [X, 0, 2, 2, 2, X], [X, 1, 3, 3, 3, X]),
  triad('min', 5, [X, 0, 2, 2, 1, X], [X, 1, 3, 4, 2, X]),
  triad('dim', 5, [X, 0, 1, 2, 1, X], [X, 1, 2, 4, 3, X]),
  triad('aug', 5, [X, 0, 3, 2, 2, X], [X, 1, 4, 2, 3, X]),
  triad('majb5', 5, [X, 0, 1, 2, 2, X], [X, 1, 2, 3, 4, X]),
  triad('sus2b5', 5, [X, 0, 1, 2, 0, X], [X, 1, 2, 3, 1, X]),
];

/** Generated grips stay at or below this fret. */
export const MAX_GRIP_FRET = 15;

/** A template played with its root on `rootFret`: frets, fingers and barre. */
export function gripShape(
  template: GripTemplate,
  rootFret: number,
): GuitarShapeDiagram {
  const frets = template.offsets.map((o) => (o === null ? null : rootFret + o));
  const shape = formatShape(frets);
  const fingering: GuitarFingerPlacement[] = [];
  GUITAR_STRINGS_LOW_TO_HIGH.forEach((string, i) => {
    const fret = frets[i];
    const finger = template.fingers[i];
    if (fret !== null && finger !== null)
      fingering.push({ finger, string, fret });
  });
  const barre = barreFromFingering(fingering);
  return {
    frets: shape,
    diagramStartFret: defaultDiagramStart(shape),
    fingering,
    ...(barre ? { barre } : {}),
  };
}

/** The finger that holds down more than one string, as a barre. */
export function barreFromFingering(
  fingering: readonly GuitarFingerPlacement[],
): GuitarBarre | undefined {
  for (const finger of [1, 2, 3, 4] as const) {
    const on = fingering.filter((f) => f.finger === finger);
    if (on.length < 2) continue;
    const strings = on.map((f) => f.string);
    return {
      fret: on[0].fret,
      fromString: Math.max(...strings) as GuitarStringNumber,
      toString: Math.min(...strings) as GuitarStringNumber,
      finger,
    };
  }
  return undefined;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** What a hand may do beyond a generated grip (the Songs page's open chords). */
export interface HandRules {
  /** Open strings may ring: they take no finger and don't count in the span. */
  allowOpen?: boolean;
  /**
   * One muted string directly above a fretted bass note, damped by the bass
   * finger (F/G as 3-X-3-2-1-1).
   */
  allowBassMute?: boolean;
}

/**
 * Why a hand could not hold `shape`, whatever chord it is; empty when it can.
 * By default the rules of a generated grip: no open strings, at most four
 * frets (five over an index barre), a finger for every note, real barres
 * only, fingers rising with the frets, no muted string between played ones.
 */
export function handProblems(
  shape: GuitarShapeDiagram,
  rules: HandRules = {},
): string[] {
  const problems: string[] = [];
  const frets = parseShape(shape.frets);
  const played = GUITAR_STRINGS_LOW_TO_HIGH.flatMap((string, i) => {
    const fret = frets[i];
    return fret === null ? [] : [{ string, fret }];
  });
  if (played.length === 0) return ['sounds nothing'];

  if (!rules.allowOpen && played.some((p) => p.fret === 0)) {
    problems.push('open string');
  }
  if (played.some((p) => p.fret > MAX_GRIP_FRET)) {
    problems.push(`above fret ${MAX_GRIP_FRET}`);
  }
  const fretted = rules.allowOpen ? played.filter((p) => p.fret > 0) : played;

  // A finger for every fretted note, from the fingering or the barre.
  const { barre } = shape;
  const fingerOf = (string: GuitarStringNumber, fret: number) =>
    shape.fingering.find((f) => f.string === string && f.fret === fret)
      ?.finger ??
    (barre &&
    fret === barre.fret &&
    string <= barre.fromString &&
    string >= barre.toString
      ? barre.finger
      : null);
  const fingered = fretted.map((p) => ({
    ...p,
    finger: fingerOf(p.string, p.fret),
  }));
  if (fingered.some((p) => p.finger === null))
    problems.push('a note has no finger');

  // Span: four frets, five when the lowest is an index barre.
  if (fretted.length > 0) {
    const lo = Math.min(...fretted.map((p) => p.fret));
    const hi = Math.max(...fretted.map((p) => p.fret));
    const indexBarre = barre?.finger === 1 && barre.fret === lo;
    if (hi - lo > (indexBarre ? 4 : 3))
      problems.push(`spans ${hi - lo + 1} frets`);
  }

  // A finger on two strings is a real barre: one fret, contiguous strings,
  // none muted under it and none fretted below it (nor open).
  const fingers = new Map<
    number,
    { string: GuitarStringNumber; fret: number }[]
  >();
  for (const p of fingered) {
    if (p.finger === null) continue;
    fingers.set(p.finger, [...(fingers.get(p.finger) ?? []), p]);
  }
  if (fingers.size > 4) problems.push('more than four fingers');
  for (const [finger, notes] of fingers) {
    if (notes.length < 2) continue;
    const fret = notes[0].fret;
    if (notes.some((n) => n.fret !== fret)) {
      problems.push(`finger ${finger} on two frets`);
      continue;
    }
    if (!barre || barre.finger !== finger || barre.fret !== fret) {
      problems.push(`finger ${finger} holds two strings with no barre`);
      continue;
    }
    for (let s = barre.toString; s <= barre.fromString; s++) {
      const under = frets[6 - s];
      if (under === null) problems.push(`muted string ${s} under the barre`);
      else if (under < fret)
        problems.push(`string ${s} fretted below the barre`);
    }
  }

  // Fingers rise with the frets, and no two neighbours stretch too far.
  const reach = [...fingers.entries()]
    .map(([finger, notes]) => ({ finger, fret: notes[0].fret }))
    .sort((a, b) => a.finger - b.finger);
  for (let i = 1; i < reach.length; i++) {
    const a = reach[i - 1];
    const b = reach[i];
    if (b.fret < a.fret)
      problems.push(`finger ${b.finger} below finger ${a.finger}`);
    if (b.fret - a.fret > b.finger - a.finger + 1) {
      problems.push(`fingers ${a.finger}-${b.finger} stretch too far`);
    }
  }

  // No muted string between the bass and the top string, unless the bass
  // finger can damp the one beside it.
  const bassString = played[0].string;
  const topString = played[played.length - 1].string;
  const inside = GUITAR_STRINGS_LOW_TO_HIGH.filter(
    (s, i) => frets[i] === null && s < bassString && s > topString,
  );
  const damped =
    !!rules.allowBassMute &&
    inside.length === 1 &&
    inside[0] === bassString - 1 &&
    played[0].fret > 0;
  if (inside.length > 0 && !damped)
    problems.push('muted string inside the grip');
  return problems;
}

/**
 * Why a hand could not play `shape` as `quality` on `rootPc`; empty when it
 * can. The rules every generated grip must pass: handProblems, the root in
 * the bass, and the chord's notes and no others.
 */
export function gripProblems(
  shape: GuitarShapeDiagram,
  rootPc: number,
  quality: BookChordQuality,
): string[] {
  const problems = handProblems(shape);
  if (problems[0] === 'sounds nothing') return problems;
  const notes = shapeNotes(shape.frets);
  const bass = Math.min(...notes.map((n) => n.midi));
  if (mod12(bass) !== mod12(rootPc)) problems.push('root not in the bass');
  const want = new Set(chordSemitones(quality).map((s) => mod12(rootPc + s)));
  const have = new Set(notes.map((n) => mod12(n.midi)));
  if (want.size !== have.size || [...want].some((pc) => !have.has(pc))) {
    problems.push(`notes are not ${quality}`);
  }
  return problems;
}

/** A grip placed on the neck: where its root sits and the diagram. */
export interface PlacedGrip {
  template: GripTemplate;
  rootString: 5 | 6;
  rootFret: number;
  shape: GuitarShapeDiagram;
}

/** The fret window a grip should sit near: the lesson's scale position. */
export interface FretWindow {
  fretStart: number;
  fretEnd: number;
}

function gripCost(
  shape: GuitarShapeDiagram,
  window: FretWindow,
  rootString: number,
) {
  const fretted = parseShape(shape.frets).filter(
    (f): f is number => f !== null,
  );
  const lo = Math.min(...fretted);
  const hi = Math.max(...fretted);
  const outside =
    Math.max(0, window.fretStart - lo) + Math.max(0, hi - window.fretEnd);
  const centre = Math.abs(
    (lo + hi) / 2 - (window.fretStart + window.fretEnd) / 2,
  );
  return [outside, centre, rootString === 5 ? 0 : 1, lo];
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/** Every comfortable placement of `quality` on `rootPc`. */
export function gripPlacements(
  rootPc: number,
  quality: BookChordQuality,
): PlacedGrip[] {
  const out: PlacedGrip[] = [];
  for (const template of GRIP_TEMPLATES) {
    if (template.quality !== quality) continue;
    const base = mod12(rootPc - GUITAR_STANDARD_TUNING[template.rootString]);
    for (const rootFret of [base, base + 12]) {
      const frets = template.offsets.flatMap((o) =>
        o === null ? [] : [rootFret + o],
      );
      if (Math.min(...frets) < 1 || Math.max(...frets) > MAX_GRIP_FRET) {
        continue;
      }
      const shape = gripShape(template, rootFret);
      if (gripProblems(shape, rootPc, quality).length > 0) continue;
      out.push({ template, rootString: template.rootString, rootFret, shape });
    }
  }
  return out;
}

/**
 * The grip of `quality` on `rootPc` that sits best in `window`: fewest frets
 * outside it, then closest to its middle, then root on string 5. With
 * `prefer`, a grip with that root string and fret wins when there is one,
 * so a triad sits where its 7th chord does.
 */
export function placeGrip(
  rootPc: number,
  quality: BookChordQuality,
  window: FretWindow,
  prefer?: { rootString: 5 | 6; rootFret: number },
): PlacedGrip {
  const placements = gripPlacements(rootPc, quality);
  const preferred =
    prefer &&
    placements.find(
      (p) =>
        p.rootString === prefer.rootString && p.rootFret === prefer.rootFret,
    );
  if (preferred) return preferred;
  let best: { grip: PlacedGrip; cost: number[] } | null = null;
  for (const grip of placements) {
    const cost = gripCost(grip.shape, window, grip.rootString);
    if (!best || lexLess(cost, best.cost)) best = { grip, cost };
  }
  if (!best)
    throw new Error(`No playable ${quality} grip on pitch class ${rootPc}`);
  return best.grip;
}
