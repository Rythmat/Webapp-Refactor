import type { ZodTypeAny } from 'zod';
import {
  INSTRUMENT_BODY_SCHEMAS,
  isInstrumentContentKind,
} from '@/content/instrument/schemas';
import { RECORD_SCHEMAS } from '@/content/vocabulary/schemas';
import type { ValidationProblem } from '@/hooks/data/admin/useAdminContent';
import {
  citySchema,
  recordBodySchemas,
} from '@/scripts/apiContract/recordBodySchemas';
import { REF_PATHS, type RefPath } from '@/scripts/apiContract/refPaths';
import { songBodySchema } from '@/scripts/apiContract/songBodySchema';
import { songBodySchema as songBodySchemaV1 } from '@/scripts/apiContract/songBodySchema.v1';
import {
  identityOf,
  identityValue,
  isVocabularyKind,
  slugPatternOf,
  type Body,
  type MockKind,
} from './mockKinds';
import type { ContentMockMode } from './mockSwitch';
import { chordProgressionBodySchema } from './progressionSchema';
import { formatLevel0Issue, level0Issues } from './songLevel0';

/**
 * The mock's validator: the same checks the contract asks of the API, run
 * against the generated schemas the API copies. Where the contract defers a
 * check (vocabulary ids, cycles), the mock defers it too, so the console is
 * never built against a stricter server than the one it will meet.
 *
 * The vocabulary's own records (genres, subgenres, instruments, which only
 * repo mode serves) are held here to the schemas their files are
 * (src/content/vocabulary/schemas.ts); the rules that read the other
 * records are the vocabulary's (`validate.ts`, through `vocabulary.ts`).
 */

/** At most this many schema issues per item, so one broken chart cannot flood a list. */
const MAX_ISSUES = 5;

/**
 * Each kind's body schema at the level `schemaVersionOf` reports. In
 * `legacy` mode a song is held to v1 here and to level 0 after it (below),
 * and a globe event to nothing, as today's server; otherwise a song is held
 * to the latest level (v2) and a globe event to its v2 body. In repo mode a
 * chord progression is held to the library's own type as well, since the
 * save is written into that typed file (progressionSchema.ts); the
 * contract has no schema for it, so the other modes take any body.
 */
const schemaFor = (
  kind: string,
  mode: ContentMockMode,
): ZodTypeAny | undefined => {
  if (kind === 'song')
    return mode === 'legacy' ? songBodySchemaV1 : songBodySchema;
  if (kind === 'globe_city')
    return mode === 'legacy' ? citySchema : recordBodySchemas.globe_city;
  if (mode === 'legacy') return undefined;
  if (kind === 'globe_event') return recordBodySchemas.globe_event;
  if (kind === 'chord_progression')
    return mode === 'repo' ? chordProgressionBodySchema : undefined;
  if (isVocabularyKind(kind)) return RECORD_SCHEMAS[kind];
  if (isInstrumentContentKind(kind)) return INSTRUMENT_BODY_SCHEMAS[kind];
  return (recordBodySchemas as Record<string, ZodTypeAny>)[kind];
};

const formatPath = (path: (string | number)[]) =>
  path.reduce<string>(
    (out, key) =>
      typeof key === 'number' ? `${out}[${key}]` : out ? `${out}.${key}` : key,
    '',
  );

/** Graph target kind → the content kind that holds it. */
const TARGET_KIND: Record<string, MockKind> = {
  artist: 'artist',
  place: 'globe_city',
  studio: 'studio',
  label: 'label',
  song: 'song',
  release: 'release',
};

/**
 * The entries the reference rows apply to (contract, priority 7: the rows are
 * exclusive). `contentRefs[].globeRegion` targets `place` but holds a region
 * id, so the contract leaves it unchecked in this draft. Display text read
 * through a code table (`resolvedBy`) is never checked, whatever it targets.
 */
const CHECKED_REF_PATHS: readonly RefPath[] = REF_PATHS.filter(
  (entry) =>
    !entry.legacy &&
    !entry.resolvedBy &&
    !entry.vocab &&
    !entry.code &&
    entry.target in TARGET_KIND &&
    entry.path !== 'contentRefs[].globeRegion',
);

