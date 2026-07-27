/**
 * "Genre Lesson" — the Phase 2 deck template. Turns one GCM genre×level into an
 * interactive session that routes students into the REAL curriculum:
 *
 *   welcome + overview → warm-up theory (app-route) → a station app-route per
 *   ActivityFlow section (Melody/Chords/Bass/Play-Along) → question → exit poll.
 *
 * Pure and SYNCHRONOUS: the async `getActivityFlow` fetch happens in the wizard,
 * which passes the resolved `flow` (and the theory `theoryMode` from
 * `getModesForGenreLevel`) in. Never serialize flow copy into slides — an
 * `ActivityStep` carries an `assessment` field that would trip the firewall;
 * only step COUNTS and section ids are read. All student-facing copy is freshly
 * authored bilingual (`GenreLevelProfile` copy is English-only) and must avoid
 * `FORBIDDEN_SUBSTRINGS` (en AND es).
 */
import type { CurriculumGenreId } from '@/curriculum/bridge/genreIdMap';
import type {
  ActivityFlow,
  ActivitySectionId,
} from '@/curriculum/types/activity';
import type { GCMKey } from '@/curriculum/types/curriculum';
import type { GenreProfile } from '@/curriculum/types/genreProfile';
import { PHASES, type PhaseKey } from '../../phases';
import { newBlankDay } from '../../plan/newBlankDay';
import type { Day, Interaction, LocalizedText } from '../../types';
import type { Slide } from '../types';
import {
  DEFAULT_SONG_SESSION_PARAMS,
  type SongSessionParams,
} from './songSession';

export const GENRE_LESSON_TEMPLATE_ID = 'genre-lesson-v1';

/** Genre decks reuse the song-session param shape; mediaPrompt/includeAppRoute are ignored. */
export type GenreLessonParams = SongSessionParams;

export const DEFAULT_GENRE_LESSON_PARAMS: SongSessionParams = {
  ...DEFAULT_SONG_SESSION_PARAMS,
  question: {
    type: 'choice',
    question: {
      en: 'Which station was your favorite?',
      es: '¿Qué estación fue tu favorita?',
    },
    options: [
      { en: 'Melody', es: 'Melodía' },
      { en: 'Chords', es: 'Acordes' },
      { en: 'Bass', es: 'Bajo' },
      { en: 'Play-Along', es: 'Toca con la pista' },
    ],
  },
};

/** Fixed bilingual station labels — NEVER read `flow.sections[i].name` (unaudited). */
const STATION_LABELS: Record<ActivitySectionId, LocalizedText> = {
  A: { en: 'Melody', es: 'Melodía' },
  B: { en: 'Chords', es: 'Acordes' },
  C: { en: 'Bass', es: 'Bajo' },
  D: { en: 'Play-Along', es: 'Toca con la pista' },
};

/** IMPACT phase that owns each station's app-route slide. */
const SECTION_PHASE: Record<ActivitySectionId, PhaseKey> = {
  A: 'groupPractice',
  B: 'groupPractice',
  C: 'creativeProjects',
  D: 'presentPerform',
};

export interface GenreLessonInput {
  gcmKey: GCMKey;
  profile: GenreProfile;
  /** Pre-fetched by the wizard (`getActivityFlow` is async). */
  flow: ActivityFlow;
  /** Theory mode for the warm-up suggestion (from `getModesForGenreLevel`); omit to skip it. */
  theoryMode?: string;
  params?: Partial<SongSessionParams>;
}

export interface GenreLessonContent {
  interactionsByPhase: Partial<Record<PhaseKey, Interaction[]>>;
  slides: Slide[];
}

const parseGcmKey = (
  gcmKey: GCMKey,
): { genre: CurriculumGenreId; levelId: string; levelNum: 1 | 2 | 3 } => {
  const i = gcmKey.lastIndexOf(':');
  const genre = gcmKey.slice(0, i) as CurriculumGenreId;
  const levelId = gcmKey.slice(i + 1); // 'L1'
  const levelNum = Number(levelId.replace(/^L/i, '')) as 1 | 2 | 3;
  return { genre, levelId, levelNum };
};

