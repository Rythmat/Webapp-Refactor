/**
 * The default deck for a new Day — the teacher's own "Template General Lesson
 * Slide Deck", as a real template.
 *
 * Provenance: a ten-slide PowerPoint that lives outside the repo
 * (`Lesson Plan Examples/Template General Lesson Slide Deck.pptx`). Two
 * deliberate departures from it:
 *
 *  1. **Slide 1 is not here.** It reads "For the Teachers…. Set up your
 *     stations… Does your sound work?" — a prep checklist. Everything in a deck
 *     is student-safe by construction (Rule 1), and the Rule 1 firewall matches
 *     KEYS, not values, so it would not catch teacher copy sitting in a `title`.
 *     `generalLessonTeacherNotes()` returns it for the Day's rationale notes,
 *     which is where teacher-only text belongs.
 *  2. **Slide 8's timetable is generic.** The original hard-codes one
 *     classroom's wall clock ("12:30 – 12:55"), which is not a template.
 *
 * Slide order follows the original arc, and the phases are the ones the
 * original slides are themselves tagged with — which happens to keep
 * `SlideDeck.slides`' non-decreasing-phase invariant without reordering.
 *
 * Spanish is present where the source deck provides it. `LocalizedText.es` is
 * optional and falls back to English per field, so a partly-translated deck
 * renders correctly rather than blanking.
 */
import type { LocalizedText } from '../../types';
import type { ContentSlide, Slide, SlideDeck } from '../types';

export const GENERAL_LESSON_TEMPLATE_ID = 'general-lesson-v1';

/**
 * Slide 1 of the source deck, verbatim, for `cells.connectRegulate.rationale
 * .notes`. Teacher-only — never put this on a slide.
 */
export const generalLessonTeacherNotes = (): string =>
  [
    'For the Teachers…',
    '• Set up your stations — pianos, computers, …',
    '• Does your sound work?',
    "• Set up your teaching space so you aren't tripping over anything.",
    '• Do you have all the material you need for your lesson?',
    '• Therapeutic regulation exercise ready?',
  ].join('\n');

const t = (en: string, es?: string): LocalizedText =>
  es === undefined ? { en } : { en, es };

interface SlideSeed {
  key: string;
  phase: ContentSlide['phase'];
  presetId: string;
  title: LocalizedText;
  prompt?: LocalizedText;
  body?: LocalizedText;
  accentBar?: boolean;
  resetChecklist?: LocalizedText[];
}

/**
 * The nine student-facing slides, in the source deck's order.
 *
 * Every entry names a preset from `templates/presets.ts`; the elements
 * themselves stay derived, so a teacher editing a title here sees it on every
 * surface immediately.
 */
