import type { HistoricalEvent } from '@/components/atlas/types';
import {
  mapGenreToCourse,
  type CurriculumCourse,
} from '@/components/atlas/utils/genreMapping';
import { LANE_IDS, type LaneId } from './laneIds';
import { MUSICAL_ERAS } from './musicalEras';

/**
 * Music's family tree: the lanes of the Globe's timeline, after Dorot's
 * bands, which here split and merge as genres do. Roots & Folk is the source;
 * Classical and Blues split from it; Blues splits into Jazz, R&B and Rock;
 * Rock and Classical merge into Metal… (owner, 2026-10-14).
 *
 * An event flows in the lane its genres name (through the curriculum course
 * every genre already maps to: utils/genreMapping.ts). One older than its
 * lane — an 1871 spiritual filed as Gospel, so R&B — sits on the nearest
 * ancestor alive in its year instead. The owner checks the table against
 * docs/globe-redesign/lineage-calibration.md, which
 * lineage.calibration.test.ts writes from the bundled events.
 */
export interface Lane {
  id: LaneId;
  label: string;
  /** The curriculum courses whose genres flow into this lane. */
  courses: readonly CurriculumCourse[];
  /** Genres that claim an event for this lane whatever its first genre is. */
  match?: RegExp;
  /** The year it splits off, or forms where two lanes meet. */
  born: number;
  /**
   * What it comes from: it grows out of the first; the others flow into it
   * at its birth (Metal: out of Rock, with Classical). Empty for the source.
   */
  from: readonly LaneId[];
  /** Lanes that flow into it later, and when (Rock into Pop, 1956). */
  joins?: readonly { from: LaneId; year: number }[];
}

/** Where the river starts: the source has been flowing since the first era. */
export const SOURCE_YEAR = MUSICAL_ERAS[0].yearStart;

/** Top to bottom, in LANE_IDS order. */
export const LANES: readonly Lane[] = [
  {
    id: 'pop',
    label: 'Pop',
    courses: ['Pop'],
    born: 1910,
    from: ['stage-screen'],
    joins: [
      { from: 'rock', year: 1956 },
      { from: 'rnb', year: 1960 },
    ],
  },
  {
    id: 'stage-screen',
    label: 'Stage & Screen',
    courses: ['Film Scoring', 'Musical Theatre', 'Jingles'],
    born: 1875,
    from: ['classical'],
  },
  {
    id: 'electronic',
    label: 'Electronic',
    courses: ['Electronic'],
    born: 1950,
    from: ['classical'],
    joins: [{ from: 'funk', year: 1977 }],
  },
  {
    id: 'classical',
    label: 'Classical',
    courses: ['Classical'],
    born: 560,
    from: ['roots'],
  },
  {
    id: 'roots',
    label: 'Roots & Folk',
    courses: ['Folk', 'African'],
    born: SOURCE_YEAR,
    from: [],
  },
  {
    id: 'reggae',
    label: 'Reggae',
    courses: ['Reggae'],
    born: 1956,
    from: ['roots', 'rnb'],
  },
  {
    id: 'latin',
    label: 'Latin',
    courses: ['Latin'],
    born: 1900,
    from: ['roots'],
  },
  {
    id: 'jazz',
    label: 'Jazz',
    courses: ['Jazz'],
    born: 1910,
    from: ['blues'],
  },
  {
    id: 'blues',
    label: 'Blues',
    courses: ['Blues'],
    born: 1895,
    from: ['roots'],
  },
  {
    id: 'jam-band',
    label: 'Jam Band',
    courses: ['Jam Band'],
    born: 1965,
    from: ['rock', 'jazz'],
  },
  {
    id: 'rock',
    label: 'Rock',
    courses: ['Rock'],
    born: 1950,
    from: ['blues'],
    joins: [{ from: 'roots', year: 1954 }],
  },
  {
    id: 'metal',
    label: 'Metal',
    courses: [],
    match: /metal/i,
    born: 1968,
    from: ['rock', 'classical'],
  },
  {
    id: 'rnb',
    label: 'R&B & Soul',
    courses: ['R&B'],
    born: 1940,
    from: ['blues'],
  },
  {
    id: 'neo-soul',
    label: 'Neo Soul',
    courses: ['Neo Soul'],
    born: 1994,
    from: ['rnb', 'hip-hop'],
  },
  {
    id: 'funk',
    label: 'Funk',
    courses: ['Funk'],
    born: 1962,
    from: ['rnb'],
  },
  {
    id: 'hip-hop',
    label: 'Hip Hop',
    courses: ['Hip Hop'],
    born: 1973,
    from: ['funk', 'reggae'],
  },
];

