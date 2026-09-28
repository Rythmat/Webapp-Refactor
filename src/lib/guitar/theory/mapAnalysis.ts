// ── Music Map analysis ─────────────────────────────────────────────────────
// Facts about a map's chord sequence for the chips, badges and popovers:
// named patterns, what each change keeps or moves, and the B8 page's climbing
// top line. Maps play twice (repeat signs), so the last bar also leads back
// to the first.

import { chordRootPc } from '@/curriculum/data/guitar/bookOne';
import type {
  GuitarKeyCenter,
  GuitarMusicMap,
} from '@/curriculum/data/guitar/types';
import {
  parseShape,
  shapeLowestMidi,
  shapeNotes,
  shapePitchClasses,
  shapePositions,
} from '@/lib/guitar/fretboard';
import { FUNCTION_OF_DEGREE } from './keyTheory';
import type {
  BookShape,
  ChangeAnchor,
  ChangeInfo,
  MapPattern,
  MusicMapAnalysis,
} from './types';
import { classifyVoicing } from './voicing';

/** The finger on a string and fret, from the fingering or the barre. */
function fingerAt(
  shape: BookShape,
  string: number,
  fret: number,
): ChangeAnchor['finger'] | null {
  const placed = shape.fingering.find(
    (f) => f.string === string && f.fret === fret,
  );
  if (placed) return placed.finger;
  const { barre } = shape;
  if (
    barre &&
    barre.fret === fret &&
    string <= barre.fromString &&
    string >= barre.toString
  ) {
    return barre.finger;
  }
  return null;
}

/**
 * What stays and what moves from one chord to the next. Anchors use the
 * book's fingering: a finger that can stay pressed. Two bars of the same
 * chord have nothing to anchor. Bars are 0-based indexes: map bars, or the
 * chords of a chord-page step in order.
 */
export function analyzeChange(
  from: BookShape,
  to: BookShape,
  fromBar: number,
  toBar: number,
  wrapsRepeat = false,
): ChangeInfo {
  const toPcs = shapePitchClasses(to.frets);
  const sharedPitchClasses = shapePitchClasses(from.frets).filter((pc) =>
    toPcs.includes(pc),
  );
  const sameChord = from.degree === to.degree && from.quality === to.quality;
  const fromPositions = shapePositions(from.frets);
  const toPositions = shapePositions(to.frets);
  const anchors: ChangeAnchor[] = [];
  if (!sameChord) {
    for (const { string, fret } of fromPositions) {
      if (fret === 0) continue;
      if (!toPositions.some((p) => p.string === string && p.fret === fret)) {
        continue;
      }
      const finger = fingerAt(from, string, fret);
      if (finger !== null && finger === fingerAt(to, string, fret)) {
        anchors.push({ string, fret, finger });
      }
    }
  }
  const a = fromPositions[0];
  const b = toPositions[0];
  let sameFretRootMove: ChangeInfo['sameFretRootMove'];
  if (a.fret === b.fret && a.fret > 0) {
    if (a.string === 6 && b.string === 5) sameFretRootMove = 'r6-to-r5';
    if (a.string === 5 && b.string === 6) sameFretRootMove = 'r5-to-r6';
  }
  return {
    fromBar,
    toBar,
    wrapsRepeat,
    sharedPitchClasses,
    anchors,
    ...(sameFretRootMove ? { sameFretRootMove } : {}),
    isTricky: sharedPitchClasses.length === 0,
  };
}

export function analyzeMusicMap(map: GuitarMusicMap): MusicMapAnalysis {
  const { bars } = map;
  const n = bars.length;
  const degrees = bars.map((b) => b.degree);
  const at = (i: number) => degrees[i % n];

  const patterns: MapPattern[] = [];
  const insideTwoFiveOne = new Set<number>();
  if (n >= 3) {
    for (let i = 0; i < n; i++) {
      if (at(i) === 2 && at(i + 1) === 5 && at(i + 2) === 1) {
        patterns.push({
          id: 'two-five-one',
          startBar: i,
          length: 3,
          wrapsRepeat: i + 2 >= n,
        });
        insideTwoFiveOne.add((i + 1) % n);
      }
    }
  }
  if (n === 4 && degrees.join() === '1,6,2,5') {
    patterns.push({
      id: 'turnaround-1625',
      startBar: 0,
      length: 4,
      wrapsRepeat: false,
    });
  }
  const changes: ChangeInfo[] = [];
  const dom7ToOne: number[] = [];
  if (n >= 2) {
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const wraps = next === 0;
      if (at(i) === 5 && at(next) === 1) {
        if (!insideTwoFiveOne.has(i)) {
          patterns.push({
            id: 'five-to-one',
            startBar: i,
            length: 2,
            wrapsRepeat: wraps,
          });
        }
        if (bars[i].quality === 'dom7') dom7ToOne.push(i);
      }
      changes.push(analyzeChange(bars[i], bars[next], i, next, wraps));
    }
  }

  return {
    degrees,
    functions: degrees.map((d) => FUNCTION_OF_DEGREE[d]),
    patterns,
    changes,
    startsOnSix: degrees[0] === 6,
    hasSevenChord: degrees.includes(7),
    triadBarsIn7thMap:
      map.example >= 4
        ? bars.flatMap((b, i) =>
            b.quality === 'maj' || b.quality === 'min' ? [i] : [],
          )
        : [],
    dom7ToOne,
  };
}

// ── The 7th-chord page (B8) ────────────────────────────────────────────────

/** A run of chord boxes, 0-based and inclusive. */
export interface TopLineRun {
  start: number;
  end: number;
}

/**
 * Stretches of three or more boxes on the 7th-chord page (1-7, then 1) that
 * keep one family while the top string climbs a scale step (1-2 semitones)
 * each chord.
 */
export function topLineRuns(center: GuitarKeyCenter): TopLineRun[] {
  const boxes = center.sevenths.map((shape) => {
    const voicing = classifyVoicing(
      shape,
      chordRootPc(center.key, shape.degree),
      shape.quality,
    );
    const notes = shapeNotes(shape.frets);
    // The highest played string, the one b8.topNote tells the student to
    // follow (not simply the highest pitch).
    return {
      family: `${voicing.family}/${voicing.rootString}`,
      top: notes[notes.length - 1].midi,
    };
  });
  const runs: TopLineRun[] = [];
  let start = 0;
  for (let i = 1; i <= boxes.length; i++) {
    const rise = i < boxes.length ? boxes[i].top - boxes[i - 1].top : 0;
    const continues =
      i < boxes.length &&
      boxes[i].family === boxes[i - 1].family &&
      rise >= 1 &&
      rise <= 2;
    if (continues) continue;
    if (i - start >= 3) runs.push({ start, end: i - 1 });
    start = i;
  }
  return runs;
}

export type OctaveReturnKind = 'same-shape' | 'new-shape' | 'not-higher';

/** How the page's closing "1" relates to box 1. */
export function octaveReturnKind(center: GuitarKeyCenter): OctaveReturnKind {
  const first = center.sevenths[0].frets;
  const last = center.sevenths[center.sevenths.length - 1].frets;
  const a = parseShape(first);
  const b = parseShape(last);
  const plusTwelve = a.every((fret, i) =>
    fret === null ? b[i] === null : b[i] === fret + 12,
  );
  if (plusTwelve) return 'same-shape';
  return shapeLowestMidi(last) > shapeLowestMidi(first)
    ? 'new-shape'
    : 'not-higher';
}
