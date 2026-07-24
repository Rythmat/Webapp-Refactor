/**
 * "Song Session" — the Phase 1 deck template. Turns one song into a complete
 * interactive session Day:
 *
 *   welcome title card → emotional check-in → media slide (YouTube + featured
 *   visual) → response question → exit poll (learned + feeling).
 *
 * Interactions live in the owning cells (`cells[phase].presentation
 * .interactions`) and slides reference them by id, so the whole response
 * pipeline (aggregation, share/reveal, reports, CSV) works unmodified.
 *
 * Firewall discipline: every string authored here is student-safe bilingual
 * copy and must avoid the `FORBIDDEN_SUBSTRINGS` of `publishDay` (en AND es —
 * beware e.g. "impacto"). `songSession.test.ts` proves the generated Day
 * publishes clean.
 */
import type { Song } from '@/curriculum/types/songLibrary';
import { PHASES, type PhaseKey } from '../../phases';
import { newBlankDay } from '../../plan/newBlankDay';
import type { Day, Interaction, LocalizedText } from '../../types';
import { getFeaturedVisual, getYouTubeVideoId } from '../songDeepLinks';
import type { Slide } from '../types';

export interface SongSessionParams {
  checkInStyle: 'emoji' | 'scale' | 'word';
  checkInQuestion: LocalizedText;
  /** Displayed with the media slide AND as the response slide's prompt. */
  mediaPrompt: LocalizedText;
  question: {
    type: 'choice' | 'text';
    question: LocalizedText;
    options?: LocalizedText[];
  };
  exitLearned: LocalizedText;
  exitFeeling: LocalizedText;
  /**
   * Phase 2 — emit the app-route slide that opens the song's Theory lesson.
   * On by default; suppressed automatically when there is no song.
   */
  includeAppRoute: boolean;
  /**
   * Phase 3 — emit the Studio pairing slide (Create) + showcase slide (Share).
   * On by default.
   */
  includeStudioShare: boolean;
  /**
   * Phase 4 — seed `Slide.timerSec` on the media + question slides so the
   * teacher's timer control starts pre-filled. 0 / undefined = no seed.
   */
  slideTimerSec?: number;
}

/** Only attach `timerSec` when a positive seed is configured. */
const withTimer = (sec: number | undefined): { timerSec?: number } =>
  sec && sec > 0 ? { timerSec: sec } : {};

export const DEFAULT_SONG_SESSION_PARAMS: SongSessionParams = {
  checkInStyle: 'emoji',
  includeAppRoute: true,
  includeStudioShare: true,
  checkInQuestion: {
    en: 'How are you feeling as we begin?',
    es: '¿Cómo te sientes al comenzar?',
  },
  mediaPrompt: {
    en: 'What instruments do you hear?',
    es: '¿Qué instrumentos escuchas?',
  },
  question: {
    type: 'choice',
    question: {
      en: 'Which instrument stood out to you the most?',
      es: '¿Qué instrumento te llamó más la atención?',
    },
    options: [
      { en: 'Drums', es: 'Batería' },
      { en: 'Bass', es: 'Bajo' },
      { en: 'Guitar', es: 'Guitarra' },
      { en: 'Piano/Keys', es: 'Piano/Teclados' },
      { en: 'Voice', es: 'Voz' },
      { en: 'Synth', es: 'Sintetizador' },
    ],
  },
  exitLearned: {
    en: 'One thing you learned today…',
    es: 'Algo que aprendiste hoy…',
  },
  exitFeeling: {
    en: 'How do you feel after today?',
    es: '¿Cómo te sientes después de hoy?',
  },
};

export const SONG_SESSION_TEMPLATE_ID = 'song-session-v1';

/** Template output before it's placed on a Day — shared with `fromPlannedDay`. */
export interface SongSessionContent {
  /** Interactions to write into (or append onto) the owning cells. */
  interactionsByPhase: Partial<Record<PhaseKey, Interaction[]>>;
  /** Ordered slides carrying the template's default copy. */
  slides: Slide[];
}

