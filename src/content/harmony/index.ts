import type { Song } from '@/curriculum/types/songLibrary';
import {
  type HarmonyChord,
  type MatchTier,
  familyLabel,
  sameAt,
} from './chordClass';
import {
  type HarmonyMatch,
  type Pattern,
  type Placement,
  type ProgressionLike,
  compareMatches,
  matchProgressions,
  readPatterns,
} from './match';
import {
  type CurriculumLike,
  type FlowLike,
  type HarmonyPass,
  type UnreadLabel,
  curriculumPasses,
  flowPasses,
  songPasses,
} from './sequences';

/**
 * The progression crosscheck: the library's progressions found, by their
 * chords, in every song chart, genre activity and curriculum level — with
 * where, how closely, and how squarely — and the loops the songs keep
 * playing that the library does not have yet.
 *
 * Derived, never stored: a chart corrected tomorrow is matched correctly
 * tomorrow. A progression's `songIds` stay what a person linked (the song a
 * source sheet named, or a match someone accepted); this is what the chords
 * say, offered beside it.
 *
 * Pure: the caller hands in the data (the console's working snapshot, the
 * bundled flows, a test fixture), so it runs the same in the Table's lazy
 * chunk and in a report.
 */

export interface HarmonyInput {
  progressions?: readonly ProgressionLike[];
  songs?: readonly Song[];
  flows?: readonly FlowLike[];
  curriculum?: readonly CurriculumLike[];
}

/** A loop several songs are built on, and whether the library has it. */
export interface LoopCandidate {
  /** In hybrid numbering by family: '1 maj - 5 maj - 6 min - 4 maj'. */
  text: string;
  chords: HarmonyChord[];
  /** Songs whose section loops it (each song once). */
  songIds: string[];
  /** Where to hear it first: a song and its section. */
  examples: { songId: string; title: string; sectionLabel: string }[];
  /** The library progression that IS this loop, at family strength. */
  libraryId?: number;
  /** A library progression that is this loop started elsewhere. */
  rotationOf?: number;
  /**
   * The library has it only as written from the relative major (a minor
   * song's '1 min - ♭6 maj - ♭3 maj - ♭7 maj' is its '6 - 4 - 1 - 5').
   */
  relative?: true;
}

export interface HarmonyIndex {
  matches: HarmonyMatch[];
  /** Matches by progression id, strongest first. */
  byProgression: Map<number, HarmonyMatch[]>;
  /** Song matches by song id, strongest first. */
  bySong: Map<string, HarmonyMatch[]>;
  passes: number;
  unread: UnreadLabel[];
  unreadable: { id: number; chord: string }[];
  loops: LoopCandidate[];
}

export function buildHarmonyIndex(input: HarmonyInput): HarmonyIndex {
  const unread: UnreadLabel[] = [];
  const { patterns, unreadable } = readPatterns(input.progressions ?? []);
  const songPassList: HarmonyPass[] = [];
  for (const song of input.songs ?? []) {
    if (!song?.id || !Array.isArray(song.sections)) continue;
    songPassList.push(...songPasses(song, unread));
  }
  const passes: HarmonyPass[] = [
    ...songPassList,
    ...(input.flows ?? []).flatMap((flow) => flowPasses(flow, unread)),
    ...(input.curriculum ?? []).flatMap((entry) =>
      curriculumPasses(entry, unread),
    ),
  ];
  const matches = matchProgressions(patterns, passes);

  const byProgression = new Map<number, HarmonyMatch[]>();
  const bySong = new Map<string, HarmonyMatch[]>();
  for (const match of matches) {
    const list = byProgression.get(match.progressionId) ?? [];
    list.push(match);
    byProgression.set(match.progressionId, list);
    if (match.source.kind === 'song') {
      const own = bySong.get(match.source.songId) ?? [];
      own.push(match);
      bySong.set(match.source.songId, own);
    }
  }
  for (const list of byProgression.values()) list.sort(compareMatches);
  for (const list of bySong.values()) list.sort(compareMatches);

  return {
    matches,
    byProgression,
    bySong,
    passes: passes.length,
    unread,
    unreadable,
    loops: findLoops(songPassList, patterns),
  };
}

/* ── Summaries ───────────────────────────────────────────────────────── */

/** How a progression is heard in one song: its strongest match there. */
export interface SongUse {
  songId: string;
  title: string;
  artist: string;
  best: HarmonyMatch;
  /** Every match in the song, strongest first. */
  matches: HarmonyMatch[];
}

/** One progression's matches folded to one entry per song. */
export function songUses(matches: readonly HarmonyMatch[]): SongUse[] {
  const bySong = new Map<string, SongUse>();
  for (const match of [...matches].sort(compareMatches)) {
    if (match.source.kind !== 'song') continue;
    const use = bySong.get(match.source.songId);
    if (use) use.matches.push(match);
    else
      bySong.set(match.source.songId, {
        songId: match.source.songId,
        title: match.source.title,
        artist: match.source.artist,
        best: match,
        matches: [match],
      });
  }
  return [...bySong.values()].sort(
    (a, b) => compareMatches(a.best, b.best) || a.title.localeCompare(b.title),
  );
}

