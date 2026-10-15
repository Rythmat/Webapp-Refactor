import {
  type HarmonyChord,
  MATCH_TIERS,
  type MatchTier,
  isNoChord,
  parseDegreeChord,
  playsAt,
  sameAt,
} from './chordClass';
import type { HarmonyPass, HarmonySource, HarmonyStep } from './sequences';

/**
 * Finding the library's progressions in the music: every place a song, a
 * genre activity or a curriculum level plays one, how closely, and how
 * squarely.
 *
 * A progression is found where its chords follow one another in a run, a
 * chord held over several bars or restruck counting once ('1 | 1 | 4 | 4'
 * is 1–4). The comparison is made at three strengths (`MatchTier`), and the
 * collapsing is done at the same strength on both sides, so '1 maj | 1 maj7
 * | 4 maj' is 1–4 at `family` though not at `exact`. A match keeps the
 * strictest tier it is found at.
 *
 * Where a match sits says how much it means (`Placement`):
 *  - `loop` — the progression is played round and round from its own start:
 *    the section is built on it;
 *  - `phrase` — it starts where a phrase of its length would (the top of the
 *    section, or a whole number of its own lengths in);
 *  - `inside` — it is heard partway through a longer line, or across the
 *    seam of a loop that starts elsewhere: a 6–4–1–5 song contains 1–5–6–4
 *    only this way.
 */

export type Placement = 'loop' | 'phrase' | 'inside';
export const PLACEMENTS: readonly Placement[] = ['loop', 'phrase', 'inside'];

/** The parts of a library progression the matcher reads. */
export interface ProgressionLike {
  id: number;
  chords: readonly string[];
}

export interface HarmonyMatch {
  progressionId: number;
  source: HarmonySource;
  tier: MatchTier;
  placement: Placement;
  /** Times it goes round back to back (1 when it is played once). */
  cycles: number;
  /** Times the pass it is in is played (a chorus heard three times). */
  plays: number;
  /** Written bar (0-based, within the section or step) it starts in. */
  startBar: number;
  /** Written bar it ends in. */
  endBar: number;
  /** The chords as the source wrote them, held chords once. */
  labels: string[];
  /**
   * Found by reading a minor or modal passage from its parent major (A minor
   * as C major): the library writes every progression from a major tonic.
   */
  relative?: true;
}

/** A library progression the matcher can read, and the ones it cannot. */
export interface Pattern {
  id: number;
  chords: HarmonyChord[];
}

export interface ReadPatterns {
  patterns: Pattern[];
  /** Progressions with a chord no reading of the vocabulary knows. */
  unreadable: { id: number; chord: string }[];
}

export function readPatterns(
  progressions: readonly ProgressionLike[],
): ReadPatterns {
  const patterns: Pattern[] = [];
  const unreadable: ReadPatterns['unreadable'] = [];
  for (const progression of progressions) {
    if (!Number.isFinite(progression?.id) || !Array.isArray(progression.chords))
      continue;
    const chords: HarmonyChord[] = [];
    let bad: string | null = null;
    for (const label of progression.chords) {
      const chord = isNoChord(label) ? null : parseDegreeChord(label);
      if (!chord) {
        bad = label;
        break;
      }
      chords.push(chord);
    }
    if (bad !== null) unreadable.push({ id: progression.id, chord: bad });
    else if (chords.length >= 2) patterns.push({ id: progression.id, chords });
  }
  return { patterns, unreadable };
}

/** A chord held (or restruck) across steps: steps `from`..`to`. */
interface Group {
  chord: HarmonyChord;
  from: number;
  to: number;
}

function collapse(steps: readonly HarmonyStep[], tier: MatchTier): Group[] {
  const groups: Group[] = [];
  steps.forEach((step, i) => {
    const last = groups[groups.length - 1];
    if (last && sameAt(tier, last.chord, step.chord)) last.to = i;
    else groups.push({ chord: step.chord, from: i, to: i });
  });
  return groups;
}

function collapseChords(
  chords: readonly HarmonyChord[],
  tier: MatchTier,
): HarmonyChord[] {
  const out: HarmonyChord[] = [];
  for (const chord of chords) {
    const last = out[out.length - 1];
    if (!last || !sameAt(tier, last, chord)) out.push(chord);
  }
  return out;
}

const TIER_RANK: Record<MatchTier, number> = { exact: 0, family: 1, loose: 2 };
const PLACEMENT_RANK: Record<Placement, number> = {
  loop: 0,
  phrase: 1,
  inside: 2,
};

/** Lower is stronger: a looped exact match first, a loose passing one last. */
export const strength = (m: Pick<HarmonyMatch, 'tier' | 'placement'>) =>
  PLACEMENT_RANK[m.placement] * 3 + TIER_RANK[m.tier];

export const compareMatches = (a: HarmonyMatch, b: HarmonyMatch) =>
  strength(a) - strength(b) || b.cycles * b.plays - a.cycles * a.plays;

/** Whether `x` is (within rounding) a whole multiple of `of`. */
const multipleOf = (x: number, of: number) =>
  of > 0 && Math.abs(x / of - Math.round(x / of)) < 1e-6;

interface Prepared {
  tier: MatchTier;
  /** Patterns collapsed at this tier, by the pitch class they open on. */
  byFirstPc: Map<number, { id: number; chords: HarmonyChord[] }[]>;
}

