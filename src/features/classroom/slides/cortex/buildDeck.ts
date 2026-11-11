import { PHASES, type PhaseKey } from '../../phases';
import type {
  Day,
  DayCells,
  FeelingsLevel,
  Interaction,
  LocalizedText,
} from '../../types';
import type { Slide, SlideDeck, SlideDeckTemplateRef } from '../types';
import { ARTIST_RECORDINGS, ARTIST_TAGLINES } from './artistStories';
import {
  CHECK_IN_QUESTION,
  COPY,
  PREP_CHECKLIST,
  RESET_CHECKLIST,
  deckTitle,
  groupTitle,
  listenTitle,
  performerTask,
  producerTask,
  promoterHeadline,
  promoterTask,
  tourTask,
} from './copy';
import { slugOf } from './graphQueries';
import { lessonRationale, withPartRationale } from './lessonRationale';
import { showcaseBio } from './showcase';
import type { CortexLessonChoices, CortexLessonPlan, GroupRole } from './types';

/**
 * A Cortex lesson as slides: the plan (from the graph) and the teacher's
 * choices in, interactions and slides out. Graph-free, so it runs anywhere and
 * tests without the Atlas.
 *
 * Interactions live in their phase's cell and slides reference them by id, so
 * the response pipeline (aggregation, reveal, reports, CSV) is unchanged. No
 * new slide kinds and no new interaction types: the server's `Interaction.type`
 * is an enum.
 *
 * The six sections, in order (`slides/sections.ts`). One idea a slide, and
 * no words a slide doesn't need (owner, 2026-11-10); the stage presets
 * (`slides/stage.ts`) draw each one big:
 *
 *   Connect             hero      feelings check-in (+ mood poll)    connectRegulate
 *   Showcase            portrait  the photo, the name, a short bio   connectRegulate
 *                       bleed     the song's video; "what do you hear?" on devices
 *                       bleed     the globe, flying through their places
 *   Group Project       hero      the activity the class does together  groupPractice
 *   Individual Project  hero      the Studio library + timer         creativeProjects
 *   Present             hero      progress, to the teacher           presentPerform
 *                       hero      "Show the class", then the featured project
 *   Reflect             hero      the exit ticket, projectable       respondReflectReset
 *                       content   the room-reset checklist
 *
 * The teacher's side (activity, CLOs, standards, assessment) goes into the
 * cells' rationale (`lessonRationale.ts`); the facts into their notes.
 */

export const CORTEX_LESSON_TEMPLATE_ID = 'cortex-lesson-v1';

/** The Promoter's mind-map launch; the board rides on the interaction. */
export const MIND_MAP_REF = 'globe:mindmap';
/** "Continue your project": the Studio's project library. */
export const STUDIO_LIBRARY_REF = 'studio:library';

/** What the deck builder adds to each phase's cell. */
export type InteractionsByPhase = Partial<Record<PhaseKey, Interaction[]>>;

export interface CortexLessonContent {
  interactionsByPhase: InteractionsByPhase;
  slides: Slide[];
  /** Each touched cell's board copy (the legacy phase board shows it). */
  cellCopy: Partial<
    Record<PhaseKey, { title: LocalizedText; prompt: LocalizedText }>
  >;
}

const ixIds = (prefix: string) => ({
  checkIn: `${prefix}-ix-checkin`,
  vibe: `${prefix}-ix-vibe`,
  listen: `${prefix}-ix-listen`,
  group: `${prefix}-ix-group`,
  project: `${prefix}-ix-project`,
  progress: `${prefix}-ix-progress`,
  share: `${prefix}-ix-share`,
  exit: `${prefix}-ix-exit`,
});

/** The emotional check-in, at a level. Teacher-eyes-only (Rule 2). */
const feelingsCheckIn = (
  id: string,
  level: FeelingsLevel,
  question: LocalizedText = CHECK_IN_QUESTION[level],
): Interaction => ({
  id,
  type: 'check-in',
  question,
  // Rule 2: check-ins never reach the projector.
  shareable: false,
  checkIn: { style: 'feelings', level },
});

/** Reflect's exit question: answered anonymously on the projector if shared. */
const exitQuestion = (id: string): Interaction => ({
  id,
  type: 'text',
  question: COPY.exitQuestion,
  shareable: true,
  text: { maxLen: 140 },
});

