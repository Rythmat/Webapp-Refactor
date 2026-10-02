import { CHORDS } from '@/daw/prism-engine/data/chords';
import {
  CHORD_SPELLING_FIXES,
  normalizeChordSpelling,
  openingKey,
} from './openingTree';

/**
 * The rules a chord progression in the library must keep, in one place, so
 * the console (as the author types), the offline content server and the
 * repo content server (as a save arrives) all say the same thing.
 *
 * - **Every chord is a degree and one of Prism's chord types**, written as
 *   the library writes them: "2 minor7", "b7 major", "#4 minor7b5". The
 *   degree is a scale step 1 to 7 with an optional flat or sharp; the type
 *   is a key of Prism's `CHORDS` (src/daw/prism-engine/data/chords.ts), so
 *   whatever the library holds, Prism can play.
 * - **A progression has 2 to 7 chords.**
 * - **No two progressions have the same chords.** A progression is its
 *   chords, so a second copy is the same progression twice. The library
 *   already holds eight such pairs, waiting on the owner; they stay as they
 *   are until someone changes their chords.
 * - **The derived fields follow the chords**: `progression`, `chordCount`,
 *   `startingChord` and `startingDegree` are written from `chords` and must
 *   say the same thing.
 * - **New ids come from the high-water mark** (`PROGRESSION_ID_HIGH_WATER`),
 *   never "one past the highest": an id is never handed out twice.
 *
 * A save is held to what it changes. A problem the stored progression
 * already had is reported as a warning, not refused, so fixing a song link
 * on one of the duplicate pairs still saves. Everything here is pure.
 */

export const MIN_CHORDS = 2;
export const MAX_CHORDS = 7;

/**
 * Keys of Prism's `CHORDS` that are not chord types. `b7dominant7#11` is the
 * chord "b7 dominant7#11" with its space lost; Prism keeps it only until
 * the data that used it is fixed, so nothing new may use it.
 */
export const NOT_CHORD_TYPES: ReadonlySet<string> = new Set(
  Object.keys(CHORD_SPELLING_FIXES).filter((spelling) =>
    Object.prototype.hasOwnProperty.call(CHORDS, spelling),
  ),
);

/** Every chord type a progression may use, in Prism's own order. */
export const CHORD_TYPES: readonly string[] = Object.keys(CHORDS).filter(
  (type) => !NOT_CHORD_TYPES.has(type),
);

const TYPES: ReadonlySet<string> = new Set(CHORD_TYPES);

