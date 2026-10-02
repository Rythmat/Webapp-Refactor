import { chordsOfOpening } from '@/curriculum/engine/openingTree';
import { parseChord } from '@/lib/chordNotation';
import {
  baseQuality,
  normalizeQuality,
  qualityIntervals,
} from '@/lib/chordNotation/qualities';
import type { TesseractModel } from './tesseractModel';

/**
 * Tesseract's Find: chords typed in any of the app's notations, or a song's
 * title, to the openings that match.
 *
 * Chords can be typed the way any page of the app writes them, in the key
 * picked above the map: Roman numerals ("ii7 V7 IΔ7", case for minor),
 * Hybrid degrees ("2 min7 5 dom7", or the library's own "2 minor7"), or
 * letter names ("Dm7 G7 Cmaj7", "D−7", "C/G"). Separators between chords
 * (spaces, commas, dashes, arrows, bars) are all the same.
 *
 * What matches, best first:
 *
 * 1. the progression's opening: the typed chords are the tree's first
 *    chords, in order;
 * 2. anywhere inside: the typed chords follow one another somewhere in a
 *    progression;
 *
 * and, either way, an exact chord before a near one (the same root and the
 * same family, major, minor, diminished or augmented, so "ii V I" still
 * finds "ii7 V7 IΔ7", just below the exact matches). Separately, a song
 * title finds the progressions that name or link that song.
 *
 * The module is pure: the caller hands in the model, the key and how to
 * read a song's title.
 */

/** A chord as typed: semitones above the key's tonic, its quality and its bass. */
export interface ChordQuery {
  pc: number;
  /** The engine quality without any bass ("minor7", "major"). */
  quality: string;
  /** The bass, as semitones above the tonic, when one was named. */
  bass: number | null;
}

