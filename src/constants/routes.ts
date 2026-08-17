import { createLinkDefinition } from '@/util/createLinkDefinition';
import { createRouteDefinition } from '@/util/createRouteDefinition';

export const WildcardRoute = {
  /**
   * The root route for the wildcard.
   */
  root: createRouteDefinition('*'),
};

/**
 * The public marketing landing page, served at the site root for logged-out
 * visitors (authenticated users are redirected to their home surface).
 */
export const LandingRoutes = {
  root: createRouteDefinition('/'),
};

const marketingPrefix = '/features';

/**
 * Public marketing pages (renders for logged-out and logged-in visitors). Module
 * pages live under `/features/*` because `/studio`, `/learn`, `/arcade`, `/atlas`
 * are taken by the authenticated app; `/blog` and `/for-teachers` are top-level.
 */
export const MarketingRoutes = {
  studio: createRouteDefinition('/studio', { prefix: marketingPrefix }),
  learn: createRouteDefinition('/learn', { prefix: marketingPrefix }),
  arcade: createRouteDefinition('/arcade', { prefix: marketingPrefix }),
  globe: createRouteDefinition('/globe', { prefix: marketingPrefix }),
  blog: createRouteDefinition('/blog'),
  teachers: createRouteDefinition('/for-teachers'),
};

const authPrefix = '/auth';

/**
 * The routes for the authentication process.
 */
export const AuthRoutes = {
  /**
   * The root route for the authentication process.
   */
  root: createRouteDefinition(authPrefix),

  /**
   * The route to sign in.
   */
  signIn: createRouteDefinition('/sign-in', { prefix: authPrefix }),

  /**
   * OAuth callback route used by Auth0 redirect processing.
   */
  callback: createRouteDefinition('/callback', { prefix: authPrefix }),

  /**
   * The route to join as a student.
   * @param code Caller can pass a code to be injected into the query params.
   */
  signUpAsStudent: createRouteDefinition<void, { code?: string }>(
    '/join/student',
    { prefix: authPrefix },
  ),

  /**
   * The route to join as a teacher.
   * @param code Caller can pass a code to be injected into the path params.
   */
  signUpAsTeacher: createRouteDefinition<{ code: string }>(
    '/join/teacher/:code',
    { prefix: authPrefix },
  ),

  /**
   * The route to request a password reset.
   */
  forgotPassword: createRouteDefinition('/forgot-password', {
    prefix: authPrefix,
  }),

  /**
   * The route to reset a password using a token.
   * Expects a `token` query parameter.
   */
  resetPassword: createRouteDefinition<void, { token?: string }>(
    '/reset-password',
    { prefix: authPrefix },
  ),
};

const adminPrefix = '/console';

export const AdminRoutes = {
  /**
   * The root route for the admin console.
   */
  root: createRouteDefinition(adminPrefix),

  /**
   * The route to the users page (view all users + subscription status).
   */
  users: createRouteDefinition('/users', { prefix: adminPrefix }),

  /**
   * The route to the free access management page.
   */
  freeAccess: createRouteDefinition('/free-access', { prefix: adminPrefix }),

  /**
   * Telemetry overview dashboard.
   */
  telemetry: createRouteDefinition('/telemetry', { prefix: adminPrefix }),

  /**
   * API performance telemetry dashboard.
   */
  telemetryApi: createRouteDefinition('/telemetry/api', {
    prefix: adminPrefix,
  }),

  /**
   * Routing analytics dashboard.
   */
  telemetryRouting: createRouteDefinition('/telemetry/routing', {
    prefix: adminPrefix,
  }),

  /**
   * Audio/keyboard analytics dashboard.
   */
  telemetryAudio: createRouteDefinition('/telemetry/audio', {
    prefix: adminPrefix,
  }),

  /**
   * Product funnel / learning analytics dashboard.
   */
  telemetryProduct: createRouteDefinition('/telemetry/product', {
    prefix: adminPrefix,
  }),

  /**
   * Recent errors / failures dashboard.
   */
  telemetryErrors: createRouteDefinition('/telemetry/errors', {
    prefix: adminPrefix,
  }),

  /**
   * Database query attribution (pg_stat_statements) dashboard.
   */
  telemetryDatabase: createRouteDefinition('/telemetry/database', {
    prefix: adminPrefix,
  }),

  /**
   * Content back office — list view for a content kind.
   */
  content: createRouteDefinition('/content', { prefix: adminPrefix }),

  /**
   * Content back office — list filtered to one kind (globe_event, song, …).
   */
  contentKind: createRouteDefinition<{ kind: string }>('/content/:kind', {
    prefix: adminPrefix,
  }),

  /**
   * Content back office — editor for one item. `id` is 'new' when creating.
   */
  contentItem: createRouteDefinition<{ kind: string; id: string }>(
    '/content/:kind/:id',
    { prefix: adminPrefix },
  ),

  /**
   * Content back office — the visual lesson editor for one genre's course.
   *
   * Separate from `contentItem` because a course spans several content items
   * (one per level) and is addressed by genre rather than by item id.
   */
  lessonCourse: createRouteDefinition<{ genre: string }, { level?: string }>(
    '/lessons/:genre',
    { prefix: adminPrefix },
  ),

  /**
   * Publish pipeline — release history, publish, and rollback.
   */
  releases: createRouteDefinition('/releases', { prefix: adminPrefix }),
};

