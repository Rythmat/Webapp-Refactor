import { LearnRoutes } from '@/constants/routes';
import {
  addSongEntry,
  ensureDefaults,
  roleList,
} from '@/features/setlists/setListsStore';
import {
  sandboxAdditions,
  useSetListSandbox,
} from '@/features/setlists/storage/setListSandbox';
import type { SetListsBlob } from '@/features/setlists/types';
import {
  atCourse,
  atCourseLesson,
  atGlobe,
  atIonianLesson,
  atLearn,
  atLearnHome,
  atLearnTab,
  atSetLists,
  atSong,
  learnHref,
  TOUR_GENRE_SLUG,
  TOUR_SONG_HREF,
  TOUR_SONG_ID,
} from '../places';
import { pressEscape, typeInto, type TargetSpec } from '../targets';
import type {
  LearnSectionTourId,
  TourApi,
  TourDefinition,
  TourPlace,
  TourStep,
} from '../types';

// ── How to Navigate ────────────────────────────────────────────────────────
// The whole of Learn, page by page, from the compass on the Learn dashboard
// (Peter, 2026-10-21): the dashboard; Start Here and its five stops; Songs,
// its filters and search, a song's chart, key, Globe and Save Version; Set
// Lists, making a set list, a show and a band and dragging each into the
// next; a genre course (Hip Hop) from its tile to a lesson and back; and
// Theory, from its sections and filters to Ionian's Overview and back.
//
// Set Lists runs on a practice copy (setListSandbox.ts), so nothing the tour
// makes is saved, and Hip Hop opens for a free player for its part of the
// tour only (tourPremiumPreview.ts).

const SONG_TITLE = 'Close To You';

/** The step's card, at a place, with the way back there. */
type StepInput = Omit<TourStep, 'chapter' | 'at' | 'href'> &
  Partial<Pick<TourStep, 'at' | 'href'>>;

const chapter =
  (
    name: string,
    base: Pick<TourStep, 'at'> & Partial<TourStep>,
  ): ((step: StepInput) => TourStep) =>
  (step) => ({ chapter: name, ...base, ...step });

/** A Learn tab, clicked in the tab bar: the way into each part of Learn. */
const openTab = (
  label: string,
  tab: string,
  extra: Partial<TourStep> = {},
): TourStep => ({
  id: `open-${tab.toLowerCase()}`,
  chapter: label === 'Start Here' ? 'Start Here' : label,
  at: (place: TourPlace) => atLearn(place) || atSong(place),
  href: () => learnHref(),
  target: { css: `a[aria-label="Open ${label}"]` },
  text: `Click **${label}**.`,
  next: 'click',
  doneWhen: (api) => atLearnTab(tab)(api.place),
  ...extra,
});

// ── The dashboard ──────────────────────────────────────────────────────────

const dashboard = chapter('Dashboard', {
  at: atLearnHome,
  href: () => learnHref(),
});

const home = (part: string): TargetSpec => ({
  css: `[data-learn-home="${part}"]`,
});

// ── Start Here ─────────────────────────────────────────────────────────────

const startHere = chapter('Start Here', {
  at: atLearnTab('StartHere'),
  href: () => learnHref('StartHere'),
});

const stop = (id: string): TargetSpec => ({ css: `[data-path-stop="${id}"]` });

// ── Songs ──────────────────────────────────────────────────────────────────

const songs = chapter('Songs', {
  at: atLearnTab('Songs'),
  href: () => learnHref('Songs'),
});

const song = chapter('Songs', { at: atSong, href: () => TOUR_SONG_HREF });

/** The song's row in the library: its title, linking to its page. */
const SONG_LINK: TargetSpec = { css: `a[href="${TOUR_SONG_HREF}"]` };
const KEY_WHEEL: TargetSpec = {
  css: '[role="radiogroup"][aria-label="Choose a key"]',
};
const DIALOG: TargetSpec = { css: '[role="dialog"]' };

// ── Set Lists, on the practice copy ────────────────────────────────────────

const setLists = chapter('Set Lists', {
  at: atSetLists,
  href: () => '/songs/setlists',
  sandbox: true,
});

