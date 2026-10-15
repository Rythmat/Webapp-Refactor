import {
  barQuarters,
  performedBars,
  writtenBarKeys,
  writtenBarMeters,
} from '@/curriculum/songLibrary/performance';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  type HarmonyChord,
  isNoChord,
  parseDegreeChord,
  parseLetterChord,
  tonicOfKey,
} from './chordClass';

/**
 * The chords of a song, a genre activity or a curriculum level, laid out as
 * runs the matcher can walk: one `HarmonyPass` per stretch of music that is
 * heard as one line.
 *
 * A song is read the way it is PLAYED (`performedBars`): a four-bar chorus
 * written once under repeat signs is eight bars of the same loop, which is
 * what tells a song built on a progression from one that passes through it.
 * A pass is a section from where the band enters it to where it leaves —
 * repeats inside it included, a jump back into it (D.S.) a new pass. The
 * same section played the same way twice is one pass, played `plays` times.
 *
 * A genre step's `chordSymbols` loop (one per bar, "loops from start"), and
 * so does a curriculum level's progression: those passes are `cyclic`.
 */

/** Where a run of chords lives, and how to get back to it. */
export type HarmonySource =
  | {
      kind: 'song';
      songId: string;
      title: string;
      artist: string;
      /** Index into `song.sections`. */
      sectionIdx: number;
      sectionId: string;
      sectionLabel: string;
      /** The local key the pass opens in ('A♭ major'). */
      key: string;
    }
  | {
      kind: 'activity';
      genre: string;
      level: number;
      /** 'A' | 'B' | 'C' | 'D'; absent for a level's Practice Track. */
      section?: string;
      stepNumber?: number;
      /** 'D3.1: …' — the step's own title, or 'Practice Track'. */
      activity: string;
      key: string;
    }
  | {
      kind: 'curriculum';
      /** The curriculum map's genre id ('POP', 'NEO_SOUL'). */
      genre: string;
      /** 'L1' | 'L2' | 'L3'. */
      level: string;
      /** The progression as the map writes it: '1 maj - 4 maj'. */
      text: string;
    };

/** One chord as heard: what it is, where it sits, and how it was written. */
export interface HarmonyStep {
  chord: HarmonyChord;
  /** As the source wrote it: '6 min7', 'Am9'. */
  label: string;
  /** Quarter notes from the start of the pass. */
  at: number;
  /** Quarter notes it sounds for (to the next chord or the end of the run). */
  length: number;
  /** Written bar index within the section (songs), or the step's bar. */
  bar: number;
}

export interface HarmonyPass {
  source: HarmonySource;
  /**
   * Runs of chords; a gap (N.C., a rest, an unreadable label) ends one run
   * and starts the next, so no match spans it.
   */
  runs: HarmonyStep[][];
  /** The runs loop back to their start (a genre step, a curriculum loop). */
  cyclic: boolean;
  /** Times the pass is played, a section repeated identically counted once. */
  plays: number;
  /**
   * Semitones from the tonic of the pass's parent major key up to its own:
   * 9 for a minor key (A minor's parent is C major), 2 for Dorian, absent
   * for major. The library writes every progression from a major tonic
   * ('6 minor - 4 major - 1 major - 5 major', never '1 minor - ♭6 major …'),
   * so a minor song is also read from its relative major.
   */
  parentShift?: number;
}

/** Where each mode's tonic sits above its parent major's. */
const MODE_SHIFT: Record<string, number> = {
  major: 0,
  ionian: 0,
  dorian: 2,
  phrygian: 4,
  lydian: 5,
  mixolydian: 7,
  minor: 9,
  aeolian: 9,
  locrian: 11,
};

/**
 * The parent shift a key name or mode implies: 'A minor (Dorian)' is
 * Dorian, 'C minor' minor, 'G mixolydian' Mixolydian. The most specific mode
 * word named wins, so a minor key called Dorian reads as Dorian.
 */
export function parentShiftOf(keyOrMode: string): number | undefined {
  const words = keyOrMode.toLowerCase().split(/[^a-z]+/);
  const named = words.filter(
    (w) => w in MODE_SHIFT && w !== 'minor' && w !== 'major',
  );
  const mode = named[0] ?? (words.includes('minor') ? 'minor' : 'major');
  return MODE_SHIFT[mode] || undefined;
}

const withShift = (shift: number | undefined) =>
  shift ? { parentShift: shift } : {};

