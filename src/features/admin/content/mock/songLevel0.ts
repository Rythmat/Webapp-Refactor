import type { Body } from './mockKinds';

/**
 * Today's song schema (level 0), as far as docs/song-body-schema-gap.md
 * measured it: the keys the production server rejects with "Unrecognized
 * key(s)", at the root, on a section and on a bar. The legacy mode rejects
 * exactly these on top of the v1 schema, and seeds each song without them.
 *
 * The last three bar keys were added to the type after that run and are
 * listed there as "new, please add"; a strict schema that predates them
 * rejects them too.
 */
const ROOT_KEYS = ['credits', 'session', 'composer', 'relatedRecordings'];
/**
 * The root keys song v2 added (songBodySchema.v2.ts). Today's server is
 * older than v1, so it refuses them as well; the legacy mode refuses them
 * through the v1 schema it runs first, before these level-0 checks. No chart
 * carried one until the bulk import of 30 September 2026 gave songs their
 * records.
 */
const V2_ROOT_KEYS = ['releases', 'subgenreIds'];
const SECTION_KEYS = ['instrumental'];
const BAR_KEYS = [
  'repeatStart',
  'repeatEnd',
  'repeatTimes',
  'keyChange',
  'cue',
  'fine',
  'ending',
  'segno',
  'coda',
  'toCoda',
  'jump',
  'timeSignature',
  'systemBreak',
  'systemRun',
];

export interface Level0Issue {
  /** Where, in today's dotted form: `sections.2.bars.0`, or '' for the root. */
  at: string;
  keys: string[];
}

const objects = (value: unknown): Body[] =>
  Array.isArray(value)
    ? value.map((entry) =>
        entry && typeof entry === 'object' && !Array.isArray(entry)
          ? (entry as Body)
          : {},
      )
    : [];

const present = (object: Body, keys: string[]) =>
  keys.filter((key) => key in object && object[key] !== undefined);

/** Every place a body carries a key today's server refuses. */
export function level0Issues(song: Body): Level0Issue[] {
  const issues: Level0Issue[] = [];
  const root = present(song, ROOT_KEYS);
  if (root.length) issues.push({ at: '', keys: root });
  objects(song.sections).forEach((section, s) => {
    const own = present(section, SECTION_KEYS);
    if (own.length) issues.push({ at: `sections.${s}`, keys: own });
    objects(section.bars).forEach((bar, b) => {
      const keys = present(bar, BAR_KEYS);
      if (keys.length) issues.push({ at: `sections.${s}.bars.${b}`, keys });
    });
  });
  return issues;
}

/** One issue as today's server words it. */
export const formatLevel0Issue = ({ at, keys }: Level0Issue) =>
  `${at ? `${at}: ` : ''}Unrecognized key(s) in object: ${keys
    .map((key) => `'${key}'`)
    .join(', ')}`;

const without = (object: Body, keys: string[]): Body => {
  const copy = { ...object };
  for (const key of keys) delete copy[key];
  return copy;
};

/**
 * The body without anything level 0 refuses: the closest thing the mock has
 * to the older copy production holds for each of the charts it rejected. The
 * legacy seed is built from these, so the song importer finds the same
 * differences, and meets the same rejections, that it met in production.
 */
export function toLevel0(song: Body): Body {
  if (
    level0Issues(song).length === 0 &&
    present(song, V2_ROOT_KEYS).length === 0
  )
    return song;
  const next = without(song, [...ROOT_KEYS, ...V2_ROOT_KEYS]);
  if (Array.isArray(song.sections))
    next.sections = objects(song.sections).map((section) => {
      const trimmed = without(section, SECTION_KEYS);
      if (Array.isArray(section.bars))
        trimmed.bars = objects(section.bars).map((bar) =>
          without(bar, BAR_KEYS),
        );
      return trimmed;
    });
  return next;
}