/**
 * Whether a match is strong enough to stand for "this song uses this
 * progression": the section is built on it or a phrase of it, and its
 * chords are the progression's or the same family (a chart's '1 maj' for
 * the library's '1 major7').
 */
export const isStrongMatch = (m: Pick<HarmonyMatch, 'tier' | 'placement'>) =>
  m.placement !== 'inside' && m.tier !== 'loose';

export const TIER_TEXT: Record<MatchTier, string> = {
  exact: 'same chords',
  family: 'same chord families',
  loose: 'same roots, other colors',
};

export const PLACEMENT_TEXT: Record<Placement, string> = {
  loop: 'looped',
  phrase: 'as a phrase',
  inside: 'passing through',
};

/* ── Loops the library does not have ─────────────────────────────────── */

const MAX_LOOP = 8;

/**
 * The loop a run opens with, at family strength: the shortest 2–8 chord
 * figure that is played at least twice back to back from the top of the
 * run. A section that is one line through ('1 4 5 1 6 2 5 1') has none.
 */
function openingLoop(chords: readonly HarmonyChord[]): HarmonyChord[] | null {
  for (let n = 2; n <= MAX_LOOP && n * 2 <= chords.length; n++) {
    let same = true;
    for (let j = 0; j < n && same; j++)
      same = sameAt('family', chords[j], chords[n + j]);
    // Not a figure of one chord and its neighbour repeated ('1 4 1 4' is
    // 1–4 at n = 2, never 1–4–1–4 at n = 4): the shortest wins by order.
    if (same) return chords.slice(0, n);
  }
  return null;
}

const familyCollapse = (steps: readonly { chord: HarmonyChord }[]) => {
  const out: HarmonyChord[] = [];
  for (const { chord } of steps) {
    const last = out[out.length - 1];
    if (!last || !sameAt('family', last, chord)) out.push(chord);
  }
  return out;
};

const sameLoop = (a: readonly HarmonyChord[], b: readonly HarmonyChord[]) =>
  a.length === b.length && a.every((c, i) => sameAt('family', c, b[i]));

const rotations = (chords: readonly HarmonyChord[]) =>
  chords.map((_, r) => [...chords.slice(r), ...chords.slice(0, r)]);

function findLoops(
  passes: readonly HarmonyPass[],
  patterns: readonly Pattern[],
): LoopCandidate[] {
  const library = patterns.map((p) => ({
    id: p.id,
    chords: familyCollapse(p.chords.map((chord) => ({ chord }))),
  }));
  const found = new Map<string, LoopCandidate>();
  for (const pass of passes) {
    if (pass.source.kind !== 'song') continue;
    const { songId, title, sectionLabel } = pass.source;
    for (const run of pass.runs) {
      const loop = openingLoop(familyCollapse(run));
      if (!loop) continue;
      const text = loop.map(familyLabel).join(' - ');
      let entry = found.get(text);
      if (!entry) {
        const shift = pass.parentShift ?? 0;
        const readings = shift
          ? [loop, loop.map((c) => ({ ...c, pc: (c.pc + shift) % 12 }))]
          : [loop];
        let libraryId: number | undefined;
        let rotationOf: number | undefined;
        let relative = false;
        readings.forEach((reading, r) => {
          if (libraryId !== undefined) return;
          const same = library.find((p) => sameLoop(p.chords, reading));
          if (same) {
            libraryId = same.id;
            rotationOf = undefined;
            relative = r > 0;
            return;
          }
          if (rotationOf !== undefined) return;
          const rotated = library.find((p) =>
            rotations(reading).some((rot) => sameLoop(p.chords, rot)),
          );
          if (rotated) {
            rotationOf = rotated.id;
            relative = r > 0;
          }
        });
        entry = {
          text,
          chords: loop,
          songIds: [],
          examples: [],
          ...(libraryId !== undefined ? { libraryId } : {}),
          ...(rotationOf !== undefined ? { rotationOf } : {}),
          ...(relative ? { relative: true as const } : {}),
        };
        found.set(text, entry);
      }
      if (!entry.songIds.includes(songId)) {
        entry.songIds.push(songId);
        if (entry.examples.length < 5)
          entry.examples.push({ songId, title, sectionLabel });
      }
    }
  }
  return [...found.values()].sort(
    (a, b) =>
      b.songIds.length - a.songIds.length || a.text.localeCompare(b.text),
  );
}

export type { HarmonyMatch, MatchTier, Placement, ProgressionLike };
export type { HarmonySource } from './sequences';
export type { HarmonyChord } from './chordClass';
export { familyLabel, parseDegreeChord, parseLetterChord } from './chordClass';
export { compareMatches, strength } from './match';
