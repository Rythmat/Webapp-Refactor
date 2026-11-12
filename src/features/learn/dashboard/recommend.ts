import {
  ARCADE_GAMES,
  isGameFree,
  type ArcadeGame,
} from '@/components/Games/arcadeGames';
import type { Song } from '@/curriculum/types/songLibrary';
import type { CortexRecords } from '@/features/cortex/ledger';
import {
  courseTouches,
  type CourseTouch,
} from '@/features/learn/catalog/courseActivity';
import { exploreHref } from '@/features/learn/catalog/exploreState';
import {
  allCourses,
  topicTitle,
  type CatalogCourse,
  type CatalogTopic,
} from '@/features/learn/catalog/learnCatalog';
import type {
  LearnGoal,
  LearnLevel,
  LearnProfile,
} from '@/features/learn/profile/learnProfile';
import type { LearnChoice } from '@/features/learn/useInstrumentStore';

// ── What the Learn dashboard suggests ──────────────────────────────────────
// Pure: the catalog, the student's answers and their own history in, ranked
// suggestions out, each row saying why it's there (Netflix's "Because you
// watched", Coursera's "why recommended"). One thing to do first, a few rows,
// one of them something new; nothing twice. Device-wide stores (saved songs,
// arcade plays) are never read: they mix whoever shares a Chromebook.

export interface Shelf {
  id: string;
  /** The row's heading. */
  title: string;
  /** Why it's here, in small caps over the heading. */
  reason: string;
  courses: readonly CatalogCourse[];
  /** Explore, narrowed to where these came from. */
  seeAll: string;
}

export interface Lead {
  /** 'continue': they were in it; 'start': where to begin. */
  kind: 'continue' | 'start';
  course: CatalogCourse;
}

export interface RevisitItem {
  /** The Cortex activity. */
  id: string;
  doneMin: number;
}

export interface Recommendations {
  /** Their main instrument (or Audio). */
  primary: LearnChoice;
  lead: Lead | null;
  shelves: readonly Shelf[];
  revisit: readonly RevisitItem[];
  /** No Learn history yet. */
  isNew: boolean;
}

export interface RecommendInputs {
  topics: readonly CatalogTopic[];
  profile: LearnProfile;
  /** Learn's current choice, if they've told us nothing. */
  fallbackTopic: LearnChoice;
  /** Genre course slugs they like, strongest first (Bio and behaviour). */
  tasteGenres: readonly string[];
  records: CortexRecords;
  nowMs: number;
}

export const SHELF_SIZE = 8;
export const REVISIT_AFTER_DAYS = 7;
const MAX_REVISIT = 6;
const MAX_SHELVES = 3;

/** Activities worth coming back to: not a project, a place or a person. */
const REVISIT_KINDS = new Set([
  'theory',
  'lesson',
  'audio',
  'technique',
  'anatomy',
  'literacy',
  'song',
  'game',
]);

/** Where to begin, by instrument and level, best first. */
const STARTERS: Readonly<
  Record<LearnChoice, Readonly<Record<LearnLevel, readonly string[]>>>
> = {
  piano: {
    new: ['piano/technique/Piano Fundamentals', 'piano/theory/diatonic'],
    basics: ['piano/theory/diatonic', 'piano/genre/pop'],
    comfortable: ['piano/genre/pop', 'piano/theory/pentatonic-blues'],
    advanced: ['piano/theory/harmonic-minor', 'piano/theory/melodic-minor'],
  },
  guitar: {
    new: ['guitar/theory/diatonic'],
    basics: ['guitar/theory/diatonic'],
    comfortable: ['guitar/theory/pentatonic-blues', 'guitar/theory/diatonic'],
    advanced: ['guitar/theory/melodic-minor', 'guitar/theory/harmonic-minor'],
  },
  bass: {
    new: ['bass/theory/diatonic'],
    basics: ['bass/theory/diatonic'],
    comfortable: ['bass/theory/pentatonic-blues', 'bass/theory/diatonic'],
    advanced: ['bass/theory/melodic-minor', 'bass/theory/harmonic-minor'],
  },
  ukulele: {
    new: ['ukulele/theory/diatonic'],
    basics: ['ukulele/theory/diatonic'],
    comfortable: ['ukulele/theory/pentatonic-blues', 'ukulele/theory/diatonic'],
    advanced: ['ukulele/theory/melodic-minor', 'ukulele/theory/harmonic-minor'],
  },
  audio: {
    new: ['audio/course/sound-basics'],
    basics: ['audio/course/sound-basics'],
    comfortable: ['audio/course/sound-basics'],
    advanced: ['audio/course/sound-basics'],
  },
};