/**
 * The routes for the teacher.
 */
const teacherPrefix = '/teacher';

export const TeacherRoutes = {
  /**
   * The root route for the teacher — now the Teacher Dashboard.
   */
  root: createRouteDefinition(teacherPrefix),

  /**
   * Alias for the dashboard landing (same URL as `root`).
   */
  dashboard: createRouteDefinition(teacherPrefix),

  /**
   * Classroom picker + create/edit/delete/share (doubles as the "all
   * classrooms" selector that a teacher with 2+ classrooms lands on).
   */
  classrooms: createRouteDefinition('/classrooms', {
    prefix: teacherPrefix,
  }),

  /**
   * Per-classroom teacher dashboard. Teachers navigate here from a card on
   * the classrooms selector (or directly if they own exactly one classroom).
   */
  classroomDashboard: createRouteDefinition<{
    classroomId: string;
  }>('/classroom/:classroomId', {
    prefix: teacherPrefix,
  }),

  /**
   * The route to the student page.
   */
  students: createRouteDefinition<{
    classroomId: string;
  }>('/classroom/:classroomId/students', {
    prefix: teacherPrefix,
  }),

  /** Plan Days overview — the teacher's list of authored Days. */
  plan: createRouteDefinition<{
    classroomId: string;
  }>('/classroom/:classroomId/plan', {
    prefix: teacherPrefix,
  }),

  /** Interactive-session deck wizard — template-first slide deck setup.
   *  Static segment outranks dayEditor's `:dayId` param in route matching. */
  deckWizard: createRouteDefinition<{
    classroomId: string;
  }>('/classroom/:classroomId/plan/live-deck', {
    prefix: teacherPrefix,
  }),

  /** Day editor — authoring surface for a single Day. */
  dayEditor: createRouteDefinition<{
    classroomId: string;
    dayId: string;
  }>('/classroom/:classroomId/plan/:dayId', {
    prefix: teacherPrefix,
  }),

  /** Preview a Day as a student would see it. */
  dayPreview: createRouteDefinition<{
    classroomId: string;
    dayId: string;
  }>('/classroom/:classroomId/plan/:dayId/preview', {
    prefix: teacherPrefix,
  }),

  /** Annual Plan — Kanban-style calendar of Units. */
  annualPlan: createRouteDefinition<{
    classroomId: string;
  }>('/classroom/:classroomId/plan/annual', {
    prefix: teacherPrefix,
  }),

  /** A single Unit inside the Annual Plan. */
  annualUnit: createRouteDefinition<{
    classroomId: string;
    unitId: string;
  }>('/classroom/:classroomId/plan/annual/unit/:unitId', {
    prefix: teacherPrefix,
  }),

  /** Presentation Mode — the projected board for a Day. */
  present: createRouteDefinition<{
    classroomId: string;
    dayId: string;
  }>('/classroom/:classroomId/present/:dayId', {
    prefix: teacherPrefix,
  }),

  /** Teacher's assignments list for a classroom. */
  assignments: createRouteDefinition<{
    classroomId: string;
  }>('/classroom/:classroomId/assignments', {
    prefix: teacherPrefix,
  }),

  /** Teacher progress grid for a single assignment. */
  assignmentProgress: createRouteDefinition<{
    classroomId: string;
    assignmentId: string;
  }>('/classroom/:classroomId/assignments/:assignmentId/progress', {
    prefix: teacherPrefix,
  }),

  /** Grades tab of the classroom workspace — thin gradebook over assignments. */
  grades: createRouteDefinition<{
    classroomId: string;
  }>('/classroom/:classroomId/grades', {
    prefix: teacherPrefix,
  }),

  /** Teacher live-session dashboard. */
  session: createRouteDefinition<{
    classroomId: string;
    sessionId: string;
  }>('/classroom/:classroomId/sessions/:sessionId', {
    prefix: teacherPrefix,
  }),

  /** Anonymized projector overlay during a live session. */
  projector: createRouteDefinition<{
    classroomId: string;
    sessionId: string;
  }>('/classroom/:classroomId/sessions/:sessionId/projector', {
    prefix: teacherPrefix,
  }),

  /** Teacher-only post-session report. */
  report: createRouteDefinition<{
    classroomId: string;
    sessionId: string;
  }>('/classroom/:classroomId/sessions/:sessionId/report', {
    prefix: teacherPrefix,
  }),

  /** Teacher-only index of ended-session reports. */
  reports: createRouteDefinition<{
    classroomId: string;
  }>('/classroom/:classroomId/reports', {
    prefix: teacherPrefix,
  }),
};

