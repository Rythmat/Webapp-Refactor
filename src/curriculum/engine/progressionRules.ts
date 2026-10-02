/**
 * The progression rules: the Algorithms tab of the "Every Chord Progression"
 * sheet (rows 2 to 20), written as tests over a progression's chords.
 *
 * Each vibe and style the tab names gets one rule. A rule reads the chords as
 * degree and quality ("5 dominant7sus4" is degree 5, quality dominant7sus4),
 * plus the bass of a slash chord, the chord's place in the progression, which
 * chords sit together, and counts such as "fewer than three 7th chords".
 *
 * The rules only ever suggest. A progression's stored `vibes` and `styles` are
 * hand-owned: `autoTags` says what the rules would give a progression, and
 * `mismatches` says where the stored tags and the rules disagree, as tags to
 * add and tags to remove. Nothing here writes a tag back.
 *
 * This module also owns the tag vocabularies (`VIBE_TAGS`, `STYLE_TAGS`). It
 * keeps the reference data from Algorithms_Scales.md (synonyms, tempo ranges,
 * modes) as metadata, including for the vibes and styles the tab gives no
 * rule. Those tags stay manual: the rules never add or remove them.
 *
 * Several clauses in the tab can be read more than one way. Every such choice
 * is one named field of `RULE_READINGS`, set to the most literal reading, so
 * the owner can flip a reading in one place. Every function here also takes a
 * partial set of readings, so a report can show what a flip would change.
 *
 * A few clauses cannot fire on today's library, because no progression holds
 * the chords they name: add2, sus2, add4, "5 add4", dominant13(sus4) and power
 * chords. Funk's "repeated chord (only 1, 2, or 3 chords per 4 bars)" needs
 * rhythm the library does not store, so it is read from the chord list alone.
 *
 * Everything here is pure and imports only the spelling fixer, so the same
 * code runs on the bundled library, on the console's working copy and in a
 * build script.
 */

import { normalizeChordSpelling } from './openingTree';

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

/**
 * Every vibe a progression may carry. The first eight have a rule in the
 * Algorithms tab, in the tab's order; the other eight come from
 * Algorithms_Scales.md and stay manual.
 */
export const VIBE_TAGS = [
  'cool',
  'sexy',
  'intriguing',
  'dark',
  'emotional',
  'sophisticated',
  'fun',
  'happy',
  'melancholic',
  'aggressive',
  'dreamy',
  'hypnotic',
  'triumphant',
  'spiritual',
  'rebellious',
  'romantic',
] as const;

export type VibeTag = (typeof VIBE_TAGS)[number];

/**
 * Every style a progression may carry. Gospel joins the earlier fourteen: the
 * Algorithms tab gives it a rule and the library already uses it. Nine styles
 * have a rule (jazz, rock, gospel, funk, r&b, neo-soul, jam-band, pop,
 * hip-hop); the other six stay manual.
 */
export const STYLE_TAGS = [
  'pop',
  'rock',
  'hip-hop',
  'jam-band',
  'funk',
  'neo-soul',
  'jazz',
  'r&b',
  'gospel',
  'reggae',
  'latin',
  'blues',
  'folk',
  'electronic',
  'african',
] as const;

export type StyleTag = (typeof STYLE_TAGS)[number];

const VIBE_SET: ReadonlySet<string> = new Set(VIBE_TAGS);
const STYLE_SET: ReadonlySet<string> = new Set(STYLE_TAGS);

export function isVibeTag(value: string): value is VibeTag {
  return VIBE_SET.has(value);
}

export function isStyleTag(value: string): value is StyleTag {
  return STYLE_SET.has(value);
}

/**
 * A stored tag in the vocabulary's spelling: lower case, outer space trimmed,
 * inner spaces turned into hyphens ("Neo Soul" becomes "neo-soul").
 */
export function canonicalTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

// ---------------------------------------------------------------------------
// Readings: one field per clause that can be read more than one way
// ---------------------------------------------------------------------------

/**
 * How the rules read the Algorithms tab where its wording allows more than
 * one meaning. `RULE_READINGS` holds the most literal reading of each; the
 * comment on each field names the alternative.
 */