/** The sections a goal points at, on the main topic (or Audio). */
const GOAL_SECTIONS: Readonly<
  Record<
    Exclude<LearnGoal, 'class'>,
    { title: string; pick: (c: CatalogCourse, primary: LearnChoice) => boolean }
  >
> = {
  theory: {
    title: 'How music works',
    pick: (c, primary) => c.topic === primary && c.kind === 'theory',
  },
  songs: {
    title: 'Play the songs you love',
    pick: (c) => c.kind === 'genre',
  },
  improvise: {
    title: 'Scales to improvise with',
    pick: (c, primary) =>
      c.topic === primary &&
      c.kind === 'theory' &&
      ['pentatonic-blues', 'diatonic', 'melodic-minor'].includes(c.slug),
  },
  create: {
    title: 'Sound and production',
    pick: (c) => c.topic === 'audio' && c.section === 'courses',
  },
};

const GOAL_ORDER: readonly Exclude<LearnGoal, 'class'>[] = [
  'songs',
  'theory',
  'improvise',
  'create',
];

const isOpen = (course: CatalogCourse) =>
  !course.comingSoon && course.percent < 100;

export function primaryTopic(
  topics: readonly CatalogTopic[],
  profile: LearnProfile,
  fallback: LearnChoice,
): LearnChoice {
  const has = (id: LearnChoice) => topics.some((t) => t.id === id);
  const first = profile.instruments?.find(has);
  return first ?? (has(fallback) ? fallback : (topics[0]?.id ?? 'piano'));
}

function pickLead(
  courses: readonly CatalogCourse[],
  touches: ReadonlyMap<string, CourseTouch>,
  primary: LearnChoice,
  level: LearnLevel,
): Lead | null {
  // The course touched last that still has a stop left.
  const inProgress = courses
    .filter(
      (c) =>
        c.next &&
        !c.comingSoon &&
        c.percent < 100 &&
        (c.percent > 0 || touches.has(c.id)),
    )
    .sort(
      (a, b) =>
        (touches.get(b.id)?.lastMin ?? 0) - (touches.get(a.id)?.lastMin ?? 0) ||
        b.percent - a.percent,
    );
  if (inProgress[0]) return { kind: 'continue', course: inProgress[0] };
  const byId = new Map(courses.map((c) => [c.id, c]));
  const starter = STARTERS[primary][level]
    .map((id) => byId.get(id))
    .find((c) => c && isOpen(c) && !c.locked && !c.next?.locked);
  if (starter) return { kind: 'start', course: starter };
  // Nothing named fits: the main topic's first open course.
  const first = courses.find(
    (c) =>
      c.topic === primary && isOpen(c) && !c.locked && c.kind !== 'technique',
  );
  return first ? { kind: 'start', course: first } : null;
}

