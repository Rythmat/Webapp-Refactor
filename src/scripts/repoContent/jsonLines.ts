import { z } from 'zod';
import {
  artistRecordSchema,
  labelRecordSchema,
  placeRecordSchema,
  releaseRecordSchema,
  studioRecordSchema,
} from '@/scripts/apiContract/recordBodySchemas';

/**
 * One record per line: how repo mode stores the content that has no
 * TypeScript home. That is releases, studios and labels, the places the
 * globe draws no pin for, and every artist field the globe roster does not
 * hold, in `src/content/data/*.json`.
 *
 * A file is `[`, then one `JSON.stringify(record)` per line, then `]`. The
 * records are sorted by identity, and each record's keys are put in the
 * order its kind's schema declares them, recursing into nested objects and
 * arrays of objects (`born`, `externalIds`, `members`, `influencedBy`). So
 * the same records always make the same bytes, whatever order they were
 * built or edited in: a one-field edit is a one-line diff, and a new record
 * is one added line.
 *
 * Pure text in and text out, with no file system and nothing from Vite, so
 * the repo store and the bulk import (`npx tsx`) share it. It orders and
 * checks shape; whether a body is valid is the content schemas' job, which
 * the store runs before anything reaches a file.
 */

/** A record as a JSON request could carry it. */
export type JsonRecord = Record<string, unknown>;

/** How one kind's file is laid out. */
export interface JsonLinesLayout {
  /** The kind's body schema. The order it declares its keys in is the canonical order. */
  schema: z.ZodTypeAny;
  /** The field that identifies a record, which the file is sorted by. */
  identity: string;
}

/**
 * The layouts of the kinds stored as JSON lines.
 *
 * `artist` rows follow the whole record's schema even though a roster
 * artist's row holds no `name` or `aliases` (those stay in
 * `artistRegistry.ts`; see src/content/records/compose.ts): ordering only
 * looks at the keys a row has. `globe_city` is the `pin: false` places,
 * which keep the globe's `id` as their identity.
 */
export const JSON_LINES_LAYOUTS = {
  artist: { schema: artistRecordSchema, identity: 'slug' },
  release: { schema: releaseRecordSchema, identity: 'slug' },
  studio: { schema: studioRecordSchema, identity: 'slug' },
  label: { schema: labelRecordSchema, identity: 'slug' },
  globe_city: { schema: placeRecordSchema, identity: 'id' },
} as const satisfies Record<string, JsonLinesLayout>;

export type JsonLinesKind = keyof typeof JSON_LINES_LAYOUTS;

/** A file or a record that cannot be read or written as JSON lines. */
export class JsonLinesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonLinesError';
  }
}

const isPlainObject = (value: unknown): value is JsonRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const hasOwn = (object: object, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);

/**
 * Code-unit order, not `localeCompare`: collation depends on the machine's
 * ICU data and locale, and the bytes of a committed file must not.
 */
const byCodeUnit = (a: string, b: string): number => {
  if (a < b) return -1;
  return a > b ? 1 : 0;
};

/**
 * The schema underneath the wrappers that do not change a value's shape:
 * optional, nullable, default, refinements, readonly and lazy.
 */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable)
    return unwrap(schema.unwrap());
  if (schema instanceof z.ZodDefault) return unwrap(schema.removeDefault());
  if (schema instanceof z.ZodEffects) return unwrap(schema.innerType());
  if (schema instanceof z.ZodReadonly) return unwrap(schema.unwrap());
  if (schema instanceof z.ZodLazy) return unwrap(schema.schema);
  return schema;
}

/** The schema of the `index`th element of an array or tuple, when there is one. */
function elementSchema(
  schema: z.ZodTypeAny | undefined,
  index: number,
): z.ZodTypeAny | undefined {
  if (schema instanceof z.ZodArray) return schema.element;
  if (schema instanceof z.ZodTuple)
    return schema.items[index] ?? schema._def.rest ?? undefined;
  return undefined;
}

const pathTo = (at: string, key: string) => (at ? `${at}.${key}` : key);

function canonical(
  value: unknown,
  schema: z.ZodTypeAny | undefined,
  at: string,
): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new JsonLinesError(`'${at}' is ${value}, which JSON cannot hold`);
    return value;
  }
  const shape = schema && unwrap(schema);
  if (Array.isArray(value))
    return value.map((element: unknown, index) => {
      // JSON.stringify would write a hole or an undefined element as null.
      if (element === undefined)
        throw new JsonLinesError(`'${at}[${index}]' is undefined`);
      return canonical(element, elementSchema(shape, index), `${at}[${index}]`);
    });
  if (!isPlainObject(value))
    throw new JsonLinesError(`'${at}' is not a JSON value`);

  // An undefined field is not there, as it would not be after a JSON round
  // trip (the mock's `plain()`).
  const keys = Object.keys(value).filter((key) => value[key] !== undefined);
  if (shape instanceof z.ZodObject) {
    const fields = shape.shape as Record<string, z.ZodTypeAny>;
    const present = new Set(keys);
    const unknown = keys.filter((key) => !hasOwn(fields, key));
    if (unknown.length)
      throw new JsonLinesError(
        `${unknown.map((key) => `'${pathTo(at, key)}'`).join(', ')} ${
          unknown.length === 1 ? 'is not a field' : 'are not fields'
        } this kind's schema declares`,
      );
    const out: JsonRecord = {};
    for (const key of Object.keys(fields))
      if (present.has(key))
        out[key] = canonical(value[key], fields[key], pathTo(at, key));
    return out;
  }
  // A shape the schema does not spell out key by key (a record map, a union,
  // or no schema at all): sorted keys keep it deterministic all the same.
  const values = shape instanceof z.ZodRecord ? shape.valueSchema : undefined;
  const out: JsonRecord = {};
  for (const key of [...keys].sort(byCodeUnit))
    out[key] = canonical(value[key], values, pathTo(at, key));
  return out;
}