export interface RuleReadings {
  /**
   * "A + B" (Dark, Sophisticated, Fun, Happy, Jazz, Gospel, R&B, Neo Soul,
   * Jam Band).
   * - 'both' (literal): the progression has an A and a B, on two different
   *   chords, in any order. "+" is read as "and", which is how
   *   Algorithms_Scales.md restates most of these clauses.
   * - 'followedBy': an A directly followed by a B.
   */
  plus: 'both' | 'followedBy';
  /**
   * Only under `plus: 'followedBy'`: whether the last chord counts as
   * followed by the first, as when a progression loops.
   * - false (literal): it does not.
   * - true: it does.
   */
  pairsWrapAround: boolean;
  /**
   * How a degree in a rule matches a chord's degree ("Contains b2").
   * - 'asWritten' (literal): only a chord written on that degree, so "b2"
   *   does not match "#1".
   * - 'enharmonic': any chord on the same pitch, so "b2" matches "#1".
   */
  degrees: 'asWritten' | 'enharmonic';
  /**
   * Whether a named chord also matches its slash forms.
   * - false (literal): "1 major" matches "1 major" only, not "1 major/3".
   * - true: "1 major" also matches "1 major/3" and "1 major/5".
   * A clause that names a slash chord ("1 major/3") always matches it exactly.
   */
  slashChordsMatchTheirChord: boolean;
  /**
   * Whether a 7th chord's name also matches its alterations and extensions,
   * as listed in `QUALITY_FAMILIES`.
   * - false (literal): "dominant7" matches dominant7 only.
   * - true: "dominant7" also matches dominant7#5, dominant7b9, dominant9
   *   and the rest of its family; "major7" matches major7#11.
   */
  qualityFamilies: boolean;
  /**
   * Whether a triad's name also matches the richer chords built on it, as
   * listed in `TRIAD_FAMILIES`.
   * - false (literal): "6 minor" matches 6 minor only, and "#5 diminished"
   *   matches #5 diminished only.
   * - true: "6 minor" also matches 6 minor7 and 6 minor6, "#5 diminished"
   *   matches #5 diminished7, and "1 major" matches 1 major7.
   */
  triadsMatchTheirSevenths: boolean;
  /**
   * "dominant7(sus4)" (Cool, R&B, Neo Soul).
   * - 'sus4Chord' (literal): the dominant7sus4 chord, as a chord symbol
   *   such as C7(sus4) means.
   * - 'optionalSus4': dominant7 with or without the sus4.
   */
  parenthesisedSus4: 'sus4Chord' | 'optionalSus4';
  /**
   * Sophisticated's "dominant7 + major7 and/or minor7".
   * - 'dominant7PlusEither' (literal): a dominant7 + a major7 or a minor7,
   *   read like Jazz's "major7 + major7/minor7".
   * - 'minor7Alone': a dominant7 + a major7, or any minor7 on its own.
   */
  sophisticated: 'dominant7PlusEither' | 'minor7Alone';
  /**
   * How "AND" mixes with "AND/OR" in Rock and Funk.
   * - 'leftToRight' (literal): read the cells in order, so Rock is (first
   *   chord AND fewer than three 7ths) OR a power chord, and Funk is
   *   (repeated chord AND a minor7) OR a 1 dominant7 OR a 4 dominant7.
   * - 'andTakesTheRest': the AND governs every clause after it, so Rock is
   *   first chord AND (fewer than three 7ths OR a power chord), and Funk is
   *   repeated chord AND (a minor7 OR a 1 dominant7 OR a 4 dominant7).
   */
  andGrouping: 'leftToRight' | 'andTakesTheRest';
  /**
   * Funk's "Repeated chord (only 1, 2, or 3 chords per 4 bars)". The library
   * stores no rhythm, so the bars cannot be counted.
   * - 'atMostThreeDistinct' (literal): the progression uses at most three
   *   different chords.
   * - 'aChordRepeats': some chord appears more than once.
   */
  funkRepeat: 'atMostThreeDistinct' | 'aChordRepeats';
  /**
   * Rock's "# of 7th Chords < 3": what is counted.
   * - 'everyChord' (literal): every 7th chord in the progression, so a
   *   chord played twice counts twice.
   * - 'distinctChords': each different 7th chord once.
   */
  seventhTally: 'everyChord' | 'distinctChords';
  /**
   * Whether a sixth chord (minor6, major6) counts as a 7th chord in Rock's
   * tally.
   * - false (literal): only chords with a 7th (see `isSeventhChord`).
   * - true: sixth chords count too.
   */
  sixthsAreSevenths: boolean;
  /**
   * The chord qualities that are triads, for Pop's "Only triads" and Hip
   * Hop's "minor triad". The literal reading is every three-note chord the
   * library uses: the four triads plus the suspended ones. The alternative,
   * from Algorithms_Scales.md's "only triads (major/minor)", is
   * ['major', 'minor'].
   */
  triadQualities: readonly string[];
  /**
   * Whether a triad over a bass note ("1 major/3") is still a triad.
   * - true (literal): it is; it is the same three notes, and the library's
   *   own complexity column files progressions with slash triads as "triad".
   * - false: only chords without a slash count.
   */
  slashTriadsAreTriads: boolean;
  /**
   * Pop's "Only triads".
   * - 'everyChord' (literal): every chord is a triad.
   * - 'atLeastOne': the progression has a triad.
   */
  popOnlyTriads: 'everyChord' | 'atLeastOne';
  /**
   * Hip Hop's "Contains minor triad".
   * - 'atLeastOne' (literal): the progression has a minor triad.
   * - 'everyChord': every chord is a minor triad.
   */
  hipHopMinorTriad: 'atLeastOne' | 'everyChord';
}

/** The most literal reading of every clause. See `RuleReadings` for each. */
export const RULE_READINGS: Readonly<RuleReadings> = {
  plus: 'both',
  pairsWrapAround: false,
  degrees: 'asWritten',
  slashChordsMatchTheirChord: false,
  qualityFamilies: false,
  triadsMatchTheirSevenths: false,
  parenthesisedSus4: 'sus4Chord',
  sophisticated: 'dominant7PlusEither',
  andGrouping: 'leftToRight',
  funkRepeat: 'atMostThreeDistinct',
  seventhTally: 'everyChord',
  sixthsAreSevenths: false,
  triadQualities: ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'],
  slashTriadsAreTriads: true,
  popOnlyTriads: 'everyChord',
  hipHopMinorTriad: 'atLeastOne',
};

/**
 * The alterations and extensions a 7th chord's name also matches when
 * `qualityFamilies` is on. Suspended chords are left out: the tab names
 * them on their own.
 */
export const QUALITY_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  dominant7: [
    'dominant7#5',
    'dominant7b5',
    'dominant7b9',
    'dominant7#9',
    'dominant7#11',
    'dominant7#5b9',
    'dominant7#5#9',
    'dominant9',
    'dominant9#5',
    'dominant13',
  ],
  major7: [
    'major7#11',
    'major7#5',
    'major7b5',
    'major7#9',
    'major9',
    'major13',
  ],
  minor7: ['minor9', 'minor11', 'minor13', 'minor7b9'],
  minor6: ['minor6add9'],
  diminished7: ['diminished7b9'],
  dominant7sus4: ['dominant13sus4'],
};

/**
 * The richer chords a triad's name also matches when
 * `triadsMatchTheirSevenths` is on: the sixth, seventh and extended chords
 * built on the same triad. A dominant7 is left out of "major" and a
 * half-diminished chord (minor7b5) is filed under "diminished", since the
 * tab names dominant chords on their own.
 */
