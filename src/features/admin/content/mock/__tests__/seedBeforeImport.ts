import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import type { SuggestionDecision } from '@/content/suggestions/types';
import type { MockSeed, MockSeedItem } from '../contentMockServer';
import { parseDecisionsFile } from '../decisions';
import type { Body } from '../mockKinds';

/**
 * The seed as the repo held it before the bulk import of 30 September 2026,
 * for the tests that rehearse the suggestion workflow: accepting, rejecting
 * and replaying rows onto empty fields. The import wrote 13,530 of those
 * rows into the repo's data files, so on today's seed most of the fields
 * those tests aim at already hold the value, and every accept reads as
 * applied.
 *
 * The import logged each value it wrote in the committed decisions.json
 * (`method: 'import'`), with the records each one needed. This undoes them
 * on a loaded seed, item by item:
 *  - a value set on a path is taken off it, and an object left empty goes
 *    too (a `born` with neither date nor place);
 *  - an element added to a list is taken out of it, and a list left empty
 *    goes (no song had credits or records the import wrote to). A credit
 *    for the song's own act was written billed as `primary` (apply.ts
 *    `asWritten`), which the logged value leaves out, so that one flag is
 *    set aside when the element is matched;
 *  - a record a decision needed is dropped when its body is exactly what the
 *    import made (with the values above taken off), which a record that was
 *    there before never is: a roster artist, a globe city or a pilot studio
 *    has fields the import's bare record lacks.
 *
 * The result was checked against a copy of every data file taken before the
 * real run: every song, event, artist, place, studio, label and progression
 * matched. Only decisions made by the import are undone; any other committed
 * decision stays as the seed has it.
 */

/** The committed decisions file, read once. */
const DECISIONS_FILE = 'src/scripts/enrichment/suggestions/decisions.json';

let importDecisions: SuggestionDecision[] | undefined;

/** The import's decisions from the committed file, in the order logged. */
export function bulkImportDecisions(): SuggestionDecision[] {
  if (!importDecisions) {
    let text: string;
    try {
      text = readFileSync(DECISIONS_FILE, 'utf8');
    } catch {
      text = '{"decisions":[]}';
    }
    importDecisions = parseDecisionsFile(text).decisions.filter(
      (decision) => decision.method === 'import',
    );
  }
  return importDecisions;
}

const isObject = (value: unknown): value is Body =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** An element without the `primary` billing the writing may add. */
const unbilled = (value: unknown): unknown => {
  if (!isObject(value) || !('primary' in value)) return value;
  const rest = { ...value };
  delete rest.primary;
  return rest;
};

/** Takes the value at `path` (dotted, an add's list ending in `[]`) back off `body`. */
function undo(body: Body, decision: SuggestionDecision): void {
  const add = decision.path.endsWith('[]');
  const keys = (add ? decision.path.slice(0, -2) : decision.path).split('.');
  const parents: Body[] = [body];
  for (const key of keys.slice(0, -1)) {
    const next = parents[parents.length - 1][key];
    if (!isObject(next)) return;
    parents.push(next);
  }
  const holder = parents[parents.length - 1];
  const last = keys[keys.length - 1];
  if (add) {
    const list = holder[last];
    if (!Array.isArray(list)) return;
    let at = list.findIndex((element) =>
      isDeepStrictEqual(element, decision.value),
    );
    if (at < 0)
      at = list.findIndex((element) =>
        isDeepStrictEqual(unbilled(element), unbilled(decision.value)),
      );
    if (at >= 0) list.splice(at, 1);
    if (list.length === 0) delete holder[last];
  } else if (isDeepStrictEqual(holder[last], decision.value)) {
    delete holder[last];
  }
  // An object the import's values alone filled goes with them.
  for (let depth = parents.length - 1; depth > 0; depth -= 1) {
    if (Object.keys(parents[depth]).length > 0) break;
    delete parents[depth - 1][keys[depth - 1]];
  }
}

const keyOf = (kind: string, slug: string) => `${kind}:${slug}`;

/** A copy of `seed` with the bulk import's values and records taken out. */
export function seedBeforeImport(
  seed: MockSeed,
  decisions: readonly SuggestionDecision[] = bulkImportDecisions(),
): MockSeed {
  const items: MockSeedItem[] = seed.items.map((item) => ({
    ...item,
    body: structuredClone(item.body),
  }));
  const byKey = new Map(
    items.map((item) => [keyOf(item.kind, item.slug), item]),
  );
  for (const decision of decisions) {
    if (decision.op !== 'accept') continue;
    const item = byKey.get(keyOf(decision.target.kind, decision.target.slug));
    if (item) undo(item.body, decision);
  }
  const made = new Map<string, Body>();
  for (const decision of decisions)
    for (const record of decision.requires ?? [])
      made.set(keyOf(record.kind, record.slug), record.body as Body);
  return {
    ...seed,
    items: items.filter((item) => {
      const body = made.get(keyOf(item.kind, item.slug));
      return !body || !isDeepStrictEqual(item.body, body);
    }),
  };
}
