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
   * The route to the teachers page.
   */
  teachers: createRouteDefinition('/teachers', { prefix: adminPrefix }),

  /**
   * The route to the students page.
   */
  students: createRouteDefinition('/students', { prefix: adminPrefix }),


  /**
   * The route to the chapters page.
   */
  chapters: createRouteDefinition('/chapters', { prefix: adminPrefix }),

  /**
   * The route to the chapter page.
   */
  chapter: createRouteDefinition<{ id: string }>('/chapters/:id', {
    prefix: adminPrefix,
  }),

  /**
   * The route to the collections page.
   */
  collections: createRouteDefinition('/collections', { prefix: adminPrefix }),

  /**
   * The route to the collection page.
   */
  collection: createRouteDefinition<{ id: string }>('/collections/:id', {
    prefix: adminPrefix,
  }),

  /**
   * The route to the phrase maps page.
   */
  phraseMaps: createRouteDefinition('/rhythm-maps', { prefix: adminPrefix }),

  /**
   * The route to the phrase map page.
   */
  phraseMap: createRouteDefinition<{ id: string }>('/rhythm-maps/:id', {
    prefix: adminPrefix,
  }),

  /**
   * The route to the play alongs page.
   */
  playAlongs: createRouteDefinition('/play-along', { prefix: adminPrefix }),

  /**
   * The route to the play along page.
   */
  playAlong: createRouteDefinition<{ id: string }>('/play-along/:id', {
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

const gamesPrefix = '/games';

export const GameRoutes = {

  root : createRouteDefinition(gamesPrefix),

  picker: createRouteDefinition('/', {prefix: gamesPrefix}),

}


const homePrefix = '/home';

export const ProfileRoutes = {

  root : createRouteDefinition(homePrefix),

  profile: createRouteDefinition(homePrefix),

  settings: createRouteDefinition('/settings', { prefix: homePrefix }),

  plan: createRouteDefinition('/plan', { prefix: homePrefix}),

}

const learnPrefix= '/learn';

export const LearnRoutes = {

  root: createRouteDefinition(learnPrefix),


  flow: createRouteDefinition<{
      flowType: string,
      nameOf: string,
    }>('/lessons/flow/:flowType/:nameOf', { prefix: learnPrefix }),

  specific: createRouteDefinition<{
      key:string,
    }>('/lessons/:key', { prefix: learnPrefix }),

  group: createRouteDefinition<{
      key:string,
      group: string,
    }>('/lessons/:key/:group', { prefix: learnPrefix }),
}


const connectPrefix = '/connect';

export const ConnectRoutes = {

  root: createRouteDefinition(connectPrefix),

}

const libraryPrefix = '/library';

export const LibraryRoutes = {

  root: createRouteDefinition(libraryPrefix),
  
}