import type { HistoricalEvent } from '@/components/atlas/types';
import {
  mapGenreToCourse,
  type CurriculumCourse,
} from '@/components/atlas/utils/genreMapping';
import { STREAM_IDS, type StreamId } from './streamIds';

/**
 * The music streams: the families of genres the Globe's timeline draws as its
 * lanes, after Dorot's "Culture & Creativity / Daily Life / Events" bands.
 *
 * Built on the curriculum courses every event genre already maps to
 * (utils/genreMapping.ts), so a new genre string joins a stream as soon as
 * the curriculum knows it. The owner signs off this table against
 * docs/globe-redesign/streams-calibration.md, which streams.calibration.test
 * writes from the bundled events.
 */
export interface Stream {
  id: StreamId;
  /** The lane's name. */
  label: string;
  /** A chip's name, where the full one does not fit. */
  short: string;
  /** The curriculum courses whose genres flow into this stream. */
  courses: readonly CurriculumCourse[];
}

export const STREAMS: readonly Stream[] = [
  {
    id: 'roots',
    label: 'Roots & Folk',
    short: 'Roots',
    courses: ['Folk', 'African', 'Latin', 'Reggae'],
  },
  {
    id: 'classical',
    label: 'Classical, Stage & Screen',
    short: 'Classical',
    courses: ['Classical', 'Film Scoring', 'Musical Theatre', 'Jingles'],
  },
  {
    id: 'blues-jazz-soul',
    label: 'Blues, Jazz & Soul',
    short: 'Blues · Jazz · Soul',
    courses: ['Blues', 'Jazz', 'R&B', 'Neo Soul', 'Funk'],
  },
  {
    id: 'rock-pop',
    label: 'Rock & Pop',
    short: 'Rock & Pop',
    courses: ['Rock', 'Pop', 'Jam Band'],
  },
  {
    id: 'beats',
    label: 'Hip Hop & Electronic',
    short: 'Beats',
    courses: ['Hip Hop', 'Electronic'],
  },
];

const STREAM_BY_ID = new Map(STREAMS.map((s) => [s.id, s]));

export const getStream = (id: StreamId): Stream =>
  STREAM_BY_ID.get(id) ?? STREAMS[0];

const STREAM_OF_COURSE = new Map<CurriculumCourse, StreamId>(
  STREAMS.flatMap((s) => s.courses.map((c) => [c, s.id] as const)),
);

/**
 * Genres the curriculum table has no course for, or would file under the
 * wrong one by its substring pass. Only secondary genres hit these today:
 * every bundled event's first mapped genre goes through the courses.
 */
const STREAM_OVERRIDES: Readonly<Record<string, StreamId>> = {
  'Hip-Hop': 'beats',
  Ambient: 'beats',
  'Post-Bop': 'blues-jazz-soul',
  'Hard Bop': 'blues-jazz-soul',
  'Neo-Bop': 'blues-jazz-soul',
  'Big Band': 'blues-jazz-soul',
  Standards: 'blues-jazz-soul',
  Boogie: 'blues-jazz-soul',
  Electropop: 'rock-pop',
  'Riot Grrrl': 'rock-pop',
  Mandé: 'roots',
  Ethiopian: 'roots',
  'Ewe Drumming': 'roots',
  Kora: 'roots',
  Wassoulou: 'roots',
  Andean: 'roots',
};

/** The stream a genre string flows into, or null when nothing claims it. */
export function classifyGenre(genre: string): StreamId | null {
  const override = STREAM_OVERRIDES[genre];
  if (override) return override;
  const course = mapGenreToCourse(genre);
  return course ? (STREAM_OF_COURSE.get(course) ?? null) : null;
}

/** Every stream an event's genres touch, in the order its genres name them. */
export function streamsOf(event: HistoricalEvent): StreamId[] {
  const out: StreamId[] = [];
  for (const genre of event.genre) {
    const stream = classifyGenre(genre);
    if (stream && !out.includes(stream)) out.push(stream);
  }
  return out;
}

/**
 * The one lane an event is drawn in: its first genre's stream, else its
 * first tag's, else Roots — the trunk the other streams branch from.
 */
export function primaryStream(event: HistoricalEvent): StreamId {
  for (const genre of event.genre) {
    const stream = classifyGenre(genre);
    if (stream) return stream;
  }
  for (const tag of event.tags) {
    const stream = classifyGenre(tag);
    if (stream) return stream;
  }
  return STREAM_IDS[0];
}
