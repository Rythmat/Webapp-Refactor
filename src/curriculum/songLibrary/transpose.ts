import {
  MIDI_ROOT_TO_KEY,
  parseNoteName,
  type SpelledNote,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type {
  ChordBar,
  ChordHit,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import {
  BASS_TOKEN,
  ROOT_TOKEN,
  expectedDegreeNumbers,
  isNoChord,
  songTonic,
  spelledPitchClass,
  splitDegreeLabel,
} from './hybridDegree';

/**
 * Transposing a chart.
 *
 * A chord's `degree` is what the chart means — "the 4 chord", "the ♭7" — and
 * it does not move when the song does. So transposing rewrites only the
 * spelling: the key, its `keyRoot`, every chord symbol and every mid-song
 * `keyChange`. Sections, bars, the roadmap and every degree are copied
 * through untouched.
 *
 * The spelling moves BY LETTER: every root travels the same number of letter
 * steps and the same number of semitones as the tonic does, so A♭→B♭ turns
 * D♭ into E♭ and C♯ into D♯. Counting in letters is what keeps the degrees
 * true, because a degree is itself a letter distance from the tonic
 * (see hybridDegree.ts) — the numbers cannot drift from the symbols.
 *
 * Where a letter step would need a double accidental the chord is respelled,
 * and then the degree DOES move with it: D major's A♭ is the ♭5, and the same
 * chord in E♭ is A, which is the ♯4. The quality never changes.
 *
 * A song that changes key mid-chart is transposed one local key at a time,
 * each by the same interval, so the relationships between its keys are fixed.
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** A note token anywhere in a key label ('G minor & A minor'). */
const KEY_NOTE_TOKEN = /[A-G](?:♯♯|♭♭|♯|♭|#|b)?/g;

/** How far the music moves, in letters and in semitones. */
interface LetterShift {
  letterSteps: number;
  semitones: number;
}

const format = (note: SpelledNote): string =>
  `${LETTERS[note.letterIndex]}${
    note.accidental > 0 ? '♯'.repeat(note.accidental) : ''
  }${note.accidental < 0 ? '♭'.repeat(-note.accidental) : ''}`;

/** Every spelling of a pitch class with at most one accidental, B♯/C♭ included. */
function spellingsOf(pc: number): SpelledNote[] {
  const out: SpelledNote[] = [];
  for (let letterIndex = 0; letterIndex < 7; letterIndex++) {
    for (const accidental of [0, 1, -1]) {
      if (mod12(LETTER_PC[letterIndex] + accidental) === pc)
        out.push({ letterIndex, accidental });
    }
  }
  return out;
}

const accidentalCount = (text: string): number =>
  (text.match(/[♯♭]/g) ?? []).length;

/** The key a musician writes a pitch class in: E♭, not D♯. */
const isCanonicalKey = (note: SpelledNote): boolean => {
  const canonical = parseNoteName(MIDI_ROOT_TO_KEY[spelledPitchClass(note)]);
  return (
    canonical != null &&
    canonical.letterIndex === note.letterIndex &&
    canonical.accidental === note.accidental
  );
};

/**
 * The note `shift` semitones above `note`, keeping the letter distance. Falls
 * back to a plain spelling of the pitch rather than write a double
 * accidental, which no chart should carry and no chord parser here reads.
 */
function shiftNote(note: SpelledNote, shift: LetterShift): SpelledNote {
  const letterIndex = (note.letterIndex + shift.letterSteps) % 7;
  const pc = mod12(spelledPitchClass(note) + shift.semitones);
  let accidental = mod12(pc - LETTER_PC[letterIndex]);
  if (accidental > 6) accidental -= 12;
  if (Math.abs(accidental) <= 1) return { letterIndex, accidental };
  return spellingsOf(pc)[0] ?? { letterIndex, accidental };
}

/**
 * One chord symbol, moved. Only the root and the slash bass are rewritten —
 * everything between them is the chord's quality, which transposition never
 * touches ('min7', 'maj9', '7(♯9)', ' sus7').
 */
function transposeChordName(
  chordName: string,
  shift: LetterShift,
): string | null {
  if (isNoChord(chordName)) return chordName;
  const rootToken = chordName.match(ROOT_TOKEN);
  const root = rootToken ? parseNoteName(rootToken[1]) : null;
  if (!rootToken || !root) return null;

  let out =
    format(shiftNote(root, shift)) + chordName.slice(rootToken[1].length);

  const bassToken = out.match(BASS_TOKEN);
  const bass = bassToken ? parseNoteName(bassToken[1]) : null;
  if (bassToken && bass && bassToken.index !== undefined) {
    const tail = out
      .slice(bassToken.index)
      .replace(bassToken[1], format(shiftNote(bass, shift)));
    out = out.slice(0, bassToken.index) + tail;
  }
  return out;
}

/** Every note token in a key label moved, the mode words left alone. */
function transposeKeyLabel(label: string, shift: LetterShift): string {
  return label.replace(KEY_NOTE_TOKEN, (token) => {
    const note = parseNoteName(token);
    return note ? format(shiftNote(note, shift)) : token;
  });
}

const shiftBetween = (from: SpelledNote, to: SpelledNote): LetterShift => ({
  letterSteps: (to.letterIndex - from.letterIndex + 7) % 7,
  semitones: mod12(spelledPitchClass(to) - spelledPitchClass(from)),
});

/**
 * Which spelling of the new tonic this chart should be written in — C♯ or D♭.
 *
 * `songTonic` is what the chart's own degrees are measured against, so the
 * answer has to be the spelling it will pick back up: transpose the chords
 * with a candidate, ask `songTonic` what tonic those chords imply, and keep
 * the candidates it agrees with. Both D♯ and E♭ can pass that test — each is
 * self-consistent once its own chords are spelled — so the tie goes to the
 * chart with fewer accidentals, and then to the key a musician would write.
 */
function chooseTargetTonic(
  source: SpelledNote,
  semitones: number,
  label: string,
  chordNames: readonly string[],
): SpelledNote {
  const candidates = spellingsOf(mod12(spelledPitchClass(source) + semitones));
  if (candidates.length === 0) return source;

  let best = candidates[0];
  let bestCost = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const shift = shiftBetween(source, candidate);
    const moved = chordNames
      .map((name) => transposeChordName(name, shift))
      .filter((name): name is string => name !== null);
    const settled = songTonic(transposeKeyLabel(label, shift), moved);
    const agrees =
      settled != null &&
      settled.letterIndex === candidate.letterIndex &&
      settled.accidental === candidate.accidental;
    const cost =
      moved.reduce((sum, name) => sum + accidentalCount(name), 0) +
      Math.abs(candidate.accidental) +
      (agrees ? 0 : 1000) +
      (isCanonicalKey(candidate) ? 0 : 0.5);
    if (cost < bestCost) {
      best = candidate;
      bestCost = cost;
    }
  }
  return best;
}

/* ── Walking a chart's local keys ─────────────────────────────────────── */

interface LocalGroup {
  label: string;
  chordNames: string[];
}

/** Each bar's local-key group, and the chords that belong to each group. */
function localGroups(song: Song): {
  groups: LocalGroup[];
  groupOfBar: number[][];
} {
  const groups: LocalGroup[] = [];
  const groupOfBar: number[][] = [];
  let current = -1;

  song.sections.forEach((section, sectionIdx) => {
    groupOfBar[sectionIdx] = [];
    section.bars.forEach((bar, barIdx) => {
      // A key change opens a new group; the home key opens the first one.
      if (bar.keyChange || current < 0) {
        groups.push({ label: bar.keyChange ?? song.key, chordNames: [] });
        current = groups.length - 1;
      }
      groupOfBar[sectionIdx][barIdx] = current;
      for (const hit of bar.chords) {
        if (hit.chordName) groups[current].chordNames.push(hit.chordName);
      }
    });
  });

  return { groups, groupOfBar };
}

/* ── The transposition ────────────────────────────────────────────────── */

export interface TransposeReport {
  song: Song;
  /** Chord symbols a double accidental would have been written for. */
  respelled: { from: string; to: string }[];
  /** Symbols no chord parser could read; passed through unchanged. */
  unparsed: string[];
}

/** Semitones that move `song`'s home tonic to pitch class `targetPc` (0–11). */
export function semitonesToTonic(song: Song, targetPc: number): number {
  return mod12(targetPc - mod12(song.keyRoot));
}

/** The transposed chart, plus what had to be respelled along the way. */
export function transposeSongWithReport(
  song: Song,
  semitones: number,
): TransposeReport {
  const steps = mod12(semitones);
  if (steps === 0) return { song, respelled: [], unparsed: [] };

  const { groups, groupOfBar } = localGroups(song);
  const respelled: { from: string; to: string }[] = [];
  const unparsed: string[] = [];

  // One shift per local key: the same interval, spelled for that key.
  const shifts = groups.map((group) => {
    const source =
      songTonic(group.label, group.chordNames) ?? parseNoteName('C')!;
    const target = chooseTargetTonic(
      source,
      steps,
      group.label,
      group.chordNames,
    );
    return { shift: shiftBetween(source, target), source, target };
  });

  const moveChord = (
    hit: ChordHit,
    group: (typeof shifts)[number],
  ): ChordHit => {
    const moved = transposeChordName(hit.chordName, group.shift);
    if (moved === null) {
      unparsed.push(hit.chordName);
      return { ...hit };
    }
    return { ...hit, chordName: moved, degree: moveDegree(hit, moved, group) };
  };

  /**
   * The degree the transposed symbol carries. Letter-step transposition
   * leaves it exactly as written; only a respelled chord moves (♭5 → ♯4),
   * and a chart whose numbers already disagreed with its own symbols is left
   * alone rather than quietly "corrected" here.
   */
  const moveDegree = (
    hit: ChordHit,
    moved: string,
    group: (typeof shifts)[number],
  ): string => {
    if (isNoChord(hit.chordName)) return hit.degree;
    const stored = splitDegreeLabel(hit.degree);
    const before = expectedDegreeNumbers(hit.chordName, group.source);
    const after = expectedDegreeNumbers(moved, group.target);
    if (!stored || !before || !after) return hit.degree;
    if (before.root !== stored.root || before.bass !== stored.bass)
      return hit.degree;
    if (after.root === stored.root && after.bass === stored.bass)
      return hit.degree;
    respelled.push({ from: hit.chordName, to: moved });
    return `${after.root}${stored.quality ? ` ${stored.quality}` : ''}${
      after.bass ? `/${after.bass}` : ''
    }`;
  };

  const sections: SongSection[] = song.sections.map((section, sectionIdx) => ({
    ...section,
    bars: section.bars.map((bar, barIdx): ChordBar => {
      const group = shifts[groupOfBar[sectionIdx][barIdx]];
      return {
        ...bar,
        ...(bar.keyChange
          ? { keyChange: transposeKeyLabel(bar.keyChange, group.shift) }
          : {}),
        chords: bar.chords.map((hit) => moveChord(hit, group)),
      };
    }),
  }));

  const homeShift = shifts[0]?.shift ?? {
    letterSteps: 0,
    semitones: steps,
  };

  return {
    song: {
      ...song,
      key: transposeKeyLabel(song.key, homeShift),
      keyRoot: 60 + mod12(song.keyRoot + steps),
      sections,
    },
    respelled,
    unparsed,
  };
}

/**
 * The chart in another key. `semitones` of 0 returns the song itself, and
 * repeated calls return the same object: the chart view keys its per-bar key
 * lookup on chord identity, so a fresh copy each render would quietly lose
 * every chord's key.
 */
const cache = new WeakMap<Song, Map<number, Song>>();

export function transposeSong(song: Song, semitones: number): Song {
  const steps = mod12(semitones);
  if (steps === 0) return song;
  let bySteps = cache.get(song);
  if (!bySteps) {
    bySteps = new Map();
    cache.set(song, bySteps);
  }
  const hit = bySteps.get(steps);
  if (hit) return hit;
  const { song: transposed } = transposeSongWithReport(song, steps);
  bySteps.set(steps, transposed);
  return transposed;
}