export function recommend(inputs: RecommendInputs): Recommendations {
  const { topics, profile, records, nowMs } = inputs;
  const courses = allCourses(topics);
  const touches = courseTouches(courses, records);
  const primary = primaryTopic(topics, profile, inputs.fallbackTopic);
  const level = profile.level ?? 'new';
  const dismissed = new Set(profile.dismissed ?? []);
  const lead = pickLead(courses, touches, primary, level);

  const used = new Set<string>(lead ? [lead.course.id] : []);
  const take = (list: readonly CatalogCourse[]) => {
    const out = list
      .filter((c) => isOpen(c) && !dismissed.has(c.id) && !used.has(c.id))
      .slice(0, SHELF_SIZE);
    out.forEach((c) => used.add(c.id));
    return out;
  };

  // Each row is built only when it's wanted, so one left out never takes
  // courses from the rows after it.
  const candidates: (() => Shelf | null)[] = [];

  // Next after what they last worked in: its section, from there on.
  const lastCourse = [...touches.entries()]
    .sort((a, b) => b[1].lastMin - a[1].lastMin)
    .map(([id]) => courses.find((c) => c.id === id))
    .find((c): c is CatalogCourse => Boolean(c));
  if (lastCourse) {
    candidates.push(() => {
      const siblings = courses.filter(
        (c) => c.topic === lastCourse.topic && c.section === lastCourse.section,
      );
      const at = siblings.indexOf(lastCourse);
      const finished = (touches.get(lastCourse.id)?.doneCount ?? 0) > 0;
      const section = topics
        .find((t) => t.id === lastCourse.topic)
        ?.sections.find((sec) => sec.id === lastCourse.section);
      return {
        id: 'next',
        title: `Next in ${section?.title ?? 'this topic'}`,
        reason: `Because you ${finished ? 'finished part of' : 'worked on'} ${lastCourse.title}`,
        courses: take([...siblings.slice(at + 1), ...siblings.slice(0, at)]),
        seeAll: exploreHref(lastCourse.topic, lastCourse.section),
      };
    });
  }

  // Their taste: genre courses that match, in the order they like them.
  if (inputs.tasteGenres.length) {
    candidates.push(() => {
      const genres = courses.filter((c) => c.kind === 'genre');
      const liked = inputs.tasteGenres
        .map((slug) => genres.find((c) => c.genre === slug))
        .filter((c): c is CatalogCourse => Boolean(c));
      // The styles they named first, then the rest that are built, so a
      // short list still makes a row.
      const list = take([
        ...liked,
        ...genres.filter((c) => !liked.includes(c)),
      ]);
      const names = list
        .filter((c) => liked.includes(c))
        .slice(0, 2)
        .map((c) => c.title);
      return {
        id: 'taste',
        title: 'Styles you love',
        reason: names.length
          ? `Because you like ${names.join(' and ')}`
          : 'From your favourite styles',
        courses: list,
        seeAll: exploreHref('piano', 'genres'),
      };
    });
  }

  // Their goals, in turn.
  for (const goal of GOAL_ORDER) {
    if (!profile.goals?.includes(goal)) continue;
    candidates.push(() => {
      const spec = GOAL_SECTIONS[goal];
      const list = courses.filter((c) => spec.pick(c, primary));
      const first = list[0];
      return {
        id: `goal-${goal}`,
        title: spec.title,
        reason: 'For your goal',
        courses: take(list),
        seeAll: first
          ? exploreHref(first.topic, first.section)
          : exploreHref(primary),
      };
    });
  }

  // With nothing else to go on, the main topic's courses in teaching order.
  candidates.push(() => ({
    id: 'more',
    title: `More on ${topicTitle(primary)}`,
    reason: 'Picked for your instrument',
    courses: take(
      courses.filter((c) => c.topic === primary && c.kind !== 'technique'),
    ),
    seeAll: exploreHref(primary),
  }));

  const shelves: Shelf[] = [];
  let tried = 0;
  const fill = (upTo: number) => {
    while (shelves.length < upTo && tried < candidates.length) {
      const shelf = candidates[tried]();
      tried += 1;
      if (shelf && shelf.courses.length) shelves.push(shelf);
    }
  };
  fill(MAX_SHELVES - 1);

  // One row of something new (Apple Fitness+'s "round out your routine"):
  // another instrument they chose, else one they've never opened.
  const touchedTopics = new Set(
    [...touches.keys()].map((id) => id.slice(0, id.indexOf('/'))),
  );
  const fresh =
    profile.instruments?.find(
      (t) => t !== primary && topics.some((x) => x.id === t),
    ) ??
    topics.map((t) => t.id).find((t) => t !== primary && !touchedTopics.has(t));
  const freshTopic = topics.find((t) => t.id === fresh);
  if (freshTopic) {
    const list = take(freshTopic.sections[0]?.courses ?? []);
    if (list.length) {
      shelves.push({
        id: 'new',
        title: `Try something new: ${freshTopic.title}`,
        reason: 'Round out your playing',
        courses: list,
        seeAll: exploreHref(freshTopic.id),
      });
    }
  }
  // Room left, with nothing new to try: the next row.
  fill(MAX_SHELVES);

  // Finished a week or more ago, the oldest first: worth another go.
  const revisitBefore = nowMs / 60_000 - REVISIT_AFTER_DAYS * 24 * 60;
  const revisit = Object.entries(records)
    .filter(([id, [, , done]]) => {
      const kind = id.slice(0, id.indexOf(':'));
      return REVISIT_KINDS.has(kind) && done > 1 && done <= revisitBefore;
    })
    .sort((a, b) => a[1][2] - b[1][2])
    .slice(0, MAX_REVISIT)
    .map(([id, [, , done]]) => ({ id, doneMin: done }));

  const learnHistory = Object.keys(records).some((id) =>
    /^(theory|lesson|audio|technique|anatomy|literacy):/.test(id),
  );

  return {
    primary,
    lead,
    shelves,
    revisit,
    isNew: !learnHistory && !courses.some((c) => c.percent > 0),
  };
}