/** A scale degree as the library writes one: 1 to 7, with an optional b or #. */
export const DEGREE_PATTERN = /^[b#]?[1-7]$/;

/**
 * The degrees the chord picker offers, low to high. Both spellings of a
 * black key are offered where the library uses both: "#5 diminished7" is a
 * passing chord on its way up, "b6 major" a borrowed one.
 */
export const PICKER_DEGREES: readonly string[] = [
  '1',
  '#1',
  'b2',
  '2',
  '#2',
  'b3',
  '3',
  '4',
  '#4',
  'b5',
  '5',
  '#5',
  'b6',
  '6',
  'b7',
  '7',
];

/** A chord's two halves, or null when it is not written as "degree type". */
export function splitChord(
  chord: string,
): { degree: string; type: string } | null {
  const space = chord.indexOf(' ');
  if (space <= 0) return null;
  const degree = chord.slice(0, space);
  const type = chord.slice(space + 1);
  if (!DEGREE_PATTERN.test(degree) || !type || /\s/.test(type)) return null;
  return { degree, type };
}

/** Whether a chord is written as a degree and a type Prism knows. */
export function isKnownChord(chord: string): boolean {
  const parts = splitChord(chord);
  return !!parts && TYPES.has(parts.type);
}

/**
 * Chords typed or pasted as one line, one chord per step: "1 major7 -
 * 4 major7", "1 major7 | 4 major7" (an opening's id), "1 major7 → 4 major7"
 * or a comma list. Each chord is trimmed; nothing else is changed.
 */
export const splitChordList = (text: string): string[] =>
  text
    .split(/\s+[-–→]\s+|\s*[|,]\s*/)
    .map((chord) => chord.trim())
    .filter(Boolean);

/** The fields a progression derives from its chords, in the library's spelling. */
export interface ChordFields {
  progression: string;
  chords: string[];
  chordCount: number;
  startingChord: string;
  startingDegree: string;
}

export const chordFieldsOf = (chords: readonly string[]): ChordFields => ({
  progression: chords.join(' - '),
  chords: [...chords],
  chordCount: chords.length,
  startingChord: chords[0] ?? '',
  startingDegree: chords[0]?.split(/\s+/)[0] ?? '',
});

/** The body paths a chords change writes, `chords` first. */
export const CHORD_FIELD_PATHS = [
  'chords',
  'progression',
  'chordCount',
  'startingChord',
  'startingDegree',
] as const satisfies readonly (keyof ChordFields)[];

/** The complexity levels, plainest first. */
export const COMPLEXITY_LEVELS = ['triad', '7th', 'extended'] as const;
export type ComplexityLevel = (typeof COMPLEXITY_LEVELS)[number];

/**
 * The complexity a progression's chords suggest, as the library has
 * assigned it: each chord counts by how many notes Prism's chord of that
 * type has before any slash bass (three a triad, four a 7th or 6th chord,
 * five or more extended), and the richest chord decides. Null when a chord
 * is not one Prism knows, or there are none.
 */
export function suggestComplexity(
  chords: readonly string[],
): ComplexityLevel | null {
  if (chords.length === 0) return null;
  let level = 0;
  for (const chord of chords) {
    const type = splitChord(chord)?.type;
    if (!type || !TYPES.has(type)) return null;
    const notes = CHORDS[type.split('/')[0]] ?? CHORDS[type];
    const size = notes.length <= 3 ? 0 : notes.length === 4 ? 1 : 2;
    level = Math.max(level, size);
  }
  return COMPLEXITY_LEVELS[level];
}

/**
 * The key two progressions with the same chords share: the chords in their
 * fixed spelling, joined as an opening's id.
 */
export const chordSequenceKey = (chords: readonly string[]): string =>
  openingKey(chords.map(normalizeChordSpelling));

/**
 * The id a new progression takes: one above the high-water mark, or above
 * the highest id there is, whichever is higher.
 */
export function nextProgressionIdFrom(
  ids: Iterable<number>,
  highWater: number,
): number {
  let highest = highWater;
  for (const id of ids) if (Number.isInteger(id) && id > highest) highest = id;
  return highest + 1;
}

/* ── Checking one progression ─────────────────────────────────────────── */

/** Which rule a problem breaks. */
export type ProgressionRule =
  | 'chord'
  | 'count'
  | 'duplicate'
  | 'derived'
  | 'id';

export interface ProgressionIssue {
  rule: ProgressionRule;
  /** The body path, with indices: "chords[2]", "chordCount", "id". */
  path: string;
  /** In words, for the author: what is wrong and what would be right. */
  message: string;
  /**
   * `error` refuses the save. `warning` is a problem the stored progression
   * already had, which this save does not make and need not fix.
   */
  severity: 'error' | 'warning';
  /** For a duplicate: the progressions with the same chords. */
  ids?: number[];
}

/** What a progression is checked against. */
export interface ProgressionCheckOptions {
  /**
   * The other progressions in the library, for the duplicate check. The
   * progression being checked may be among them: it is skipped by its id.
   */
  others?: Iterable<{ id?: unknown; chords?: unknown }>;
  /**
   * The progression as stored before this change. Problems it already had
   * are warnings. Undefined or null for a new progression.
   */
  before?: Readonly<Record<string, unknown>> | null;
  /**
   * The highest id ever issued, for a new progression's id. Leave it out to
   * skip the check (an edit keeps its id).
   */
  highWater?: number;
}

const strings = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')
    ? (value as string[])
    : null;

const quote = (text: string) => `“${text}”`;

/** What is wrong with one chord's spelling, or null when nothing is. */
function chordProblem(chord: string): string | null {
  if (isKnownChord(chord)) return null;
  const fixed = normalizeChordSpelling(chord);
  if (fixed !== chord && isKnownChord(fixed))
    return `${quote(chord)} is not how the library spells it: ${quote(fixed)}.`;
  const parts = splitChord(chord.trim().replace(/\s+/g, ' '));
  if (parts && !TYPES.has(parts.type))
    return `${quote(chord)}: “${parts.type}” is not one of Prism’s chord types.`;
  return `${quote(chord)} is not a chord: write a degree (1, b3, #4) and a chord type, as in “2 minor7”.`;
}

/** Every problem `body` has, all as errors. */
function issuesOf(
  body: Readonly<Record<string, unknown>>,
  others: readonly { id?: unknown; chords?: unknown }[],
  highWater: number | undefined,
): ProgressionIssue[] {
  const issues: ProgressionIssue[] = [];
  const error = (
    rule: ProgressionRule,
    path: string,
    message: string,
    ids?: number[],
  ) =>
    issues.push({
      rule,
      path,
      message,
      severity: 'error',
      ...(ids ? { ids } : {}),
    });

  const id = body.id;
  const idOk = typeof id === 'number' && Number.isInteger(id) && id > 0;
  if (!idOk) error('id', 'id', 'A progression’s id is a whole number above 0.');
  else if (highWater !== undefined && id <= highWater)
    error(
      'id',
      'id',
      `The id ${id} was handed out before. Ids are never reused, since UNISON stores them: a new progression takes ${highWater + 1} or higher.`,
    );

  const chords = strings(body.chords);
  if (!chords) {
    error('chord', 'chords', 'The chords are a list of chords.');
    return issues;
  }
  chords.forEach((chord, index) => {
    const problem = chordProblem(chord);
    if (problem) error('chord', `chords[${index}]`, problem);
  });
  if (chords.length < MIN_CHORDS || chords.length > MAX_CHORDS)
    error(
      'count',
      'chords',
      `A progression has ${MIN_CHORDS} to ${MAX_CHORDS} chords; this one has ${chords.length}.`,
    );

  if (chords.length > 0) {
    const key = chordSequenceKey(chords);
    const same = others
      .filter(
        (other) =>
          other.id !== id &&
          strings(other.chords) !== null &&
          chordSequenceKey(strings(other.chords)!) === key,
      )
      .map((other) => Number(other.id))
      .sort((a, b) => a - b);
    if (same.length)
      error(
        'duplicate',
        'chords',
        `The same chords as progression ${same.join(', ')}: a progression is its chords, so this would be ${same.length === 1 ? 'it' : 'them'} again.`,
        same,
      );
  }

  const derived = chordFieldsOf(chords);
  for (const path of [
    'progression',
    'chordCount',
    'startingChord',
    'startingDegree',
  ] as const) {
    if (body[path] !== derived[path])
      error(
        'derived',
        path,
        `${path} must follow the chords: ${JSON.stringify(derived[path])}, not ${JSON.stringify(body[path] ?? null)}.`,
      );
  }
  return issues;
}

const issueKey = (issue: ProgressionIssue) =>
  `${issue.rule}\u0000${issue.path}\u0000${issue.message}`;

/**
 * Every problem a progression body has. Errors refuse a save; a problem the
 * stored progression (`before`) already had comes back as a warning. Errors
 * come first, then warnings, each in the body's order.
 */
export function validateProgression(
  body: Readonly<Record<string, unknown>>,
  { others = [], before, highWater }: ProgressionCheckOptions = {},
): ProgressionIssue[] {
  const list = [...others];
  const issues = issuesOf(body, list, before ? undefined : highWater);
  if (!before) return issues;
  const had = new Set(issuesOf(before, list, undefined).map(issueKey));
  const marked = issues.map(
    (issue): ProgressionIssue =>
      had.has(issueKey(issue)) ? { ...issue, severity: 'warning' } : issue,
  );
  return [
    ...marked.filter((issue) => issue.severity === 'error'),
    ...marked.filter((issue) => issue.severity === 'warning'),
  ];
}

/** The errors only: what refuses a save. */
export const progressionErrors = (
  body: Readonly<Record<string, unknown>>,
  options?: ProgressionCheckOptions,
): ProgressionIssue[] =>
  validateProgression(body, options).filter(
    (issue) => issue.severity === 'error',
  );
