import { z } from 'zod';
import { SLUG_PATTERN } from '@/content/graph/ids';

/**
 * The instrument content kinds' bodies (docs/instrument-content-kinds.md):
 * `drum_groove`, `instrument_part` and `feel_profile`, as the console's Drum
 * Grooves designer and Parts Library write them. Strict, like the vocabulary
 * records: a key the type does not have is an error, not something kept.
 *
 * Hand-written rather than generated (generateRecordSchema.ts reads named
 * record interfaces; these types use inline objects and a numeric-keyed
 * map). `instrumentSchemas.test.ts` holds the TypeScript types and these to
 * each other, and every file in the repo to these.
 */

const int = z.number().int();
const velocity = int.min(1).max(127);
const meter = z.tuple([int.min(1), int.min(1)]);
const swing = z.number().min(0).max(100);
const status = z.enum(['draft', 'live']);
const kebab = (entity: 'part' | 'feel') =>
  z.string().regex(SLUG_PATTERN[entity]);

/* ── drum_groove ──────────────────────────────────────────────────────── */

export const drumGrooveHitSchema = z
  .object({
    tick: int.min(0),
    note: int.min(0).max(127),
    velocity,
    offset: int.optional(),
  })
  .strict();

export const drumGrooveBodySchema = z
  .object({
    id: z.string().regex(SLUG_PATTERN.groove),
    name: z.string().min(1),
    description: z.string().optional(),
    genre: z.string().optional(),
    style: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status,
    timeSignature: meter,
    feltBeats: int.min(1),
    bars: int.min(1),
    tempo: z.number().positive(),
    tempoUnit: z.enum(['quarter', 'dotted-quarter', 'half', 'eighth']),
    swing,
    grid: z.enum(['8n', '16n', '8t', '16t', '32n']),
    kit: z.string().min(1),
    /** Pad note (as a JSON key) → level. */
    padGains: z.record(z.string().regex(/^\d+$/), z.number().min(0)),
    humanize: z
      .object({ timing: z.number().min(0), velocity: z.number().min(0) })
      .strict(),
    hits: z.array(drumGrooveHitSchema),
  })
  .strict();

/* ── instrument_part ──────────────────────────────────────────────────── */

export const partNoteSchema = z
  .object({
    tick: int.min(0),
    duration: int.min(1),
    midi: int.min(0).max(127),
    velocity,
    hand: z.enum(['lh', 'rh']).optional(),
    string: int.min(1).optional(),
    fret: int.min(0).optional(),
    offset: int.optional(),
    grace: z.boolean().optional(),
    finger: int.min(1).max(5).optional(),
  })
  .strict();

const partSourceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('lesson'),
      genre: z.string(),
      level: int.min(1),
      section: z.string(),
      stepNumber: int,
      title: z.string().optional(),
      tag: z.string().optional(),
      variant: int.min(0).optional(),
      hands: z.enum(['both', 'rh', 'lh']).optional(),
      tickOffset: int.min(0).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('midi'),
      fileName: z.string(),
      track: z.string().optional(),
    })
    .strict(),
  z.object({ kind: z.literal('scratch') }).strict(),
]);

export const instrumentPartBodySchema = z
  .object({
    id: kebab('part'),
    name: z.string().min(1),
    description: z.string().optional(),
    instrument: z.enum(['piano', 'bass', 'guitar', 'drums']),
    role: z.enum([
      'melody',
      'comping',
      'two-hand',
      'bassline',
      'riff',
      'groove',
      'fill',
    ]),
    genre: z.string().optional(),
    style: z.string().optional(),
    level: int.min(1).max(5),
    tags: z.array(z.string()),
    status,
    key: z.object({ tonic: int.min(0).max(11), mode: z.string() }).strict(),
    timeSignature: meter,
    bars: int.min(1),
    tempo: z.number().positive(),
    swing,
    feel: kebab('feel').optional(),
    chordSymbols: z.array(z.string()).optional(),
    sound: z.string().min(1),
    notes: z.array(partNoteSchema),
    source: partSourceSchema,
  })
  .strict();

/* ── feel_profile ─────────────────────────────────────────────────────── */

export const feelProfileBodySchema = z
  .object({
    id: kebab('feel'),
    name: z.string().min(1),
    description: z.string().optional(),
    step: int.min(1),
    positions: int.min(1),
    offsets: z.array(z.number()),
    velocity: z.array(z.number().min(0)).optional(),
    source: z.string().optional(),
  })
  .strict()
  .refine((f) => f.offsets.length === f.positions, {
    message: 'offsets has one entry per position',
    path: ['offsets'],
  });

/** Each instrument kind's body schema. */
export const INSTRUMENT_BODY_SCHEMAS = {
  drum_groove: drumGrooveBodySchema,
  instrument_part: instrumentPartBodySchema,
  feel_profile: feelProfileBodySchema,
} as const;

export type InstrumentContentKind = keyof typeof INSTRUMENT_BODY_SCHEMAS;

export const INSTRUMENT_CONTENT_KINDS = Object.keys(
  INSTRUMENT_BODY_SCHEMAS,
) as InstrumentContentKind[];

export const isInstrumentContentKind = (
  kind: string,
): kind is InstrumentContentKind => kind in INSTRUMENT_BODY_SCHEMAS;
