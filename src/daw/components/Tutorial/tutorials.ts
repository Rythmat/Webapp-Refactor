import type { AllSlices } from '@/daw/store';
import type { ViewType, ChannelStripTabId } from '@/daw/store/uiSlice';
import type { SynthStore } from '@/daw/oracle-synth/store';
import type { InspectorPanelId } from '@/daw/shell/layout/layoutModel';
import type { PromptBarSnapshot } from '@/daw/shell/prompt/promptBarStore';
import type { AnchorRack } from './anchorRegistry';
import type { RackTarget } from '@/daw/store/effectRack';
import type { DemoBeat } from './demo/demoTypes';
import { studioBasicsSteps } from './studioBasics/studioBasicsLesson';
import { edmSteps } from './skills/edm';
import { hiphopSteps } from './skills/hiphop';
import { houseSteps } from './skills/house';
import { indieSteps } from './skills/indie';
import { jazzSteps } from './skills/jazz';
import { rnbSteps } from './skills/rnb';
import type {
  StudioLesson,
  StudioLessonStep,
} from '@/content/studioLessons/schemas';
import { getStudioLesson } from '@/curriculum/engine/studioLessons/registry';
import { buildNamedCheck } from './checkRegistry';
import {
  currentLessonId,
  fileCatalogEntry,
  listTutorialCatalog,
  TUTORIAL_CATALOG,
  type TutorialCatalogEntry,
  type TutorialId,
} from './tutorialCatalog';

export type { TutorialDifficulty } from './tutorialCatalog';
export type {
  DemoAction,
  DemoBeat,
  DemoKeyPress,
  DemoRun,
} from './demo/demoTypes';

// ── Tutorial data model ────────────────────────────────────────────────────
// Step-by-step, "Duolingo for the Studio" lessons. Each step spotlights a
// region of the Studio (by data-tutorial-id) and — when it declares a `check`
// — auto-advances the moment the store reflects the correct adjustment.
//
// Mirrors the shape of the Atlas guided-tour data (guidedTours.ts): an ordered
// list of steps with a title + blurb, but targeting DOM regions and Studio
// state instead of a globe camera.
//
// A lesson's tile copy (title, subtitle, difficulty, length) and whether it
// needs Premium live in tutorialCatalog.ts, which the Studio dashboard reads
// without loading these steps; this file adds the steps by lesson id. Studio
// Basics keeps its steps in studioBasics/, the skills lessons in skills/.
//
// A step may show before it asks: its `demo` (demo/demoTypes.ts) plays as
// the step arrives, a cursor doing the move on the real Studio, and the
// step's check is armed only once it is the student's turn. A step with no
// demo runs as it always has.

/** Preconditions applied (via store setters) when a step becomes active. */
export interface StepRequires {
  view?: ViewType;
  libraryOpen?: boolean;
  /**
   * The dock's tab to show, or null to shut the dock (the timeline and the
   * track list then take its room).
   */
  channelStripTab?: ChannelStripTabId | null;
  /**
   * Clear the global clip selection so the piano roll opens in blank mode on
   * the SELECTED track (it otherwise edits the selected clip regardless of
   * which track that clip belongs to).
   */
  clearClipSelection?: boolean;
  /** Force the automation lane's selected paramId so a lane-drawing step targets
   *  the parameter it teaches regardless of the prior selection. */
  automationParam?: string;
  /**
   * Open the Add effect picker, whose cards (the fx-add-* anchors) add
   * effects to the rack in front of the student; the dock's chain has none
   * of its own.
   */
  effectsLibrary?: boolean;
  /**
   * Unfold the instrument view's menu column (the sounds every MIDI
   * instrument lists, and the drums' kits and grooves), which folds to a
   * rail (dockSidePanels.ts).
   */
  soundsOpen?: boolean;
  /** Open the Mix view's RackDock on this rack (milestone 2.10). */
  mixRack?: RackTarget;
  /**
   * Open (true) or fold (false) Prism, the prompt bar over the lanes, which
   * starts folded: a step that types into it opens it when the student
   * isn't being taught where it lives.
   */
  promptOpen?: boolean;
  /** Open the Inspector on this side-rail panel (Insight, Library, …). */
  inspector?: InspectorPanelId;
}

/**
 * `check` is evaluated against the live store on every change. `armed` is the
 * store snapshot captured when the step became active, so a step can require a
 * *change* (e.g. "add a chord") rather than an absolute value. Returning true
 * marks the step complete and advances. Omit `check` for a free-form step that
 * advances only when the user clicks Next.
 */
export type StepCheck = (s: AllSlices, armed: AllSlices) => boolean;

/**
 * Like `check`, but evaluated against the Oracle Synth's own store
 * (`useSynthStore`), which holds the selected track's live patch (presetName,
 * oscillators, LFOs, …) and is NOT mirrored into the main store. Use for steps
 * like "load the Wobble preset". A validated step declares `check` OR
 * `synthCheck` (not both).
 */
export type SynthStepCheck = (
  synth: SynthStore,
  armedSynth: SynthStore,
) => boolean;