/** The copy, readied: Close To You in My Lead Sheets, to drag. */
function withPracticeLeadSheet(blob: SetListsBlob): SetListsBlob {
  const ready = ensureDefaults(blob, Date.now());
  const inbox = roleList(ready, 'inbox');
  if (!inbox) return ready;
  const has = inbox.entries.some(
    (e) => e.kind === 'song' && e.songId === TOUR_SONG_ID,
  );
  return has
    ? ready
    : addSongEntry(ready, inbox.id, { songId: TOUR_SONG_ID }, 0, Date.now())
        .blob;
}

/** The last set list made on the copy (and show and band, by the card). */
function made() {
  const added = sandboxAdditions();
  const blob = useSetListSandbox.getState().blob;
  const last = (ids: readonly string[]) => ids[ids.length - 1];
  return {
    blob,
    listId: last(added.setLists.filter((id) => !blob?.setLists[id]?.role)),
    showId: last(added.shows),
    bandId: last(added.artists),
  };
}

/** A field on a set list's card: its Group or Date. */
const placeField = (
  id: string | undefined,
  field: 'Group' | 'Date',
): TargetSpec => ({
  css: `[data-set-list="${id}"] input[aria-label="${field}"]`,
});

// ── Genre ──────────────────────────────────────────────────────────────────

const genre = chapter('Genre', {
  at: atLearnTab('Genre'),
  href: () => learnHref('Genre'),
  preview: true,
});

const course = chapter('Genre', {
  at: atCourse,
  href: () => LearnRoutes.genreCourse({ genre: TOUR_GENRE_SLUG }),
  preview: true,
});

const courseTab = (id: string): TargetSpec => ({
  css: `[data-course-tab="${id}"]`,
});
const courseLevel = (level: number): TargetSpec => ({
  css: `[data-course-level="${level}"]`,
});

/** A crumb in a lesson's header (shown in capitals: COURSES, THEORY). */
const crumb = (label: string): TargetSpec => ({
  css: 'nav[aria-label="Breadcrumb"] button',
  text: new RegExp(`^${label}$`, 'i'),
});

// ── Theory ─────────────────────────────────────────────────────────────────

const theory = chapter('Theory', {
  at: atLearnTab('Theory'),
  href: () => learnHref('Theory'),
});

const ionian = chapter('Theory', {
  at: atIonianLesson,
  href: () =>
    LearnRoutes.keyboardLesson({ mode: 'ionian', key: 'c' }, { section: 'O' }),
});

const overviewTab = (label: RegExp): TargetSpec => ({
  css: '[role="group"][aria-label="Overview"] button',
  text: label,
});

/** The Overview card's Triads / 7ths / 9ths / Inversions toggle. */
const chordView = (label: RegExp): TargetSpec => ({
  css: '[data-theory-content] [role="group"][aria-label="Chords"] button',
  text: label,
});

const pressed = (api: TourApi, target: TargetSpec) =>
  api.find(target)[0]?.getAttribute('aria-pressed') === 'true';

const PLAY_CHORD: TargetSpec = {
  css: '[data-theory-content] [data-chord-tile]',
};

// ── The tour ───────────────────────────────────────────────────────────────

