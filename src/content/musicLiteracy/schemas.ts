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
 *
 * PART 2 (docs/music-literacy-content-kind.md, "Part 2")
 * Everything above still means what it did: a file without the fields below
 * is a Part 1 lesson, read exactly as before. Part 2 adds:
 *
 *   keyChoice  'student': the student picks the key (a choose-key step) and
 *              the mode (a choose-mode step); `key` is then the default and
 *              the editor's preview key. Choose steps alone in the first
 *              section make it the lesson's gate (`lessonGateSection`):
 *              chosen once there, the key and mode hold for every step
 *              after, and the gate is not a module.
 *   numbering  'scale': '3' is the 3rd of the mode, so minor's 3, 6 and 7
 *              are ♭3, ♭6 and ♭7 (natural minor). Left out, 'chromatic':
 *              '3' is always the major 3rd, as Part 1 writes it.
 *   modules    the lesson's sections as modules (all but the gate), each
 *              by its section's title, with a goal and the round a student
 *              is offered once they pass it: 'create' (their own call,
 *              played twice), 'challenge' (play ALL the notes) or 'none'. A
 *              lesson with no sections is one module (Part 1).
 *   goal       the lesson's one directive, shown at its start.
 *   passes     the round of a module that names none: the create round
 *              when `create` is on, else the challenge when `challenge` is
 *              (on by default: Part 1), else none. A step's own `passes`
 *              opts it out of its module's round.
 *   step kinds `kind` picks one: 'echo' (call and response, the default, so
 *              Part 1's steps need none), 'chooseKey', 'chooseMode',
 *              'chooseChords' and 'replay'. An echo's call may be a chord
 *              figure: a bar of chords each, in one repeated rhythm.
 *   section    an optional label grouping steps ("Choose a Color").
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

/**
 * The plain degrees 1–7: all that scale numbering writes (the mode supplies
 * the flats), and a chord's root, as a degree of the mode.
 */
export const LITERACY_SCALE_DEGREES = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
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

export const LITERACY_MODES = ['major', 'minor'] as const;

/** How a lesson's degrees read: Part 1's chromatic labels, or the mode's. */
export const LITERACY_NUMBERINGS = ['chromatic', 'scale'] as const;

/** A chord figure's chords: triads, or the same chords with their 7ths. */
export const LITERACY_HARMONIES = ['triads', 'sevenths'] as const;

/** A step's kinds; an echo (call and response) is the default. */
export const LITERACY_STEP_KINDS = [
  'echo',
  'chooseKey',
  'chooseMode',
  'chooseChords',
  'replay',
] as const;

/** A bar of a choose-chords template: the 1 chord, or one the student picks. */
export const LITERACY_TEMPLATE_BARS = ['1', 'X'] as const;

/**
 * A bar of a chord figure: a chord by its root's scale degree, or X, the
 * chord the student chose in the figure's `progression`.
 */
export const LITERACY_CHORD_BARS = [...LITERACY_SCALE_DEGREES, 'X'] as const;

/**
 * The chord each mode leaves out, being diminished: major's 7 and minor's 2.
 * Part 2 uses the natural modes' other six chords.
 */
export const LITERACY_DIMINISHED_DEGREE = {
  major: '7',
  minor: '2',
} as const satisfies Record<
  (typeof LITERACY_MODES)[number],
  (typeof LITERACY_SCALE_DEGREES)[number]
>;

/** How many chords the student may pick an X from, in either mode. */
export const LITERACY_PALETTE_SIZE = 5;

export const literacyDegreeSchema = z.enum(LITERACY_DEGREES);
export const literacyModeSchema = z.enum(LITERACY_MODES);
export const literacyHarmonySchema = z.enum(LITERACY_HARMONIES);

/** A step's tag, and the name a progression is saved under. */
const tagSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

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
 * A chord figure, an echo's call in chords: one chord a bar, each struck in
 * the same rhythm. The chords are `chords`, a bar each, or the progression
 * the student saved under `progression`; `chords` with an X takes the X
 * from that progression (one whose X's are all one chord). Root position,
 * in the student's key and mode, voiced together in the treble staff
 * (engine/musicLiteracy/chords.ts `voiceChords`).
 */
export const literacyChordFigureSchema = z
  .object({
    /** Each bar's chord: '1'–'7' of the mode, or 'X' from `progression`. */
    chords: z.array(z.enum(LITERACY_CHORD_BARS)).min(1).max(8).optional(),
    /** A progression a choose-chords step before this one saves. */
    progression: tagSchema.optional(),
    /**
     * Every bar's rhythm, in ticks: the chord is struck at each, back to
     * back from the bar's downbeat; what's left of the bar is a rest.
     */
    rhythm: z.array(int.min(1)).min(1),
    harmony: literacyHarmonySchema,
  })
  .strict();

/**
 * An echo's call: a melodic figure (Part 1's shape, no `harmony`) or a chord
 * figure (it has one), told apart by `harmony`.
 */
export const literacyCallSchema = z.discriminatedUnion('harmony', [
  literacyFigureSchema.extend({ harmony: z.undefined() }).strict(),
  literacyChordFigureSchema,
]);

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

/**
 * The lesson's default round, for a module that names none (`modules`).
 * Left out, the challenge is on and the create pass off: Part 1's.
 */
export const literacyLessonPassesSchema = z
  .object({
    /**
     * "Want a challenge just for fun?" The student plays every note along
     * with Atlas, the words and the call too, then the response. Melodic
     * calls only.
     */
    challenge: z.boolean().optional(),
    /**
     * "Now go again and create your own": the student plays their own call
     * on the step's material, then repeats it exactly. On, it is the round
     * (over the challenge).
     */
    create: z.boolean().optional(),
  })
  .strict();

/**
 * A step's own passes: `false` leaves it out of its module's round (a
 * `true` adds nothing: the module picks the round).
 */
export const literacyStepPassesSchema = literacyLessonPassesSchema
  .extend({
    /** The create pass's call, in bars (left out: the call's). Melodies only. */
    createBars: int.min(1).max(8).optional(),
  })
  .strict();

/**
 * What a student may do once they pass a module, going through its steps
 * a second time:
 *
 *   create     each step's create pass: their own call on the step's notes
 *              or chords, then their repeat of it (Part 2).
 *   challenge  each melody's challenge: play ALL the notes along with
 *              Atlas (Part 1, "just for fun").
 *   none       nothing more.
 */
export const LITERACY_ROUNDS = ['create', 'challenge', 'none'] as const;

/**
 * A module: the steps of one section (by its title), with its goal and its
 * round. Every field but the title may be left out: the goal then follows
 * the round and what the steps play, the round the lesson's `passes`.
 */
export const literacyModuleSchema = z
  .object({
    /** The section it is: the `section` of its steps. */
    title: z.string().min(1),
    /** What to make, said on the module's card ("Create a melody…"). */
    goal: z.string().min(1).optional(),
    round: z.enum(LITERACY_ROUNDS).optional(),
  })
  .strict();

/** What every kind of step has. */
const stepFields = {
  /** Unique within the lesson; progress keys off it, so keep it when editing. */
  tag: tagSchema,
  /** The part of the lesson it's in ("Choose a Color"): a label, for grouping. */
  section: z.string().min(1).optional(),
  title: z.string().min(1),
  direction: z.string().optional(),
  /** Overrides the lesson's tempo for this step (whatever it plays). */
  tempo: z.number().positive().optional(),
};

/** Call and response: the default kind, and Part 1's every step. */
export const literacyEchoStepSchema = z
  .object({
    kind: z.literal('echo').optional(),
    ...stepFields,
    /** The teacher's sung line. Left out, none: the call comes in first. */
    words: literacyWordsSchema.optional(),
    call: literacyCallSchema,
    /** What the student plays back. Left out, it echoes the call. */
    response: literacyFigureSchema.optional(),
    passes: literacyStepPassesSchema.optional(),
    /** Percent needed to pass (left out: the house in-time mark). */
    passMark: z.number().min(0).max(100).optional(),
  })
  .strict();

/** The student picks the key center on the circle of fifths. */
export const literacyChooseKeyStepSchema = z
  .object({ kind: z.literal('chooseKey'), ...stepFields })
  .strict();

/** The student picks major or minor. */
export const literacyChooseModeStepSchema = z
  .object({ kind: z.literal('chooseMode'), ...stepFields })
  .strict();

/**
 * The student fills a template's X bars from the mode's palette, with
 * `distinct` different chords, and the progression is saved under
 * `saveAs` for the steps after it.
 */
export const literacyChooseChordsStepSchema = z
  .object({
    kind: z.literal('chooseChords'),
    ...stepFields,
    template: z.array(z.enum(LITERACY_TEMPLATE_BARS)).min(1).max(8),
    /** How many different chords the X bars use (the 1 not counted). */
    distinct: int.min(1),
    /** What the palette offers: "4 maj", or "4 maj7". */
    harmony: literacyHarmonySchema,
    saveAs: tagSchema,
  })
  .strict();

/** Atlas plays back a progression the student saved, in each harmony. */
export const literacyReplayStepSchema = z
  .object({
    kind: z.literal('replay'),
    ...stepFields,
    progression: tagSchema,
    /** Played through once in each (left out: triads, then 7ths). */
    harmonies: z.array(literacyHarmonySchema).min(1).optional(),
    /** Every bar's rhythm, as a chord figure's (left out: a chord a bar). */
    rhythm: z.array(int.min(1)).min(1).optional(),
  })
  .strict();

export const literacyStepSchema = z.discriminatedUnion('kind', [
  literacyEchoStepSchema,
  literacyChooseKeyStepSchema,
  literacyChooseModeStepSchema,
  literacyChooseChordsStepSchema,
  literacyReplayStepSchema,
]);

type Ctx = z.RefinementCtx;
type Path = (string | number)[];
const issue = (ctx: Ctx, path: Path, message: string) =>
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

const isScaleDegree = (degree: string) =>
  (LITERACY_SCALE_DEGREES as readonly string[]).includes(degree);

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

export const musicLiteracyBodySchema = z
  .object({
    id: z.string().regex(SLUG_PATTERN.part),
    name: z.string().min(1),
    description: z.string().optional(),
    status,
    /** Its place in the series (Part 1 = 1). */
    part: int.min(1),
    order: int.optional(),
    /** The lesson's key; with `keyChoice: 'student'`, the default and preview. */
    key: z
      .object({
        tonic: z.enum(LITERACY_TONICS),
        mode: literacyModeSchema,
      })
      .strict(),
    /** Who picks the key: the lesson (left out), or the student. */
    keyChoice: z.enum(['lesson', 'student']).optional(),
    /** How degrees read (left out: chromatic, Part 1's). */
    numbering: z.enum(LITERACY_NUMBERINGS).optional(),
    passes: literacyLessonPassesSchema.optional(),
    /** The lesson's one directive, shown at its start. */
    goal: z.string().min(1).optional(),
    /** Its sections' goals and rounds, each by its title. */
    modules: z.array(literacyModuleSchema).optional(),
    tempo: z.number().positive(),
    timeSignature: z.tuple([int.min(1), int.min(1)]),
    countInBars: int.min(0).max(2),
    steps: z.array(literacyStepSchema).min(1),
  })
  .strict()
  .superRefine((body, ctx) => {
    const [beats, unit] = body.timeSignature;
    const barTicks = (beats * LITERACY_TPQ * 4) / unit;
    const studentKey = body.keyChoice === 'student';
    const scale = body.numbering === 'scale';
    // A fixed chord has to be in the mode the student will hear it in.
    const modes = studentKey ? LITERACY_MODES : [body.key.mode];
    const tags = new Set<string>();
    /** Progressions saved so far, by name: how many different X's each has. */
    const saved = new Map<string, { distinct: number }>();
    /** Each step's module, by its title. */
    const moduleTitles = stepModuleTitles(body.steps);

    // A module is a section: listed once, by a title its steps use. The
    // gate is not one.
    const sections = new Set(body.steps.flatMap((step) => step.section ?? []));
    const gate = lessonGateSection(body.steps);
    const listed = new Set<string>();
    body.modules?.forEach((module, m) => {
      const at: Path = ['modules', m, 'title'];
      if (listed.has(module.title))
        issue(ctx, at, `Module "${module.title}" is listed twice`);
      else if (!sections.has(module.title))
        issue(ctx, at, `No steps are in a section called "${module.title}"`);
      else if (module.title === gate?.title)
        issue(
          ctx,
          at,
          `"${module.title}" is the gate, where students choose: it has no goal or round`,
        );
      listed.add(module.title);
    });

    const knownProgression = (name: string, path: Path) => {
      const progression = saved.get(name);
      if (!progression)
        issue(
          ctx,
          path,
          `No choose-chords step before this one saves "${name}"`,
        );
      return progression;
    };
    const rhythmFits = (rhythm: readonly number[] | undefined, path: Path) => {
      if (rhythm && sum(rhythm) > barTicks)
        issue(ctx, path, 'A chord rhythm runs past its bar');
    };

    body.steps.forEach((step, s) => {
      const at = (...rest: Path): Path => ['steps', s, ...rest];
      if (tags.has(step.tag))
        issue(ctx, at('tag'), `Step tag "${step.tag}" is used twice`);
      tags.add(step.tag);

      switch (step.kind) {
        case 'chooseKey':
        case 'chooseMode':
          if (!studentKey)
            issue(
              ctx,
              at('kind'),
              'Only a lesson whose key is the student’s choice asks for it',
            );
          return;
        case 'chooseChords': {
          const xs = step.template.filter((bar) => bar === 'X').length;
          if (xs === 0)
            issue(
              ctx,
              at('template'),
              'A template needs an X bar for the student to choose',
            );
          else if (step.distinct > xs)
            issue(
              ctx,
              at('distinct'),
              `${step.distinct} different chords don’t fit in ${xs} X bar${xs > 1 ? 's' : ''}`,
            );
          if (step.distinct > LITERACY_PALETTE_SIZE)
            issue(
              ctx,
              at('distinct'),
              `There are only ${LITERACY_PALETTE_SIZE} chords to choose from`,
            );
          if (saved.has(step.saveAs))
            issue(
              ctx,
              at('saveAs'),
              `Progression "${step.saveAs}" is saved by two steps`,
            );
          saved.set(step.saveAs, { distinct: step.distinct });
          return;
        }
        case 'replay':
          knownProgression(step.progression, at('progression'));
          rhythmFits(step.rhythm, at('rhythm'));
          return;
        default:
          break;
      }

      // An echo: call and response.
      const pickup = step.words?.pickup ?? 0;
      if (pickup > barTicks - PICKUP_STEP)
        issue(
          ctx,
          at('words', 'pickup'),
          'A pickup must be at least an eighth shorter than a bar',
        );
      step.words?.notes.forEach((note, n) => {
        if (note.tick < -pickup)
          issue(
            ctx,
            at('words', 'notes', n),
            pickup
              ? 'A syllable starts before the pickup: make the pickup longer'
              : 'A syllable starts before the words do: give them a pickup',
          );
      });

      // A create pass: the step is in a create round, and not opted out.
      const create =
        moduleRound(body, moduleTitles[s]) === 'create' &&
        step.passes?.create !== false;
      if (step.passes?.createBars !== undefined && !create)
        issue(
          ctx,
          at('passes', 'createBars'),
          'Create-pass bars on a step without a create pass',
        );

      const call = step.call;
      if (call.harmony !== undefined) {
        // A chord call.
        if (step.response)
          issue(
            ctx,
            at('response'),
            'A chord call is echoed as it is: leave the response out',
          );
        if (step.passes?.challenge)
          issue(
            ctx,
            at('passes', 'challenge'),
            'The challenge pass is for melodies, not chord calls',
          );
        if (step.passes?.createBars !== undefined)
          issue(
            ctx,
            at('passes', 'createBars'),
            'A chord call’s create pass lasts its chords’ bars: leave its bars out',
          );
        rhythmFits(call.rhythm, at('call', 'rhythm'));
        const hasX = call.chords?.includes('X') ?? false;
        if (!call.chords && !call.progression)
          issue(
            ctx,
            at('call'),
            'A chord call needs its chords, or a progression to play',
          );
        if (call.chords && call.progression && !hasX)
          issue(
            ctx,
            at('call', 'progression'),
            'A chord call with chords of its own takes a progression only for an X',
          );
        if (hasX && !call.progression)
          issue(
            ctx,
            at('call', 'chords'),
            'An X needs a progression to take its chord from',
          );
        if (call.progression) {
          const progression = knownProgression(
            call.progression,
            at('call', 'progression'),
          );
          if (hasX && progression && progression.distinct > 1)
            issue(
              ctx,
              at('call', 'chords'),
              `X stands for one chord, but "${call.progression}" has ${progression.distinct}: play the progression itself`,
            );
        }
        call.chords?.forEach((bar, b) => {
          for (const mode of modes) {
            if (bar === LITERACY_DIMINISHED_DEGREE[mode]) {
              issue(
                ctx,
                at('call', 'chords', b),
                `The ${bar} chord is diminished in ${mode}: use another`,
              );
              break;
            }
          }
        });
      }

      const segments = [
        ['words', step.words],
        ['call', call.harmony === undefined ? call : undefined],
        ['response', step.response],
      ] as const;
      for (const [name, segment] of segments) {
        if (!segment) continue;
        const length = segment.bars * barTicks;
        segment.notes.forEach((note, n) => {
          if (note.tick + note.duration > length)
            issue(
              ctx,
              at(name, 'notes', n),
              `A ${name} note runs past its ${segment.bars} bar(s)`,
            );
          if (scale && !isScaleDegree(note.degree))
            issue(
              ctx,
              at(name, 'notes', n, 'degree'),
              'Scale numbering writes the plain degrees 1–7: the mode gives the flats',
            );
        });
      }
    });
  });

export type LiteracyDegree = z.infer<typeof literacyDegreeSchema>;
export type LiteracyScaleDegree = (typeof LITERACY_SCALE_DEGREES)[number];
export type LiteracyTonic = (typeof LITERACY_TONICS)[number];
export type LiteracyMode = z.infer<typeof literacyModeSchema>;
export type LiteracyNumbering = (typeof LITERACY_NUMBERINGS)[number];
export type LiteracyHarmony = z.infer<typeof literacyHarmonySchema>;
export type LiteracyTemplateBar = (typeof LITERACY_TEMPLATE_BARS)[number];
export type LiteracyChordBar = (typeof LITERACY_CHORD_BARS)[number];
export type LiteracyNote = z.infer<typeof literacyNoteSchema>;
export type LiteracyWord = z.infer<typeof literacyWordSchema>;
export type LiteracyFigure = z.infer<typeof literacyFigureSchema>;
export type LiteracyChordFigure = z.infer<typeof literacyChordFigureSchema>;
/** An echo's call: a melodic figure, or a chord figure (`harmony` set). */
export type LiteracyCall = z.infer<typeof literacyCallSchema>;
export type LiteracyWords = z.infer<typeof literacyWordsSchema>;
export type LiteracyLessonPasses = z.infer<typeof literacyLessonPassesSchema>;
export type LiteracyStepPasses = z.infer<typeof literacyStepPassesSchema>;
export type LiteracyRound = (typeof LITERACY_ROUNDS)[number];
export type LiteracyModuleEntry = z.infer<typeof literacyModuleSchema>;
export type LiteracyEchoStep = z.infer<typeof literacyEchoStepSchema>;
export type LiteracyChooseKeyStep = z.infer<typeof literacyChooseKeyStepSchema>;
export type LiteracyChooseModeStep = z.infer<
  typeof literacyChooseModeStepSchema
>;
export type LiteracyChooseChordsStep = z.infer<
  typeof literacyChooseChordsStepSchema
>;
export type LiteracyReplayStep = z.infer<typeof literacyReplayStepSchema>;
/** A step of any kind. */
export type LiteracyStep = z.infer<typeof literacyStepSchema>;
export type LiteracyStepKind = (typeof LITERACY_STEP_KINDS)[number];
/** An echo with a melodic call: Part 1's every step. */
export type LiteracyMelodicEchoStep = Omit<LiteracyEchoStep, 'call'> & {
  call: LiteracyFigure;
};
/** An echo with a chord call (echoed as it is: no response). */
export type LiteracyChordEchoStep = Omit<
  LiteracyEchoStep,
  'call' | 'response'
> & { call: LiteracyChordFigure };
export type MusicLiteracyLesson = z.infer<typeof musicLiteracyBodySchema>;

// ── Telling the kinds apart ────────────────────────────────────────────────

/** A step's kind: an echo when it says none. */
export const stepKind = (step: Pick<LiteracyStep, 'kind'>): LiteracyStepKind =>
  step.kind ?? 'echo';

export const isEchoStep = (step: LiteracyStep): step is LiteracyEchoStep =>
  stepKind(step) === 'echo';

/** A call in chords (it has a harmony), not notes. */
export const isChordFigure = (
  call: LiteracyCall | LiteracyFigure,
): call is LiteracyChordFigure =>
  'harmony' in call && call.harmony !== undefined;

/** An echo whose call is notes: Part 1's kind of step. */
export const isMelodicEcho = (
  step: LiteracyStep,
): step is LiteracyMelodicEchoStep =>
  isEchoStep(step) && !isChordFigure(step.call);

/** An echo whose call is chords. */
export const isChordEcho = (
  step: LiteracyStep,
): step is LiteracyChordEchoStep =>
  isEchoStep(step) && isChordFigure(step.call);

// ── Modules and their rounds ───────────────────────────────────────────────
// (Function declarations: the body's refinement above reads them.)

/**
 * Each step's module, by title: its section; a step with none takes the
 * section of the step before it (the first steps, of the step after them).
 * Null throughout when no step has a section: the lesson is one module.
 */
export function stepModuleTitles(
  steps: readonly Pick<LiteracyStep, 'section'>[],
): (string | null)[] {
  const titles: (string | null)[] = [];
  let last: string | null = null;
  for (const step of steps) {
    last = step.section ?? last;
    titles.push(last);
  }
  const first = titles.find((title) => title !== null) ?? null;
  return titles.map((title) => title ?? first);
}

/** A gate's kind of step: it chooses the key, or major or minor. */
export const isGateStep = (step: Pick<LiteracyStep, 'kind'>): boolean =>
  step.kind === 'chooseKey' || step.kind === 'chooseMode';

/** The lesson's gate: its section's title and its steps' places. */
export interface LiteracyGateSection {
  title: string;
  indices: number[];
}

/**
 * The lesson's gate: its first section, when every step in it chooses the
 * key or major or minor, and other steps follow it. The student makes those
 * choices there, once, and every step after plays in them. A gate is not a
 * module: no goal, no round, no card. Null when the lesson has none (no
 * sections, as Part 1; a first section with any other step in it).
 */
export function lessonGateSection(
  steps: readonly Pick<LiteracyStep, 'kind' | 'section'>[],
): LiteracyGateSection | null {
  const titles = stepModuleTitles(steps);
  const title = titles[0];
  if (title === null || title === undefined) return null;
  const indices = titles.flatMap((t, i) => (t === title ? [i] : []));
  if (indices.length === steps.length) return null;
  return indices.every((i) => isGateStep(steps[i])) ? { title, indices } : null;
}

/**
 * The round of a module that names none, from the lesson's `passes`: the
 * create round when it is on, else the challenge when that is (on by
 * default, Part 1's), else none.
 */
export function defaultRound(
  passes: LiteracyLessonPasses | undefined,
): LiteracyRound {
  if (passes?.create) return 'create';
  return (passes?.challenge ?? true) ? 'challenge' : 'none';
}

/** A module's round, by its title (null: the lesson with no sections). */
export function moduleRound(
  lesson: Pick<MusicLiteracyLesson, 'passes' | 'modules'>,
  title: string | null,
): LiteracyRound {
  const own =
    title === null
      ? undefined
      : lesson.modules?.find((module) => module.title === title)?.round;
  return own ?? defaultRound(lesson.passes);
}

/**
 * The round of the module a step is in. A step not in the lesson (a copy
 * being edited) goes by its own section.
 */
export function stepRound(
  lesson: Pick<MusicLiteracyLesson, 'passes' | 'modules' | 'steps'>,
  step: LiteracyStep,
): LiteracyRound {
  const index = lesson.steps.indexOf(step);
  const title =
    index >= 0 ? stepModuleTitles(lesson.steps)[index] : (step.section ?? null);
  return moduleRound(lesson, title);
}