// ── Songs and a game ───────────────────────────────────────────────────────

const fold = (s: string) =>
  s
    .toLowerCase()
    .replace('&', 'n')
    .replace(/[^a-z0-9]/g, '');

const DIFFICULTY: Readonly<Record<LearnLevel, readonly number[]>> = {
  new: [1],
  basics: [1, 2],
  comfortable: [2, 3],
  advanced: [3, 2],
};

/** Songs in the styles they like, at about their level, not yet opened. */
export function songsFor(
  songs: readonly Song[],
  options: {
    tasteGenres: readonly string[];
    level: LearnLevel | null | undefined;
    records: CortexRecords;
    limit?: number;
  },
): readonly Song[] {
  const levels = DIFFICULTY[options.level ?? 'basics'];
  const taste = options.tasteGenres.map(fold);
  const seen = (song: Song) => Boolean(options.records[`song:${song.id}`]);
  const score = (song: Song) => {
    const tags = song.genreTags.map(fold);
    const genreRank = taste.findIndex((g) => tags.includes(g));
    const levelRank = levels.indexOf(song.difficulty);
    return (
      (genreRank < 0 ? (taste.length ? 0 : 1) : 3 - Math.min(2, genreRank)) *
        1000 +
      (levelRank < 0 ? 0 : (levels.length - levelRank) * 200) +
      (song.popularity ?? 0)
    );
  };
  return songs
    .filter((song) => !seen(song))
    .filter(
      (song) =>
        !taste.length ||
        song.genreTags.some((tag) => taste.includes(fold(tag))) ||
        levels.includes(song.difficulty),
    )
    .map((song) => ({ song, s: score(song) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, options.limit ?? 6)
    .map(({ song }) => song);
}

/** Games that suit a goal or topic, best first. */
const GAMES_FOR: Readonly<Record<string, readonly string[]>> = {
  theory: ['majorArcanum', 'chordConnection', 'boardChoice'],
  songs: ['chordPress', 'echo', 'boardChoice'],
  improvise: ['constellations', 'chroma', 'majorArcanum'],
  create: ['grooveLab', 'waveSculptor', 'signalFlow'],
  audio: ['signalFlow', 'waveSculptor', 'harmonicStrings'],
  default: ['chroma', 'echo', 'chordPress'],
};

/** One Arcade game for them: one they haven't played if there is one. */
export function arcadePick(options: {
  primary: LearnChoice;
  goals: readonly LearnGoal[];
  isPremium: boolean;
  records: CortexRecords;
}): ArcadeGame | null {
  const keys = [
    ...(options.primary === 'audio' ? GAMES_FOR.audio : []),
    ...options.goals.flatMap((goal) => GAMES_FOR[goal] ?? []),
    ...GAMES_FOR.default,
  ];
  const games = keys
    .map((key) => ARCADE_GAMES.find((g) => g.route === key))
    .filter((g): g is ArcadeGame => Boolean(g))
    .filter((g) => options.isPremium || isGameFree(g));
  return (
    games.find((g) => !options.records[`game:${g.route}`]) ?? games[0] ?? null
  );
}