function prepare(patterns: readonly Pattern[]): Prepared[] {
  return MATCH_TIERS.map((tier) => {
    const byFirstPc = new Map<
      number,
      { id: number; chords: HarmonyChord[] }[]
    >();
    for (const pattern of patterns) {
      const chords = collapseChords(pattern.chords, tier);
      // '1 major7 - 1 dominant7#5' is one chord at `loose`: nothing to find.
      if (chords.length < 2) continue;
      const list = byFirstPc.get(chords[0].pc) ?? [];
      list.push({ id: pattern.id, chords });
      byFirstPc.set(chords[0].pc, list);
    }
    return { tier, byFirstPc };
  });
}

/** A run's chords as heard from another tonic, `shift` semitones below. */
const shifted = (run: readonly HarmonyStep[], shift: number): HarmonyStep[] =>
  run.map((step) => ({
    ...step,
    chord: {
      ...step.chord,
      pc: (step.chord.pc + shift) % 12,
      ...(step.chord.bassPc === undefined
        ? {}
        : { bassPc: (step.chord.bassPc + shift) % 12 }),
    },
  }));

/**
 * The matches in one run read from one tonic, keyed by progression and the
 * step they start on.
 */
function matchRun(
  pass: HarmonyPass,
  run: readonly HarmonyStep[],
  prepared: readonly Prepared[],
): Map<string, HarmonyMatch> {
  const out = new Map<string, HarmonyMatch>();
  const period = run.length;
  const cycleQuarters = run.reduce((sum, s) => sum + s.length, 0);
  // A loop is read twice over, so a progression across its seam is found;
  // matches must start in the first time round.
  const steps: HarmonyStep[] = pass.cyclic
    ? [...run, ...run.map((s) => ({ ...s, at: s.at + cycleQuarters }))]
    : [...run];
  // (progression, start step) found already, at a stricter tier or as a
  // later round of a loop found from its start.
  const taken = new Set<string>();
  for (const { tier, byFirstPc } of prepared) {
    const groups = collapse(steps, tier);
    const loopGroups = pass.cyclic ? collapse(run, tier).length : 0;
    for (let i = 0; i < groups.length; i++) {
      if (pass.cyclic && groups[i].from >= period) break;
      for (const pattern of byFirstPc.get(groups[i].chord.pc) ?? []) {
        const n = pattern.chords.length;
        const fits = (at: number) =>
          at + n <= groups.length &&
          pattern.chords.every((c, j) =>
            playsAt(tier, groups[at + j].chord, c),
          );
        if (!fits(i)) continue;
        const key = `${pattern.id}@${groups[i].from}`;
        if (taken.has(key)) continue;
        taken.add(key);

        // A progression that ends on the chord it starts on (1–4–5–1) goes
        // round sharing that chord: the held chord is one group.
        const stride = sameAt(tier, pattern.chords[0], pattern.chords[n - 1])
          ? n - 1
          : n;
        let cycles = 1;
        if (!pass.cyclic) {
          while (fits(i + cycles * stride)) {
            taken.add(`${pattern.id}@${groups[i + cycles * stride].from}`);
            cycles++;
          }
        }
        const first = steps[groups[i].from];
        const lastGroup = groups[i + n - 1];
        const last = steps[lastGroup.to];
        const span = last.at + last.length - first.at;
        let placement: Placement;
        if (pass.cyclic) {
          const fromTop = groups[i].from === 0;
          placement =
            fromTop && n === loopGroups
              ? 'loop'
              : fromTop || multipleOf(first.at, span)
                ? 'phrase'
                : 'inside';
        } else {
          const aligned = first.at === 0 || multipleOf(first.at, span);
          placement = aligned ? (cycles >= 2 ? 'loop' : 'phrase') : 'inside';
        }
        out.set(key, {
          progressionId: pattern.id,
          source: pass.source,
          tier,
          placement,
          cycles,
          plays: pass.plays,
          startBar: first.bar,
          endBar: steps[groups[i + stride * (cycles - 1) + n - 1].to].bar,
          labels: groups.slice(i, i + n).map((g) => steps[g.from].label),
        });
      }
    }
  }
  return out;
}

/**
 * Every match of the patterns in one pass: read from its own tonic and, in
 * a minor or modal key, from its parent major too, each place a progression
 * starts kept once in its stronger reading (its own tonic on a tie).
 */
function matchPass(
  pass: HarmonyPass,
  prepared: readonly Prepared[],
): HarmonyMatch[] {
  const out: HarmonyMatch[] = [];
  for (const run of pass.runs) {
    const own = matchRun(pass, run, prepared);
    if (pass.parentShift) {
      const parent = matchRun(pass, shifted(run, pass.parentShift), prepared);
      for (const [key, match] of parent) {
        const mine = own.get(key);
        if (!mine || strength(match) < strength(mine))
          own.set(key, { ...match, relative: true });
      }
    }
    out.push(...own.values());
  }
  return out;
}

/** Every match of the library's progressions in the passes. */
export function matchProgressions(
  patterns: readonly Pattern[],
  passes: readonly HarmonyPass[],
): HarmonyMatch[] {
  const prepared = prepare(patterns);
  return passes.flatMap((pass) => matchPass(pass, prepared));
}