/** Reflect's two slides: the exit question, then the room reset. */
const reflectSlides = (prefix: string, exitId: string): Slide[] => [
  {
    id: `${prefix}-slide-exit`,
    kind: 'interaction',
    phase: 'respondReflectReset',
    section: 'reflect',
    presetId: 'hero',
    title: COPY.exitTitle,
    interactionIds: [exitId],
    reveal: 'wall',
  },
  {
    id: `${prefix}-slide-reset`,
    kind: 'content',
    phase: 'respondReflectReset',
    section: 'reflect',
    variant: 'plain',
    title: COPY.resetTitle,
    resetChecklist: [...RESET_CHECKLIST],
  },
];

const withTimer = (minutes: number): { timerSec?: number } =>
  minutes > 0 ? { timerSec: Math.round(minutes * 60) } : {};

/** The parts every Cortex deck shares: Individual Project, Present, Reflect. */
const projectAndPresent = (
  prefix: string,
  projectMinutes: number,
): Pick<CortexLessonContent, 'interactionsByPhase' | 'slides' | 'cellCopy'> => {
  const ids = ixIds(prefix);
  const project: Interaction = {
    id: ids.project,
    type: 'atlas',
    question: COPY.projectTask,
    shareable: false,
    atlas: {
      module: 'studio',
      activityRef: STUDIO_LIBRARY_REF,
      expects: 'artifact',
    },
  };
  const progress: Interaction = {
    id: ids.progress,
    type: 'text',
    question: COPY.progressQuestion,
    // Shared with the teacher, never projected.
    shareable: false,
    text: { maxLen: 280 },
  };
  const share: Interaction = {
    id: ids.share,
    type: 'showcase',
    question: COPY.shareQuestion,
    shareable: false,
  };
  const exit = exitQuestion(ids.exit);
  return {
    interactionsByPhase: {
      creativeProjects: [project],
      presentPerform: [progress, share],
      respondReflectReset: [exit],
    },
    slides: [
      {
        id: `${prefix}-slide-project`,
        kind: 'app-route',
        phase: 'creativeProjects',
        section: 'individualProject',
        presetId: 'hero',
        title: COPY.projectTitle,
        interactionId: project.id,
        ...withTimer(projectMinutes),
      },
      {
        id: `${prefix}-slide-progress`,
        kind: 'interaction',
        phase: 'presentPerform',
        section: 'present',
        presetId: 'hero',
        title: COPY.presentTitle,
        interactionIds: [progress.id],
      },
      {
        id: `${prefix}-slide-share`,
        kind: 'showcase',
        phase: 'presentPerform',
        section: 'present',
        presetId: 'hero',
        title: COPY.shareTitle,
        interactionId: share.id,
      },
      ...reflectSlides(prefix, exit.id),
    ],
    cellCopy: {
      creativeProjects: {
        title: COPY.projectTitle,
        prompt: COPY.projectPrompt,
      },
      presentPerform: {
        title: COPY.presentCell,
        prompt: COPY.progressQuestion,
      },
      respondReflectReset: {
        title: COPY.exitTitle,
        prompt: COPY.exitQuestion,
      },
    },
  };
};

/** The Group Project interaction for the chosen role, or null if it can't run. */
const groupInteraction = (
  id: string,
  plan: CortexLessonPlan,
  choices: Pick<CortexLessonChoices, 'role' | 'tutorialId' | 'performerRef'>,
): { interaction: Interaction; prompt: LocalizedText } | null => {
  switch (choices.role) {
    case 'promoter': {
      const board = plan.promoter;
      if (!board) return null;
      const task = promoterTask(plan.focus.label, board.goal);
      return {
        prompt: promoterHeadline(plan.focus.label),
        interaction: {
          id,
          type: 'atlas',
          question: task,
          shareable: false,
          atlas: {
            module: 'globe',
            activityRef: MIND_MAP_REF,
            expects: 'artifact',
            board,
          },
        },
      };
    }
    case 'producer': {
      // Every Group Project activity but the mind map is done together.
      const option =
        plan.producer.find((o) => o.tutorial.id === choices.tutorialId) ??
        plan.producer[0];
      if (!option) return null;
      const task = producerTask(option.tutorial.title);
      return {
        prompt: task,
        interaction: {
          id,
          type: 'atlas',
          question: task,
          shareable: false,
          atlas: {
            module: 'studio',
            activityRef: `studio:tutorial:${option.tutorial.id}`,
            // The tutorial reports completion when its last step is done.
            expects: 'completion',
            follow: true,
          },
        },
      };
    }
    case 'performer': {
      const option =
        plan.performer.find((o) => o.activityRef === choices.performerRef) ??
        plan.performer[0];
      if (!option) return null;
      const task = performerTask(option.label);
      return {
        prompt: task,
        interaction: {
          id,
          type: 'atlas',
          question: task,
          shareable: false,
          atlas: {
            module: 'learn',
            activityRef: option.activityRef,
            expects: 'completion',
            follow: true,
          },
        },
      };
    }
  }
};

