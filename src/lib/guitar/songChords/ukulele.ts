// ── Song chords on ukulele ────────────────────────────────────────────────
// Every chord name a song uses → one ukulele box, open chords first: a major
// or minor chord is The Ukulele Atlas's own box (C 0-0-0-3, A minor
// 2-0-0-0, B♭ 3-2-1-1), anything else the most open grip a hand can hold
// that sounds the chord's required tones and nothing outside it (a 9th or
// 13th leaves its 5th out, as on guitar). No capo. A ukulele has no bass
// string, so a slash chord is played as its chord, with the bass named for
// the bass player, as guitar does when no shape reaches the bass.

import { homeBookTriad } from '@/curriculum/data/ukulele/grips';
import {
  MAX_UKULELE_GRIP_FRET,
  ukuleleHandProblems,
  ukuleleShape,
} from '@/curriculum/data/ukulele/positions';
import { formatShape, shapeNotes } from '@/lib/guitar/fretboard';
import { UKULELE } from '@/lib/guitar/instrument';
import type {
  GuitarShapeDiagram,
  GuitarStringNumber,
} from '@/lib/guitar/types';
import { parseSongChord, type SongChord } from './parse';
import { SONG_QUALITIES, songToneLabel } from './quality';
import type { SongChordShape } from './resolve';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

const less = (a: readonly number[], b: readonly number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

interface SearchRules {
  /** Leave the root out (a rootless voicing). */
  rootless: boolean;
  /** The outer strings that may be muted: G (4), A (1). */
  muted: readonly (1 | 4)[];
}

/** The most open grip for a chord under `rules`, or null. */
function searchGrip(
  chord: SongChord,
  { rootless, muted }: SearchRules,
): GuitarShapeDiagram | null {
  const spec = SONG_QUALITIES[chord.quality];
  const allowed = new Set(
    Object.keys(spec.tones).map((s) => mod12(chord.rootPc + Number(s))),
  );
  const required = spec.required
    .filter((s) => !(rootless && s === 0))
    .map((s) => mod12(chord.rootPc + s));
  const options = UKULELE.stringsLowToHigh.map((string) => {
    const open = UKULELE.tuning[string]!;
    const frets: (number | null)[] = (muted as number[]).includes(string)
      ? [null]
      : [];
    for (let f = 0; f <= MAX_UKULELE_GRIP_FRET; f++) {
      if (allowed.has(mod12(open + f))) frets.push(f);
    }
    return frets;
  });
  let best: { frets: (number | null)[]; cost: number[] } | null = null;
  const pick = (i: number, acc: (number | null)[]) => {
    if (i === options.length) {
      const fretted = acc.filter((f): f is number => f !== null && f > 0);
      const hi = fretted.length ? Math.max(...fretted) : 0;
      if (fretted.length && hi - Math.min(...fretted) > 3) return;
      const pcs = new Set(
        acc.flatMap((f, s) =>
          f === null
            ? []
            : [mod12(UKULELE.tuning[UKULELE.stringsLowToHigh[s]]! + f)],
        ),
      );
      if (!required.every((pc) => pcs.has(pc))) return;
      const cost = [hi, fretted.length, fretted.reduce((a, b) => a + b, 0)];
      if (best && !less(cost, best.cost)) return;
      const shape = ukuleleShape(formatShape(acc));
      if (ukuleleHandProblems(shape, { allowMuted: muted }).length > 0) {
        return;
      }
      best = { frets: [...acc], cost };
      return;
    }
    for (const f of options[i]) pick(i + 1, [...acc, f]);
  };
  pick(0, []);
  const found = best as { frets: (number | null)[] } | null;
  return found ? ukuleleShape(formatShape(found.frets)) : null;
}

/**
 * Four ringing strings first; then, as ukulele players do, the G string
 * muted, then the root left out (a rootless 9th), then both; last, both
 * outer strings muted (a two-string power chord, E♭5 X-3-6-X).
 */
const FALLBACKS: readonly SearchRules[] = [
  { rootless: false, muted: [] },
  { rootless: false, muted: [4] },
  { rootless: true, muted: [] },
  { rootless: true, muted: [4] },
  { rootless: false, muted: [4, 1] },
];

function toneLabelsOf(
  shape: GuitarShapeDiagram,
  chord: SongChord,
): Map<GuitarStringNumber, string> {
  return new Map(
    shapeNotes(shape.frets, UKULELE).map((n) => [
      n.position.string,
      songToneLabel(chord.quality, chord.rootPc, n.midi),
    ]),
  );
}

const CACHE = new Map<string, SongChordShape | null>();

/** The ukulele box for one chord name, or null (unreadable or unplayable). */
export function ukuleleSongChord(name: string): SongChordShape | null {
  const key = name.trim();
  if (CACHE.has(key)) return CACHE.get(key)!;
  const chord = parseSongChord(key);
  let result: SongChordShape | null = null;
  if (chord && chord !== 'noChord') {
    const book =
      chord.quality === 'maj' || chord.quality === 'min'
        ? homeBookTriad(chord.rootPc, chord.quality)
        : undefined;
    let shape = book ? ukuleleShape(book.frets) : null;
    for (const rules of FALLBACKS) {
      if (shape) break;
      shape = searchGrip(chord, rules);
    }
    if (shape) {
      const open = shape.frets.split('-').includes('0');
      result = {
        chordName: key,
        chord,
        shape,
        source: open ? 'open' : 'movable',
        bassNote: chord.bassPc !== null ? chord.bassName : null,
        toneLabels: toneLabelsOf(shape, chord),
      };
    }
  }
  CACHE.set(key, result);
  return result;
}

/**
 * The ukulele box for each chord name, in first-appearance order; a name
 * that can't be read (or played) maps to null, 'N.C.' is left out.
 */
export function resolveUkuleleSongChords(
  names: readonly string[],
): Map<string, SongChordShape | null> {
  const out = new Map<string, SongChordShape | null>();
  for (const raw of names) {
    const name = raw.trim();
    if (out.has(name) || parseSongChord(name) === 'noChord') continue;
    out.set(name, ukuleleSongChord(name));
  }
  return out;
}