export const TRIAD_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  major: ['major6', 'major7', 'major9', 'major13', 'major7#11', 'major6add9'],
  minor: [
    'minor6',
    'minor7',
    'minor9',
    'minor11',
    'minor13',
    'minor6add9',
    'minormajor7',
  ],
  diminished: ['diminished7', 'minor7b5'],
};

function withReadings(overrides?: Partial<RuleReadings>): RuleReadings {
  return overrides ? { ...RULE_READINGS, ...overrides } : RULE_READINGS;
}

// ---------------------------------------------------------------------------
// Chords as the rules read them
// ---------------------------------------------------------------------------

/** One chord of a progression, split into the parts the rules test. */
export interface RuleChord {
  /** The chord's place in the progression, from 0. */
  index: number;
  /** The chord as written, with known misspellings fixed. */
  chord: string;
  /** The degree it is built on: "1", "b2", "#4". Empty when unreadable. */
  degree: string;
  /** The whole quality in lower case, slash included: "major/3". */
  quality: string;
  /** The quality before any slash: "major" for "major/3". */
  base: string;
  /** The slash part, as written: "3" for "major/3", or null. */
  bass: string | null;
}

/**
 * Reads one chord as the rules see it. Known misspellings ("2 minor 7") are
 * fixed first, through the opening tree's spelling list.
 */
export function parseRuleChord(chord: string, index = 0): RuleChord {
  const fixed = normalizeChordSpelling(chord);
  const space = fixed.indexOf(' ');
  const degree = space < 0 ? '' : fixed.slice(0, space);
  const quality = (space < 0 ? fixed : fixed.slice(space + 1))
    .trim()
    .toLowerCase();
  const slash = quality.indexOf('/');
  return {
    index,
    chord: fixed,
    degree,
    quality,
    base: slash < 0 ? quality : quality.slice(0, slash),
    bass: slash < 0 ? null : quality.slice(slash + 1),
  };
}

