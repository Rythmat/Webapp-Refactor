import { progressionErrors } from '@/curriculum/engine/progressionValidation';
import type { Body } from '@/features/admin/content/mock/mockKinds';
import { PROGRESSION_LIBRARY_DECLARATION } from '../literal';
import { TS_FILE_KINDS, writeTsElements } from '../tsWrite';
import {
  badChange,
  checkIdentity,
  declarationValue,
  type FilePlan,
  type ItemChange,
  itemFrom,
  itemKey,
  loadFailed,
  oneChangePerItem,
  type PlanContext,
  type PlanOptions,
  planFor,
  type RepoItem,
  type RepoReader,
  type RepoSource,
  slugPattern,
  unwritable,
} from './common';

/**
 * Chord progressions: `src/curriculum/data/chordProgressionLibrary.ts`, one
 * array (`CHORD_PROGRESSION_LIBRARY`, the module's default export) of about
 * 700 entries. Students read the chords, vibes and styles through the vibe,
 * style and pipeline engines; the console adds `songIds`.
 *
 * An entry is identified by its numeric `id`, and its slug is that number
 * as a string (`'42'`), as the mock seeds it. An edit changes the entry
 * where it stands, surgically (`tsWrite.ts`); a new entry is appended after
 * the last, in the blank-line-separated style the file uses.
 *
 * Every entry a change writes is held to the library's rules
 * (src/curriculum/engine/progressionValidation.ts) before anything is
 * planned: chords Prism knows, 2 to 7 of them, no second copy of another
 * progression's chords, derived fields that follow the chords, and a new
 * id above the high-water mark. Only what the change itself breaks is
 * refused (422 `REPO_BAD_CHANGE`): a problem the stored entry already had
 * does not stop a song link being saved on it. The mark lives in its own
 * file (`progressionIdMark.ts`), which the same save raises when a change
 * adds or deletes an entry above it, so an id is never handed out twice.
 */

export const LIBRARY_FILE = 'src/curriculum/data/chordProgressionLibrary.ts';

/** The high-water mark of progression ids (PROGRESSION_ID_HIGH_WATER). */
export const PROGRESSION_ID_MARK_FILE =
  'src/curriculum/data/progressionIdMark.ts';

const MARK = /export const PROGRESSION_ID_HIGH_WATER = (\d+);/;

/** The mark the file holds, or null when it does not hold one as written. */
export function readProgressionIdMark(
  text: string | null | undefined,
): number | null {
  const found = text ? MARK.exec(text) : null;
  return found ? Number(found[1]) : null;
}

/** The file with its mark raised to `mark`, nothing else changed. */
const withMark = (text: string, mark: number): string =>
  text.replace(MARK, `export const PROGRESSION_ID_HIGH_WATER = ${mark};`);

/** A mark file for a repo that has none yet. */
const NEW_MARK_FILE = (mark: number) =>
  `/**\n * The highest chord progression id ever issued: a new progression takes the\n * next one up, and an id is never reused (UNISON stores them).\n */\nexport const PROGRESSION_ID_HIGH_WATER = ${mark};\n`;

const PROGRESSION_ID = slugPattern('chord_progression');

async function load(reader: RepoReader) {
  const file = await reader.read(LIBRARY_FILE);
  if (!file) throw loadFailed(LIBRARY_FILE, new Error('the file is missing'));
  let entries: unknown[];
  try {
    entries = declarationValue(
      file,
      PROGRESSION_LIBRARY_DECLARATION,
    ) as unknown[];
  } catch (error) {
    throw loadFailed(LIBRARY_FILE, error);
  }
  const problems: string[] = [];
  const seen = new Set<string>();
  const items: RepoItem[] = [];
  entries.forEach((entry, index) => {
    const id = (entry as { id?: unknown } | null)?.id;
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
      problems.push(`entry ${index + 1} has no whole-number id`);
      return;
    }
    const slug = String(id);
    if (seen.has(slug)) {
      problems.push(`the id ${slug} is used twice`);
      return;
    }
    seen.add(slug);
    items.push(itemFrom('chord_progression', slug, entry as Body, file));
  });
  if (problems.length) {
    throw loadFailed(LIBRARY_FILE, new Error(problems.join('; ')));
  }
  // The mark: a repo without its file yet reads as the highest id held.
  const markFile = await reader.read(PROGRESSION_ID_MARK_FILE);
  if (markFile && readProgressionIdMark(markFile.text) === null) {
    throw loadFailed(
      PROGRESSION_ID_MARK_FILE,
      new Error(
        'it does not say `export const PROGRESSION_ID_HIGH_WATER = <id>;`',
      ),
    );
  }
  return {
    items,
    files: markFile ? [file, markFile] : [file],
    missing: markFile ? [] : [PROGRESSION_ID_MARK_FILE],
    warnings: [],
  };
}