/**
 * Build the template's interactions + slides under an id prefix. Pure: both
 * `buildSongSessionDay` (fresh Day) and `enrichDayWithSongSessionDeck`
 * (existing Day) consume this. When `song` is absent (artistless flow) or has
 * no YouTube source, the media slide is omitted.
 */
export const buildSongSessionContent = (
  idPrefix: string,
  params: SongSessionParams,
  song?: Song,
): SongSessionContent => {
  const checkIn: Interaction = {
    id: `${idPrefix}-ix-arrive`,
    type: 'check-in',
    question: params.checkInQuestion,
    // Rule 2 — check-ins never reach the projector; publishDay force-falses
    // this anyway, but the template says what it means.
    shareable: false,
    checkIn: { style: params.checkInStyle },
  };

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
              DEFAULT_SONG_SESSION_PARAMS.question.options ??
              [],
            multi: false,
          },
        }
      : { text: { maxLen: 240 } }),
  };

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

  // Phase 2 — the "go do the real Theory lesson" app-route (Create phase).
  // shareable:false keeps the projector reveal toggle disabled; the completion
  // signal rides the atlas response pipeline back to the teacher dashboard.
  const theory: Interaction | null =
    params.includeAppRoute && song
      ? {
          id: `${idPrefix}-ix-theory`,
          type: 'atlas',
          question: {
            en: 'Open the theory lesson for this song and finish the first activity.',
            es: 'Abre la lección de teoría de esta canción y termina la primera actividad.',
          },
          shareable: false,
          atlas: {
            module: 'learn',
            activityRef: `song:${song.id}:lesson`,
            expects: 'completion',
          },
        }
      : null;

  // Phase 3 — the "share your project" offer (Share phase). shareable:false
  // keeps the raw offers off the projector; featuring is a separate broadcast.
  const showcase: Interaction | null = params.includeStudioShare
    ? {
        id: `${idPrefix}-ix-showcase`,
        type: 'showcase',
        question: {
          en: 'Share your project with the class.',
          es: 'Comparte tu proyecto con la clase.',
        },
        shareable: false,
      }
    : null;

  const video = song ? getYouTubeVideoId(song) : null;

  const slides: Slide[] = [
    {
      id: `${idPrefix}-slide-welcome`,
      kind: 'content',
      phase: 'connectRegulate',
      variant: 'welcome',
      title: song
        ? { en: song.title, es: song.title }
        : { en: 'Welcome', es: 'Bienvenidos' },
      ...(song
        ? { body: { en: `by ${song.artist}`, es: `de ${song.artist}` } }
        : {}),
    },
    {
      id: `${idPrefix}-slide-checkin`,
      kind: 'interaction',
      phase: 'connectRegulate',
      title: { en: 'How are you today?', es: '¿Cómo estás hoy?' },
      interactionIds: [checkIn.id],
    },
    ...(song && video
      ? [
          {
            id: `${idPrefix}-slide-media`,
            kind: 'media',
            phase: 'groupPractice',
            title: {
              en: `Listen: ${song.title}`,
              es: `Escucha: ${song.title}`,
            },
            prompt: params.mediaPrompt,
            media: {
              type: 'youtube',
              videoId: video.videoId,
              ...(video.startSec !== undefined
                ? { startSec: video.startSec }
                : {}),
            },
            sideMedia: getFeaturedVisual(song),
            ...withTimer(params.slideTimerSec),
          } satisfies Slide,
        ]
      : []),
    {
      id: `${idPrefix}-slide-question`,
      kind: 'interaction',
      phase: 'groupPractice',
      title: { en: 'Your turn', es: 'Te toca' },
      prompt: params.mediaPrompt,
      interactionIds: [question.id],
      reveal: isChoice ? 'bars' : 'wall',
      ...withTimer(params.slideTimerSec),
    },
    ...(theory
      ? [
          {
            id: `${idPrefix}-slide-theory`,
            kind: 'app-route',
            phase: 'creativeProjects',
            title: { en: 'Try it on the keys', es: 'Pruébalo en las teclas' },
            prompt: {
              en: 'Tap Launch to open the lesson. Come back here when you finish.',
              es: 'Toca Iniciar para abrir la lección. Vuelve aquí cuando termines.',
            },
            interactionId: theory.id,
          } satisfies Slide,
        ]
      : []),
    ...(params.includeStudioShare
      ? [
          {
            id: `${idPrefix}-slide-studio`,
            kind: 'studio-collab',
            phase: 'creativeProjects',
            title: { en: 'Build together', es: 'Creen juntos' },
            prompt: {
              en: 'Pair up in the Studio and make something with what you learned.',
              es: 'Fórmense en parejas en el Studio y creen algo con lo aprendido.',
            },
            grouping: 'pairs',
          } satisfies Slide,
        ]
      : []),
    ...(showcase
      ? [
          {
            id: `${idPrefix}-slide-showcase`,
            kind: 'showcase',
            phase: 'presentPerform',
            title: { en: 'Show the class', es: 'Muestra a la clase' },
            prompt: {
              en: 'Offer your project — your teacher may feature it.',
              es: 'Ofrece tu proyecto — tu maestro puede mostrarlo.',
            },
            interactionId: showcase.id,
          } satisfies Slide,
        ]
      : []),
    {
      id: `${idPrefix}-slide-exit`,
      kind: 'interaction',
      phase: 'respondReflectReset',
      title: { en: 'Before you go', es: 'Antes de irte' },
      prompt: params.exitLearned,
      interactionIds: [exitText.id, exitCheckIn.id],
      reveal: 'wall',
    },
  ];

  return {
    interactionsByPhase: {
      connectRegulate: [checkIn],
      groupPractice: [question],
      ...(theory ? { creativeProjects: [theory] } : {}),
      ...(showcase ? { presentPerform: [showcase] } : {}),
      respondReflectReset: [exitText, exitCheckIn],
    },
    slides,
  };
};