/** Whether a role can run for this plan (a Promoter needs a board, …). */
export const roleAvailable = (
  plan: CortexLessonPlan,
  role: GroupRole,
): boolean =>
  role === 'promoter'
    ? plan.promoter !== null
    : role === 'producer'
      ? plan.producer.length > 0
      : plan.performer.length > 0;

/**
 * The lesson's interactions, slides and cell copy, every id under `prefix`.
 * Throws when the chosen role cannot run for this plan (`roleAvailable`).
 */
export const buildCortexLessonContent = (
  prefix: string,
  plan: CortexLessonPlan,
  choices: CortexLessonChoices,
): CortexLessonContent => {
  const ids = ixIds(prefix);
  const { focus } = plan;

  const checkIn = feelingsCheckIn(
    ids.checkIn,
    choices.checkInLevel,
    choices.checkInQuestion,
  );
  const vibe: Interaction | null =
    choices.vibePoll && plan.vibes.length >= 2
      ? {
          id: ids.vibe,
          type: 'choice',
          question: COPY.vibeQuestion,
          shareable: true,
          choice: { options: plan.vibes.map((v) => ({ en: v })), multi: false },
        }
      : null;

  const group = groupInteraction(ids.group, plan, choices);
  if (!group)
    throw new Error(
      `The ${choices.role} role has nothing to run for ${focus.label}`,
    );

  // The energy check-in is asked on the portrait (no page of its own); the
  // faces and the wheel keep their own Connect slide, at full size.
  const onPortrait = choices.checkInLevel === 'energy';
  const showcase_ = showcaseParts(
    prefix,
    plan,
    onPortrait ? checkIn.id : undefined,
  );

  const shared = projectAndPresent(prefix, choices.projectMinutes);

  return {
    interactionsByPhase: {
      connectRegulate: [
        checkIn,
        ...(vibe ? [vibe] : []),
        ...showcase_.interactions,
      ],
      groupPractice: [group.interaction],
      ...shared.interactionsByPhase,
    },
    slides: [
      ...(onPortrait
        ? []
        : [
            {
              id: `${prefix}-slide-connection`,
              kind: 'interaction' as const,
              phase: 'connectRegulate' as const,
              section: 'connect' as const,
              presetId: 'hero',
              title: COPY.connectionTitle,
              interactionIds: [checkIn.id],
            },
          ]),
      // The mood poll, when there is one, is a slide of its own.
      ...(vibe
        ? [
            {
              id: `${prefix}-slide-vibe`,
              kind: 'interaction' as const,
              phase: 'connectRegulate' as const,
              section: 'connect' as const,
              presetId: 'hero',
              title: COPY.vibeQuestion,
              interactionIds: [vibe.id],
              reveal: 'bars' as const,
            },
          ]
        : []),
      ...showcase_.slides,
      {
        id: `${prefix}-slide-group`,
        kind: 'app-route',
        phase: 'groupPractice',
        section: 'groupProject',
        presetId: 'hero',
        title: groupTitle(choices.role),
        prompt: group.prompt,
        interactionId: group.interaction.id,
      },
      ...shared.slides,
    ],
    cellCopy: {
      connectRegulate: { title: COPY.connectionCell, prompt: checkIn.question },
      groupPractice: { title: groupTitle(choices.role), prompt: group.prompt },
      ...shared.cellCopy,
    },
  };
};

/**
 * The Showcase's first slide for a plan's subject (owner, 2026-11-10): the
 * photo edge to edge with the name and a short bio over it. Without a photo,
 * the globe of their place takes its place. The generator and the editor's
 * Showcase pick share it.
 */
export const showcaseSlideFields = (
  plan: CortexLessonPlan,
): Pick<
  Extract<Slide, { kind: 'content' }>,
  'title' | 'body' | 'presetId' | 'media' | 'accent' | 'recording'
