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
 * the owner's review; videos chosen by the owner (2026-11-10).
 */
export interface StoryMoment {
  id: string;
  year: number;
  /** The place's short name, as on the card ("Detroit"). */
  place: string;
  location: [number, number];
  title: LocalizedText;
  body: LocalizedText;
  /** A YouTube id: the card's picture, and the clip it plays. */
  videoId?: string;
  /** Further pages on its card (a song that sampled or covered it). */
  more?: StoryPages;
}

/**
 * A card's further pages, turned to from its first with the card's chevron
 * (owner, 2026-11-10: "useful for when an artist samples or covers songs").
 * `tab` names the first page; each further page names itself (the chevron's
 * label: "Next: The sample").
 */
export interface StoryPages {
  tab: LocalizedText;
  pages: {
    tab: LocalizedText;
    /** The page's own line over its title, in place of the place's. */
    label?: LocalizedText;
    title: LocalizedText;
    body?: LocalizedText;
    videoId?: string;
  }[];
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
        videoId: 'BWl72SRGA9w',
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
        videoId: 'y2bVIBwpCTA',
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
        videoId: '_BfcRjZn6y4',
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
        videoId: 'CauNjt2j-BM',
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
        videoId: '9AjkUyX0rVw',
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
        videoId: 'CEbSPtfl4g0',
      },
    ],
  };

/**
 * The line a portrait shows under an artist's name, where the owner wrote
 * one (2026-11-10: "The King of Pop"), in place of the bio made from their
 * facts; the facts stay in the teacher's notes. By the artist's slug.
 */
export const ARTIST_TAGLINES: Readonly<Record<string, LocalizedText>> = {
  'michael-jackson': { en: 'The King of Pop', es: 'El Rey del Pop' },
};

/**
 * The song a portrait plays from its "Recording" pill, where the owner chose
 * one (2026-11-10): a YouTube id, by the artist's slug.
 */
export const ARTIST_RECORDINGS: Readonly<Record<string, string>> = {
  'michael-jackson': 'rlpZmqGS8rc',
};

/** A multiple-choice question about the song the class listens to. */
export interface ListenQuestion {
  question: LocalizedText;
  options: readonly LocalizedText[];
  /** Several answers may be picked (which instruments). */
  multi?: boolean;
}

/**
 * The song a lesson's listening slide plays, where the owner chose one
 * (2026-11-12: "use the same song on slide 1"), in place of the catalog's:
 * the portrait's recording, so it plays on from the first slide into the
 * second. `lyric` is the social-emotional question about what the song says,
 * in place of the general one; `note` is the teacher's line about it (never
 * a lyric). By the artist's slug.
 */
export const ARTIST_LISTEN: Readonly<
  Record<
    string,
    { videoId: string; title: string; lyric: ListenQuestion; note: string }
  >
> = {
  'michael-jackson': {
    videoId: 'rlpZmqGS8rc',
    title: 'Can You Feel It',
    lyric: {
      question: {
        en: 'When do you feel most connected?',
        es: '¿Cuándo te sientes más conectado?',
      },
      options: [
        { en: 'Making music', es: 'Haciendo música' },
        { en: 'With friends', es: 'Con amigos' },
        { en: 'With family', es: 'Con mi familia' },
        { en: 'On a team', es: 'En un equipo' },
        { en: 'In my community', es: 'En mi comunidad' },
      ],
    },
    note: '“Can You Feel It” (The Jacksons, 1980) is about people everywhere coming together as one: ask what connection feels like.',
  },
};

/**
 * The clips the owner chose for the Globe's own events on an artist's
 * globe (by the artist's slug, then the event's id), where the event's video
 * is gone or another tells the story better. The Globe's events are left as
 * they are.
 */
export const STORY_VIDEOS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  'michael-jackson': {
    'evt-makossa-douala-1972': 'o0CeFX6E2yI',
    'evt-pop-losangeles-1982-michaeljackson': 'sOnqjkJTMaA',
    'evt-media-pasadena-1993-superbowl': 'LOnTuSqrvbM',
  },
};

/**
 * Further pages for the Globe's own events on an artist's globe (by the
 * artist's slug, then the event's id): where a song of theirs samples or
 * covers what happened there.
 */
export const STORY_PAGES: Readonly<
  Record<string, Readonly<Record<string, StoryPages>>>
> = {
  'michael-jackson': {
    // Manu Dibango's "Soul Makossa" (Douala, 1972) → the end of "Wanna Be
    // Startin' Somethin'" (owner, 2026-11-10).
    'evt-makossa-douala-1972': {
      tab: en('The original'),
      pages: [
        {
          tab: en('The sample'),
          label: en('Thriller · 1982'),
          title: en('“Wanna Be Startin’ Somethin’”'),
          body: en(
            'Michael Jackson turns the “Soul Makossa” chant into the “mama-se, mama-sa, ma-ma-coo-sa” that closes “Wanna Be Startin’ Somethin’”, the opening song of “Thriller”.',
          ),
          videoId: '1XMvPTFzgVU',
        },
      ],
    },
  },
};