/**
 * `record` with its keys in the order `schema` declares them, at every
 * depth, and its undefined fields dropped. Arrays keep their order, which
 * means something (billing order, a member list).
 *
 * Refuses, with the path, a key the schema does not declare (the body
 * schemas are strict, so it could never be saved), a number JSON cannot
 * hold, an undefined array element and anything that is not plain JSON.
 */
export function canonicalRecord(
  record: object,
  schema: z.ZodTypeAny,
): JsonRecord {
  if (!isPlainObject(record))
    throw new JsonLinesError('a record must be a plain object');
  return canonical(record, schema, '') as JsonRecord;
}

/** The record's identity, checked to be a non-empty string. */
function identityOf(
  record: JsonRecord,
  layout: JsonLinesLayout,
  where: string,
) {
  const id = record[layout.identity];
  if (typeof id !== 'string' || id === '')
    throw new JsonLinesError(
      `${where} has no ${layout.identity} (a non-empty string identifies each record)`,
    );
  return id;
}

function refuseDuplicates(ids: readonly string[], layout: JsonLinesLayout) {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) twice.add(id);
    seen.add(id);
  }
  if (twice.size)
    throw new JsonLinesError(
      `more than one record has the ${layout.identity} ${[...twice]
        .sort(byCodeUnit)
        .map((id) => `'${id}'`)
        .join(', ')}`,
    );
}

/**
 * The file text for `records`: `[`, one canonical record per line sorted by
 * identity, `]`, and a final newline; `[]` and a newline when there are
 * none. The same records give the same bytes, in any order and with their
 * keys in any order.
 */
export function formatJsonLines(
  records: readonly object[],
  layout: JsonLinesLayout,
): string {
  const rows = records.map((record, index) => {
    if (!isPlainObject(record))
      throw new JsonLinesError(`record ${index + 1} is not a plain object`);
    const id = identityOf(record, layout, `record ${index + 1}`);
    try {
      return {
        id,
        line: JSON.stringify(canonicalRecord(record, layout.schema)),
      };
    } catch (error) {
      if (error instanceof JsonLinesError)
        throw new JsonLinesError(
          `${layout.identity} '${id}': ${error.message}`,
        );
      throw error;
    }
  });
  refuseDuplicates(
    rows.map((row) => row.id),
    layout,
  );
  if (!rows.length) return '[]\n';
  rows.sort((a, b) => byCodeUnit(a.id, b.id));
  return `[\n${rows.map((row) => `  ${row.line}`).join(',\n')}\n]\n`;
}

/**
 * The records in a JSON-lines file, as the file has them (key order and
 * record order included; `formatJsonLines` restores the canonical ones).
 *
 * Any JSON array of objects reads, so a hand edit that broke the one-per-line
 * layout still loads. Refused, naming `source`: text that is not JSON, a
 * value that is not an array of objects, a record without its identity and
 * two records with the same identity.
 */
export function parseJsonLines(
  text: string,
  layout: JsonLinesLayout,
  source = 'the file',
): JsonRecord[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new JsonLinesError(
      `${source} is not JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!Array.isArray(value))
    throw new JsonLinesError(`${source} is not a JSON array`);
  const ids = value.map((record: unknown, index) => {
    if (!isPlainObject(record))
      throw new JsonLinesError(
        `${source}: record ${index + 1} is not an object`,
      );
    return identityOf(record, layout, `${source}: record ${index + 1}`);
  });
  try {
    refuseDuplicates(ids, layout);
  } catch (error) {
    if (error instanceof JsonLinesError)
      throw new JsonLinesError(`${source}: ${error.message}`);
    throw error;
  }
  return value as JsonRecord[];
}

/**
 * Whether `text` is exactly what `formatJsonLines` would write for the
 * records in it. A file edited by hand into another layout reads fine, but
 * its next write re-lays the whole file, so this lets a loader say so first.
 * Throws what `parseJsonLines` and `formatJsonLines` throw.
 */
export const isCanonicalJsonLines = (
  text: string,
  layout: JsonLinesLayout,
): boolean => formatJsonLines(parseJsonLines(text, layout), layout) === text;