> => {
  const { focus, showcase } = plan;
  const artist = focus.kind === 'artist' ? slugOf(focus.id) : null;
  // The owner's own line for the artist, else the bio from their facts.
  const bio =
    (artist ? ARTIST_TAGLINES[artist] : undefined) ??
    showcaseBio(showcase.facts);
  // The song the owner chose, to play from the portrait's corner.
  const recording = artist ? ARTIST_RECORDINGS[artist] : undefined;
  const visual = showcase.portrait ?? showcase.globe ?? showcase.visual;
  return {
    title: { en: focus.label, es: focus.label },
    ...(bio.en ? { body: bio } : {}),
    presetId: 'portrait',
    ...(visual ? { media: visual } : {}),
    accent: showcase.accent,
    ...(recording ? { recording: { videoId: recording } } : {}),
  };
};

/** The Showcase slides' ids under a deck's prefix. */
export const showcaseSlideIds = (prefix: string) => ({
  portrait: `${prefix}-slide-showcase`,
  listen: `${prefix}-slide-listen`,
  places: `${prefix}-slide-places`,
});

/**
 * The whole Showcase (owner, 2026-11-10): three slides, one idea each.
 *
 *   1. the subject's photo, name and short bio            (portrait)
 *   2. their song's video, full screen; the class says     (bleed)
 *      what they hear on their devices, revealed as words
 *   3. the globe, full screen, flying through their places (bleed)
 *
 * The second and third are left out when there is no video, or no place.
 */
export const showcaseParts = (
  prefix: string,
  plan: CortexLessonPlan,
  /**
   * The class's energy check-in, asked on the portrait (owner, 2026-11-10:
   * the check-in at the first page's bottom left, a slider): its
   * interaction's id. Without it the portrait is a picture alone.
   */
  checkInId?: string,
): { slides: Slide[]; interactions: Interaction[] } => {
  const { focus, showcase } = plan;
  const ids = showcaseSlideIds(prefix);
  const fields = showcaseSlideFields(plan);
  const slides: Slide[] = [
    checkInId
      ? {
          id: ids.portrait,
          kind: 'interaction',
          phase: 'connectRegulate',
          section: 'showcase',
          title: fields.title,
          ...(fields.body ? { body: fields.body } : {}),
          ...(fields.media ? { media: fields.media } : {}),
          presetId: 'portrait-check-in',
          interactionIds: [checkInId],
          accent: fields.accent,
          ...(fields.recording ? { recording: fields.recording } : {}),
        }
      : {
          id: ids.portrait,
          kind: 'content',
          phase: 'connectRegulate',
          section: 'showcase',
          ...fields,
        },
  ];
  const interactions: Interaction[] = [];
  if (showcase.listen) {
    const { listen } = showcase;
    const heard: Interaction = {
      id: ixIds(prefix).listen,
      type: 'text',
      question: COPY.listenPrompt,
      shareable: true,
      // A word or two: the room sees them as a cloud.
      text: { maxLen: 32 },
    };
    interactions.push(heard);
    slides.push({
      id: ids.listen,
      kind: 'interaction',
      phase: 'connectRegulate',
      section: 'showcase',
      presetId: 'bleed',
      title: listenTitle(listen.title),
      media: {
        type: 'youtube',
        videoId: listen.videoId,
        ...(listen.startSec !== undefined ? { startSec: listen.startSec } : {}),
      },
      interactionIds: [heard.id],
      reveal: 'words',
      accent: showcase.accent,
    });
  }
  const globe = showcase.globe;
  if (globe?.type === 'globePreview' && (globe.stops?.length ?? 0) > 0) {
    slides.push({
      id: ids.places,
      kind: 'content',
      phase: 'connectRegulate',
      section: 'showcase',
      presetId: 'bleed',
      title: { en: focus.label, es: focus.label },
      media: globe,
      accent: showcase.accent,
    });
  }
  return { slides, interactions };
};

/**
 * A Group Project activity for a role, from a plan: the one the Group
 * Project slide runs. `ref` picks a particular Studio tutorial or Learn
 * lesson; without it the plan's first. Null when the plan cannot run the
 * role. The editor's "match the Showcase" uses it to replace an activity in
 * place, keeping the interaction's id.
 */