/** Student-safe bilingual cell copy themed on the song. */
const cellCopyForSong = (
  song: Song,
  params: SongSessionParams,
): Record<PhaseKey, { title: LocalizedText; prompt: LocalizedText }> => ({
  connectRegulate: {
    title: { en: 'Welcome', es: 'Bienvenidos' },
    prompt: {
      en: `Today we listen to "${song.title}" by ${song.artist}.`,
      es: `Hoy escuchamos "${song.title}" de ${song.artist}.`,
    },
  },
  groupPractice: {
    title: { en: `Listen: ${song.title}`, es: `Escucha: ${song.title}` },
    prompt: params.mediaPrompt,
  },
  creativeProjects: {
    title: { en: 'Make It Yours', es: 'Hazlo Tuyo' },
    prompt: {
      en: `Play with the groove of "${song.title}" in your own way.`,
      es: `Juega con el ritmo de "${song.title}" a tu manera.`,
    },
  },
  presentPerform: {
    title: { en: 'Share the Sound', es: 'Comparte el Sonido' },
    prompt: {
      en: 'Show a partner what you found in the music.',
      es: 'Muéstrale a un compañero lo que encontraste en la música.',
    },
  },
  respondReflectReset: {
    title: { en: 'Reflect', es: 'Reflexiona' },
    prompt: params.exitLearned,
  },
});

/**
 * Generate a complete Song Session Day from a song. Starts from
 * `newBlankDay` (same id + cell conventions as the Plan page), fills the five
 * cells with song-themed bilingual copy, writes the template Interactions into
 * their owning cells, and attaches the ordered deck. The output runs the exact
 * existing PlanPage path: saveDay → publish → startSession.
 */
export function buildSongSessionDay(input: {
  song: Song;
  params?: Partial<SongSessionParams>;
}): Day {
  const { song } = input;
  const params: SongSessionParams = {
    ...DEFAULT_SONG_SESSION_PARAMS,
    ...input.params,
  };

  const day = newBlankDay(song.title);
  const { interactionsByPhase, slides } = buildSongSessionContent(
    day.id,
    params,
    song,
  );
  const copy = cellCopyForSong(song, params);

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

  return {
    ...day,
    deck: {
      id: `${day.id}-deck`,
      title: { en: song.title, es: song.title },
      slides,
      templateRef: { templateId: SONG_SESSION_TEMPLATE_ID, songId: song.id },
    },
  };
}