export const buildGenreLessonContent = (
  idPrefix: string,
  input: GenreLessonInput,
): GenreLessonContent => {
  const params: SongSessionParams = {
    ...DEFAULT_GENRE_LESSON_PARAMS,
    ...input.params,
  };
  const { genre, levelId, levelNum } = parseGcmKey(input.gcmKey);
  const lvl = input.profile.levels[levelNum];
  const displayName = input.profile.displayName;

  const interactionsByPhase: Partial<Record<PhaseKey, Interaction[]>> = {};
  const slides: Slide[] = [];
  const push = (phase: PhaseKey, interaction: Interaction) => {
    (interactionsByPhase[phase] ??= []).push(interaction);
  };

  // --- Connect: welcome + check-in + station overview ---
  const checkIn: Interaction = {
    id: `${idPrefix}-ix-arrive`,
    type: 'check-in',
    question: params.checkInQuestion,
    shareable: false,
    checkIn: { style: params.checkInStyle },
  };
  push('connectRegulate', checkIn);

  slides.push({
    id: `${idPrefix}-slide-welcome`,
    kind: 'content',
    phase: 'connectRegulate',
    variant: 'welcome',
    title: { en: displayName, es: displayName },
    body: {
      en: `Level ${levelNum} · ${lvl.keyCenter} · ${lvl.tempoRange}`,
      es: `Nivel ${levelNum} · ${lvl.keyCenter} · ${lvl.tempoRange}`,
    },
  });
  slides.push({
    id: `${idPrefix}-slide-checkin`,
    kind: 'interaction',
    phase: 'connectRegulate',
    title: { en: 'How are you today?', es: '¿Cómo estás hoy?' },
    interactionIds: [checkIn.id],
  });

  const presentSections = input.flow.sections.filter((s) => s.steps.length > 0);
  const stationChain = presentSections
    .map((s) => STATION_LABELS[s.id])
    .filter(Boolean);
  slides.push({
    id: `${idPrefix}-slide-overview`,
    kind: 'content',
    phase: 'connectRegulate',
    variant: 'section',
    title: { en: "Today's stations", es: 'Las estaciones de hoy' },
    body: {
      en: stationChain.map((l) => l.en).join(' → '),
      es: stationChain.map((l) => l.es).join(' → '),
    },
  });

  // --- Group Practice: warm-up theory (conditional) ---
  if (input.theoryMode) {
    const theory: Interaction = {
      id: `${idPrefix}-ix-theory`,
      type: 'atlas',
      question: {
        en: 'Play the warm-up scale one time.',
        es: 'Toca la escala de calentamiento una vez.',
      },
      shareable: false,
      atlas: {
        module: 'learn',
        activityRef: `learn:${input.theoryMode}:${lvl.keyCenter}`,
        expects: 'completion',
      },
    };
    push('groupPractice', theory);
    slides.push({
      id: `${idPrefix}-slide-theory`,
      kind: 'app-route',
      phase: 'groupPractice',
      title: { en: 'Warm up with theory', es: 'Calienta con teoría' },
      prompt: {
        en: 'Tap Launch, play the scale one time through, then come back.',
        es: 'Toca Iniciar, toca la escala una vez completa y vuelve.',
      },
      interactionId: theory.id,
    });
  }

  // --- Stations: one app-route per present section ---
  for (const section of presentSections) {
    const phase = SECTION_PHASE[section.id];
    const label = STATION_LABELS[section.id];
    const ix: Interaction = {
      id: `${idPrefix}-ix-sec-${section.id}`,
      type: 'atlas',
      question: {
        en: `Finish the ${label.en} station.`,
        es: `Termina la estación de ${label.es}.`,
      },
      shareable: false,
      atlas: {
        module: 'learn',
        activityRef: `curriculum:${genre}:${levelId}:${section.id}`,
        expects: 'completion',
      },
    };
    push(phase, ix);
    slides.push({
      id: `${idPrefix}-slide-sec-${section.id}`,
      kind: 'app-route',
      phase,
      title: { en: `Station: ${label.en}`, es: `Estación: ${label.es}` },
      prompt: {
        en: `${section.steps.length} short activities. Tap Launch, then come back when you finish.`,
        es: `${section.steps.length} actividades cortas. Toca Iniciar y vuelve cuando termines.`,
      },
      interactionId: ix.id,
    });
  }

  // --- Present: response question ---
  const isChoice = params.question.type === 'choice';
  const question: Interaction = {
    id: `${idPrefix}-ix-question`,
    type: params.question.type,
    question: params.question.question,
    shareable: true,
    ...(isChoice
      ? {
          choice: {
            options:
              params.question.options ??
              DEFAULT_GENRE_LESSON_PARAMS.question.options ??
              [],
            multi: false,
          },
        }
      : { text: { maxLen: 240 } }),
  };
  push('presentPerform', question);
  slides.push({
    id: `${idPrefix}-slide-question`,
    kind: 'interaction',
    phase: 'presentPerform',
    title: { en: 'Your turn', es: 'Te toca' },
    interactionIds: [question.id],
    reveal: isChoice ? 'bars' : 'wall',
  });

  // --- Reflect: exit poll ---
  const exitText: Interaction = {
    id: `${idPrefix}-ix-exit-text`,
    type: 'text',
    question: params.exitLearned,
    shareable: true,
    text: { maxLen: 240 },
  };
  const exitCheckIn: Interaction = {
    id: `${idPrefix}-ix-exit-feel`,
    type: 'check-in',
    question: params.exitFeeling,
    shareable: false,
    checkIn: { style: params.checkInStyle },
  };
  push('respondReflectReset', exitText);
  push('respondReflectReset', exitCheckIn);
  slides.push({
    id: `${idPrefix}-slide-exit`,
    kind: 'interaction',
    phase: 'respondReflectReset',
    title: { en: 'Before you go', es: 'Antes de irte' },
    prompt: params.exitLearned,
    interactionIds: [exitText.id, exitCheckIn.id],
    reveal: 'wall',
  });

  return { interactionsByPhase, slides };
};

