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

/**
 * The Table's query: search, sort, filters and status. The same on a table
 * and on an open row, so opening a row keeps the table as it was.
 */
type TableQuery = { q?: string; sort?: string; f?: string; status?: string };

/**
 * Cortex's query (the graph of the Atlas), the same on the graph and on a
 * row opened beside it, so opening a row keeps the graph as it was.
 *
 *  - `focus` — the item a local graph is centred on; without it the page
 *    shows the whole Atlas (the global graph);
 *  - `depth` — how many steps the local graph walks out, 1 to 5, left out
 *    when it is 1;
 *  - `list` — `1` while the accessible List view shows instead of the map;
 *  - `node` — an item with no row in the Table (a vibe, an era, a teach
 *    day), open beside the graph read-only.
 *
 * Old links may still say `hops`, which is read as `depth`, and `off`, `on`,
 * `guesses`, `unconfirmed` or `hubs`, which mean nothing now; the graph
 * reads past them and drops them the first time it changes the URL
 * (features/admin/content/graph/map/useGraphUrlState.ts). None of these
 * names is one the Table's query uses, so a row panel reading its own
 * never finds the graph's there.
 */
type GraphQuery = {
  focus?: string;
  depth?: string;
  list?: string;
  node?: string;
};

/**
 * Tesseract's query (the map of progression openings), the same on the map
 * and on a row opened beside it:
 *
 *  - `key` — the major key chords are named and coloured in (`Eb`), left
 *    out for C;
 *  - `notation` — `hybrid` or `roman` to name chords that way, left out for
 *    the map's default, Jazz letter names;
 *  - `list` — `1` while the accessible list shows instead of the map;
 *  - `depth` — how many chords deep the trees show (`1` to `7`, or `all`),
 *    always written by the map, so a URL it wrote is never bare;
 *  - `open`, `fold` — the openings opened beyond that depth and folded
 *    within it, comma-separated (`1 major7|2 minor7`).
 *
 * A bare URL restores the last view the browser showed. None of these is a
 * name the Table's query uses
 * (features/admin/content/graph/tesseract/tesseractLinks.ts).
 */
type TesseractQuery = {
  key?: string;
  notation?: string;
  list?: string;
  depth?: string;
  open?: string;
  fold?: string;
};

