import type { LocalizedText } from '../../types';

/**
 * Moments in an artist's story that the Globe's events don't hold yet, for
 * the lesson's globe (owner, 2026-11-10: "include The Jackson Five, and
 * other Michael Jackson related events"). Each is a place in the story: when,
 * where, and the one sentence that says what happened there.
 *
 * Lesson content, not Globe events: the Globe's own events are published
 * from the console (and frozen by the content tests), so these join a lesson's
 * globe stops without changing the Globe section. Facts from the record, for
 * the owner's review; no videos, so the card shows the artist's photo.
 */
export interface StoryMoment {
  id: string;
  year: number;
  /** The place's short name, as on the card ("Detroit"). */
  place: string;
  location: [number, number];
  title: LocalizedText;
  body: LocalizedText;
}

const en = (text: string): LocalizedText => ({ en: text });

/** By the artist's slug (`artist:<slug>`). */
export const ARTIST_STORIES: Readonly<Record<string, readonly StoryMoment[]>> =
  {
    'michael-jackson': [
      {
        id: 'story-mj-1968-motown',
        year: 1968,
        place: 'Detroit',
        location: [42.364, -83.0891],
        title: en('The Jackson 5 sign with Motown'),
        body: en(
          'Michael Jackson and his brothers, the Jackson 5 from Gary, audition for Berry Gordy at Hitsville U.S.A. in Detroit and are signed to Motown.',
        ),
      },
      {
        id: 'story-mj-1970-i-want-you-back',
        year: 1970,
        place: 'Los Angeles',
        location: [34.0522, -118.2437],
        title: en('“I Want You Back” reaches No. 1'),
        body: en(
          'The Jackson 5’s first Motown single tops the Billboard Hot 100, with an eleven-year-old Michael Jackson singing lead. Three more No. 1 hits follow that year.',
        ),
      },
      {
        id: 'story-mj-1979-off-the-wall',
        year: 1979,
        place: 'Los Angeles',
        location: [34.0522, -118.2437],
        title: en('“Off the Wall” makes him a solo star'),
        body: en(
          'Michael Jackson releases “Off the Wall”, his first album with producer Quincy Jones, with the No. 1 hits “Don’t Stop ’Til You Get Enough” and “Rock with You”.',
        ),
      },
      {
        id: 'story-mj-1983-moonwalk',
        year: 1983,
        place: 'Pasadena',
        location: [34.1452, -118.1441],
        title: en('The moonwalk, at Motown 25'),
        body: en(
          'At the Motown 25 television special in Pasadena, Michael Jackson sings “Billie Jean” and debuts the moonwalk, seen by tens of millions.',
        ),
      },
      {
        id: 'story-mj-1985-we-are-the-world',
        year: 1985,
        place: 'Los Angeles',
        location: [34.0928, -118.3442],
        title: en('“We Are the World”'),
        body: en(
          'Michael Jackson and Lionel Richie write “We Are the World”, recorded in one night in Hollywood by more than 40 artists to raise money for famine relief in Africa.',
        ),
      },
      {
        id: 'story-mj-1987-bad-tour',
        year: 1987,
        place: 'Tokyo',
        location: [35.7056, 139.7519],
        title: en('The Bad World Tour opens in Tokyo'),
        body: en(
          'Michael Jackson begins his first solo world tour in Tokyo; over 16 months he plays 123 concerts to about 4.4 million fans.',
        ),
      },
    ],
  };