export const cortexGroupActivity = (
  id: string,
  plan: CortexLessonPlan,
  role: GroupRole,
  ref?: string,
  /** The activity's name, for a Globe tour ("North America tour"). */
  label?: string,
): {
  interaction: Interaction;
  title: LocalizedText;
  prompt: LocalizedText;
} | null => {
  const tutorialId = ref?.startsWith('studio:tutorial:')
    ? ref.slice('studio:tutorial:'.length)
    : undefined;
  // A Promoter's Globe tour: the class travels it together.
  if (role === 'promoter' && ref?.startsWith('globe:tour:')) {
    const task = tourTask(label ?? 'tour');
    return {
      title: groupTitle(role),
      prompt: task,
      interaction: {
        id,
        type: 'atlas',
        question: task,
        shareable: false,
        atlas: {
          module: 'globe',
          activityRef: ref,
          expects: 'completion',
          follow: true,
        },
      },
    };
  }
  const group = groupInteraction(id, plan, {
    role,
    ...(tutorialId ? { tutorialId } : {}),
    ...(ref && role === 'performer' ? { performerRef: ref } : {}),
  });
  return group ? { ...group, title: groupTitle(role) } : null;
};

/** Random suffix, so regenerating a Day never reuses an interaction id. */
const freshToken = (): string =>
  Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0');

const NOTES_HEADER = '— Cortex lesson —';

/** The Connect cell's notes: the generator's block, then the teacher's own. */
const notesWith = (existing: string, plan: CortexLessonPlan): string => {
  // Drop a block an earlier generation wrote, keep everything after it.
  const paragraphs = existing.split('\n\n');
  const own = existing.startsWith(NOTES_HEADER)
    ? paragraphs
        .slice(paragraphs[1]?.startsWith('Talking points:') ? 2 : 1)
        .join('\n\n')
    : existing;
  // What to say about the subject: the facts the slides leave off.
  const talking = [
    'Talking points:',
    ...plan.showcase.facts.map((f) => `• ${f.text.en}`),
  ].join('\n');
  const block = [NOTES_HEADER, ...plan.notes].join('\n') + '\n\n' + talking;
  const rest = own.trim() || PREP_CHECKLIST;
  return `${block}\n\n${rest}`;
};

const hasText = (text: LocalizedText | undefined): boolean =>
  Boolean(text && text.en.trim() !== '');

/** The interaction ids a deck's slides reference. */
const deckInteractionIds = (deck: SlideDeck | undefined): Set<string> => {
  const ids = new Set<string>();
  for (const slide of deck?.slides ?? []) {
    if (slide.kind === 'interaction')
      for (const id of slide.interactionIds) ids.add(id);
    if (slide.kind === 'app-route' || slide.kind === 'showcase')
      ids.add(slide.interactionId);
  }
  return ids;
};

export const cortexTemplateRef = (
  plan: CortexLessonPlan,
  choices: CortexLessonChoices,
): SlideDeckTemplateRef => {
  const songId =
    plan.showcase.listen?.songId ??
    plan.performer.find((o) => o.songId)?.songId;
  return {
    templateId: CORTEX_LESSON_TEMPLATE_ID,
    focusId: plan.focus.id,
    role: choices.role,
    seed: choices.seed,
    ...(songId ? { songId } : {}),
  };
};

/**
 * Put a Cortex lesson on a Day. Returns a new Day; the input is untouched.
 *
 *  - The deck is replaced, and so are the interactions an earlier generated
 *    deck put in the cells; interactions the teacher added are kept.
 *  - A cell's title and prompt are filled only where the teacher left them
 *    empty: a Day planned from the Teach year keeps its own board copy.
 *  - The Connect cell's notes get the generator's reasoning (teacher-only).
 */
export const applyCortexLessonToDay = (
  day: Day,
  plan: CortexLessonPlan,
  choices: CortexLessonChoices,
  token: string = freshToken(),
): Day => {
  const prefix = `${day.id}-cx-${token}`;
  const content = buildCortexLessonContent(prefix, plan, choices);
  const generated =
    day.deck?.templateRef?.templateId === CORTEX_LESSON_TEMPLATE_ID
      ? deckInteractionIds(day.deck)
      : new Set<string>();

  const parts = lessonRationale(choices.role);
  const cells = {} as DayCells;
  for (const phase of PHASES) {
    const cell = day.cells[phase];
    const kept = (cell.presentation.interactions ?? []).filter(
      (ix) => !generated.has(ix.id),
    );
    const added = content.interactionsByPhase[phase] ?? [];
    const copy = content.cellCopy[phase];
    const interactions = [...kept, ...added];
    cells[phase] = {
      ...cell,
      presentation: {
        ...cell.presentation,
        ...(copy && !hasText(cell.presentation.title)
          ? { title: copy.title }
          : {}),
        ...(copy && !hasText(cell.presentation.prompt)
          ? { prompt: copy.prompt }
          : {}),
        ...(interactions.length > 0 || cell.presentation.interactions
          ? { interactions }
          : {}),
      },
      rationale: withPartRationale(
        phase === 'connectRegulate'
          ? { ...cell.rationale, notes: notesWith(cell.rationale.notes, plan) }
          : cell.rationale,
        parts[phase],
      ),
    };
  }

  return {
    ...day,
    cells,
    deck: {
      id: `${prefix}-deck`,
      title: deckTitle(plan.focus, choices.role),
      slides: content.slides,
      templateRef: cortexTemplateRef(plan, choices),
    },
  };
};