const LANE_BY_ID = new Map(LANES.map((l) => [l.id, l]));

export const getLane = (id: LaneId): Lane => LANE_BY_ID.get(id) ?? LANES[4];

/** The source every other lane descends from. */
export const SOURCE_LANE: LaneId = 'roots';

const LANE_OF_COURSE = new Map<CurriculumCourse, LaneId>(
  LANES.flatMap((l) => l.courses.map((c) => [c, l.id] as const)),
);

const MATCHERS = LANES.filter((l) => l.match);

/**
 * Genres the curriculum table has no course for, or would file under the
 * wrong one by its substring pass. Only secondary genres hit these today:
 * every bundled event's first mapped genre goes through the courses.
 */
const LANE_OVERRIDES: Readonly<Record<string, LaneId>> = {
  'Hip-Hop': 'hip-hop',
  Ambient: 'electronic',
  'Post-Bop': 'jazz',
  'Hard Bop': 'jazz',
  'Neo-Bop': 'jazz',
  'Big Band': 'jazz',
  Standards: 'jazz',
  Boogie: 'rnb',
  Electropop: 'pop',
  'Riot Grrrl': 'rock',
  Mandé: 'roots',
  Ethiopian: 'roots',
  'Ewe Drumming': 'roots',
  Kora: 'roots',
  Wassoulou: 'roots',
  Andean: 'roots',
};

/** The lane a genre string flows into, or null when nothing claims it. */
export function laneOfGenre(genre: string): LaneId | null {
  for (const lane of MATCHERS) if (lane.match!.test(genre)) return lane.id;
  const override = LANE_OVERRIDES[genre];
  if (override) return override;
  const course = mapGenreToCourse(genre);
  return course ? (LANE_OF_COURSE.get(course) ?? null) : null;
}

/** Every lane an event's genres touch, in the order its genres name them. */
export function lanesOf(event: HistoricalEvent): LaneId[] {
  const out: LaneId[] = [];
  for (const genre of event.genre) {
    const lane = laneOfGenre(genre);
    if (lane && !out.includes(lane)) out.push(lane);
  }
  return out;
}

/**
 * The lane an event's genres name, whatever its year: a lane that claims any
 * of its genres outright (Metal), else its first genre's, else its first
 * tag's, else the source.
 */
export function genreLane(event: HistoricalEvent): LaneId {
  for (const lane of MATCHERS) {
    if (event.genre.some((g) => lane.match!.test(g))) return lane.id;
  }
  for (const genre of event.genre) {
    const lane = laneOfGenre(genre);
    if (lane) return lane;
  }
  for (const tag of event.tags) {
    const lane = laneOfGenre(tag);
    if (lane) return lane;
  }
  return SOURCE_LANE;
}

/** Whether a lane is flowing in a year. */
export const aliveAt = (id: LaneId, year: number): boolean =>
  year >= getLane(id).born;

/**
 * The lane an event is drawn in: its genres' lane, or — when the event is
 * older than that lane — the nearest ancestor (by the lane it grew out of)
 * flowing in its year.
 */
export function laneOf(event: HistoricalEvent): LaneId {
  let id = genreLane(event);
  while (!aliveAt(id, event.year) && getLane(id).from.length) {
    id = getLane(id).from[0];
  }
  return id;
}

/** Every lane that flows into this one, at its birth or later, all the way up. */
export function ancestorsOf(id: LaneId): LaneId[] {
  const out: LaneId[] = [];
  const visit = (lane: Lane) => {
    for (const parent of [
      ...lane.from,
      ...(lane.joins ?? []).map((j) => j.from),
    ]) {
      if (!out.includes(parent)) {
        out.push(parent);
        visit(getLane(parent));
      }
    }
  };
  visit(getLane(id));
  return out;
}

/** Every lane this one flows into, all the way down. */
export function descendantsOf(id: LaneId): LaneId[] {
  return LANE_IDS.filter((other) => ancestorsOf(other).includes(id));
}

/** A lane with everything it came from and everything it became. */
export function familyOf(id: LaneId): Set<LaneId> {
  return new Set([id, ...ancestorsOf(id), ...descendantsOf(id)]);
}
