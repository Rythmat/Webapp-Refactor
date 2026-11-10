import type { FeelingsLevel, LocalizedText } from '../../types';
import type { GroupRole, LessonFocus } from './types';

/**
 * The Cortex lesson's student-facing copy, English and Spanish. Every string
 * here reaches a slide; teacher-only text belongs in the cell's rationale.
 *
 * One idea a slide, and few words (owner, 2026-11-10: "no extra text at
 * all"): a projected line is seven words at most (`wordBudget.test.ts`).
 */

export const ROLE_NAME: Readonly<Record<GroupRole, LocalizedText>> = {
  promoter: { en: 'Promoter', es: 'Promotor' },
  producer: { en: 'Producer', es: 'Productor' },
  performer: { en: 'Performer', es: 'Intérprete' },
};

/** The feelings check-in's question, by how fine-grained it is. */
export const CHECK_IN_QUESTION: Readonly<Record<FeelingsLevel, LocalizedText>> =
  {
    simple: { en: 'How are you feeling today?', es: '¿Cómo te sientes hoy?' },
    advanced: {
      en: 'Which face fits you today?',
      es: '¿Qué cara va contigo hoy?',
    },
    complex: { en: 'What are you feeling?', es: '¿Qué sientes?' },
  };

/** Reflect's room reset, in the order a class does it. */
export const RESET_CHECKLIST: readonly LocalizedText[] = [
  { en: 'Save your project', es: 'Guarda tu proyecto' },
  { en: 'Instruments away', es: 'Instrumentos guardados' },
  { en: 'Chairs in', es: 'Sillas acomodadas' },
  { en: 'Room ready', es: 'Salón listo' },
];

export const COPY = {
  connectionTitle: { en: 'Check in', es: 'Conéctate' },
  connectionCell: { en: 'Connection', es: 'Conexión' },
  vibeQuestion: {
    en: 'Which sound matches your mood?',
    es: '¿Qué sonido va con tu ánimo?',
  },
  showcaseArtist: { en: 'Artist showcase', es: 'Artista destacado' },
  showcasePlace: { en: 'Place showcase', es: 'Lugar destacado' },
  showcaseTitle: { en: 'Showcase', es: 'Muestra' },
  showcaseOpen: {
    en: 'Who or where are we exploring today?',
    es: '¿A quién o qué lugar exploramos hoy?',
  },
  listenPrompt: { en: 'What do you hear?', es: '¿Qué escuchas?' },
  groupTitle: { en: 'Group Project', es: 'Proyecto grupal' },
  groupOpen: {
    en: 'Today we work together as Promoters, Producers or Performers.',
    es: 'Hoy trabajamos juntos como promotores, productores o intérpretes.',
  },
  projectTitle: { en: 'Individual Project', es: 'Proyecto individual' },
  projectPrompt: {
    en: 'Open your project in the Studio and keep building.',
    es: 'Abre tu proyecto en el Studio y sigue creando.',
  },
  libraryTile: { en: 'Open my projects', es: 'Abrir mis proyectos' },
  projectTask: {
    en: 'Work on your own project in the Studio.',
    es: 'Trabaja en tu propio proyecto en el Studio.',
  },
  presentTitle: { en: 'Present your progress', es: 'Presenta tu avance' },
  presentCell: { en: 'Present', es: 'Presenta' },
  presentPrompt: {
    en: 'Tell your teacher what you got done today.',
    es: 'Cuéntale a tu maestro lo que lograste hoy.',
  },
  progressQuestion: {
    en: 'What did you get done today?',
    es: '¿Qué lograste hoy?',
  },
  shareTitle: { en: 'Show the class', es: 'Muestra a la clase' },
  sharePrompt: {
    en: 'Offer your project — your teacher may feature it.',
    es: 'Ofrece tu proyecto — tu maestro puede mostrarlo.',
  },
  shareQuestion: {
    en: 'Share your project with your teacher.',
    es: 'Comparte tu proyecto con tu maestro.',
  },
  exitTitle: { en: 'Before you go', es: 'Antes de irte' },
  // The Daily Plan Template's exit ticket (Pedagogy Knowledge Base).
  exitQuestion: {
    en: 'What emotion did you aim for today?',
    es: '¿Qué emoción buscaste hoy?',
  },
  resetTitle: { en: 'Reset the room', es: 'Ordena el salón' },
} satisfies Record<string, LocalizedText>;

export const todayWith = (
  focus: Pick<LessonFocus, 'label'>,
): LocalizedText => ({
  en: `Today: ${focus.label}`,
  es: `Hoy: ${focus.label}`,
});

export const groupTitle = (role: GroupRole): LocalizedText => ({
  en: `${COPY.groupTitle.en}: ${ROLE_NAME[role].en}`,
  es: `${COPY.groupTitle.es}: ${ROLE_NAME[role].es}`,
});

export const promoterTask = (focus: string, goal: number): LocalizedText => ({
  en: `Find ${goal} connections to ${focus} on the Globe and build a mind map. Submit it when you're done.`,
  es: `Encuentra ${goal} conexiones con ${focus} en el Globo y arma un mapa mental. Envíalo cuando termines.`,
});

/** The Promoter slide's one-line headline; the task itself is the question. */
export const promoterHeadline = (focus: string): LocalizedText => ({
  en: `Map ${focus}’s connections on the Globe.`,
  es: `Mapea las conexiones de ${focus} en el Globo.`,
});

export const tourTask = (tour: string): LocalizedText => ({
  en: `Open the Globe and travel the “${tour}” together.`,
  es: `Abre el Globo y recorran juntos “${tour}”.`,
});

export const producerTask = (tutorial: string): LocalizedText => ({
  en: `Open the Studio and follow the “${tutorial}” tutorial together.`,
  es: `Abre el Studio y sigan juntos el tutorial “${tutorial}”.`,
});

export const performerTask = (lesson: LocalizedText): LocalizedText => ({
  en: `Open the lesson and play it together as a class: ${lesson.en}.`,
  es: `Abre la lección y tóquenla juntos como clase: ${lesson.es ?? lesson.en}.`,
});

export const listenTitle = (title: string): LocalizedText => ({
  en: `Listen: “${title}”`,
  es: `Escucha: “${title}”`,
});

export const deckTitle = (
  focus: Pick<LessonFocus, 'label'>,
  role: GroupRole,
): LocalizedText => ({
  en: `${focus.label} · ${ROLE_NAME[role].en}`,
  es: `${focus.label} · ${ROLE_NAME[role].es}`,
});

/**
 * The teacher's own prep checklist (the first slide of their "Template
 * General Lesson Slide Deck"), kept for the Connect cell's notes. Teacher-only:
 * never put this on a slide.
 */
export const PREP_CHECKLIST = [
  'For the Teachers…',
  '• Set up your stations — pianos, computers, …',
  '• Does your sound work?',
  "• Set up your teaching space so you aren't tripping over anything.",
  '• Do you have all the material you need for your lesson?',
  '• Therapeutic regulation exercise ready?',
].join('\n');
