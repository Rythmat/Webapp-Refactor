import { PHASES, type PhaseKey } from '../../phases';
import type { Day, DayCells, Interaction, LocalizedText } from '../../types';
import type { Slide, SlideDeck, SlideDeckTemplateRef } from '../types';
import {
  CHECK_IN_QUESTION,
  COPY,
  PREP_CHECKLIST,
  deckTitle,
  groupTitle,
  listenTitle,
  performerTask,
  producerTask,
  promoterTask,
  todayWith,
} from './copy';
import { showcaseBody } from './showcase';
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
 *   Connection          `interaction`  check-in (+ mood poll)   connectRegulate
 *   Showcase            `content`      facts + portrait/globe   connectRegulate
 *                       `media`        a video, when there is one
 *   Group Project       `app-route`    Globe / Studio / Learn   groupPractice
 *   Individual Project  `app-route`    the Studio library       creativeProjects
 *   Present             `interaction`  progress, to the teacher presentPerform
 *                       `showcase`     a project to offer
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
  group: `${prefix}-ix-group`,
  project: `${prefix}-ix-project`,
  progress: `${prefix}-ix-progress`,
  share: `${prefix}-ix-share`,
});

const withTimer = (minutes: number): { timerSec?: number } =>
  minutes > 0 ? { timerSec: Math.round(minutes * 60) } : {};

/** The parts every Cortex deck shares: Individual Project and Present. */
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
  return {
    interactionsByPhase: {
      creativeProjects: [project],
      presentPerform: [progress, share],
    },
    slides: [
      {
        id: `${prefix}-slide-project`,
        kind: 'app-route',
        phase: 'creativeProjects',
        presetId: 'personal-project-time',
        title: COPY.projectTitle,
        prompt: COPY.projectPrompt,
        interactionId: project.id,
        ...withTimer(projectMinutes),
      },
      {
        id: `${prefix}-slide-progress`,
        kind: 'interaction',
        phase: 'presentPerform',
        presetId: 'question',
        title: COPY.presentTitle,
        prompt: COPY.presentPrompt,
        interactionIds: [progress.id],
      },
      {
        id: `${prefix}-slide-share`,
        kind: 'showcase',
        phase: 'presentPerform',
        presetId: 'share-day',
        title: COPY.shareTitle,
        prompt: COPY.sharePrompt,
        interactionId: share.id,
      },
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
    },
  };
};