/** Labels no chord could be read from, for the report. */
export interface UnreadLabel {
  where: string;
  label: string;
}

export interface Extracted {
  passes: HarmonyPass[];
  unread: UnreadLabel[];
}

/* ── Songs ───────────────────────────────────────────────────────────── */

/** The passes of one song. */
export function songPasses(
  song: Song,
  unread: UnreadLabel[] = [],
): HarmonyPass[] {
  const performed = performedBars(song);
  if (!performed.length) return [];
  const keys = writtenBarKeys(song);
  const meters = writtenBarMeters(song);
  // Written index of each section's first bar, for its bar numbers.
  const sectionStart: number[] = [];
  let at = 0;
  for (const section of song.sections) {
    sectionStart.push(at);
    at += section.bars.length;
  }

  // Group the performance into passes: a new one where the section changes
  // or the band jumps back into a section it was already playing from an
  // earlier point than a repeat would (a D.S. into the same section is rare;
  // a repeat is the normal case and stays in the pass).
  const groups: (typeof performed)[] = [];
  for (const bar of performed) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1].sectionIdx === bar.sectionIdx)
      last.push(bar);
    else groups.push([bar]);
  }

  const seen = new Map<string, HarmonyPass>();
  const out: HarmonyPass[] = [];
  for (const group of groups) {
    const signature = group.map((b) => b.writtenIdx).join(',');
    const already = seen.get(signature);
    if (already) {
      already.plays++;
      continue;
    }
    const sectionIdx = group[0].sectionIdx;
    const section = song.sections[sectionIdx];
    const runs: HarmonyStep[][] = [];
    let run: HarmonyStep[] = [];
    const close = () => {
      if (run.length) runs.push(run);
      run = [];
    };
    let clock = 0;
    for (const { bar, writtenIdx } of group) {
      const quarters = barQuarters(meters[writtenIdx] ?? [4, 4]);
      const beatQuarters = quarters / ((meters[writtenIdx]?.[0] ?? 4) || 4);
      const barIdx = writtenIdx - sectionStart[sectionIdx];
      if (bar.restBars) {
        close();
        clock += quarters * bar.restBars;
        continue;
      }
      // An empty bar holds the chord before it.
      for (const hit of bar.chords) {
        const label = hit.degree ?? '';
        const chord = isNoChord(label) ? null : parseDegreeChord(label);
        if (!chord) {
          if (!isNoChord(label))
            unread.push({ where: `${song.id} ${section.label}`, label });
          close();
          continue;
        }
        const start = clock + (Math.max(1, hit.beat) - 1) * beatQuarters;
        const prev = run[run.length - 1];
        if (prev) prev.length = start - prev.at;
        run.push({ chord, label, at: start, length: 0, bar: barIdx });
      }
      clock += quarters;
      const last = run[run.length - 1];
      if (last) last.length = clock - last.at;
    }
    close();
    if (!runs.length) continue;
    const pass: HarmonyPass = {
      source: {
        kind: 'song',
        songId: song.id,
        title: song.title,
        artist: song.artist,
        sectionIdx,
        sectionId: section.id,
        sectionLabel: section.label,
        key: keys[group[0].writtenIdx]?.key ?? song.key,
      },
      runs,
      cyclic: false,
      plays: 1,
      ...withShift(parentShiftOf(keys[group[0].writtenIdx]?.mode ?? song.mode)),
    };
    seen.set(signature, pass);
    out.push(pass);
  }
  return out;
}

/* ── Chord loops written one chord per bar ───────────────────────────── */

/** Letter symbols, one per bar, as a cyclic pass in the key of `tonicPc`. */
function letterLoop(
  symbols: readonly string[],
  tonicPc: number,
  source: HarmonySource,
  unread: UnreadLabel[],
  where: string,
  shift?: number,
): HarmonyPass | null {
  const runs: HarmonyStep[][] = [];
  let run: HarmonyStep[] = [];
  symbols.forEach((label, bar) => {
    const chord = isNoChord(label) ? null : parseLetterChord(label, tonicPc);
    if (!chord) {
      if (!isNoChord(label)) unread.push({ where, label });
      if (run.length) runs.push(run);
      run = [];
      return;
    }
    run.push({ chord, label, at: bar * 4, length: 4, bar });
  });
  if (run.length) runs.push(run);
  if (!runs.length) return null;
  // A loop with a gap in it does not wrap around the gap.
  return {
    source,
    runs,
    cyclic: runs.length === 1,
    plays: 1,
    ...withShift(shift),
  };
}