const checkedRefPaths = (kind: string): RefPath[] =>
  CHECKED_REF_PATHS.filter((entry) => entry.kind === kind);

/**
 * The checked entries whose values name an item of `kind`: what
 * `DELETE /items/:id` scans every other item for before it lets that item
 * go (contract priority 7, "Delete": 409 `REFERENCED`). The same entries
 * the reference checks read, so whatever a check would call dangling once
 * the item is gone is what stops the delete.
 */
export const refPathsTargeting = (kind: MockKind): RefPath[] =>
  CHECKED_REF_PATHS.filter((entry) => TARGET_KIND[entry.target] === kind);

/**
 * Every value at a REF_PATHS path, with its concrete path:
 * `credits[].artistGlobeId` → `credits[2].artistGlobeId`.
 */
export function valuesAt(
  body: unknown,
  path: string,
): { path: string; value: unknown }[] {
  const out: { path: string; value: unknown }[] = [];
  const walk = (node: unknown, segments: string[], prefix: string) => {
    if (segments.length === 0) {
      out.push({ path: prefix, value: node });
      return;
    }
    const [head, ...rest] = segments;
    const many = head.endsWith('[]');
    const key = many ? head.slice(0, -2) : head;
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const child = (node as Body)[key];
    if (child === undefined || child === null) return;
    const here = prefix ? `${prefix}.${key}` : key;
    if (!many) return walk(child, rest, here);
    if (Array.isArray(child))
      child.forEach((element, index) =>
        walk(element, rest, `${here}[${index}]`),
      );
  };
  walk(body, path.split('.'), '');
  return out;
}

/** What the validator needs to know about the rest of the store. */
export interface RefLookup {
  /** The target's status among working items, or null when there is none. */
  statusOf(kind: MockKind, slug: string): string | null;
  /** Whether the target is in its kind's live release. */
  isLive(kind: MockKind, slug: string): boolean;
  isServed(kind: MockKind): boolean;
  isAuthoritative(kind: MockKind): boolean;
}

