import { z } from 'zod';
import { SLUG_PATTERN } from '@/content/graph/ids';

/**
 * The `music_literacy` content kind's body: one Music Literacy lesson (Part 1
 * is one item), as the console's Music Literacy editor writes it into
 * src/curriculum/data/musicLiteracy/. Strict, like the instrument kinds.
 *
 * Every note is a scale degree of the lesson's key, so a lesson written in C
 * plays in any key. A step is call and response: the words (the "teacher's"
 * line, each syllable on a note), then the call figure, then the student
 * plays the response back. Rests are the gaps between notes; a segment's
 * `bars` says how long it lasts, trailing rests included.
 *
 * The words may open with a pickup (an anacrusis): syllables sung at the
 * end of the count-in, leading into the words' first downbeat. They are
 * stored with negative ticks, back from that downbeat, and `pickup` says
 * how long the pickup is. A step with a pickup counts in at least a bar,
 * whatever the lesson's `countInBars`, so the pickup always has a count-in
 * bar to sit in.
 *
 * The sung line is `words`, never "lyrics": the song kind forbids lyrics by
 * design, and this line is original teaching text, not a song's.
 */

const int = z.number().int();
const status = z.enum(['draft', 'live']);

/** Ticks per quarter note, as everywhere in the curriculum. */
export const LITERACY_TPQ = 480;

/** The scale degrees a figure may use, flats before their naturals. */
export const LITERACY_DEGREES = [
  '1',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  '#4',
  '5',
  'b6',
  '6',
  'b7',
  '7',
] as const;

/** The keys a lesson may be in, spelled as the Studio's key colours spell them. */
export const LITERACY_TONICS = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

export const literacyDegreeSchema = z.enum(LITERACY_DEGREES);

/** A note of a figure, timed from the start of its segment. */
export const literacyNoteSchema = z
  .object({
    tick: int.min(0),
    duration: int.min(1),
    degree: literacyDegreeSchema,
    /** Octaves from the tonic's own (left out: 0). */
    octave: int.min(-2).max(2).optional(),
  })
  .strict();

/**
 * A sung word or syllable, on its note. A pickup's syllables come before
 * the words' downbeat, so their ticks are negative (the body checks them
 * against the pickup).
 */
export const literacyWordSchema = literacyNoteSchema
  .extend({ tick: int, text: z.string().min(1) })
  .strict();

/** A figure: its notes and how many bars it lasts, trailing rests included. */
export const literacyFigureSchema = z
  .object({
    bars: int.min(1).max(8),
    notes: z.array(literacyNoteSchema).min(1),
  })
  .strict();

/**
 * The shortest pickup, an eighth, and how much shorter than a bar the
 * longest must be.
 */
export const PICKUP_STEP = LITERACY_TPQ / 2;

export const literacyWordsSchema = z
  .object({
    bars: int.min(1).max(8),
    /**
     * A pickup's length in ticks, sung before the words' downbeat at the
     * end of the count-in: an eighth up to a bar less an eighth. Left out,
     * none: the words start on their downbeat.
     */
    pickup: int.min(PICKUP_STEP).optional(),
    notes: z.array(literacyWordSchema).min(1),
  })
  .strict();

export const literacyStepSchema = z
  .object({
    /** Unique within the lesson; progress keys off it, so keep it when editing. */
    tag: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    title: z.string().min(1),
    direction: z.string().optional(),
    words: literacyWordsSchema,
    call: literacyFigureSchema,
    /** What the student plays back. Left out, it echoes the call. */
    response: literacyFigureSchema.optional(),
    /** Overrides the lesson's tempo for this step. */
    tempo: z.number().positive().optional(),
    /** Percent needed to pass (left out: the house in-time mark). */
    passMark: z.number().min(0).max(100).optional(),
  })
  .strict();

export const musicLiteracyBodySchema = z
  .object({
    id: z.string().regex(SLUG_PATTERN.part),
    name: z.string().min(1),
    description: z.string().optional(),
    status,
    /** Its place in the series (Part 1 = 1). */
    part: int.min(1),
    order: int.optional(),
    key: z
      .object({
        tonic: z.enum(LITERACY_TONICS),
        mode: z.enum(['major', 'minor']),
      })
      .strict(),
    tempo: z.number().positive(),
    timeSignature: z.tuple([int.min(1), int.min(1)]),
    countInBars: int.min(0).max(2),
    steps: z.array(literacyStepSchema).min(1),
  })
  .strict()
  .superRefine((body, ctx) => {
    const [beats, unit] = body.timeSignature;
    const barTicks = (beats * LITERACY_TPQ * 4) / unit;
    const tags = new Set<string>();
    body.steps.forEach((step, s) => {
      if (tags.has(step.tag))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', s, 'tag'],
          message: `Step tag "${step.tag}" is used twice`,
        });
      tags.add(step.tag);
      const pickup = step.words.pickup ?? 0;
      if (pickup > barTicks - PICKUP_STEP)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', s, 'words', 'pickup'],
          message: 'A pickup must be at least an eighth shorter than a bar',
        });
      step.words.notes.forEach((note, n) => {
        if (note.tick < -pickup)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['steps', s, 'words', 'notes', n],
            message: pickup
              ? 'A syllable starts before the pickup: make the pickup longer'
              : 'A syllable starts before the words do: give them a pickup',
          });
      });
      const segments = [
        ['words', step.words],
        ['call', step.call],
        ['response', step.response],
      ] as const;
      for (const [name, segment] of segments) {
        if (!segment) continue;
        const length = segment.bars * barTicks;
        segment.notes.forEach((note, n) => {
          if (note.tick + note.duration > length)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['steps', s, name, 'notes', n],
              message: `A ${name} note runs past its ${segment.bars} bar(s)`,
            });
        });
      }
    });
  });

export type LiteracyDegree = z.infer<typeof literacyDegreeSchema>;
export type LiteracyTonic = (typeof LITERACY_TONICS)[number];
export type LiteracyNote = z.infer<typeof literacyNoteSchema>;
export type LiteracyWord = z.infer<typeof literacyWordSchema>;
export type LiteracyFigure = z.infer<typeof literacyFigureSchema>;
export type LiteracyWords = z.infer<typeof literacyWordsSchema>;
export type LiteracyStep = z.infer<typeof literacyStepSchema>;
export type MusicLiteracyLesson = z.infer<typeof musicLiteracyBodySchema>;