export interface TutorialStep {
  id: string;
  /** Section label shown in the coach card, e.g. "STAGE 2 — KEY". */
  stage: string;
  /** Instruction body. Supports **bold** via double-asterisks. */
  instruction: string;
  /**
   * Why the step matters, in one plain sentence: what the student gains by
   * it in a song of their own, shown under the instruction.
   */
  why?: string;
  /** Optional secondary line. */
  hint?: string;
  /** data-tutorial-id(s) of the region to spotlight. When an array, the first
   *  id currently on screen wins — e.g. a button, then a modal card that
   *  appears after it's clicked. Omit for a centered card, no ring. Renamed
   *  ids resolve through ANCHOR_ALIASES (anchorRegistry.ts). */
  target?: string | string[];
  /** Which effect rack an `fx-add-*` target means. The FX list is mounted per
   *  rack with the same ids; the default is the selected track's dock. */
  rack?: AnchorRack;
  requires?: StepRequires;
  check?: StepCheck;
  synthCheck?: SynthStepCheck;
  promptCheck?: PromptStepCheck;
  /**
   * A "watch me" demonstration played when the step arrives, before the
   * student's turn (demo/demoTypes.ts has the beats and the conventions).
   * `check` and `synthCheck` are armed only after it, against the Studio as
   * it left it, so the demo's own moves never pass the step.
   */
  demo?: readonly DemoBeat[];
}

/**
 * Like `check`, but evaluated against Prism's own store (the prompt bar's,
 * promptBarStore.ts): whether it is open, what it is doing. Its parts land
 * in the main store, so "Prism wrote chords" is a `check`; "Prism is open"
 * is this.
 */
export type PromptStepCheck = (
  bar: PromptBarSnapshot,
  armedBar: PromptBarSnapshot,
) => boolean;

/** A lesson: its catalog entry plus its steps. */
export interface Tutorial extends TutorialCatalogEntry {
  steps: TutorialStep[];
}

// ── Lessons ────────────────────────────────────────────────────────────────

/** Each lesson's steps, by its id in TUTORIAL_CATALOG. */
const LESSON_STEPS: Record<TutorialId, TutorialStep[]> = {
  'studio-basics': studioBasicsSteps,

  // ── The skills: one craft each, in a genre, from a blank project ───────
  'hiphop-build-the-beat': hiphopSteps,
  'house-make-it-pump': houseSteps,
  'edm-design-the-drop': edmSteps,
  'jazz-color-your-chords': jazzSteps,
  'rnb-mix-and-polish': rnbSteps,
  'indie-movement-and-dynamics': indieSteps,
};

/** Every code lesson, in catalog order, with its steps. */
export const TUTORIALS: Tutorial[] = TUTORIAL_CATALOG.map((entry) => ({
  ...entry,
  steps: LESSON_STEPS[entry.id],
}));

// ── Lessons written in the console ─────────────────────────────────────────
// A console lesson (curriculum/engine/studioLessons) is data: its steps name
// what they check, a code step's check by its lesson and step id or a
// ready-made one (checkRegistry.ts). They are built into steps like the
// code's here, and one with a code lesson's id replaces that lesson.

/** A code lesson's step, by lesson and step id. */
export function codeStep(
  lessonId: string,
  stepId: string,
): TutorialStep | undefined {
  return Object.prototype.hasOwnProperty.call(LESSON_STEPS, lessonId)
    ? LESSON_STEPS[lessonId as TutorialId].find((st) => st.id === stepId)
    : undefined;
}

function warnUnresolved(lesson: string, step: string, what: string) {
  if (import.meta.env.DEV) {
    console.warn(
      `[studio lesson] ${lesson} › ${step}: ${what} not found; the step advances on Next.`,
    );
  }
}

/** A console lesson's step, as a step the lesson layer runs. */
function stepFromFile(lessonId: string, step: StudioLessonStep): TutorialStep {
  const { check, demo, requires, rack, ...rest } = step;
  const built: TutorialStep = { ...rest };
  if (requires) built.requires = requires as StepRequires;
  if (rack) built.rack = rack as AnchorRack;
  if (check?.kind === 'code') {
    const code = codeStep(check.lesson, check.step);
    if (code?.check) built.check = code.check;
    if (code?.synthCheck) built.synthCheck = code.synthCheck;
    if (code?.promptCheck) built.promptCheck = code.promptCheck;
    if (!code)
      warnUnresolved(lessonId, step.id, `${check.lesson}/${check.step}`);
  } else if (check?.kind === 'named') {
    const named = buildNamedCheck(check.name, check.params);
    if (named?.check) built.check = named.check;
    if (named?.synthCheck) built.synthCheck = named.synthCheck;
    if (!named) warnUnresolved(lessonId, step.id, `check "${check.name}"`);
  }
  if (demo) {
    const code = codeStep(demo.lesson, demo.step);
    if (code?.demo) built.demo = code.demo;
    else warnUnresolved(lessonId, step.id, `demo ${demo.lesson}/${demo.step}`);
  }
  return built;
}

/** A console lesson, built. */
export function tutorialFromFile(lesson: StudioLesson): Tutorial {
  return {
    ...fileCatalogEntry(lesson),
    steps: lesson.steps.map((st) => stepFromFile(lesson.id, st)),
  };
}

/** A lesson by id: the console's when there is one, else the code's. */
export function getTutorial(id: string | null): Tutorial | null {
  if (!id) return null;
  const current = currentLessonId(id);
  const file = getStudioLesson(current);
  if (file) return tutorialFromFile(file);
  return TUTORIALS.find((t) => t.id === current) ?? null;
}

/** Every lesson, console ones included, in catalog order. */
export function listTutorials(): Tutorial[] {
  return listTutorialCatalog().flatMap((entry) => {
    const lesson = getTutorial(entry.id);
    return lesson ? [lesson] : [];
  });
}