/** Student-safe bilingual cell copy for a genre lesson. */
const cellCopyForGenre = (
  displayName: string,
  params: SongSessionParams,
): Record<PhaseKey, { title: LocalizedText; prompt: LocalizedText }> => ({
  connectRegulate: {
    title: { en: 'Welcome', es: 'Bienvenidos' },
    prompt: {
      en: `Today we explore the sound of ${displayName}.`,
      es: `Hoy exploramos el sonido de ${displayName}.`,
    },
  },
  groupPractice: {
    title: { en: 'Learn the sound', es: 'Aprende el sonido' },
    prompt: {
      en: 'Work through the stations at your own pace.',
      es: 'Avanza por las estaciones a tu propio ritmo.',
    },
  },
  creativeProjects: {
    title: { en: 'Make It Yours', es: 'Hazlo Tuyo' },
    prompt: {
      en: 'Bring the bass line to life your own way.',
      es: 'Dale vida a la línea de bajo a tu manera.',
    },
  },
  presentPerform: {
    title: { en: 'Share the Sound', es: 'Comparte el Sonido' },
    prompt: {
      en: 'Play along and show a partner your favorite part.',
      es: 'Toca con la pista y muéstrale a un compañero tu parte favorita.',
    },
  },
  respondReflectReset: {
    title: { en: 'Reflect', es: 'Reflexiona' },
    prompt: params.exitLearned,
  },
});

/**
 * Generate a complete Genre Lesson Day. Same shape/flow as `buildSongSessionDay`
 * (newBlankDay → fill cells → attach deck), running the exact PlanPage go-live path.
 */
export function buildGenreLessonDay(input: GenreLessonInput): Day {
  const params: SongSessionParams = {
    ...DEFAULT_GENRE_LESSON_PARAMS,
    ...input.params,
  };
  const { levelNum } = parseGcmKey(input.gcmKey);
  const displayName = input.profile.displayName;
  const label = `${displayName} — Level ${levelNum}`;

  const day = newBlankDay(label);
  const { interactionsByPhase, slides } = buildGenreLessonContent(day.id, {
    ...input,
    params,
  });
  const copy = cellCopyForGenre(displayName, params);

  for (const phase of PHASES) {
    const cell = day.cells[phase];
    const interactions = interactionsByPhase[phase];
    day.cells[phase] = {
      ...cell,
      presentation: {
        ...cell.presentation,
        title: copy[phase].title,
        prompt: copy[phase].prompt,
        ...(interactions ? { interactions: [...interactions] } : {}),
      },
    };
  }

  const deckTitle: LocalizedText = {
    en: `${displayName} — Level ${levelNum}`,
    es: `${displayName} — Nivel ${levelNum}`,
  };

  return {
    ...day,
    deck: {
      id: `${day.id}-deck`,
      title: deckTitle,
      slides,
      templateRef: {
        templateId: GENRE_LESSON_TEMPLATE_ID,
        gcmKey: input.gcmKey,
      },
    },
  };
}