/** One thing Find found. */
export interface FindHit {
  /** The node to reveal: the matched opening's last chord, or a progression's end. */
  id: string;
  kind: 'opening' | 'inside' | 'song';
  /** For a song: the progression that names it, and the title matched. */
  progressionId?: number;
  song?: string;
  /** Higher is better. */
  score: number;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const LETTER_PC: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const ascii = (s: string) => s.replace(/♭/g, 'b').replace(/♯/g, '#');

/** "b7" → 10; null when it is not a degree. */
function degreeToPc(text: string): number | null {
  const m = /^([b#]?)([1-7])$/.exec(ascii(text.trim()));
  if (!m) return null;
  return mod12(MAJOR[Number(m[2]) - 1] + (m[1] === 'b' ? -1 : m[1] ? 1 : 0));
}

/** "Bb" → 10; null when it is not a note name. */
function letterToPc(text: string): number | null {
  const m = /^([A-G])(bb|##|b|#)?$/.exec(ascii(text.trim()));
  if (!m) return null;
  const shift = { bb: -2, '##': 2, b: -1, '#': 1 }[m[2] ?? ''] ?? 0;
  return mod12(LETTER_PC[m[1]] + shift);
}

/** The bass an engine slash quality puts under its root ("major/5": a fifth below). */
function slashBass(quality: string, rootPc: number): number | null {
  if (baseQuality(quality) === quality) return null;
  const intervals = qualityIntervals(quality) ?? [];
  const lowest = Math.min(0, ...intervals);
  return lowest < 0 ? mod12(rootPc + lowest) : null;
}

const ROMAN = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/;
const ROMAN_NUMBER: Readonly<Record<string, number>> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
};

/** A Roman numeral's chord: case says major or minor, the rest is the symbol. */
function readRoman(token: string): ChordQuery | null {
  const m = ROMAN.exec(ascii(token));
  if (!m) return null;
  const [, accidental, numeral, rawRest] = m;
  const [symbol, bassText] = rawRest.split('/');
  const lower = numeral === numeral.toLowerCase();
  const rest = symbol.trim();
  let quality: string;
  if (!lower) {
    quality = normalizeQuality(rest);
  } else if (/^[°oø]/.test(rest)) {
    quality = normalizeQuality(rest);
  } else {
    quality = normalizeQuality(`m${rest.replace(/^(min|m|-|−)/, '')}`);
  }
  if (!qualityIntervals(quality)) return null;
  const pc = degreeToPc(`${accidental}${ROMAN_NUMBER[numeral.toLowerCase()]}`)!;
  let bass: number | null = null;
  if (bassText !== undefined) {
    bass = degreeToPc(bassText);
    if (bass === null) return null;
  }
  return { pc, quality: baseQuality(quality), bass };
}

/**
 * One typed chord, in a key: Roman, Hybrid or a letter name. Null when the
 * text is not a chord the app can read.
 */
export function readChord(token: string, keyPc: number): ChordQuery | null {
  const text = token.trim();
  if (!text) return null;
  if (!/^[A-G]/.test(text)) {
    const roman = readRoman(text);
    if (roman) return roman;
  }
  // "2min7" written without its space reads as "2 min7".
  const spaced = text.replace(/^([b#♭♯]?[1-7])(?=[A-Za-zΔ°ø−+-])/, '$1 ');
  const spec = parseChord(spaced);
  if (!spec) return null;
  const quality = normalizeQuality(spec.quality);
  if (!qualityIntervals(quality)) return null;
  let pc: number | null = null;
  if (spec.tonicDegree) pc = degreeToPc(spec.tonicDegree);
  else if (typeof spec.root === 'string') {
    const letter = letterToPc(spec.root);
    pc = letter === null ? null : mod12(letter - keyPc);
  }
  if (pc === null) return null;
  let bass: number | null = slashBass(quality, pc);
  if (typeof spec.bass === 'string') {
    const asDegree = degreeToPc(spec.bass);
    const asLetter = letterToPc(spec.bass);
    bass =
      asDegree !== null
        ? asDegree
        : asLetter !== null
          ? mod12(asLetter - keyPc)
          : null;
    if (bass === null) return null;
  }
  return { pc, quality: baseQuality(quality), bass };
}

/** A tree's chord ("2 minor7") as a query, to compare with what was typed. */
export function chordAsQuery(chord: string): ChordQuery | null {
  return readChord(chord, 0);
}

/**
 * Split typed text into chords: spaces, commas, dashes between chords,
 * arrows and bars all separate, and a bare degree joins the word after it
 * ("2 min7" is one chord).
 */
export function chordTokens(text: string): string[] {
  const words = text
    .split(/[\s,|→]+|\s[-–—]\s/)
    .map((w) => w.trim())
    .filter((w) => w !== '' && !/^[-–—]+$/.test(w));
  const tokens: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (/^[b#♭♯]?[1-7]$/.test(word) && i + 1 < words.length) {
      tokens.push(`${word} ${words[i + 1]}`);
      i += 1;
    } else tokens.push(word);
  }
  return tokens;
}

/** Typed text as chords, or null unless every word reads as one. */
export function readChords(text: string, keyPc: number): ChordQuery[] | null {
  const tokens = chordTokens(text);
  if (tokens.length === 0) return null;
  const chords: ChordQuery[] = [];
  for (const token of tokens) {
    const chord = readChord(token, keyPc);
    if (!chord) return null;
    chords.push(chord);
  }
  return chords;
}

/** A quality's family: major, minor, diminished, augmented or suspended. */
function family(quality: string): string {
  const pcs = new Set((qualityIntervals(quality) ?? []).map(mod12));
  const third = pcs.has(4) ? 'major' : pcs.has(3) ? 'minor' : 'sus';
  if (third === 'minor' && pcs.has(6) && !pcs.has(7)) return 'diminished';
  if (third === 'major' && pcs.has(8) && !pcs.has(7)) return 'augmented';
  return third;
}

/** How well a tree's chord answers a typed one: 2 exact, 1 near, 0 not at all. */
function closeness(typed: ChordQuery, tree: ChordQuery): number {
  if (typed.pc !== tree.pc || typed.bass !== tree.bass) return 0;
  if (typed.quality === tree.quality) return 2;
  return family(typed.quality) === family(tree.quality) ? 1 : 0;
}

/** Everything in the map these chords or this title find, best first. */
export function findInTesseract(
  model: TesseractModel,
  text: string,
  keyPc: number,
  songTitle: (songId: string) => string | undefined = () => undefined,
  limit = 24,
): FindHit[] {
  const query = text.trim();
  if (!query) return [];
  const hits: FindHit[] = [];
  const typed = readChords(query, keyPc);

  if (typed) {
    const asQuery = new Map<string, ChordQuery | null>();
    const read = (chord: string) => {
      if (!asQuery.has(chord)) asQuery.set(chord, chordAsQuery(chord));
      return asQuery.get(chord) ?? null;
    };
    const n = typed.length;
    for (const id of model.order) {
      const chords = chordsOfOpening(id);
      if (chords.length < n) continue;
      // The typed chords ending at this node: from the start, or inside.
      let score = 0;
      for (let k = 0; k < n; k++) {
        const tree = read(chords[chords.length - n + k]);
        const c = tree ? closeness(typed[k], tree) : 0;
        if (c === 0) {
          score = -1;
          break;
        }
        score += c;
      }
      if (score < 0) continue;
      const fromStart = chords.length === n;
      hits.push({
        id,
        kind: fromStart ? 'opening' : 'inside',
        // An opening outranks a match inside, which outranks a song title;
        // exact chords outrank near ones.
        score: (fromStart ? 3000 : 2000) + score * 10 - chords.length,
      });
    }
  }

  if (query.length >= 2) {
    const needle = query.toLowerCase();
    for (const entry of model.entries.values()) {
      const end = model.forest.endNodeOf.get(entry.id);
      if (!end) continue;
      const titles = [
        entry.song,
        ...entry.songIds.map((s) => songTitle(s) ?? ''),
      ].filter(Boolean);
      const title = titles.find((t) => t.toLowerCase().includes(needle));
      if (!title) continue;
      const exact = title.toLowerCase() === needle;
      hits.push({
        id: end,
        kind: 'song',
        progressionId: entry.id,
        song: title,
        score: (exact ? 1100 : 1000) - entry.id / 10_000,
      });
    }
  }

  // Best first; ties by the map's own order, so results never shuffle.
  const rank = new Map(model.order.map((id, i) => [id, i]));
  return hits
    .sort(
      (a, b) =>
        b.score - a.score || (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0),
    )
    .slice(0, limit);
}
