import type { ZodTypeAny } from 'zod';

/**
 * A zod schema's structure as plain data: each node's type, an object's
 * keys and strictness, a string's regexes, a number's checks, an enum's
 * values. Two schemas with the same shape accept the same keys in the same
 * places; what a refinement's function does is not visible here, so the
 * tests that use this also run real bodies through both.
 *
 * Used to hold the API's import-free copies of a schema to the app's own,
 * where the app's imports keep the API from copying it as it is.
 */
export function schemaShape(schema: ZodTypeAny): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = schema._def as any;
  switch (def.typeName) {
    case 'ZodObject':
      return {
        object: Object.fromEntries(
          Object.entries(def.shape() as Record<string, ZodTypeAny>).map(
            ([key, value]) => [key, schemaShape(value)],
          ),
        ),
        unknownKeys: def.unknownKeys,
      };
    case 'ZodOptional':
      return { optional: schemaShape(def.innerType) };
    case 'ZodNullable':
      return { nullable: schemaShape(def.innerType) };
    case 'ZodArray':
      return { array: schemaShape(def.type) };
    case 'ZodEffects':
      return { effect: def.effect.type, of: schemaShape(def.schema) };
    case 'ZodEnum':
      return { enum: [...def.values] };
    case 'ZodLiteral':
      return { literal: def.value };
    case 'ZodString':
      return {
        string: (def.checks as { kind: string; regex?: RegExp }[]).map(
          (check) =>
            check.regex ? `${check.kind}:${check.regex.source}` : check.kind,
        ),
      };
    case 'ZodNumber':
      return {
        number: (
          def.checks as { kind: string; value?: number; inclusive?: boolean }[]
        ).map((check) =>
          check.value === undefined
            ? check.kind
            : `${check.kind}:${check.value}:${check.inclusive}`,
        ),
      };
    case 'ZodBoolean':
      return 'boolean';
    default:
      throw new Error(`schemaShape does not read ${def.typeName}`);
  }
}
