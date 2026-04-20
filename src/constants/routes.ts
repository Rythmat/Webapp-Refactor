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
  telemetryApi: createRouteDefinition('/telemetry/api', { prefix: adminPrefix }),

  /**
   * Routing analytics dashboard.
   */
  telemetryRouting: createRouteDefinition('/telemetry/routing', { prefix: adminPrefix }),

  /**
   * Audio/keyboard analytics dashboard.
   */
  telemetryAudio: createRouteDefinition('/telemetry/audio', { prefix: adminPrefix }),

  /**
   * Product funnel / learning analytics dashboard.
   */
  telemetryProduct: createRouteDefinition('/telemetry/product', { prefix: adminPrefix }),

  /**
   * Recent errors / failures dashboard.
   */
  telemetryErrors: createRouteDefinition('/telemetry/errors', { prefix: adminPrefix }),
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

  plan: createRouteDefinition('/user/plan', { prefix: homePrefix }),
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
