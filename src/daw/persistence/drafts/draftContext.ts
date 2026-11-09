import { getTutorial } from '@/daw/components/Tutorial/tutorials';
import { CONTEXT_KEYS } from '@/daw/persistence/projectDocument/fields';
import { getSessionDeps } from '@/daw/session/sessionDeps';
import { useStore, type AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import type {
  GenrePracticeSession,
  PracticeKeyboard,
  PracticeKeyboardView,
  PracticeSession,
  TheoryPracticeSession,
} from '@/daw/store/uiSlice';
import type { DraftContext } from '@/lib/studio-projects/drafts/types';

// ── A draft's lesson and practice context (milestone 1.15) ─────────────────
//
// A refresh used to end the lesson and drop the practice screen: neither is
// part of the project, so the body never held them (state-reload-17,
// shell-16, practice-tutorial-02, -05, ia-flows-28). They ride in the
// draft's meta instead (DraftContext; the registry's CONTEXT_KEYS, and the
// practice screen as the view). The autosave records draftContextOf()
// with every write of the live draft, and applyPreparedDraft puts it back
// with restoreDraftContext() when that same draft opens again: a refresh, a
// resume, Restore of kept work, the draft from Projects. Every other open
// resets the lesson and the practice session with the rest of the session
// (resetOnNew), so neither follows the student into another project, and
// nobody who opens the project's cloud copy lands in them.
//
// A lesson comes back at its step with the view its draft kept, so the
// step's preconditions aren't applied again (tutorialStepPrepared); its
// check arms on the restored project, as on any arrival. What a draft holds
// is checked before it is used: a lesson this build doesn't have, or one the
// student's plan no longer opens, is left out, and so is a practice session
// of any other shape or with a "Back to lesson" outside the app.

/** The context the live session leaves in its draft; undefined for none. */
export function draftContextOf(
  state: AllSlices = useStore.getState(),
): DraftContext | undefined {
  const context: DraftContext = {};
  if (state.activeTutorialId !== null) {
    context.tutorial = {
      id: state.activeTutorialId,
      stepIndex: state.tutorialStepIndex,
    };
  }
  if (state.practiceSession !== null) {
    context.practiceSession = state.practiceSession;
    if (state.practiceKeyboard !== null) {
      context.practiceKeyboard = state.practiceKeyboard;
    }
    if (state.currentView === 'practice') context.view = 'practice';
  }
  return context.tutorial || context.practiceSession ? context : undefined;
}

/** Whether a store write moved anything draftContextOf records. */
export function draftContextChanged(
  state: AllSlices,
  prev: AllSlices,
): boolean {
  for (const key of CONTEXT_KEYS) {
    if (state[key] !== prev[key]) return true;
  }
  return (
    state.practiceSession !== null && state.currentView !== prev.currentView
  );
}

/** What restoreDraftContext put back. */
export interface RestoredContext {
  /** The lesson resumed; `stepIndex` counts from 0. */
  lesson: { id: string; stepIndex: number; steps: number } | null;
  practice: boolean;
}

/**
 * Put a draft's context back into the session just loaded from its body
 * (applyPreparedDraft, inside the open's seed): the lesson at its step, the
 * practice session, its keyboard and screen. Whatever doesn't check out is
 * left out.
 */
export function restoreDraftContext(context: unknown): RestoredContext {
  const restored: RestoredContext = { lesson: null, practice: false };
  if (!isRecord(context)) return restored;
  const store = useStore.getState();

  const lesson = lessonOf(context.tutorial);
  if (lesson) {
    store.resumeTutorial(lesson.id, lesson.stepIndex);
    restored.lesson = lesson;
  }

  const session = practiceSessionOf(context.practiceSession, store.tracks);
  if (session) {
    store.setPracticeSession(session);
    const keyboard = practiceKeyboardOf(context.practiceKeyboard);
    if (keyboard) store.setPracticeKeyboard(keyboard);
    // The body opened on Create (the codec can't reopen practice without
    // its session): the screen comes back now that the session has.
    if (context.view === 'practice') store.setCurrentView('practice');
    restored.practice = true;
  }
  return restored;
}

// ── Checks ─────────────────────────────────────────────────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const isNumberOrNull = (v: unknown): v is number | null =>
  v === null || isNumber(v);
const isStringOrNull = (v: unknown): v is string | null =>
  v === null || isString(v);
const listOf =
  <T>(item: (v: unknown) => v is T) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(item);
const isStrings = listOf(isString);
const isNumbers = listOf(isNumber);

/** The lesson to resume, at a step it has, when this build may open it. */
function lessonOf(value: unknown): RestoredContext['lesson'] {
  if (!isRecord(value) || !isString(value.id)) return null;
  const tutorial = getTutorial(value.id);
  if (!tutorial || tutorial.steps.length === 0) return null;
  // A Premium lesson the student's plan no longer opens stays closed
  // (decision 8: Prism isn't unlocked in lessons).
  if (getSessionDeps()?.lessonAccess(tutorial.id) === 'upgrade') return null;
  const index = Number.isInteger(value.stepIndex)
    ? (value.stepIndex as number)
    : 0;
  return {
    id: tutorial.id,
    stepIndex: Math.min(Math.max(0, index), tutorial.steps.length - 1),
    steps: tutorial.steps.length,
  };
}

/** A path inside this app: "Back to lesson" never leaves it. */
const isAppPath = (v: unknown): v is string =>
  isString(v) && v.startsWith('/') && !v.startsWith('//') && !v.includes('\\');

const isScale = (v: unknown) =>
  isRecord(v) &&
  isString(v.id) &&
  isString(v.title) &&
  isNumbers(v.intervals) &&
  isStrings(v.degrees) &&
  isStrings(v.names);

const isVoicingSet = (v: unknown) =>
  isRecord(v) &&
  isString(v.id) &&
  isString(v.label) &&
  Array.isArray(v.voicings) &&
  v.voicings.every((voicing) => voicing === null || isNumbers(voicing));

const STUDENT_PARTS = new Set(['melody', 'chords', 'bass']);
const SECTIONS = new Set(['A', 'B', 'C', 'D']);

function isTheorySession(v: Record<string, unknown>): boolean {
  return (
    isString(v.mode) &&
    v.mode !== '' &&
    isString(v.rootParam) &&
    (v.level === 1 || v.level === 2 || v.level === 3) &&
    (v.openTrack === 'melody' || v.openTrack === 'chords')
  );
}

/** A chart as Hear It with Your Band keeps it (uiSlice LiteracyPracticeChart). */
const isChart = (v: unknown) =>
  isRecord(v) &&
  isStrings(v.chords) &&
  (v.harmony === 'triads' || v.harmony === 'sevenths') &&
  isString(v.tonic) &&
  (v.mode === 'major' || v.mode === 'minor');

/** A band playing the student's chart: absent, or every field in place. */
const isLiteracyBand = (v: unknown) =>
  v === undefined ||
  (isRecord(v) &&
    isString(v.band) &&
    isString(v.bandName) &&
    isString(v.variation) &&
    isString(v.styleName) &&
    isChart(v.chart) &&
    isString(v.keyName) &&
    Array.isArray(v.charts) &&
    v.charts.every((c) => isRecord(c) && isString(c.id) && isChart(c.chart)));

function isGenreSession(v: Record<string, unknown>): boolean {
  return (
    isString(v.genre) &&
    isString(v.genreLabel) &&
    isNumber(v.level) &&
    SECTIONS.has(v.section as string) &&
    isString(v.sectionName) &&
    isString(v.keyLabel) &&
    Array.isArray(v.scales) &&
    v.scales.every(isScale) &&
    isStrings(v.chordCycle) &&
    (v.voicingSets === null ||
      (Array.isArray(v.voicingSets) && v.voicingSets.every(isVoicingSet))) &&
    isStringOrNull(v.defaultVoicing) &&
    isNumberOrNull(v.bassFloor) &&
    Array.isArray(v.studentParts) &&
    v.studentParts.length > 0 &&
    v.studentParts.every((part) => STUDENT_PARTS.has(part as string)) &&
    isRecord(v.keyboard) &&
    isNumber(v.keyboard.startC) &&
    isNumber(v.keyboard.endC) &&
    isNumber(v.scaleTonic) &&
    isStrings(v.prompts) &&
    isAppPath(v.returnTo) &&
    isLiteracyBand(v.literacy)
  );
}

/**
 * A stored practice session, as a fresh copy, when it has the shape the
 * practice screen reads. A student track it names that isn't a MIDI track
 * of this project is left out (the screen falls back, practiceStudentTrack).
 */
export function practiceSessionOf(
  value: unknown,
  tracks: readonly Track[],
): PracticeSession | null {
  if (!isRecord(value)) return null;
  const valid =
    value.kind === 'theory'
      ? isTheorySession(value)
      : value.kind === 'genre'
        ? isGenreSession(value)
        : false;
  if (!valid) return null;
  const session = structuredClone(value) as unknown as
    | TheoryPracticeSession
    | GenrePracticeSession;
  const student = session.studentTrackId;
  if (
    student !== undefined &&
    !tracks.some((t) => t.id === student && t.type === 'midi')
  ) {
    delete session.studentTrackId;
  }
  return session;
}

const KEYBOARD_VIEWS = new Set<PracticeKeyboardView>([
  'scales',
  'chords',
  'bass',
]);

function practiceKeyboardOf(value: unknown): PracticeKeyboard | null {
  if (!isRecord(value)) return null;
  const view = KEYBOARD_VIEWS.has(value.view as PracticeKeyboardView)
    ? (value.view as PracticeKeyboardView)
    : null;
  const scaleId = isString(value.scaleId) ? value.scaleId : null;
  return view === null && scaleId === null ? null : { view, scaleId };
}