const SEEDS: readonly SlideSeed[] = [
  {
    key: 'sonic-spotlight',
    phase: 'connectRegulate',
    presetId: 'artist-spotlight',
    title: t('Sonic Spotlight', 'Foco Sonoro'),
    prompt: t('Class Playlist Shuffle', 'Mezcla de la lista de clase'),
    body: t(
      'You influence the world around you, whether you want to or not. You have the ability to decide in every moment what kind of influence you want to make.',
      'Tú influyes el mundo que te rodea, quieras o no. Tú decides cada momento qué tipo de influencia quieres ejercer.',
    ),
  },
  {
    key: 'turn-and-talk',
    phase: 'connectRegulate',
    // NOT the `turn-and-talk` preset: that one is interaction-only, and its
    // `body: 'off'` would hide the three questions this slide exists to ask.
    // A teacher who later converts this slide to a Question can switch to it
    // from the Layout menu, which offers it only for the kinds it claims.
    presetId: 'group-practice',
    title: t('Turn & Talk', 'Parar y anotar'),
    prompt: t('Stop, listen, write.', 'Detenerse, escuchar, escribir.'),
    body: t(
      'What instruments do you hear? What story is being told? What would you tell your friend in that situation?',
      '¿Qué instrumentos escuchas? ¿Qué historia se cuenta? ¿Qué le dirías a tu amigo en esa situación?',
    ),
  },
  {
    key: 'objectives',
    phase: 'connectRegulate',
    presetId: 'objectives',
    accentBar: true,
    title: t('IMPACT Practice Objectives', 'Objetivos de práctica IMPACT'),
    body: t(
      'Practice developing our own personal artistic collage as ambassadors, performers and producers of music.',
      'Practicar el desarrollo de nuestro propio collage artístico personal como embajadores, intérpretes y productores de música.',
    ),
  },
  {
    key: 'the-grid',
    phase: 'groupPractice',
    presetId: 'rhythm-grid',
    // No `prompt`: a hero band replaces the subtitle, so `rhythm-grid` sets
    // `subtitle: 'off'` and a prompt here would be authored and then hidden.
    // The source slide's second line goes in the title instead.
    title: t(
      '“The Grid” — rhythmic table of time',
      '“La Cuadrícula” — tabla rítmica del tiempo',
    ),
  },
  {
    key: 'group-practice',
    phase: 'groupPractice',
    presetId: 'group-practice',
    title: t(
      'Group Practice — Class Project',
      'Práctica grupal — Proyecto de clase',
    ),
    prompt: t(
      'What do we want to create together in music?',
      '¿Qué queremos crear juntos en la música?',
    ),
    body: t(
      'Use this time we have together to show up for yourself and build your skills in music. This is for you. This is for us.',
      'Usa este tiempo juntos para cuidarte y desarrollar tus habilidades musicales. Esto es para ti. Esto es para nosotros.',
    ),
  },
  {
    key: 'personal-project-time',
    phase: 'creativeProjects',
    presetId: 'personal-project-time',
    title: t('Personal Project Time', 'Tiempo de proyecto personal'),
    prompt: t(
      'What draft are you working on today?',
      '¿En qué borrador trabajas hoy?',
    ),
  },
  {
    key: 'stations-rotation',
    phase: 'creativeProjects',
    presetId: 'stations-rotation',
    title: t('Project Stations Rotation', 'Rotación de estaciones'),
    body: t(
      'Artist Spotlight · Group Practice · Personal Projects — rotate when the timer sounds, then save your work and reset your station.',
      'Foco de Artista · Práctica grupal · Proyectos personales — rota cuando suene el temporizador, guarda tu trabajo y ordena tu estación.',
    ),
  },
  {
    key: 'share-day',
    phase: 'presentPerform',
    presetId: 'share-day',
    title: t('Sharing Project Drafts', 'Compartir borradores'),
    prompt: t(
      'How do you want to share your work — private, anonymous, or public?',
      '¿Cómo quieres compartir tu trabajo — privado, anónimo o público?',
    ),
  },
  {
    key: 'last-5',
    phase: 'respondReflectReset',
    presetId: 'last-5',
    title: t('Last 5', 'Últimos 5'),
    resetChecklist: [
      t('Save your work', 'Guarda tu trabajo'),
      t('Think about what you want to do next', 'Piensa en tu siguiente paso'),
      t('Clean up your equipment', 'Ordena tu equipo'),
      t('Reset the room', 'Restablece el salón'),
    ],
  },
];

const slideFromSeed = (dayId: string, seed: SlideSeed): Slide =>
  ({
    id: `${dayId}-general-${seed.key}`,
    kind: 'content',
    phase: seed.phase,
    presetId: seed.presetId,
    title: seed.title,
    ...(seed.prompt ? { prompt: seed.prompt } : {}),
    ...(seed.body ? { body: seed.body } : {}),
    ...(seed.accentBar ? { accentBar: true } : {}),
    ...(seed.resetChecklist ? { resetChecklist: seed.resetChecklist } : {}),
  }) as Slide;

/** The default deck for a new Day. */
export const buildGeneralLessonDeck = (dayId: string): SlideDeck => ({
  id: `${dayId}-deck`,
  title: { en: 'General Lesson', es: 'Lección general' },
  slides: SEEDS.map((seed) => slideFromSeed(dayId, seed)),
  templateRef: { templateId: GENERAL_LESSON_TEMPLATE_ID },
});