/** The starter interactions' ids: the new Day's own check-in and exit question. */
const starterIds = (dayId: string) => ({
  feelings: `${dayId}-cx-ix-feelings`,
  exit: `${dayId}-cx-ix-exit`,
});

/**
 * Whether an interaction is one a new Day starts with (its feelings check-in
 * or exit question) rather than one a teacher or a seed added. A cell holding
 * only these still counts as empty, so seeding a new Day fills every cell.
 */
export const isStarterInteraction = (interaction: Pick<Interaction, 'id'>) =>
  /-cx-ix-(feelings|exit)$/.test(interaction.id);

/**
 * The deck every new Day starts with, before a focus is chosen: the six
 * sections with general copy. Connect asks the feelings check-in (Simple) and
 * Reflect the exit question, so a new lesson taught as it stands still opens
 * and closes properly; their interactions are `cortexSkeletonInteractions`,
 * which `newBlankDay` puts in the cells. The Individual Project's Studio
 * library opens from a launch tile. "Generate from Cortex" replaces the lot,
 * filling the Showcase and the Group Project in.
 */
export const buildCortexLessonSkeleton = (dayId: string): SlideDeck => {
  const prefix = `${dayId}-cx`;
  const ids = starterIds(dayId);
  const section = (
    key: string,
    phase: Slide['phase'],
    sectionId: NonNullable<Slide['section']>,
    title: LocalizedText,
    prompt: LocalizedText,
    presetId = 'section',
  ): Slide => ({
    id: `${prefix}-slide-${key}`,
    kind: 'content',
    phase,
    section: sectionId,
    presetId,
    title,
    prompt,
  });
  return {
    id: `${dayId}-deck`,
    title: { en: 'Lesson', es: 'Lección' },
    slides: [
      {
        id: `${prefix}-slide-connection`,
        kind: 'interaction',
        phase: 'connectRegulate',
        section: 'connect',
        presetId: 'greeting-check-in',
        title: COPY.connectionTitle,
        interactionIds: [ids.feelings],
      },
      section(
        'showcase',
        'connectRegulate',
        'showcase',
        COPY.showcaseTitle,
        COPY.showcaseOpen,
      ),
      section(
        'group',
        'groupPractice',
        'groupProject',
        COPY.groupTitle,
        COPY.groupOpen,
      ),
      {
        ...section(
          'project',
          'creativeProjects',
          'individualProject',
          COPY.projectTitle,
          COPY.projectPrompt,
          'project-menu',
        ),
        launchTiles: [
          {
            id: `${prefix}-tile-library`,
            module: 'studio',
            activityRef: STUDIO_LIBRARY_REF,
            label: COPY.libraryTile,
          },
        ],
      } as Slide,
      section(
        'present',
        'presentPerform',
        'present',
        COPY.presentTitle,
        COPY.presentPrompt,
        'share-day',
      ),
      ...reflectSlides(prefix, ids.exit),
    ],
    templateRef: { templateId: CORTEX_LESSON_TEMPLATE_ID },
  };
};

/** The new Day's starter interactions, by the phase cell they live in. */
export const cortexSkeletonInteractions = (
  dayId: string,
): InteractionsByPhase => {
  const ids = starterIds(dayId);
  return {
    connectRegulate: [feelingsCheckIn(ids.feelings, 'simple')],
    respondReflectReset: [exitQuestion(ids.exit)],
  };
};

/** The prep checklist for a new Day's Connect cell notes (teacher-only). */
export const cortexLessonTeacherNotes = (): string => PREP_CHECKLIST;

/** Whether a deck is a Cortex lesson that still needs its focus generated. */
export const isUngeneratedCortexDeck = (deck: SlideDeck | undefined): boolean =>
  deck?.templateRef?.templateId === CORTEX_LESSON_TEMPLATE_ID &&
  !deck.templateRef.focusId;