export function createValidator(mode: ContentMockMode) {
  // Bodies are never mutated in place, so a body object's schema problems are
  // fixed for its lifetime. /validate runs on every list page load; without
  // this it would re-parse 638 charts each time.
  const schemaCache = new WeakMap<object, ValidationProblem[]>();

  /** INVALID_BODY from the kind's generated schema, where it has one. */
  const schemaProblems = (
    kind: string,
    slug: string,
    body: Body,
  ): ValidationProblem[] => {
    const cached = schemaCache.get(body);
    if (cached) return cached.map((problem) => ({ ...problem, slug }));

    const problems: ValidationProblem[] = [];
    const schema = schemaFor(kind, mode);
    if (schema) {
      const result = schema.safeParse(body);
      if (!result.success) {
        // One problem per item, like today's API: a list keys its rows on
        // (code, slug), and one broken chart is one thing to fix.
        const issues = result.error.issues;
        const details = issues.slice(0, MAX_ISSUES).map((issue) => {
          const path = formatPath(issue.path);
          return path ? `${path}: ${issue.message}` : issue.message;
        });
        if (issues.length > MAX_ISSUES)
          details.push(`and ${issues.length - MAX_ISSUES} more`);
        const path = formatPath(issues[0].path);
        problems.push({
          code: 'INVALID_BODY',
          slug,
          detail: details.join('; '),
          severity: 'error',
          ...(path ? { path } : {}),
        });
      }
    }
    if (kind === 'song' && mode === 'legacy' && problems.length === 0) {
      // Today's server runs song schema level 0, which refuses keys v1
      // accepts. Worded as it words them, since that text is what the
      // console shows.
      const issues = level0Issues(body);
      if (issues.length > 0) {
        const details = issues.slice(0, MAX_ISSUES).map(formatLevel0Issue);
        if (issues.length > MAX_ISSUES)
          details.push(`and ${issues.length - MAX_ISSUES} more`);
        const first = issues[0];
        const at = first.at.replace(/\.(\d+)/g, '[$1]');
        problems.push({
          code: 'INVALID_BODY',
          slug,
          detail: details.join('; '),
          severity: 'error',
          path: at ? `${at}.${first.keys[0]}` : first.keys[0],
        });
      }
    }
    schemaCache.set(body, problems);
    return problems;
  };

  /** SLUG_ID_MISMATCH, and INVALID_BODY for an identity off its pattern. */
  const identityProblems = (
    kind: string,
    slug: string,
    body: Body,
  ): ValidationProblem[] => {
    const field = identityOf(kind);
    const value = identityValue(kind, body);
    if (value !== slug) {
      return [
        {
          code: 'SLUG_ID_MISMATCH',
          slug,
          detail: `The slug "${slug}" must equal body.${field} ("${value}").`,
          severity: 'error',
          path: field,
        },
      ];
    }
    // Today's server enforces no pattern; the contract adds them.
    const pattern = mode === 'legacy' ? null : slugPatternOf(kind);
    if (pattern && !pattern.test(value)) {
      return [
        {
          code: 'INVALID_BODY',
          slug,
          detail: `body.${field} "${value}" does not match ${pattern.source}.`,
          severity: 'error',
          path: field,
        },
      ];
    }
    return [];
  };

  /**
   * Reference checks. On PUT (priority 4): the pattern check rejects, and a
   * target that is missing or not published is only a warning, so inline
   * creation works in any order. On /validate and publish (priority 7): a
   * published item pointing at something outside its kind's live release is
   * DANGLING_REFERENCE when that kind is authoritative.
   */
  const refProblems = (
    kind: string,
    slug: string,
    body: Body,
    lookup: RefLookup,
    phase:
      | { on: 'put' }
      | {
          on: 'publish';
          itemStatus: string;
          /** Slugs in the release being built, which count as published. */
          building?: { kind: string; slugs: Set<string> };
        },
  ): ValidationProblem[] => {
    // Today's server has no reference checks at all.
    if (mode === 'legacy') return [];
    if (phase.on === 'publish' && phase.itemStatus === 'archived') return [];

    const problems: ValidationProblem[] = [];
    for (const entry of checkedRefPaths(kind)) {
      const targetKind = TARGET_KIND[entry.target];
      const pattern = slugPatternOf(targetKind);
      for (const { path, value } of valuesAt(body, entry.path)) {
        if (typeof value !== 'string' || (pattern && !pattern.test(value))) {
          // No `target`: a value that is not a slug names nothing, and
          // `<kind>:<value>` would read as a reference to something.
          problems.push({
            code: 'INVALID_REFERENCE',
            slug,
            detail: `${path} must be a ${entry.target} slug${
              pattern ? ` matching ${pattern.source}` : ''
            }; got ${JSON.stringify(value)}.`,
            severity: 'error',
            path,
          });
          continue;
        }
        const target = `${entry.target}:${value}`;
        if (!lookup.isServed(targetKind)) continue;

        if (phase.on === 'put') {
          const status = lookup.statusOf(targetKind, value);
          if (status === 'published') continue;
          problems.push({
            code: 'UNPUBLISHED_REFERENCE',
            slug,
            detail:
              status === null
                ? `No ${entry.target} "${value}" exists yet.`
                : `The ${entry.target} "${value}" is ${
                    status === 'pending' ? 'a pending proposal' : `a ${status}`
                  }, not published.`,
            severity: 'warning',
            path,
            target,
          });
          continue;
        }

        const inBuild =
          phase.building?.kind === targetKind &&
          phase.building.slugs.has(value);
        if (inBuild || lookup.isLive(targetKind, value)) continue;
        const dangling =
          phase.itemStatus === 'published' &&
          lookup.isAuthoritative(targetKind);
        problems.push({
          code: dangling ? 'DANGLING_REFERENCE' : 'UNPUBLISHED_REFERENCE',
          slug,
          detail: `${path} names ${target}, which is not in the live ${targetKind} release.`,
          severity: dangling ? 'error' : 'warning',
          path,
          target,
        });
      }
    }
    return problems;
  };

  return { schemaProblems, identityProblems, refProblems };
}

export type MockValidator = ReturnType<typeof createValidator>;

export const isError = (problem: ValidationProblem) =>
  (problem.severity ?? 'error') === 'error';