/* ── Genre activities ────────────────────────────────────────────────── */

/** The parts of an activity flow the matcher reads (`ActivityFlowV2`). */
export interface FlowLike {
  genre: string;
  level: number;
  params: {
    defaultKey: string;
    practiceTrack?: { chords?: readonly string[] };
  };
  sections: readonly {
    id: string;
    steps: readonly {
      stepNumber: number;
      activity: string;
      chordSymbols?: readonly string[];
      variants?: readonly { chordSymbols?: readonly string[] }[];
    }[];
  }[];
}

/**
 * The chord loops a genre level's activities play: each step's
 * `chordSymbols` and its variants' (the same loop once), and the level's
 * Practice Track. Read in the level's `defaultKey`, which every authored
 * step is written in.
 */
export function flowPasses(
  flow: FlowLike,
  unread: UnreadLabel[] = [],
): HarmonyPass[] {
  const tonic = tonicOfKey(flow.params.defaultKey);
  if (tonic === null) return [];
  const key = flow.params.defaultKey;
  const shift = parentShiftOf(key);
  const out: HarmonyPass[] = [];
  const where = `${flow.genre} L${flow.level}`;
  for (const section of flow.sections) {
    for (const step of section.steps) {
      const loops = [
        step.chordSymbols,
        ...(step.variants ?? []).map((v) => v.chordSymbols),
      ].filter((l): l is readonly string[] => !!l?.length);
      const distinct = [
        ...new Map(loops.map((l) => [l.join('|'), l])).values(),
      ];
      for (const symbols of distinct) {
        const pass = letterLoop(
          symbols,
          tonic,
          {
            kind: 'activity',
            genre: flow.genre,
            level: flow.level,
            section: section.id,
            stepNumber: step.stepNumber,
            activity: step.activity,
            key,
          },
          unread,
          `${where} ${step.activity}`,
          shift,
        );
        if (pass) out.push(pass);
      }
    }
  }
  const track = flow.params.practiceTrack?.chords;
  if (track?.length) {
    const pass = letterLoop(
      track,
      tonic,
      {
        kind: 'activity',
        genre: flow.genre,
        level: flow.level,
        activity: 'Practice Track',
        key,
      },
      unread,
      `${where} Practice Track`,
      shift,
    );
    if (pass) out.push(pass);
  }
  return out;
}

/* ── The genre curriculum map ────────────────────────────────────────── */

/** The part of a curriculum map entry the matcher reads. */
export interface CurriculumLike {
  genre: string;
  level: string;
  chords: { progressions?: readonly string[] };
  /** The level's key ('C minor'), which says how its degrees are counted. */
  global?: { defaultKey?: string };
}

/**
 * A curriculum level's progressions ('1 maj - 4 maj | 1 maj - 2 min'), each
 * alternative a loop of hybrid degrees.
 */
export function curriculumPasses(
  entry: CurriculumLike,
  unread: UnreadLabel[] = [],
): HarmonyPass[] {
  const out: HarmonyPass[] = [];
  const shift = parentShiftOf(entry.global?.defaultKey ?? '');
  for (const line of entry.chords.progressions ?? []) {
    for (const text of line.split('|').map((t) => t.trim())) {
      if (!text) continue;
      const labels = text.split(/\s+-\s+/).map((l) => l.trim());
      const steps: HarmonyStep[] = [];
      let readable = true;
      let bar = 0;
      for (const written of labels) {
        // A 12-bar form gives each chord its bars: '1 dom7 (4)'.
        const counted = /^(.*?)\s*\((\d+)\)$/.exec(written);
        const label = counted ? counted[1] : written;
        const bars = counted ? Number(counted[2]) : 1;
        const chord = parseDegreeChord(label);
        if (!chord) {
          readable = false;
          unread.push({ where: `${entry.genre} ${entry.level}`, label });
          break;
        }
        steps.push({ chord, label, at: bar * 4, length: bars * 4, bar });
        bar += bars;
      }
      if (!readable || steps.length < 2) continue;
      out.push({
        source: {
          kind: 'curriculum',
          genre: entry.genre,
          level: entry.level,
          text,
        },
        runs: [steps],
        cyclic: true,
        plays: 1,
        ...withShift(shift),
      });
    }
  }
  return out;
}