/** The highest id ever issued: the mark, or a higher id the library holds. */
function highWaterOf(context: PlanContext): number {
  let mark =
    readProgressionIdMark(context.file(PROGRESSION_ID_MARK_FILE)?.text) ?? 0;
  for (const item of context.items('chord_progression')) {
    const id = Number(item.slug);
    if (Number.isInteger(id) && id > mark) mark = id;
  }
  return mark;
}

/**
 * Refuses an entry the change breaks a library rule in (see the file's
 * comment), checked against the library as it will be after the whole
 * batch: an entry removed in it is no longer there to copy.
 */
function checkEntries(
  changes: readonly ItemChange[],
  context: PlanContext,
  highWater: number,
) {
  const after = new Map<string, Body | null>();
  for (const item of context.items('chord_progression'))
    after.set(item.slug, item.body as Body);
  for (const change of changes) after.set(change.slug, change.body);
  const entries = [...after.values()].filter((body): body is Body => !!body);
  for (const change of changes) {
    if (change.body === null) continue;
    const before = context.item('chord_progression', change.slug)?.body as
      | Body
      | undefined;
    const errors = progressionErrors(change.body, {
      others: entries,
      before,
      ...(before ? {} : { highWater }),
    });
    if (errors.length)
      throw badChange(
        change,
        errors.map((issue) => `${issue.path}: ${issue.message}`).join(' '),
      );
  }
}

async function plan(
  changes: readonly ItemChange[],
  context: PlanContext,
  options: PlanOptions = {},
): Promise<FilePlan[]> {
  oneChangePerItem(changes);
  const upsert: Body[] = [];
  const remove: number[] = [];
  const items: string[] = [];
  for (const change of changes) {
    checkIdentity(change, 'id', PROGRESSION_ID);
    const existing = context.item('chord_progression', change.slug);
    items.push(itemKey('chord_progression', change.slug));
    if (change.body === null) {
      if (!existing) throw badChange(change, 'there is no such progression');
      remove.push(Number(change.slug));
      continue;
    }
    if (typeof change.body.id !== 'number') {
      throw badChange(change, 'a progression id is a number, not a string');
    }
    upsert.push(change.body);
  }
  if (!items.length) return [];
  const highWater = highWaterOf(context);
  checkEntries(changes, context, highWater);
  const file = context.file(LIBRARY_FILE);
  if (!file) throw loadFailed(LIBRARY_FILE, new Error('the file is missing'));
  const plans: FilePlan[] = [];
  try {
    const written = await writeTsElements({
      text: file.text,
      fileName: LIBRARY_FILE,
      ...TS_FILE_KINDS.progressions,
      upsert,
      remove,
      force: options.force,
    });
    const planned = planFor(
      LIBRARY_FILE,
      file,
      written.text,
      items,
      options.force,
    );
    if (planned) plans.push(planned);
  } catch (error) {
    throw unwritable(LIBRARY_FILE, error);
  }
  // The mark goes up with any id this save adds or deletes above it (and
  // a repo without the file gets one the first time an id comes or goes).
  const markFile = context.file(PROGRESSION_ID_MARK_FILE);
  const stored = readProgressionIdMark(markFile?.text);
  const idsMove = changes.some(
    (change) =>
      change.body === null || !context.item('chord_progression', change.slug),
  );
  const raised = Math.max(
    highWater,
    ...upsert.map((body) => Number(body.id)),
    ...remove,
  );
  if (idsMove && (stored === null || raised > stored)) {
    const text = markFile
      ? withMark(markFile.text, raised)
      : NEW_MARK_FILE(raised);
    const planned = planFor(PROGRESSION_ID_MARK_FILE, markFile, text, items);
    if (planned) plans.push(planned);
  }
  return plans;
}

export const progressionsSource: RepoSource = {
  name: 'progressions',
  kinds: ['chord_progression'],
  readOnly: false,
  files: async () => [LIBRARY_FILE, PROGRESSION_ID_MARK_FILE],
  load,
  plan,
};