const DEGREE_PATTERN = /^([b#]*)([1-7])$/;
const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/** A degree's distance above the key's root in semitones, or null. */
function degreeSemitones(degree: string): number | null {
  const m = DEGREE_PATTERN.exec(degree);
  if (!m) return null;
  let semis = STEP_SEMITONES[Number(m[2]) - 1];
  for (const accidental of m[1]) semis += accidental === '#' ? 1 : -1;
  return ((semis % 12) + 12) % 12;
}

function sameDegree(have: string, want: string, r: RuleReadings): boolean {
  if (have === want) return true;
  if (r.degrees === 'asWritten') return false;
  const a = degreeSemitones(have);
  return a !== null && a === degreeSemitones(want);
}

function qualityMatches(c: RuleChord, want: string, r: RuleReadings): boolean {
  const target = want.toLowerCase();
  // A clause that names a slash chord means exactly that chord.
  if (target.includes('/')) return c.quality === target;
  const own = r.slashChordsMatchTheirChord ? c.base : c.quality;
  if (own === target) return true;
  if (r.qualityFamilies && (QUALITY_FAMILIES[target] ?? []).includes(own))
    return true;
  return (
    r.triadsMatchTheirSevenths && (TRIAD_FAMILIES[target] ?? []).includes(own)
  );
}

/**
 * Whether a chord has a 7th: a quality named with a 7 (major7, minor7b5,
 * dominant7sus4), or a 9th, 11th or 13th chord, which holds the 7th below
 * it. A 6/9 chord has no 7th. A slash bass does not make a chord a 7th
 * chord: "5 major/7" names a bass note, not a 7th. With
 * `sixthsAreSevenths`, sixth chords count too.
 */
export function isSeventhChord(
  c: RuleChord,
  readings?: Partial<RuleReadings>,
): boolean {
  return seventh(c, withReadings(readings));
}

function seventh(c: RuleChord, r: RuleReadings): boolean {
  const q = c.base;
  if (/7/.test(q)) return true;
  if (/(9|11|13)/.test(q) && !/6add9/.test(q)) return true;
  return r.sixthsAreSevenths && /6/.test(q);
}

/** Whether a chord is a triad, under `triadQualities` and `slashTriadsAreTriads`. */
export function isTriad(
  c: RuleChord,
  readings?: Partial<RuleReadings>,
): boolean {
  return triad(c, withReadings(readings));
}

function triad(c: RuleChord, r: RuleReadings): boolean {
  return r.triadQualities.includes(r.slashTriadsAreTriads ? c.base : c.quality);
}

function isMinorTriad(c: RuleChord, r: RuleReadings): boolean {
  return (r.slashTriadsAreTriads ? c.base : c.quality) === 'minor';
}

// ---------------------------------------------------------------------------
// Clauses
// ---------------------------------------------------------------------------

type ChordTest = (c: RuleChord, r: RuleReadings) => boolean;

/** A chord on one of `degrees` (any quality when `qualities` is left out). */
function chord(
  degrees: string | readonly string[] | null,
  qualities?: string | readonly string[],
): ChordTest {
  const ds = degrees === null ? null : [degrees].flat();
  const qs = qualities === undefined ? null : [qualities].flat();
  return (c, r) =>
    (ds === null || ds.some((d) => sameDegree(c.degree, d, r))) &&
    (qs === null || qs.some((q) => qualityMatches(c, q, r)));
}

/** A chord of one of `qualities`, on any degree. */
const quality = (qualities: string | readonly string[]): ChordTest =>
  chord(null, qualities);

const either =
  (...tests: ChordTest[]): ChordTest =>
  (c, r) =>
    tests.some((t) => t(c, r));

/**
 * One clause of a rule. `find` returns the places of the chords that
 * satisfy it, or null when it fails. An empty list is a pass that points at
 * no chord, as "fewer than three 7th chords" does when there are none.
 */
interface Clause {
  label: string;
  find: (chords: readonly RuleChord[], r: RuleReadings) => number[] | null;
}

type RuleExpr = Clause | { any: RuleExpr[] } | { all: RuleExpr[] };

/** Some chord passes the test. */
function has(label: string, test: ChordTest): Clause {
  return {
    label,
    find: (chords, r) => {
      const at = chords.filter((c) => test(c, r)).map((c) => c.index);
      return at.length ? at : null;
    },
  };
}

/** The first chord passes the test. */
function startsOn(label: string, test: ChordTest): Clause {
  return {
    label,
    find: (chords, r) => (chords.length && test(chords[0], r) ? [0] : null),
  };
}

/** Every chord passes the test. */
function every(label: string, test: ChordTest): Clause {
  return {
    label,
    find: (chords, r) =>
      chords.length && chords.every((c) => test(c, r))
        ? chords.map((c) => c.index)
        : null,
  };
}

/** "A + B", read as `plus` says. */
function pair(label: string, a: ChordTest, b: ChordTest): Clause {
  return {
    label,
    find: (chords, r) => {
      const n = chords.length;
      const at = new Set<number>();
      if (r.plus === 'both') {
        const as = chords.filter((c) => a(c, r)).map((c) => c.index);
        const bs = chords.filter((c) => b(c, r)).map((c) => c.index);
        for (const i of as)
          for (const j of bs)
            if (i !== j) {
              at.add(i);
              at.add(j);
            }
      } else {
        for (let i = 0; i < n; i++) {
          const j = i + 1 < n ? i + 1 : r.pairsWrapAround && n > 1 ? 0 : -1;
          if (j >= 0 && a(chords[i], r) && b(chords[j], r)) {
            at.add(i);
            at.add(j);
          }
        }
      }
      return at.size ? [...at].sort((x, y) => x - y) : null;
    },
  };
}

/** Rock's "# of 7th Chords < 3", counted as `seventhTally` says. */
function fewerSevenths(label: string, limit: number): Clause {
  return {
    label,
    find: (chords, r) => {
      const sevenths = chords.filter((c) => seventh(c, r));
      const count =
        r.seventhTally === 'everyChord'
          ? sevenths.length
          : new Set(sevenths.map((c) => c.chord)).size;
      return count < limit ? sevenths.map((c) => c.index) : null;
    },
  };
}

/** Funk's repeated chord, read as `funkRepeat` says. */
function repeatedChord(label: string): Clause {
  return {
    label,
    find: (chords, r) => {
      if (!chords.length) return null;
      const seen = new Map<string, number[]>();
      for (const c of chords)
        seen.set(c.chord, [...(seen.get(c.chord) ?? []), c.index]);
      if (r.funkRepeat === 'atMostThreeDistinct')
        return seen.size <= 3 ? chords.map((c) => c.index) : null;
      const repeats = [...seen.values()].filter((at) => at.length > 1).flat();
      return repeats.length ? repeats.sort((x, y) => x - y) : null;
    },
  };
}

/** The place of a clause that fired, and the chords it pointed at. */
export interface ClauseHit {
  /** The clause in the tab's own words: "1 dominant7 + 4 major7". */
  clause: string;
  /** The places of the chords it matched, from 0. */
  chords: number[];
}

function evaluate(
  expr: RuleExpr,
  chords: readonly RuleChord[],
  r: RuleReadings,
): ClauseHit[] | null {
  if ('find' in expr) {
    const at = expr.find(chords, r);
    return at ? [{ clause: expr.label, chords: at }] : null;
  }
  if ('any' in expr) {
    const hits = expr.any.map((e) => evaluate(e, chords, r));
    return hits.some(Boolean) ? hits.flatMap((h) => h ?? []) : null;
  }
  const hits: ClauseHit[] = [];
  for (const e of expr.all) {
    const h = evaluate(e, chords, r);
    if (!h) return null;
    hits.push(...h);
  }
  return hits;
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

/** One row of the Algorithms tab. */
export interface TagRule<T extends string> {
  tag: T;
  /** The row in the Algorithms tab. */
  sheetRow: number;
  /** The row as the tab writes it, cells joined with their connectors. */
  sheetText: string;
  /** The rule's clauses under a set of readings. */
  build: (r: RuleReadings) => RuleExpr;
}

const SEVENTH_CHORDS = ['major7', 'minor7', 'dominant7', 'diminished7'];

/** "dominant7(sus4)", and R&B's "/dominant13(sus4)", read as `parenthesisedSus4` says. */
const susDominant = (r: RuleReadings, withThirteenth = false): ChordTest => {
  const sus = withThirteenth
    ? ['dominant7sus4', 'dominant13sus4']
    : ['dominant7sus4'];
  const plain = withThirteenth ? ['dominant7', 'dominant13'] : ['dominant7'];
  return quality(
    r.parenthesisedSus4 === 'sus4Chord' ? sus : [...sus, ...plain],
  );
};

/** The eight vibes the Algorithms tab gives a rule, in the tab's order. */
export const VIBE_RULES: readonly TagRule<VibeTag>[] = [
  {
    tag: 'cool',
    sheetRow: 2,
    sheetText:
      '1st Chord = major7 AND/OR 1st Chord = minor7 AND/OR Contains dominant7(sus4)',
    build: (r) => ({
      any: [
        startsOn('1st chord = major7', quality('major7')),
        startsOn('1st chord = minor7', quality('minor7')),
        has('dominant7(sus4)', susDominant(r)),
      ],
    }),
  },
  {
    tag: 'sexy',
    sheetRow: 3,
    sheetText: 'Contains dominant7#5',
    build: () => has('dominant7#5', quality('dominant7#5')),
  },
  {
    tag: 'intriguing',
    sheetRow: 4,
    sheetText: 'Contains b2',
    build: () => has('b2', chord('b2')),
  },
  {
    tag: 'dark',
    sheetRow: 5,
    sheetText: 'Contains b2 + b3/b5/b6/b7',
    build: () =>
      pair('b2 + b3/b5/b6/b7', chord('b2'), chord(['b3', 'b5', 'b6', 'b7'])),
  },
  {
    tag: 'emotional',
    sheetRow: 6,
    sheetText: 'Contains 4 minor and/or b6 major7',
    build: () => ({
      any: [
        has('4 minor', chord('4', 'minor')),
        has('b6 major7', chord('b6', 'major7')),
      ],
    }),
  },
  {
    tag: 'sophisticated',
    sheetRow: 7,
    sheetText: 'Contains dominant7 + major7 and/or minor7',
    build: (r) =>
      r.sophisticated === 'dominant7PlusEither'
        ? pair(
            'dominant7 + major7 and/or minor7',
            quality('dominant7'),
            quality(['major7', 'minor7']),
          )
        : {
            any: [
              pair(
                'dominant7 + major7',
                quality('dominant7'),
                quality('major7'),
              ),
              has('minor7', quality('minor7')),
            ],
          },
  },
  {
    tag: 'fun',
    sheetRow: 8,
    sheetText:
      'Contains 1 dominant7 + 4 major7 AND/OR 2 dominant7 + 5 dominant7',
    build: () => ({
      any: [
        pair(
          '1 dominant7 + 4 major7',
          chord('1', 'dominant7'),
          chord('4', 'major7'),
        ),
        pair(
          '2 dominant7 + 5 dominant7',
          chord('2', 'dominant7'),
          chord('5', 'dominant7'),
        ),
      ],
    }),
  },
  {
    tag: 'happy',
    sheetRow: 9,
    sheetText: 'Contains 5 dominant7sus4 + 1 major AND/OR 4 major7 + 1 major',
    build: () => ({
      any: [
        pair(
          '5 dominant7sus4 + 1 major',
          chord('5', 'dominant7sus4'),
          chord('1', 'major'),
        ),
        pair('4 major7 + 1 major', chord('4', 'major7'), chord('1', 'major')),
      ],
    }),
  },
];

/** The nine styles the Algorithms tab gives a rule, in the tab's order. */
export const STYLE_RULES: readonly TagRule<StyleTag>[] = [
  {
    tag: 'jazz',
    sheetRow: 12,
    sheetText:
      'Contains major7 + major7/minor7/dominant7/diminished7 OR minor6 + major7/minor7/dominant7/diminished7 OR dominant7 + major7/minor7/dominant7/diminished7 OR diminished7 + minor7',
    build: () => ({
      any: [
        pair(
          'major7 + major7/minor7/dominant7/diminished7',
          quality('major7'),
          quality(SEVENTH_CHORDS),
        ),
        pair(
          'minor6 + major7/minor7/dominant7/diminished7',
          quality('minor6'),
          quality(SEVENTH_CHORDS),
        ),
        pair(
          'dominant7 + major7/minor7/dominant7/diminished7',
          quality('dominant7'),
          quality(SEVENTH_CHORDS),
        ),
        pair('diminished7 + minor7', quality('diminished7'), quality('minor7')),
      ],
    }),
  },
  {
    tag: 'rock',
    sheetRow: 13,
    sheetText:
      '1st Chord = 1 major or 2 minor or 3 minor or 4 major or 5 major or 6 minor AND # of 7th Chords < 3 AND/OR CONTAINS power chords (aka 1-5 diads)',
    build: (r) => {
      const first = startsOn(
        '1st chord = 1 major, 2 minor, 3 minor, 4 major, 5 major or 6 minor',
        either(
          chord('1', 'major'),
          chord('2', 'minor'),
          chord('3', 'minor'),
          chord('4', 'major'),
          chord('5', 'major'),
          chord('6', 'minor'),
        ),
      );
      const sevenths = fewerSevenths('# of 7th chords < 3', 3);
      const power = has('power chords (1-5 dyads)', quality(['5', 'power']));
      return r.andGrouping === 'leftToRight'
        ? { any: [{ all: [first, sevenths] }, power] }
        : { all: [first, { any: [sevenths, power] }] };
    },
  },
  {
    tag: 'gospel',
    sheetRow: 14,
    sheetText:
      'Contains 1 major/3 + 4 AND/OR 5 major/7 + 1 AND/OR #4 diminished + 1 major/5 AND/OR #5 diminished + 6 minor',
    build: () => ({
      any: [
        pair('1 major/3 + 4', chord('1', 'major/3'), chord('4')),
        pair('5 major/7 + 1', chord('5', 'major/7'), chord('1')),
        pair(
          '#4 diminished + 1 major/5',
          chord('#4', 'diminished'),
          chord('1', 'major/5'),
        ),
        pair(
          '#5 diminished + 6 minor',
          chord('#5', 'diminished'),
          chord('6', 'minor'),
        ),
      ],
    }),
  },
  {
    tag: 'funk',
    sheetRow: 15,
    sheetText:
      'Contains Repeated chord (only 1, 2, or 3 chords per 4 bars) AND minor 7 AND/OR 1 dominant7 AND/OR 4 dominant7',
    build: (r) => {
      const repeat = repeatedChord('repeated chord (1, 2 or 3 chords)');
      const minor7 = has('minor 7', quality('minor7'));
      const one = has('1 dominant7', chord('1', 'dominant7'));
      const four = has('4 dominant7', chord('4', 'dominant7'));
      return r.andGrouping === 'leftToRight'
        ? { any: [{ all: [repeat, minor7] }, one, four] }
        : { all: [repeat, { any: [minor7, one, four] }] };
    },
  },
  {
    tag: 'r&b',
    sheetRow: 16,
    sheetText:
      'Contains major7 + major7/minor7 AND/OR dominant7#5 AND/OR dominant7(sus4)/dominant13(sus4) AND/OR 1 major + 2 minor',
    build: (r) => ({
      any: [
        pair(
          'major7 + major7/minor7',
          quality('major7'),
          quality(['major7', 'minor7']),
        ),
        has('dominant7#5', quality('dominant7#5')),
        has('dominant7(sus4)/dominant13(sus4)', susDominant(r, true)),
        pair('1 major + 2 minor', chord('1', 'major'), chord('2', 'minor')),
      ],
    }),
  },
  {
    tag: 'neo-soul',
    sheetRow: 17,
    sheetText:
      'Contains major7 + major7/minor7 AND/OR dominant7#5 AND/OR dominant7(sus4)/dominant13(sus4)',
    build: (r) => ({
      any: [
        pair(
          'major7 + major7/minor7',
          quality('major7'),
          quality(['major7', 'minor7']),
        ),
        has('dominant7#5', quality('dominant7#5')),
        has('dominant7(sus4)/dominant13(sus4)', susDominant(r, true)),
      ],
    }),
  },
  {
    tag: 'jam-band',
    sheetRow: 18,
    sheetText:
      'Contains 1 major + 4 major AND/OR minor7 AND/OR 4 dominant7 AND/OR b7 major or b7 dominant7',
    build: () => ({
      any: [
        pair('1 major + 4 major', chord('1', 'major'), chord('4', 'major')),
        has('minor7', quality('minor7')),
        has('4 dominant7', chord('4', 'dominant7')),
        has('b7 major or b7 dominant7', chord('b7', ['major', 'dominant7'])),
      ],
    }),
  },
  {
    tag: 'pop',
    sheetRow: 19,
    sheetText:
      'Contains Only triads AND/OR add2/sus2/add4/sus4 AND/OR 4 major7/6 minor7 AND/OR 5 add4',
    build: (r) => ({
      any: [
        r.popOnlyTriads === 'everyChord'
          ? every('only triads', triad)
          : has('a triad', triad),
        has('add2/sus2/add4/sus4', quality(['add2', 'sus2', 'add4', 'sus4'])),
        has(
          '4 major7/6 minor7',
          either(chord('4', 'major7'), chord('6', 'minor7')),
        ),
        has('5 add4', chord('5', 'add4')),
      ],
    }),
  },
  {
    tag: 'hip-hop',
    sheetRow: 20,
    sheetText: 'Contains minor triad',
    build: (r) =>
      r.hipHopMinorTriad === 'atLeastOne'
        ? has('minor triad', isMinorTriad)
        : every('minor triads only', isMinorTriad),
  },
];

/** The vibes that have a rule, in vocabulary order. */
export const RULED_VIBES: readonly VibeTag[] = VIBE_TAGS.filter((t) =>
  VIBE_RULES.some((rule) => rule.tag === t),
);

/** The styles that have a rule, in vocabulary order. */
export const RULED_STYLES: readonly StyleTag[] = STYLE_TAGS.filter((t) =>
  STYLE_RULES.some((rule) => rule.tag === t),
);

// ---------------------------------------------------------------------------
// Reference data (Algorithms_Scales.md)
// ---------------------------------------------------------------------------

/** What Algorithms_Scales.md says about a vibe, beyond its chord rules. */
export interface VibeInfo {
  tag: VibeTag;
  synonyms: readonly string[];
  /** Beats per minute, low and high. */
  tempoRange: readonly [number, number];
  /** The modes and scales that suit the vibe. */
  applicableModes: readonly string[];
  /** Whether the Algorithms tab gives the vibe a rule. */
  hasRule: boolean;
}

/** What Algorithms_Scales.md says about a style, beyond its chord rules. */
export interface StyleInfo {
  tag: StyleTag;
  primaryModes: readonly string[];
  secondaryModes: readonly string[];
  /** Whether the Algorithms tab gives the style a rule. */
  hasRule: boolean;
}

const vibe = (
  tag: VibeTag,
  synonyms: string[],
  tempoRange: [number, number],
  applicableModes: string[],
): VibeInfo => ({
  tag,
  synonyms,
  tempoRange,
  applicableModes,
  hasRule: RULED_VIBES.includes(tag),
});

/**
 * The vibes' reference data. Synonyms, tempo ranges and modes are as
 * Algorithms_Scales.md gives them; `hasRule` comes from the rules above.
 */
export const VIBE_INFO: Readonly<Record<VibeTag, VibeInfo>> = {
  cool: vibe(
    'cool',
    ['chill', 'smooth', 'relaxed'],
    [70, 110],
    ['ionian', 'dorian', 'aeolian', 'mixolydian', 'alteredDominant'],
  ),
  sexy: vibe(
    'sexy',
    ['sultry', 'seductive', 'sensual'],
    [65, 100],
    ['dorian', 'aeolian', 'mixolydian', 'alteredDominant'],
  ),
  intriguing: vibe(
    'intriguing',
    ['mysterious', 'curious', 'enigmatic'],
    [70, 120],
    ['aeolian', 'phrygian'],
  ),
  dark: vibe(
    'dark',
    ['ominous', 'heavy', 'brooding'],
    [40, 100],
    ['aeolian', 'phrygian', 'locrian'],
  ),
  emotional: vibe(
    'emotional',
    ['moving', 'heartfelt', 'bittersweet'],
    [60, 120],
    ['ionian', 'lydian', 'aeolian', 'dorian', 'phrygian'],
  ),
  sophisticated: vibe(
    'sophisticated',
    ['elegant', 'complex', 'refined'],
    [80, 130],
    ['lydian', 'dorian', 'lydianDominant', 'alteredDominant'],
  ),
  fun: vibe(
    'fun',
    ['playful', 'lighthearted', 'bouncy'],
    [100, 140],
    ['ionian', 'lydian', 'mixolydian'],
  ),
  happy: vibe(
    'happy',
    ['joyful', 'uplifting', 'bright'],
    [100, 145],
    ['ionian', 'lydian'],
  ),
  melancholic: vibe(
    'melancholic',
    ['sad', 'wistful', 'nostalgic'],
    [55, 100],
    ['aeolian'],
  ),
  aggressive: vibe(
    'aggressive',
    ['intense', 'powerful', 'driving'],
    [100, 200],
    ['dorian', 'aeolian', 'phrygian', 'alteredDominant'],
  ),
  dreamy: vibe(
    'dreamy',
    ['ethereal', 'floating', 'atmospheric'],
    [60, 110],
    ['lydian', 'ionian', 'dorian', 'aeolian'],
  ),
  hypnotic: vibe(
    'hypnotic',
    ['trance-like', 'repetitive', 'meditative'],
    [70, 140],
    ['lydian', 'ionian', 'dorian', 'aeolian'],
  ),
  triumphant: vibe(
    'triumphant',
    ['epic', 'victorious', 'anthemic'],
    [110, 150],
    ['lydian', 'ionian', 'aeolian'],
  ),
  spiritual: vibe(
    'spiritual',
    ['transcendent', 'sacred', 'devotional'],
    [60, 120],
    ['lydian', 'ionian', 'aeolian', 'dorian'],
  ),
  rebellious: vibe(
    'rebellious',
    ['defiant', 'punk', 'anti-establishment'],
    [130, 200],
    ['aeolian', 'phrygian', 'mixolydian'],
  ),
  romantic: vibe(
    'romantic',
    ['tender', 'loving', 'intimate'],
    [55, 95],
    ['ionian', 'dorian', 'lydian'],
  ),
};

const style = (
  tag: StyleTag,
  primaryModes: string[],
  secondaryModes: string[],
): StyleInfo => ({
  tag,
  primaryModes,
  secondaryModes,
  hasRule: RULED_STYLES.includes(tag),
});

/**
 * The styles' reference data: their modes, as Algorithms_Scales.md gives them.
 * That document has no gospel section, so gospel's modes are the ones its R&B
 * section lists as common in gospel: Mixolydian and Minor Pentatonic as
 * primary, Harmonic Minor as tertiary.
 */
export const STYLE_INFO: Readonly<Record<StyleTag, StyleInfo>> = {
  jazz: style(
    'jazz',
    ['dorian', 'mixolydian', 'ionian', 'bebopDominant'],
    ['lydian', 'alteredDominant', 'lydianDominant', 'blues'],
  ),
  rock: style(
    'rock',
    ['pentatonicMinor', 'pentatonicMajor', 'aeolian', 'blues'],
    ['ionian', 'mixolydian', 'dorian'],
  ),
  folk: style(
    'folk',
    ['ionian', 'mixolydian', 'dorian'],
    ['aeolian', 'lydian'],
  ),
  funk: style(
    'funk',
    ['dorian', 'mixolydian', 'blues', 'pentatonicMinor'],
    ['aeolian'],
  ),
  'r&b': style(
    'r&b',
    ['dorian', 'aeolian', 'mixolydian', 'ionian'],
    ['lydian', 'pentatonicMinor'],
  ),
  gospel: style('gospel', ['mixolydian', 'pentatonicMinor'], ['harmonicMinor']),
  'neo-soul': style(
    'neo-soul',
    ['dorian', 'aeolian', 'mixolydian'],
    ['lydian', 'pentatonicMinor', 'blues'],
  ),
  'jam-band': style(
    'jam-band',
    ['ionian', 'dorian', 'mixolydian'],
    ['pentatonicMajor', 'pentatonicMinor', 'blues', 'aeolian'],
  ),
  pop: style('pop', ['ionian', 'aeolian'], ['mixolydian', 'dorian']),
  'hip-hop': style(
    'hip-hop',
    ['aeolian', 'pentatonicMinor', 'dorian'],
    ['phrygian', 'blues'],
  ),
  electronic: style(
    'electronic',
    ['aeolian', 'dorian', 'pentatonicMinor'],
    ['ionian', 'lydian', 'phrygian'],
  ),
  latin: style(
    'latin',
    ['ionian', 'aeolian', 'dorian', 'mixolydian'],
    ['phrygian', 'pentatonicMinor'],
  ),
  african: style(
    'african',
    ['pentatonicMajor', 'pentatonicMinor', 'ionian', 'dorian'],
    ['aeolian', 'mixolydian'],
  ),
  reggae: style(
    'reggae',
    ['ionian', 'aeolian', 'dorian', 'mixolydian'],
    ['pentatonicMinor', 'blues'],
  ),
  blues: style(
    'blues',
    ['blues', 'pentatonicMinor', 'mixolydian', 'dorian'],
    ['aeolian', 'alteredDominant'],
  ),
};

// ---------------------------------------------------------------------------
// What the rules say about a progression
// ---------------------------------------------------------------------------

/** One tag the rules give, with the clauses that gave it. */
export interface TagReason<T extends string> {
  tag: T;
  clauses: ClauseHit[];
}

export interface TagExplanation {
  vibes: TagReason<VibeTag>[];
  styles: TagReason<StyleTag>[];
}

function readChords(chords: readonly string[]): RuleChord[] {
  return chords.map((c, i) => parseRuleChord(c, i));
}

function reasons<T extends string>(
  rules: readonly TagRule<T>[],
  order: readonly T[],
  chords: readonly RuleChord[],
  r: RuleReadings,
): TagReason<T>[] {
  const out: TagReason<T>[] = [];
  for (const rule of rules) {
    const clauses = evaluate(rule.build(r), chords, r);
    if (clauses) out.push({ tag: rule.tag, clauses });
  }
  return out.sort((a, b) => order.indexOf(a.tag) - order.indexOf(b.tag));
}

/**
 * Every tag the rules give a progression, each with the clauses that fired
 * and the chords they matched: the "why" behind a suggestion.
 */
export function explainTags(
  chords: readonly string[],
  readings?: Partial<RuleReadings>,
): TagExplanation {
  const r = withReadings(readings);
  const read = readChords(chords);
  return {
    vibes: reasons(VIBE_RULES, VIBE_TAGS, read, r),
    styles: reasons(STYLE_RULES, STYLE_TAGS, read, r),
  };
}

export interface AutoTags {
  vibes: VibeTag[];
  styles: StyleTag[];
}

/** The vibes and styles the rules give a progression, in vocabulary order. */
export function autoTags(
  chords: readonly string[],
  readings?: Partial<RuleReadings>,
): AutoTags {
  const why = explainTags(chords, readings);
  return {
    vibes: why.vibes.map((v) => v.tag),
    styles: why.styles.map((s) => s.tag),
  };
}

/**
 * What the rules read from a progression. Library entries, the console's
 * progression rows and Tesseract's entries all fit this shape.
 */
export interface RuleEntry {
  id: number;
  chords: readonly string[];
  vibes?: readonly string[];
  styles?: readonly string[];
}

/** Tags the rules would add to a progression, and tags they would take off. */
export interface TagChanges<T extends string> {
  add: T[];
  remove: T[];
}

/** Where a progression's stored tags and the rules disagree. */
export interface RuleMismatch {
  id: number;
  vibes: TagChanges<VibeTag>;
  styles: TagChanges<StyleTag>;
  /** Every tag to add or remove, vibes and styles together. */
  count: number;
}

function changes<T extends string>(
  stored: readonly string[] | undefined,
  suggested: readonly T[],
  ruled: readonly T[],
): TagChanges<T> {
  const have = new Set((stored ?? []).map(canonicalTag));
  const give = new Set<string>(suggested);
  return {
    add: suggested.filter((t) => !have.has(t)),
    remove: ruled.filter((t) => have.has(t) && !give.has(t)),
  };
}

/**
 * Where a progression's stored vibes and styles disagree with the rules: the
 * ruled tags the rules give that are not stored (add), and the ruled tags
 * stored that the rules do not give (remove). A tag with no rule is never
 * flagged either way, and nothing is written: the result is a suggestion.
 */
export function mismatches(
  entry: RuleEntry,
  readings?: Partial<RuleReadings>,
): RuleMismatch {
  const suggested = autoTags(entry.chords, readings);
  const vibes = changes(entry.vibes, suggested.vibes, RULED_VIBES);
  const styles = changes(entry.styles, suggested.styles, RULED_STYLES);
  return {
    id: entry.id,
    vibes,
    styles,
    count:
      vibes.add.length +
      vibes.remove.length +
      styles.add.length +
      styles.remove.length,
  };
}

/** How one ruled tag fares across a set of progressions. */
export interface TagTally {
  /** Progressions that store the tag. */
  stored: number;
  /** Progressions the rules give the tag. */
  suggested: number;
  /** Progressions that store it and that the rules give it. */
  agree: number;
  /** Progressions the rules would add it to. */
  add: number;
  /** Progressions the rules would take it off. */
  remove: number;
}

/**
 * The rules run over many progressions at once, for the console's flags: a
 * drawer, a hover card, a filter or a table column reads one entry from
 * `byId`, and a summary reads the tallies.
 */
export interface MismatchReport {
  /** Each progression with at least one flag, by id. No entry means no flag. */
  byId: ReadonlyMap<number, RuleMismatch>;
  /** The ids in `byId`, in the order the entries came in. */
  flaggedIds: number[];
  vibes: Record<VibeTag, TagTally>;
  styles: Record<StyleTag, TagTally>;
  totals: {
    entries: number;
    flagged: number;
    additions: number;
    removals: number;
  };
}

const emptyTally = (): TagTally => ({
  stored: 0,
  suggested: 0,
  agree: 0,
  add: 0,
  remove: 0,
});

function tallyTags<T extends string>(
  tallies: Record<T, TagTally>,
  ruled: readonly T[],
  stored: readonly string[] | undefined,
  suggested: readonly T[],
): void {
  const have = new Set((stored ?? []).map(canonicalTag));
  const give = new Set<string>(suggested);
  for (const tag of ruled) {
    const t = tallies[tag];
    const s = have.has(tag);
    const g = give.has(tag);
    if (s) t.stored++;
    if (g) t.suggested++;
    if (s && g) t.agree++;
    if (g && !s) t.add++;
    if (s && !g) t.remove++;
  }
}

/**
 * Runs the rules over every entry and gathers the flags. The tallies cover
 * the ruled tags only (`RULED_VIBES`, `RULED_STYLES`); the others are listed
 * at zero so a reader can index any tag.
 */
export function mismatchReport(
  entries: Iterable<RuleEntry>,
  readings?: Partial<RuleReadings>,
): MismatchReport {
  const r = withReadings(readings);
  const byId = new Map<number, RuleMismatch>();
  const flaggedIds: number[] = [];
  const vibes = Object.fromEntries(
    VIBE_TAGS.map((t) => [t, emptyTally()]),
  ) as Record<VibeTag, TagTally>;
  const styles = Object.fromEntries(
    STYLE_TAGS.map((t) => [t, emptyTally()]),
  ) as Record<StyleTag, TagTally>;
  const totals = { entries: 0, flagged: 0, additions: 0, removals: 0 };
  for (const entry of entries) {
    totals.entries++;
    const suggested = autoTags(entry.chords, r);
    tallyTags(vibes, RULED_VIBES, entry.vibes, suggested.vibes);
    tallyTags(styles, RULED_STYLES, entry.styles, suggested.styles);
    const v = changes(entry.vibes, suggested.vibes, RULED_VIBES);
    const s = changes(entry.styles, suggested.styles, RULED_STYLES);
    const additions = v.add.length + s.add.length;
    const removals = v.remove.length + s.remove.length;
    if (additions + removals === 0) continue;
    totals.flagged++;
    totals.additions += additions;
    totals.removals += removals;
    flaggedIds.push(entry.id);
    byId.set(entry.id, {
      id: entry.id,
      vibes: v,
      styles: s,
      count: additions + removals,
    });
  }
  return { byId, flaggedIds, vibes, styles, totals };
}