/**
 * The routes for the classroom.
 */
const classroomPrefix = '/classrooms';

export const ClassroomRoutes = {
  /**
   * The root route for the classroom.
   */
  root: createRouteDefinition(classroomPrefix),

  /**
   * The route to the classroom picker page.
   */
  picker: createRouteDefinition('/', { prefix: classroomPrefix }),

  /**
   * The route to the classroom collection page.
   */
  home: createRouteDefinition<{
    classroomId: string;
  }>('/:classroomId', {
    prefix: classroomPrefix,
  }),

  /**
   * The route to the classroom collection page.
   */
  collection: createRouteDefinition<{
    classroomId: string;
    collectionId: string;
  }>('/:classroomId/collections/:collectionId', {
    prefix: classroomPrefix,
  }),

  /**
   * The route to the classroom lesson page.
   */
  lesson: createRouteDefinition<{
    classroomId: string;
    collectionId: string;
    lessonId: string;
  }>('/:classroomId/collections/:collectionId/lessons/:lessonId', {
    prefix: classroomPrefix,
  }),

  /**
   * Student and teacher assignments list for a classroom. This URL is the
   * student's view; the teacher's mirror lives at `TeacherRoutes.assignments`.
   */
  assignments: createRouteDefinition<{
    classroomId: string;
  }>('/:classroomId/assignments', {
    prefix: classroomPrefix,
  }),

  /**
   * Student-paced walk of an assignment whose kind is 'day' — renders the
   * PublishedDay snapshot with `InteractionInput` bindings.
   */
  assignmentDayRun: createRouteDefinition<{
    classroomId: string;
    assignmentId: string;
  }>('/:classroomId/assignments/:assignmentId/run', {
    prefix: classroomPrefix,
  }),

  /**
   * Read-only view for assignments whose kind is 'instructions' — student
   * marks it done manually.
   */
  assignmentInstructions: createRouteDefinition<{
    classroomId: string;
    assignmentId: string;
  }>('/:classroomId/assignments/:assignmentId/instructions', {
    prefix: classroomPrefix,
  }),

  /** Student live-session view. */
  live: createRouteDefinition<{
    classroomId: string;
    sessionId: string;
  }>('/:classroomId/live/:sessionId', {
    prefix: classroomPrefix,
  }),
};

const legalPrefix = '/documents';
export const LegalRoutes = {
  /**
   * The root route for the legal documents.
   */
  root: createRouteDefinition(legalPrefix),

  /**
   * The route to the privacy policy.
   */
  privacyPolicy: createRouteDefinition('/privacy', { prefix: legalPrefix }),

  /**
   * The route to the terms of service.
   */
  termsOfService: createRouteDefinition('/terms', { prefix: legalPrefix }),
};

export const ExternalLinks = {
  LandingPage: createLinkDefinition('https://music-atlas.io'),
  About: createLinkDefinition('https://music-atlas.io/about'),
  Help: createLinkDefinition('https://help.music-atlas.io'),
};

const studioPrefix = '/studio';

export const StudioRoutes = {
  root: createRouteDefinition(studioPrefix),

  picker: createRouteDefinition('/', { prefix: studioPrefix }),

  /** The DAW editor. The `/studio` index now shows the Studio Dashboard. */
  editor: createRouteDefinition('/editor', { prefix: studioPrefix }),
};

const gamesPrefix = '/arcade';

