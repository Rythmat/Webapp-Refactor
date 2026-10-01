import { artistSlug, getArtist } from './artists';

/**
 * One featured hit per artist, played at the top of the artist's globe card.
 *
 * The genre Overview's artist cards link here (a Globe icon → `?artist=`), so
 * every artist on an Overview has one, including those the globe has no
 * moments for yet. Chosen for schools: an official upload (artist, VEVO or
 * label channel), the clean or edited version wherever one exists, and a hit
 * that is clean when none does. Each id was checked against YouTube's oEmbed,
 * which only answers for videos that exist and may be embedded.
 *
 * Keyed by artist slug (`artistSlug(name)`), the same id the registry uses.
 */
export interface ArtistHit {
  /** Display name, for artists the globe has no other record of. */
  artist: string;
  /** The song, with the performer when it isn't the artist (a producer's hit). */
  song: string;
  videoId: string;
  /** The uploading channel, as oEmbed reports it. */
  channel: string;
  /**
   * 'clean' — nothing to edit (or the official upload is labelled clean);
   * 'edited' — the official video is the censored/radio edit.
   */
  clean: 'clean' | 'edited';
  /** What to check before classroom use — nothing was watched end to end. */
  review?: string;
}

export const ARTIST_HITS: Readonly<Record<string, ArtistHit>> = {
  // ── Funk ──
  'james-brown': {
    artist: 'James Brown',
    song: 'Cold Sweat (Pt. 1)',
    videoId: 'bohEcmK4MyQ',
    channel: 'James Brown - Topic',
    clean: 'clean',
  },
  parliament: {
    artist: 'Parliament',
    song: 'Give Up the Funk (Tear the Roof off the Sucker)',
    videoId: '3HU-KdHmYeA',
    channel: 'Parliament - Topic',
    clean: 'clean',
  },
  'tower-of-power': {
    artist: 'Tower of Power',
    song: 'What Is Hip?',
    videoId: 'Pfim3SKTNkw',
    channel: 'Tower Of Power - Topic',
    clean: 'clean',
  },
  'stevie-wonder': {
    artist: 'Stevie Wonder',
    song: 'Superstition',
    videoId: 'ftdZ363R9kQ',
    channel: 'Stevie Wonder - Topic',
    clean: 'clean',
  },
  'herbie-hancock': {
    artist: 'Herbie Hancock',
    song: 'Chameleon',
    videoId: 'iqomTAiRnVM',
    channel: 'HerbieHancockVEVO',
    clean: 'clean',
  },
  prince: {
    artist: 'Prince',
    song: 'Purple Rain (Prince & The Revolution)',
    videoId: 'uW1UIDYmYyI',
    channel: 'Prince',
    clean: 'clean',
  },
  // ── Pop ──
  'the-beatles': {
    artist: 'The Beatles',
    song: 'Hey Jude',
    videoId: 'A_MjCqQoLLA',
    channel: 'TheBeatlesVEVO',
    clean: 'clean',
  },
  'the-beach-boys': {
    artist: 'The Beach Boys',
    song: 'Good Vibrations',
    videoId: 'apBWI6xrbLY',
    channel: 'TheBeachBoysVEVO',
    clean: 'clean',
  },
  abba: {
    artist: 'ABBA',
    song: 'Dancing Queen',
    videoId: 'xFrGuyw1V8s',
    channel: 'AbbaVEVO',
    clean: 'clean',
  },
  'elton-john': {
    artist: 'Elton John',
    song: 'Rocket Man',
    videoId: 'DtVBCG6ThDk',
    channel: 'EltonJohnVEVO',
    clean: 'clean',
  },
  'michael-jackson': {
    artist: 'Michael Jackson',
    song: 'Billie Jean',
    videoId: 'Zi_XLOBDo_Y',
    channel: 'michaeljacksonVEVO',
    clean: 'clean',
  },
  'whitney-houston': {
    artist: 'Whitney Houston',
    song: 'I Wanna Dance With Somebody (Who Loves Me)',
    videoId: 'eH3giaIzONA',
    channel: 'whitneyhoustonVEVO',
    clean: 'clean',
  },
  'mariah-carey': {
    artist: 'Mariah Carey',
    song: 'Always Be My Baby',
    videoId: 'LfRNRymrv9k',
    channel: 'MariahCareyVEVO',
    clean: 'clean',
  },
  beyonce: {
    artist: 'Beyoncé',
    song: 'Halo',
    videoId: 'bnVUHWCynig',
    channel: 'BeyoncéVEVO',
    clean: 'clean',
  },
  coldplay: {
    artist: 'Coldplay',
    song: 'Viva La Vida',
    videoId: 'dvgZkm1xWPE',
    channel: 'Coldplay',
    clean: 'clean',
  },
  'sara-bareilles': {
    artist: 'Sara Bareilles',
    song: 'Brave',
    videoId: 'QUQsqBqxoR4',
    channel: 'SaraBareillesVEVO',
    clean: 'clean',
  },
  'bruno-mars': {
    artist: 'Bruno Mars',
    song: 'Just the Way You Are',
    videoId: 'LjhCEhWiKXk',
    channel: 'Bruno Mars',
    clean: 'clean',
  },
  'taylor-swift': {
    artist: 'Taylor Swift',
    song: 'Love Story',
    videoId: '8xg3vE8Ie_E',
    channel: 'Taylor Swift',
    clean: 'clean',
  },
  'billie-eilish': {
    artist: 'Billie Eilish',
    song: 'ocean eyes',
    videoId: 'viimfQi_pUw',
    channel: 'Billie Eilish',
    clean: 'clean',
  },
  // ── Hip Hop ──
  'metro-boomin': {
    artist: 'Metro Boomin',
    song: 'Am I Dreaming (Metro Boomin, A$AP Rocky, Roisee)',
    videoId: '7aUZtDaxS60',
    channel: 'MetroBoominVEVO',
    clean: 'clean',
    review: 'A visualizer, not a full music video.',
  },
  'lex-luger': {
    artist: 'Lex Luger',
    song: 'Hard in da Paint (Waka Flocka Flame, produced by Lex Luger)',
    videoId: 'WkkC9cK8Hz0',
    channel: 'Waka Flocka',
    clean: 'edited',
    review:
      'Edited version likely (Apple lists a cleaned edit; long silenced stretches), but the lyrics are violent and the visuals unchecked. Watch first.',
  },
  'cardi-b': {
    artist: 'Cardi B',
    song: 'Finesse (Remix) (Bruno Mars ft. Cardi B)',
    videoId: 'LsoLEjrDogU',
    channel: 'Bruno Mars',
    clean: 'clean',
  },
  'bad-bunny': {
    artist: 'Bad Bunny',
    song: 'Ojitos Lindos (ft. Bomba Estéreo)',
    videoId: 'wAjHQXrIj9o',
    channel: 'Bad Bunny',
    clean: 'clean',
  },
  'dj-premier': {
    artist: 'DJ Premier',
    song: 'Mass Appeal (Gang Starr, produced by DJ Premier)',
    videoId: 'y9lNbNGbo24',
    channel: 'GangStarrVEVO',
    clean: 'edited',
  },
  'pete-rock': {
    artist: 'Pete Rock',
    song: 'They Reminisce Over You (T.R.O.Y.) (Pete Rock & CL Smooth)',
    videoId: '1ut9spXrkDw',
    channel: 'Pete Rock Official',
    clean: 'clean',
  },
  'the-fat-boys': {
    artist: 'The Fat Boys',
    song: 'Wipeout (with The Beach Boys)',
    videoId: 'tJI2KLrO3wQ',
    channel: 'Fat Boys - Topic',
    clean: 'clean',
    review: 'Official audio, no video.',
  },
  'wu-tang-clan': {
    artist: 'Wu-Tang Clan',
    song: 'C.R.E.A.M. (edited)',
    videoId: 'PBwAxmrE194',
    channel: 'WuTangClanVEVO',
    clean: 'edited',
    review: 'Clean language, but the story is about selling drugs.',
  },
  'n-w-a': {
    artist: 'N.W.A',
    song: 'Express Yourself',
    videoId: 'u31FO_4d9TY',
    channel: 'NWAVEVO',
    clean: 'clean',
  },
  'jay-z': {
    artist: 'Jay-Z',
    song: 'Empire State of Mind (ft. Alicia Keys)',
    videoId: 'vk6014HuxcE',
    channel: 'JayZVEVO',
    clean: 'edited',
  },
  'dr-dre': {
    artist: 'Dr. Dre',
    song: 'Family Affair (Mary J. Blige, produced by Dr. Dre)',
    videoId: 'znlFu_lemsU',
    channel: 'MaryJBligeVEVO',
    clean: 'clean',
  },
  eminem: {
    artist: 'Eminem',
    song: 'Lose Yourself',
    videoId: 'xFYQQPAOz7Y',
    channel: 'EminemMusic',
    clean: 'edited',
    review:
      'Edited version inferred: explicit uploads live on a separate channel. Listen through once.',
  },
  'snoop-dogg': {
    artist: 'Snoop Dogg',
    song: 'Beautiful (ft. Pharrell Williams)',
    videoId: '_FE194VN6c4',
    channel: 'SnoopDoggVEVO',
    clean: 'clean',
    review: 'Beach and swimwear scenes are mildly suggestive.',
  },
  'missy-elliott': {
    artist: 'Missy Elliott',
    song: 'The Rain (Supa Dupa Fly)',
    videoId: 'hHcyJPTTn9w',
    channel: 'Missy Elliott',
    clean: 'clean',
  },
  'a-tribe-called-quest': {
    artist: 'A Tribe Called Quest',
    song: 'Can I Kick It?',
    videoId: 'O3pyCGnZzYA',
    channel: 'TribeCalledQuestVEVO',
    clean: 'clean',
  },
  common: {
    artist: 'Common',
    song: 'Glory (with John Legend)',
    videoId: 'HUZOKvYcx_o',
    channel: 'CommonVEVO',
    clean: 'clean',
  },
  'mos-def': {
    artist: 'Mos Def',
    song: 'Umi Says',
    videoId: 'vntLKOd9saI',
    channel: 'UPROXX',
    clean: 'clean',
    review: "Licensed catalogue channel, not the artist's or label's own.",
  },
  'queen-latifah': {
    artist: 'Queen Latifah',
    song: 'Ladies First (ft. Monie Love)',
    videoId: '2h0RR4R4un0',
    channel: 'QueenLatifahVEVO',
    clean: 'clean',
  },
  'lauryn-hill': {
    artist: 'Lauryn Hill',
    song: 'Everything Is Everything',
    videoId: 'i3_dOWYHS7I',
    channel: 'laurynhillvevo',
    clean: 'clean',
  },
  'tupac-shakur': {
    artist: 'Tupac Shakur',
    song: 'Dear Mama (edited)',
    videoId: 'i2aqxtAETJs',
    channel: '2Pac - Topic',
    clean: 'edited',
    review: 'Official audio, no video. Mature themes, treated respectfully.',
  },
  'kendrick-lamar': {
    artist: 'Kendrick Lamar',
    song: 'All the Stars (with SZA)',
    videoId: 'JQbjS0_ZfJ0',
    channel: 'KendrickLamarVEVO',
    clean: 'clean',
    review: "Kendrick's verse may have mild language.",
  },
};

/** The featured hit for an artist name or slug, or null. */
export function getArtistHit(nameOrSlug: string): ArtistHit | null {
  const registered = getArtist(nameOrSlug)?.slug;
  return (
    (registered && ARTIST_HITS[registered]) ||
    ARTIST_HITS[artistSlug(nameOrSlug)] ||
    ARTIST_HITS[nameOrSlug] ||
    null
  );
}