export const AdminRoutes = {
  /**
   * The root route for the admin console.
   */
  root: createRouteDefinition(adminPrefix),

  /**
   * The route to the users page: all users + subscription status, with
   * insider (free) access managed from the Subscription column. Takes
   * `?subscription=` to open filtered.
   */
  users: createRouteDefinition('/users', { prefix: adminPrefix }),

  /**
   * Legacy: redirects to the users page filtered to insider access.
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
   * Content — the app as students see it, mirrored inside the console. Any
   * app path appended to it is that page (`/console/content/songs/africa`);
   * see features/admin/content/mirror/mirrorPaths.ts.
   */
  content: createRouteDefinition('/content', { prefix: adminPrefix }),

  /**
   * Content records — the table of one kind (globe_event, song, …). Under
   * `records/` so a kind's name can never shadow an app segment in the mirror.
   */
  contentKind: createRouteDefinition<{ kind: string }, { q?: string }>(
    '/content/records/:kind',
    { prefix: adminPrefix },
  ),

  /**
   * Content back office — editor for one item. `id` is 'new' when creating.
   */
  contentItem: createRouteDefinition<{ kind: string; id: string }>(
    '/content/records/:kind/:id',
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
   * Publishing — the review queue, per-kind publish and "publish everything
   * that changed". Replaces the old /console/releases page.
   */
  contentPublishing: createRouteDefinition('/content/publishing', {
    prefix: adminPrefix,
  }),

  /** Publishing — release history: restore and cancel. */
  contentPublishingHistory: createRouteDefinition(
    '/content/publishing/history',
    { prefix: adminPrefix },
  ),

  /**
   * Publishing — bring the repo's chord charts into the store. Temporary: a
   * migration that hides once the store matches the repo. Replaces the old
   * /console/import-songs page.
   */
  contentPublishingImport: createRouteDefinition('/content/publishing/import', {
    prefix: adminPrefix,
  }),

  /**
   * Cortex — the console's section for the Atlas as a graph and as tables
   * (owner, 1 Oct 2026: the sidebar's "Table" renamed "Cortex", and the
   * mind map renamed "Cortex" too). Its home, and the section's default
   * view, is the graph: the whole Atlas as one map, or with
   * `?focus=song:africa` the local graph around one item (`&depth=2` to walk
   * further out). The tables stay at their own `/console/table/…` URLs,
   * inside the same section. The graph used to live at
   * `/console/content/graph`; those links redirect here, query and all.
   */
  cortex: createRouteDefinition<void, GraphQuery>('/cortex', {
    prefix: adminPrefix,
  }),

  /**
   * Cortex with an item's Table row open beside the graph (a dot clicked).
   * A child of the graph's route, so the map stays mounted while rows open
   * and close; the row lives in the path so that leaving it with unsaved
   * edits is caught by the unsaved-changes guard, as in the Table. The
   * static `integrity` and `links` pages are one segment shorter, so they
   * never read as a row.
   */
  cortexRow: createRouteDefinition<{ table: string; row: string }, GraphQuery>(
    '/cortex/:table/:row',
    { prefix: adminPrefix },
  ),

  /** Cortex — integrity: coverage and every problem row. */
  cortexIntegrity: createRouteDefinition<
    void,
    { check?: string; severity?: string }
  >('/cortex/integrity', { prefix: adminPrefix }),

  /** Cortex — link the songs' artist names to records, in bulk. */
  cortexLinks: createRouteDefinition('/cortex/links', {
    prefix: adminPrefix,
  }),

  /**
   * Cortex — Tesseract (owner, 1 Oct 2026): the map of progression
   * openings, one tidy tree per starting chord, named and coloured in the
   * key the query picks. Its own pill, second in the Cortex bar. Static and
   * one segment long, so it is never read as `cortexRow`.
   */
  cortexTesseract: createRouteDefinition<void, TesseractQuery>(
    '/cortex/tesseract',
    { prefix: adminPrefix },
  ),

  /**
   * Tesseract with a progression's Table row open beside the map (an end
   * clicked). A child of the map's route, so the map stays mounted while
   * rows open and close, as Cortex's does.
   */
  cortexTesseractRow: createRouteDefinition<
    { table: string; row: string },
    TesseractQuery
  >('/cortex/tesseract/:table/:row', { prefix: adminPrefix }),

  /**
   * Where the graph lived before it became Cortex. Only the route tree uses
   * it, to send old links (bookmarks, review notes) on to `cortex`.
   */
  legacyGraph: createRouteDefinition('/content/graph', {
    prefix: adminPrefix,
  }),

  /**
   * The Atlas's vocabularies — genres, instruments, and the globe tags nothing
   * has placed yet. Read-only; these lists live in code. Beside the records
   * because that is what they are: the fixed lists records point at.
   */
  contentVocabulary: createRouteDefinition('/content/records/vocabulary', {
    prefix: adminPrefix,
  }),

  /**
   * The Table — the Atlas as rows and columns, one table per category
   * (artists, songs, genres…), inside the Cortex section beside the graph,
   * not under the mirror. The bare URL names no table and opens the
   * section's default view, the graph (`cortex`), its query kept; a link
   * meant for a table uses `tableList`.
   */
  table: createRouteDefinition('/table', { prefix: adminPrefix }),

  /**
   * The Table — one table (`artists`, `records`, `years`…; the ids are in
   * features/admin/table/tablePaths.ts). The query holds the search, sort,
   * filters and status, so a table can be linked as it was left.
   */
  tableList: createRouteDefinition<{ table: string }, TableQuery>(
    '/table/:table',
    { prefix: adminPrefix },
  ),

  /**
   * The Table — one table with a row open. The row lives in the path so that
   * leaving it with unsaved edits is caught by the unsaved-changes guard, and
   * Back closes it. A second generator rather than an optional `:row?`, which
   * would print an absent row as "undefined"; the route tree matches both
   * with one `:table/:row?` so the table keeps its scroll when the row changes.
   */
  tableRow: createRouteDefinition<{ table: string; row: string }, TableQuery>(
    '/table/:table/:row',
    { prefix: adminPrefix },
  ),

  /**
   * Drum Grooves designer — the step-sequenced grooves activity backing tracks,
   * Practice Tracks and the Studio's Grooves tab play. Saving writes repo
   * files (dev server only).
   */
  drumGrooves: createRouteDefinition('/grooves', { prefix: adminPrefix }),

  /** Drum Grooves designer — one groove. */
  drumGroove: createRouteDefinition<{ id: string }>('/grooves/:id', {
    prefix: adminPrefix,
  }),

  /**
   * Parts Library — instrumental parts (piano, bass, guitar…) lessons and the
   * Studio draw on, drum grooves listed alongside. Saving writes repo files
   * (dev server only).
   */
  parts: createRouteDefinition('/parts', { prefix: adminPrefix }),

  /** Parts Library — one part's editor. */
  part: createRouteDefinition<{ id: string }>('/parts/:id', {
    prefix: adminPrefix,
  }),

  /**
   * Parts editor on a lesson step's notes: piano roll / staff, then commit
   * back to the lesson. `index` is the step's position in its section.
   */
  lessonPart: createRouteDefinition<
    { genre: string; level: string },
    { section?: string; index?: string; hands?: string; variant?: string }
  >('/parts/lesson/:genre/:level', { prefix: adminPrefix }),
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
 * Teacher "Office" — the standalone classroom picker/home, promoted to a
 * top-level URL (no `/teacher` prefix).
 */
export const OfficeRoutes = {
  root: createRouteDefinition('/office'),
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

  /**
   * The route to the licensing policy.
   */
  licensing: createRouteDefinition('/licensing', { prefix: legalPrefix }),
};

export const ExternalLinks = {
  LandingPage: createLinkDefinition('https://musicatlas.io'),
};

const studioPrefix = '/studio';

export const StudioRoutes = {
  root: createRouteDefinition(studioPrefix),

  picker: createRouteDefinition('/', { prefix: studioPrefix }),

  /** The DAW editor. The `/studio` index now shows the Studio Dashboard. */
  editor: createRouteDefinition('/editor', { prefix: studioPrefix }),

  /** The Production tab — step-by-step DAW lessons, each opening the editor. */
  production: createRouteDefinition('/production', { prefix: studioPrefix }),
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

  // Guitar (The Guitar Atlas): its key centers are Theory → Ionian (Major) on
  // guitar. Static first segment, so these outrank '/:mode' and '/:mode/:key'.
  /** Bare '/learn/guitar': not a page; sends the student to Theory. */
  guitar: createRouteDefinition('/guitar', { prefix: learnPrefix }),

  /** A mode's guitar overview: the keys, the book's scale box. */
  guitarOverview: createRouteDefinition<{
    mode: string;
  }>('/guitar/:mode', { prefix: learnPrefix }),

  /** A key's guitar lesson; `?section=A|B|D` opens that chapter. */
  guitarLesson: createRouteDefinition<{
    mode: string;
    key: string;
  }>('/guitar/:mode/:key', { prefix: learnPrefix }),
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
  // The static segments must be declared — and registered — before the
  // `:songId` route, or it swallows them.
  setLists: createRouteDefinition('/setlists', { prefix: songsPrefix }),
  setList: createRouteDefinition<{ setListId: string }>(
    '/setlists/:setListId',
    {
      prefix: songsPrefix,
    },
  ),
  setListPrint: createRouteDefinition<{ setListId: string }>(
    '/setlists/:setListId/print',
    { prefix: songsPrefix },
  ),
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

  appliedTheoryFundamentals: createRouteDefinition(
    '/applied-theory-fundamentals',
    { prefix: curriculumPrefix },
  ),

  appliedTheoryFundamentalsLesson: createRouteDefinition<{ key: string }>(
    '/applied-theory-fundamentals/:key',
    { prefix: curriculumPrefix },
  ),

  // Legacy: guitar lived here as a twin of Applied Theory Fundamentals. It is
  // now Learn → Theory → Ionian (Major) on guitar (LearnRoutes.guitarOverview /
  // guitarLesson); these paths only redirect there, so old links keep
  // working. Static segments, so they rank above '/:genre/:level'.
  guitarAppliedTheoryFundamentals: createRouteDefinition(
    '/guitar/applied-theory-fundamentals',
    { prefix: curriculumPrefix },
  ),

  guitarAppliedTheoryFundamentalsLesson: createRouteDefinition<{
    key: string;
  }>('/guitar/applied-theory-fundamentals/:key', {
    prefix: curriculumPrefix,
  }),

  genreLevel: createRouteDefinition<{ genre: string; level: string }>(
    '/:genre/:level',
    { prefix: curriculumPrefix },
  ),
};