/** The Group Project interaction for the chosen role, or null if it can't run. */
const groupInteraction = (
  id: string,
  plan: CortexLessonPlan,
  choices: CortexLessonChoices,
): { interaction: Interaction; prompt: LocalizedText } | null => {
  switch (choices.role) {
    case 'promoter': {
      const board = plan.promoter;
      if (!board) return null;
      const task = promoterTask(plan.focus.label, board.goal);
      return {
        prompt: task,
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
  const { focus, showcase } = plan;

  const checkIn: Interaction = {
    id: ids.checkIn,
    type: 'check-in',
    question:
      choices.checkInQuestion ?? CHECK_IN_QUESTION[choices.checkInStyle],
    // Rule 2: check-ins never reach the projector.
    shareable: false,
    checkIn: { style: choices.checkInStyle },
  };
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

  const showcaseSlides: Slide[] = [
    {
      id: `${prefix}-slide-showcase`,
      kind: 'content',
      phase: 'connectRegulate',
      presetId: 'artist-spotlight',
      title: { en: focus.label, es: focus.label },
      prompt:
        focus.kind === 'artist' ? COPY.showcaseArtist : COPY.showcasePlace,
      ...(showcase.facts.length > 0
        ? { body: showcaseBody(showcase.facts) }
        : {}),
      ...(showcase.visual ? { media: showcase.visual } : {}),
      accent: showcase.accent,
    },
  ];
  if (showcase.listen) {
    const { listen } = showcase;
    showcaseSlides.push({
      id: `${prefix}-slide-listen`,
      kind: 'media',
      phase: 'connectRegulate',
      title: listenTitle(listen.title),
      prompt: {
        en: `${listen.caption} — ${COPY.listenPrompt.en}`,
        es: `${listen.caption} — ${COPY.listenPrompt.es}`,
      },
      media: {
        type: 'youtube',
        videoId: listen.videoId,
        ...(listen.startSec !== undefined ? { startSec: listen.startSec } : {}),
      },
      ...(showcase.visual ? { sideMedia: showcase.visual } : {}),
      accent: showcase.accent,
    });
  }

  const shared = projectAndPresent(prefix, choices.projectMinutes);

  return {
    interactionsByPhase: {
      connectRegulate: vibe ? [checkIn, vibe] : [checkIn],
      groupPractice: [group.interaction],
      ...shared.interactionsByPhase,
    },
    slides: [
      {
        id: `${prefix}-slide-connection`,
        kind: 'interaction',
        phase: 'connectRegulate',
        presetId: 'greeting-check-in',
        title: COPY.connectionTitle,
        prompt: todayWith(focus),
        interactionIds: vibe ? [checkIn.id, vibe.id] : [checkIn.id],
        ...(vibe ? { reveal: 'bars' as const } : {}),
      },
      ...showcaseSlides,
      {
        id: `${prefix}-slide-group`,
        kind: 'app-route',
        phase: 'groupPractice',
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

/** Random suffix, so regenerating a Day never reuses an interaction id. */
const freshToken = (): string =>
  Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0');

const NOTES_HEADER = '— Cortex lesson —';

/** The Connect cell's notes: the generator's block, then the teacher's own. */
const notesWith = (existing: string, plan: CortexLessonPlan): string => {
  // Drop a block an earlier generation wrote, keep everything after it.
  const own = existing.startsWith(NOTES_HEADER)
    ? existing.split('\n\n').slice(1).join('\n\n')
    : existing;
  const block = [NOTES_HEADER, ...plan.notes].join('\n');
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
      ...(phase === 'connectRegulate'
        ? {
            rationale: {
              ...cell.rationale,
              notes: notesWith(cell.rationale.notes, plan),
            },
          }
        : {}),
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

/**
 * The deck every new Day starts with, before a focus is chosen: the same five
 * parts, as content slides with general copy. No interactions, on purpose: a
 * cell with an interaction counts as filled in (`isCellPopulated`), so a
 * blank Day must not carry any, or seeding it would skip those cells. The
 * Individual Project's Studio library opens from a launch tile instead;
 * "Generate from Cortex" adds the check-in, the Group Project and the
 * Present slides' responses.
 */
export const buildCortexLessonSkeleton = (dayId: string): SlideDeck => {
  const prefix = `${dayId}-cx`;
  const section = (
    key: string,
    phase: Slide['phase'],
    title: LocalizedText,
    prompt: LocalizedText,
    presetId = 'section',
  ): Slide => ({
    id: `${prefix}-slide-${key}`,
    kind: 'content',
    phase,
    presetId,
    title,
    prompt,
  });
  return {
    id: `${dayId}-deck`,
    title: { en: 'Lesson', es: 'Lección' },
    slides: [
      section(
        'connection',
        'connectRegulate',
        COPY.connectionTitle,
        CHECK_IN_QUESTION.emoji,
      ),
      section(
        'showcase',
        'connectRegulate',
        COPY.showcaseTitle,
        COPY.showcaseOpen,
      ),
      section('group', 'groupPractice', COPY.groupTitle, COPY.groupOpen),
      {
        ...section(
          'project',
          'creativeProjects',
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
        COPY.presentTitle,
        COPY.presentPrompt,
        'share-day',
      ),
    ],
    templateRef: { templateId: CORTEX_LESSON_TEMPLATE_ID },
  };
};

/** The prep checklist for a new Day's Connect cell notes (teacher-only). */
export const cortexLessonTeacherNotes = (): string => PREP_CHECKLIST;

/** Whether a deck is a Cortex lesson that still needs its focus generated. */
export const isUngeneratedCortexDeck = (deck: SlideDeck | undefined): boolean =>
  deck?.templateRef?.templateId === CORTEX_LESSON_TEMPLATE_ID &&
  !deck.templateRef.focusId;