export const GameRoutes = {
  root: createRouteDefinition(gamesPrefix),

  picker: createRouteDefinition('/', { prefix: gamesPrefix }),

  chroma: createRouteDefinition('/chroma', { prefix: gamesPrefix }),

  boardChoice: createRouteDefinition('/board-choice', { prefix: gamesPrefix }),

  chordConnection: createRouteDefinition('/chord-connection', {
    prefix: gamesPrefix,
  }),

  chordPress: createRouteDefinition('/chord-press', { prefix: gamesPrefix }),

  playAlong: createRouteDefinition('/play-along', { prefix: gamesPrefix }),

  foli: createRouteDefinition('/foli', { prefix: gamesPrefix }),

  majorArcanum: createRouteDefinition('/major-arcanum', {
    prefix: gamesPrefix,
  }),

  constellations: createRouteDefinition('/constellations', {
    prefix: gamesPrefix,
  }),

  grooveLab: createRouteDefinition('/groove-lab', { prefix: gamesPrefix }),

  waveSculptor: createRouteDefinition('/wave-sculptor', {
    prefix: gamesPrefix,
  }),

  harmonicStrings: createRouteDefinition('/harmonic-strings', {
    prefix: gamesPrefix,
  }),

  signalFlow: createRouteDefinition('/signal-flow', {
    prefix: gamesPrefix,
  }),

  jamLobby: createRouteDefinition('/jam', { prefix: gamesPrefix }),

  jamLocal: createRouteDefinition('/jam/local', { prefix: gamesPrefix }),

  jamRoom: createRouteDefinition<{ roomId: string }>('/jam/:roomId', {
    prefix: gamesPrefix,
  }),
};

const homePrefix = '/home';

export const ProfileRoutes = {
  root: createRouteDefinition(homePrefix),

  profile: createRouteDefinition('/user', { prefix: homePrefix }),

  awards: createRouteDefinition('/user/awards', { prefix: homePrefix }),

  settings: createRouteDefinition('/user/settings', { prefix: homePrefix }),

  settingsSection: createRouteDefinition<{ section: string }>(
    '/user/settings/:section',
    { prefix: homePrefix },
  ),

  plan: createRouteDefinition('/user/plan', { prefix: homePrefix }),
};

const userPrefix = '/user';

export const UserRoutes = {
  root: createRouteDefinition(userPrefix),
};

const settingsPrefix = '/settings';

export const SettingsRoutes = {
  root: createRouteDefinition(settingsPrefix),

  section: createRouteDefinition<{ section: string }>('/:section', {
    prefix: settingsPrefix,
  }),
};

const learnPrefix = '/learn';

export const LearnRoutes = {
  root: createRouteDefinition(learnPrefix),

  overview: createRouteDefinition<{
    mode: string;
  }>('/:mode', { prefix: learnPrefix }),

  lesson: createRouteDefinition<{
    mode: string;
    key: string;
  }>('/:mode/:key', { prefix: learnPrefix }),

  relativeOverview: createRouteDefinition<{
    key: string;
  }>('/relative/:key', { prefix: learnPrefix }),

  parallelOverview: createRouteDefinition<{
    key: string;
  }>('/parallel/:key', { prefix: learnPrefix }),
};

const connectPrefix = '/connect';

export const ConnectRoutes = {
  root: createRouteDefinition(connectPrefix),
};

const libraryPrefix = '/library';

export const LibraryRoutes = {
  root: createRouteDefinition(libraryPrefix),
};

const atlasPrefix = '/atlas';

export const AtlasRoutes = {
  root: createRouteDefinition(atlasPrefix),

  /** The full interactive 3D globe. The `/atlas` index now shows the Globe Dashboard. */
  globe: createRouteDefinition('/globe', { prefix: atlasPrefix }),
};

const songsPrefix = '/songs';

export const SongRoutes = {
  root: createRouteDefinition(songsPrefix),
  song: createRouteDefinition<{ songId: string }>('/:songId', {
    prefix: songsPrefix,
  }),
};

const searchPrefix = '/search';

/**
 * Global content search page. `q` deep-links a query (e.g. `/search?q=redbone`).
 */
export const SearchRoutes = {
  root: createRouteDefinition<void, { q?: string }>(searchPrefix),
};

const curriculumPrefix = '/curriculum';

export const CurriculumRoutes = {
  root: createRouteDefinition(curriculumPrefix),

  genre: createRouteDefinition<{ genre: string }>('/:genre', {
    prefix: curriculumPrefix,
  }),

  fundamentalsSection: createRouteDefinition<{ sectionId: string }>(
    '/piano-fundamentals/:sectionId',
    { prefix: curriculumPrefix },
  ),

  genreLevel: createRouteDefinition<{ genre: string; level: string }>(
    '/:genre/:level',
    { prefix: curriculumPrefix },
  ),
};