export const navigateTour: TourDefinition = {
  id: 'navigate',
  title: 'How to Navigate',
  prepareSandbox: withPracticeLeadSheet,
  finale: {
    heading: 'Congratulations! You’ve toured all of Learn.',
    line: 'Need a hand later? Click the **compass** in the Learn menu for help with the page you’re on.',
  },
  steps: [
    // 1. The dashboard
    dashboard({
      id: 'welcome',
      text: 'Welcome to **Learn**! This tour shows you around: the dashboard, **Start Here**, **Songs**, **Set Lists**, **Genre** and **Theory**. Press **Next** to go on, or **Quit Tutorial** whenever you like.',
    }),
    dashboard({
      id: 'continue',
      target: home('continue'),
      text: '**Continue** takes you right back to where you left off.',
    }),
    dashboard({
      id: 'streak',
      target: home('streak'),
      text: 'Your **streak** counts the days in a row you’ve learned, with today’s goal beside it.',
    }),
    dashboard({
      id: 'xp',
      target: home('xp'),
      text: 'Every lesson and game earns **XP**. Here’s how yours adds up.',
    }),
    dashboard({
      id: 'recent',
      target: home('recent'),
      text: '**Recent Lessons** are the ones you played last, one click away.',
    }),
    dashboard({
      id: 'saved',
      target: home('saved'),
      text: '**Saved Songs** keeps the songs you’ve saved.',
    }),

    // 2. Start Here
    openTab('Start Here', 'StartHere'),
    startHere({
      id: 'stop-1',
      target: stop('call-and-response'),
      text: '**Start Here** is the Music Literacy path, five stops in a row. First, **Rhythm and Harmony**: call and response, to feel the beat and hear the chords.',
    }),
    startHere({
      id: 'stop-2',
      target: stop('choose-a-color'),
      text: '**Melodies and Chords**: play tunes, and choose the chords that color them.',
    }),
    startHere({
      id: 'stop-3',
      target: stop('hear-it-with-your-band'),
      text: '**Practice with a Band**: play along with a band in the Studio.',
    }),
    startHere({
      id: 'stop-4',
      target: stop('studio-basics'),
      text: '**Learn Studio Basics**: record and build your own songs.',
    }),
    startHere({
      id: 'stop-5',
      target: stop('echo'),
      text: '**Play Echo in the Arcade**: a game that trains your ear.',
    }),

    // 3. Songs
    openTab('Songs', 'Songs'),
    songs({
      id: 'songs-difficulty',
      target: { css: 'button[aria-label="Difficulty"]' },
      text: 'Find songs by **Difficulty**, from Level 1 up…',
    }),
    songs({
      id: 'songs-genre',
      target: { css: 'button[aria-label="Genre"]' },
      text: '…by **Genre**…',
    }),
    songs({
      id: 'songs-saved',
      target: { css: 'button[aria-label="Saved"]' },
      text: '…or only the ones you’ve **Saved**.',
    }),
    songs({
      id: 'songs-sort',
      target: { css: 'button[aria-label="Sort"]' },
      text: '**Sort** them by title, artist, level and more.',
    }),
    songs({
      id: 'songs-search',
      target: { css: 'input[placeholder="Search artist name or song title"]' },
      text: 'Or **search** for an artist or a title. Let’s find *Close To You*.',
      next: async (api) => {
        const [input] = api.find({
          css: 'input[placeholder="Search artist name or song title"]',
        });
        if (input instanceof HTMLInputElement && !/close/i.test(input.value))
          await typeInto(input, 'Close To You', api.reducedMotion);
        await api.wait(400);
      },
    }),
    songs({
      id: 'open-song',
      target: SONG_LINK,
      text: `There it is. Click **(They Long To Be) ${SONG_TITLE}**.`,
      next: 'click',
      doneWhen: (api) => atSong(api.place),
    }),
    song({
      id: 'chart',
      wait: 10000,
      scroll: { css: '[data-chart-section]' },
      text: 'Here’s the chord chart. Click on a chord symbol to see how to play it.',
    }),
    song({
      id: 'key',
      target: { css: 'button[title="Transpose"]' },
      text: 'Click the **key** to play the song in another key.',
      next: 'click',
      doneWhen: (api) => api.find(KEY_WHEEL).length > 0,
    }),
    song({
      id: 'key-wheel',
      resumeFrom: 'key',
      target: KEY_WHEEL,
      wait: 2500,
      text: 'Pick any key on the wheel, and the whole chart changes with it.',
      next: (api) => {
        if (api.find(KEY_WHEEL).length > 0) pressEscape();
      },
    }),
    song({
      id: 'globe',
      target: { css: 'button[aria-label="Open in Globe"]' },
      text: 'Click the **Globe** to see where and when this song was made.',
      next: 'click',
      doneWhen: (api) => atGlobe(api.place),
    }),
    {
      id: 'globe-view',
      resumeFrom: 'globe',
      chapter: 'Songs',
      at: atGlobe,
      text: 'The **Globe** puts every song in its place and time. Next takes you back to the song.',
      next: (api) => api.navigate(TOUR_SONG_HREF),
    },
    song({
      id: 'save-version',
      sandbox: true,
      wait: 10000,
      target: { css: 'button[title="Save this version to a set list"]' },
      text: '**Save Version** keeps the song in the key you chose, with your notes, in a set list.',
      next: 'click',
      doneWhen: (api) => api.find(DIALOG).length > 0,
    }),
    song({
      id: 'save-dialog',
      resumeFrom: 'save-version',
      sandbox: true,
      target: DIALOG,
      wait: 2500,
      text: 'Name your version and choose its set list. (On the tour, nothing is saved.)',
      next: (api) => {
        if (api.find(DIALOG).length > 0) pressEscape();
      },
    }),
    song({
      id: 'back-to-songs',
      sandbox: true,
      target: { css: 'button[aria-label="Back to Song Library"]' },
      text: 'Now let’s look at **Set Lists**. First, back to **Songs**.',
      next: 'click',
      doneWhen: (api) => atLearnTab('Songs')(api.place),
    }),
    songs({
      id: 'open-set-lists',
      sandbox: true,
      target: { css: 'a[aria-label="Open Set Lists"]' },
      text: 'Click **Set Lists**.',
      next: 'click',
      doneWhen: (api) => atSetLists(api.place),
    }),

    // 3b. Set Lists
    setLists({
      id: 'set-lists',
      target: { css: '[data-setlists-column]', all: true },
      text: '**Set Lists** is where you plan what you’ll play. On the tour this page is a practice copy: nothing you make here is saved.',
    }),
    setLists({
      id: 'new-set-list',
      resumeFrom: 'set-lists',
      target: { css: '[data-setlists-new="setlist"]' },
      text: 'Click **+ Add Set List** to make a set list.',
      next: 'click',
      doneWhen: () => !!made().listId,
    }),
    setLists({
      id: 'place-the-list',
      resumeFrom: 'set-lists',
      target: () => {
        const { listId } = made();
        return [placeField(listId, 'Group'), placeField(listId, 'Date')];
      },
      text: 'A set list’s name is its show. Beside it, type its **Group** and pick its **Date**.',
    }),
    setLists({
      id: 'the-shape',
      resumeFrom: 'set-lists',
      target: { css: '[data-setlists-column="setlists"]' },
      text: 'That’s how it fits together: **songs** go in **set lists**, and each set list knows its **group** and **date**.',
    }),
    setLists({
      id: 'back-from-set-lists',
      resumeFrom: 'set-lists',
      target: { css: 'a[aria-label="Back to Songs"]' },
      text: 'Your practice set lists go away now. Let’s head back to **Songs**.',
      next: 'click',
      doneWhen: (api) => atLearnTab('Songs')(api.place),
    }),

    // 4. Genre
    openTab('Genre', 'Genre', { preview: true }),
    genre({
      id: 'genres',
      scroll: { css: '[data-learn-tile]' },
      text: 'Every genre course, from the blues to hip hop. Let’s scroll through them.',
    }),
    genre({
      id: 'hip-hop',
      target: { css: '[data-learn-tile="Hip Hop"]' },
      text: 'Click **Hip Hop**.',
      next: 'click',
      doneWhen: (api) =>
        api.find({ css: '[data-learn-chapter="Overview"]' }).length > 0,
    }),
    genre({
      id: 'course-overview',
      resumeFrom: 'hip-hop',
      target: { css: '[data-learn-chapter="Overview"]' },
      wait: 3000,
      text: 'Each course has three levels, each in chapters. Click **Overview** to see the whole course.',
      next: 'click',
      doneWhen: (api) => atCourse(api.place),
    }),
    course({
      id: 'about',
      scroll: { css: '[data-course-tab]' },
      text: 'The **Overview** tells Hip Hop’s story: where it comes from and how it sounds.',
    }),
    course({
      id: 'course-theory',
      target: courseTab('theory'),
      text: 'Click **Theory**.',
      next: 'click',
      doneWhen: (api) =>
        api.find(courseTab('theory'))[0]?.getAttribute('aria-pressed') ===
        'true',
    }),
    course({
      id: 'course-theory-page',
      resumeFrom: 'course-theory',
      scroll: { css: '[data-course-tab]' },
      text: '**Theory** shows the scales and chords of each level.',
    }),
    course({
      id: 'course-technique',
      target: courseTab('technique'),
      text: 'Click **Technique**.',
      next: 'click',
      doneWhen: (api) =>
        api.find(courseTab('technique'))[0]?.getAttribute('aria-pressed') ===
        'true',
    }),
    course({
      id: 'course-technique-page',
      resumeFrom: 'course-technique',
      scroll: { css: '[data-course-tab]' },
      text: '**Technique** shows what you’ll play in each part: the melody, the chords, the bass and the whole performance.',
    }),
    course({
      id: 'level-2',
      resumeFrom: 'course-technique',
      target: courseLevel(2),
      text: 'Each course has three levels. Click **L2**…',
      next: 'click',
      doneWhen: (api) =>
        api.find(courseLevel(2))[0]?.getAttribute('aria-pressed') === 'true',
    }),
    course({
      id: 'level-3',
      resumeFrom: 'course-technique',
      target: courseLevel(3),
      text: '…and **L3**.',
      next: 'click',
      doneWhen: (api) =>
        api.find(courseLevel(3))[0]?.getAttribute('aria-pressed') === 'true',
    }),
    course({
      id: 'jump-in',
      resumeFrom: 'course-technique',
      target: { css: '[data-course-jump="melody"]' },
      text: 'Click **Jump In** on Melody to start the lesson.',
      next: 'click',
      doneWhen: (api) => atCourseLesson(api.place),
    }),
    {
      id: 'course-lesson',
      resumeFrom: 'course-technique',
      chapter: 'Genre',
      at: atCourseLesson,
      preview: true,
      wait: 15000,
      target: { css: '[data-guitar-bar]' },
      text: 'You’re in the lesson. The first time you open one on your own, we’ll show you around it.',
    },
    {
      id: 'courses',
      resumeFrom: 'course-technique',
      chapter: 'Genre',
      at: atCourseLesson,
      preview: true,
      target: crumb('Courses'),
      text: (api) =>
        `Click **Courses** to go back to the Learn dashboard.${
          api.ctx.premium
            ? ''
            : ' Hip Hop and every other genre course come with **Premium**.'
        }`,
      next: 'click',
      doneWhen: (api) => atLearn(api.place),
    },

    // 5. Theory
    openTab('Theory', 'Theory'),
    theory({
      id: 'modes',
      scroll: { css: '[data-learn-tile]' },
      text: 'Here are the scales and modes, family by family.',
    }),
    theory({
      id: 'mode-family',
      target: { css: 'button[aria-label="Mode Family"]' },
      text: '**Mode Family** shows one family of modes at a time.',
    }),
    theory({
      id: 'mode-sort',
      target: { css: 'button[aria-label="Sort"]' },
      text: '**Sort** puts them in the order you like.',
    }),
    theory({
      id: 'mode-saved',
      target: { css: 'button[aria-label="Saved"]' },
      text: '**Saved** shows only the ones you’ve saved.',
    }),
    theory({
      id: 'mode-search',
      target: { css: 'input[placeholder="Search modes"]' },
      text: 'And you can **search** for any mode by name.',
    }),
    theory({
      id: 'ionian',
      target: { css: '[data-learn-tile="Ionian (Major)"]' },
      text: 'Click **Ionian (Major)**, the major scale.',
      next: 'click',
      doneWhen: (api) =>
        api.find({ css: '[data-learn-chapter="Overview"]' }).length > 0,
    }),
    theory({
      id: 'ionian-keys',
      resumeFrom: 'ionian',
      target: { css: '[data-learn-panel="levels"]' },
      wait: 3000,
      text: 'Every mode comes in all twelve keys. **C** is chosen for you.',
    }),
    theory({
      id: 'ionian-overview',
      resumeFrom: 'ionian',
      target: { css: '[data-learn-chapter="Overview"]' },
      text: 'Click **Overview** to open the lesson.',
      next: 'click',
      doneWhen: (api) => atIonianLesson(api.place),
    }),
    ionian({
      id: 'play-scale',
      wait: 15000,
      target: { css: '[data-theory-content] [data-overview-play]' },
      text: 'This is the **Overview**. Click **Play** to hear the scale.',
      next: 'click',
      doneWhen: 'click',
    }),
    ionian({
      id: 'triads',
      target: overviewTab(/^Chords$/),
      text: 'Click **Chords**. It opens on the triads.',
      next: 'click',
      doneWhen: (api) => pressed(api, chordView(/^Triads$/)),
    }),
    ionian({
      id: 'triads-page',
      resumeFrom: 'triads',
      scroll: { css: '[data-theory-content]' },
      text: 'A triad on every note of the scale, in the key’s color.',
    }),
    ionian({
      id: 'play-triad',
      resumeFrom: 'triads',
      target: PLAY_CHORD,
      text: 'Click one to hear it.',
      next: 'click',
      doneWhen: 'click',
    }),
    ionian({
      id: 'sevenths',
      target: chordView(/^7ths$/),
      text: 'Now click **7ths**.',
      next: 'click',
      doneWhen: (api) => pressed(api, chordView(/^7ths$/)),
    }),
    ionian({
      id: 'sevenths-page',
      resumeFrom: 'sevenths',
      scroll: { css: '[data-theory-content]' },
      text: 'Each triad with one more note on top: its 7th.',
    }),
    ionian({
      id: 'play-seventh',
      resumeFrom: 'sevenths',
      target: PLAY_CHORD,
      text: 'Click one to hear it.',
      next: 'click',
      doneWhen: 'click',
    }),
    ionian({
      id: 'ninths',
      target: chordView(/^9ths$/),
      text: 'And **9ths**: one more note again, the 9th.',
      next: 'click',
      doneWhen: (api) => pressed(api, chordView(/^9ths$/)),
    }),
    ionian({
      id: 'inversions',
      target: chordView(/^Inversions$/),
      text: 'Then **Inversions**.',
      next: 'click',
      doneWhen: (api) => pressed(api, chordView(/^Inversions$/)),
    }),
    ionian({
      id: 'inversions-page',
      resumeFrom: 'inversions',
      scroll: { css: '[data-theory-content]' },
      text: 'The same chords with a different note at the bottom.',
    }),
    ionian({
      id: 'seventh-inversions',
      resumeFrom: 'inversions',
      target: {
        css: '[data-theory-content] [role="group"][aria-label="Inversions of"] button',
        text: /^7ths$/,
      },
      text: 'Click **7ths** to see their inversions too.',
      next: 'click',
      doneWhen: 'click',
    }),
    ionian({
      id: 'to-activities',
      target: { css: 'button[data-section="A"]' },
      text: 'Ready to play? Click **Melody** to start the activities.',
      next: 'click',
      doneWhen: 'click',
    }),
    ionian({
      id: 'exit-theory',
      target: crumb('Theory'),
      wait: 8000,
      text: 'Click **Theory** to head back to Learn.',
      next: 'click',
      doneWhen: (api) => atLearn(api.place),
    }),
  ],
};

// ── A page at a time ───────────────────────────────────────────────────────
// The compass in the Learn menu runs the part of How to Navigate for the page
// it's on (Peter, 2026-10-21): Start Here, Songs (with Set Lists), Genre and
// Theory. The steps are the full tour's, from the one after "Click <page>".

function section(
  id: LearnSectionTourId,
  title: string,
  first: string,
  last: string,
): TourDefinition {
  const ids = navigateTour.steps.map((s) => s.id);
  return {
    id,
    title,
    steps: navigateTour.steps.slice(ids.indexOf(first), ids.indexOf(last) + 1),
    prepareSandbox: navigateTour.prepareSandbox,
    finale: {
      heading: `That’s ${title}!`,
      line: 'Click the **compass** any time for help with the page you’re on.',
    },
  };
}

export const startHereTour = section(
  'startHere',
  'Start Here',
  'stop-1',
  'stop-5',
);
export const songsTour = section(
  'songs',
  'Songs',
  'songs-difficulty',
  'back-from-set-lists',
);
export const genreTour = section('genre', 'Genre', 'genres', 'courses');
export const theoryTour = section('theory', 'Theory', 'modes', 'exit-theory');
