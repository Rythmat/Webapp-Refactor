import { createLinkDefinition } from '@/util/createLinkDefinition';
import { createRouteDefinition } from '@/util/createRouteDefinition';

export const WildcardRoute = {
  /**
   * The root route for the wildcard.
   */
  root: createRouteDefinition('*'),
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
};

/**
 * The routes for the teacher.
 */
const teacherPrefix = '/teacher';

export const TeacherRoutes = {
  /**
   * The root route for the teacher.
   */
  root: createRouteDefinition(teacherPrefix),

  /**
   * The route to the student page.
   */
  students: createRouteDefinition<{
    classroomId: string;
  }>('/classroom/:classroomId/students', {
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
   * Presentation Mode — the projected board for a specific Day.
   * See src/features/classroom/presentation/PresentationMode.tsx.
   */
  present: createRouteDefinition<{
    classroomId: string;
    dayId: string;
  }>('/:classroomId/present/:dayId', {
    prefix: classroomPrefix,
  }),

  /**
   * Plan overview for a classroom — lists the teacher's authored Days and
   * exposes a "New Day" affordance. Days persist locally per the fresh-build
   * brief; nothing hits the server in v1.
   */
  plan: createRouteDefinition<{
    classroomId: string;
  }>('/:classroomId/plan', {
    prefix: classroomPrefix,
  }),

  /**
   * Day editor — teacher-facing authoring surface for a single Day. Reads and
   * writes through `useLocalPlan` (localStorage `ma-teacher:plan:v1`).
   */
  dayEditor: createRouteDefinition<{
    classroomId: string;
    dayId: string;
  }>('/:classroomId/plan/:dayId', {
    prefix: classroomPrefix,
  }),

  /**
   * Preview a Day as a student would see it. Runs the Day through
   * `buildStudentView` + renders phase interactions inline via
   * `InteractionInput` so the teacher can smoke-test authoring locally
   * before publishing.
   */
  preview: createRouteDefinition<{
    classroomId: string;
    dayId: string;
  }>('/:classroomId/plan/:dayId/preview', {
    prefix: classroomPrefix,
  }),

  /**
   * Student and teacher assignments list for a classroom. Backed by
   * localStorage in Sprint 2; will read `GET /classrooms/:id/assignments`
   * when the backend endpoints in `docs/classroom-v2/openapi.yaml` ship.
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

  /**
   * Teacher progress grid for a single assignment.
   */
  assignmentProgress: createRouteDefinition<{
    classroomId: string;
    assignmentId: string;
  }>('/:classroomId/assignments/:assignmentId/progress', {
    prefix: classroomPrefix,
  }),

  /** Student live-session view. */
  live: createRouteDefinition<{
    classroomId: string;
    sessionId: string;
  }>('/:classroomId/live/:sessionId', {
    prefix: classroomPrefix,
  }),

  /** Teacher live-session dashboard. */
  session: createRouteDefinition<{
    classroomId: string;
    sessionId: string;
  }>('/:classroomId/sessions/:sessionId', {
    prefix: classroomPrefix,
  }),

  /** Anonymized projector overlay. */
  projector: createRouteDefinition<{
    classroomId: string;
    sessionId: string;
  }>('/:classroomId/sessions/:sessionId/projector', {
    prefix: classroomPrefix,
  }),

  /** Teacher-only post-session report. */
  report: createRouteDefinition<{
    classroomId: string;
    sessionId: string;
  }>('/:classroomId/sessions/:sessionId/report', {
    prefix: classroomPrefix,
  }),

  /** Teacher-only index of ended-session reports. */
  reports: createRouteDefinition<{
    classroomId: string;
  }>('/:classroomId/reports', {
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
};

const songsPrefix = '/songs';

export const SongRoutes = {
  root: createRouteDefinition(songsPrefix),
  song: createRouteDefinition<{ songId: string }>('/:songId', {
    prefix: songsPrefix,
  }),
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
