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
  }, // ── Latin ──
  'daddy-yankee': {
    artist: 'Daddy Yankee',
    song: 'Lo Que Pasó, Pasó',
    videoId: '8MpVPbN3_eE',
    channel: 'Daddy Yankee',
    clean: 'clean',
    review:
      'Official audio, no video. No profanity, but a breakup song with mild innuendo (a past night together, a partner who belongs to someone else). Read the lyrics first.',
  },
  'ivy-queen': {
    artist: 'Ivy Queen',
    song: 'Te He Querido, Te He Llorado',
    videoId: 'IxusFnY0-Nk',
    channel: 'Ivy Queen - Topic',
    clean: 'clean',
    review:
      'Official audio. A heartbreak ballad, chosen over "Quiero Bailar" (perreo lyrics, crude slang); its own lyrics are not vetted yet.',
  },
  'toto-la-momposina': {
    artist: 'Totó la Momposina',
    song: 'La Candela Viva',
    videoId: 'LnmtdHiKdTE',
    channel: 'Real World Records',
    clean: 'clean',
    review:
      'The label’s footage of the 1991 Real World Studios session, not a music video.',
  },
  selena: {
    artist: 'Selena',
    song: 'Bidi Bidi Bom Bom',
    videoId: 'RKGbjJarMeA',
    channel: 'SelenaVEVO',
    clean: 'clean',
  },
  'los-angeles-azules': {
    artist: 'Los Ángeles Azules',
    song: 'Cómo Te Voy a Olvidar',
    videoId: 'nxXvOEPsE0s',
    channel: 'LosAngelesAzulesVEVO',
    clean: 'clean',
  },
  'mariachi-vargas-de-tecalitlan': {
    artist: 'Mariachi Vargas de Tecalitlán',
    song: 'El Son de la Negra / Guadalajara',
    videoId: '9J9YxWNXS4c',
    channel: 'Mariachi Vargas Oficial',
    clean: 'clean',
    review: 'The official video is a medley with "Guadalajara".',
  },
  'vicente-fernandez': {
    artist: 'Vicente Fernández',
    song: 'Volver, Volver',
    videoId: 'ugNQ5uIN09Q',
    channel: 'vicentefernandez®',
    clean: 'clean',
    review:
      'A scene from one of his films: check for cantina and drinking scenes.',
  },
  'johnny-ventura': {
    artist: 'Johnny Ventura',
    song: 'Patacón Pisao',
    videoId: 'zN138OU1qws',
    channel: 'Johnny Ventura - Topic',
    clean: 'clean',
    review:
      'Official audio (1985). A song about fried plantain; check for double meanings.',
  },
  'juan-luis-guerra': {
    artist: 'Juan Luis Guerra',
    song: 'Ojalá Que Llueva Café (Juan Luis Guerra 4.40)',
    videoId: 'suQC8d-YkeU',
    channel: 'Karen Records',
    clean: 'clean',
  },
  aventura: {
    artist: 'Aventura',
    song: 'Mi Corazoncito',
    videoId: 'z2pt4CN4rhc',
    channel: 'Aventura',
    clean: 'clean',
    review:
      'Chosen over "Obsesión" (sensual lines, pursuing a girl who has a partner). Lyrics read as a sweet love song; not vetted line by line.',
  },
  'prince-royce': {
    artist: 'Prince Royce',
    song: 'Stand by Me',
    videoId: 'foyH-TEs9D0',
    channel: 'Top Stop Music',
    clean: 'clean',
  },
  'enrique-jorrin': {
    artist: 'Enrique Jorrín',
    song: 'La Engañadora',
    videoId: 'SlON1AorxU0',
    channel: 'Enrique Jorrin - Topic',
    clean: 'clean',
    review:
      'Official audio from a 2014 reissue; recording date not stated. The lyrics tease a girl whose figure turns out to be padding (mild).',
  },
  'perez-prado': {
    artist: 'Pérez Prado',
    song: 'Cherry Pink and Apple Blossom White',
    videoId: 'pqk3F1pPjyA',
    channel: 'Perez Prado - Topic',
    clean: 'clean',
    review: 'Official audio of the 1954 RCA original, no video. Instrumental.',
  },
  'trio-los-panchos': {
    artist: 'Trío Los Panchos',
    song: 'Bésame Mucho',
    videoId: 'kjYyblq-hX4',
    channel: 'Trio Los Panchos - Topic',
    clean: 'clean',
    review: 'Official audio from a reissue label.',
  },
  'luis-miguel': {
    artist: 'Luis Miguel',
    song: 'La Barca',
    videoId: 'qPv0KJ0Ra4w',
    channel: 'Luis Miguel - Topic',
    clean: 'clean',
    review: 'Official audio (Romance, 1991), no video.',
  },
  'joao-gilberto': {
    artist: 'João Gilberto',
    song: 'Chega de Saudade',
    videoId: 'Y0a0QuLEC8A',
    channel: 'João Gilberto - Topic',
    clean: 'clean',
    review: 'Official audio of the 1959 original, no video.',
  },
  'antonio-carlos-jobim': {
    artist: 'Antônio Carlos Jobim',
    song: 'Águas de Março (Elis Regina & Tom Jobim)',
    videoId: '3dVe9WiZa2c',
    channel: 'Elis Regina - Topic',
    clean: 'clean',
    review: 'Official audio of the 1974 duet, no video.',
  },
  'carlos-gardel': {
    artist: 'Carlos Gardel',
    song: 'Por una Cabeza',
    videoId: 'UcUekXtC2wY',
    channel: 'Carlos Gardel',
    clean: 'clean',
    review:
      'Probably an old film clip. The lyrics compare a lost love to a lost horse-race bet (mild gambling theme).',
  },
  'astor-piazzolla': {
    artist: 'Astor Piazzolla',
    song: 'Libertango',
    videoId: '8UNtQpMMSEM',
    channel: 'Astor Piazzolla Oficial',
    clean: 'clean',
    review: 'Official audio of the 1974 original, no video. Instrumental.',
  },
  'arsenio-rodriguez': {
    artist: 'Arsenio Rodríguez',
    song: 'Bruca Maniguá',
    videoId: 'nosWuFoRtjU',
    channel: 'Arsenio Rodríguez - Topic',
    clean: 'clean',
    review:
      'Official audio of his 1950 recording. An enslaved African’s lament in Afro-Cuban bozal dialect: a serious historical theme worth framing for students.',
  },
  machito: {
    artist: 'Machito',
    song: 'Tanga (Machito and His Afro-Cuban Orchestra)',
    videoId: '35PQplNewBc',
    channel: 'Machito And His Afro-Cuban Orchestra - Topic',
    clean: 'clean',
    review: 'Official audio (1947), no video. Instrumental.',
  },
  'tito-puente': {
    artist: 'Tito Puente',
    song: 'Oye Como Va',
    videoId: 'BpAXzTpANNw',
    channel: 'Tito Puente',
    clean: 'clean',
    review: 'Official audio, no video.',
  },
  'celia-cruz': {
    artist: 'Celia Cruz',
    song: 'La Vida Es un Carnaval',
    videoId: '7Ho86ggAVrY',
    channel: 'CeliaCruzVEVO',
    clean: 'clean',
    review: 'Official audio, no video.',
  },
  'buena-vista-social-club': {
    artist: 'Buena Vista Social Club',
    song: 'Chan Chan',
    videoId: 'tGbRZ73NvlY',
    channel: 'World Circuit Records',
    clean: 'clean',
    review:
      'From the Wim Wenders documentary: check for incidental cigar smoking.',
  },
  // ── Jazz ──
  'louis-armstrong': {
    artist: 'Louis Armstrong',
    song: 'West End Blues (Louis Armstrong & His Hot Five)',
    videoId: 'BTxhgmk_ofk',
    channel: 'Louis Armstrong And The All-Stars - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1928 Hot Five original, no video. A wordless scat vocal.',
  },
  'duke-ellington': {
    artist: 'Duke Ellington',
    song: 'C Jam Blues (Duke Ellington and His Famous Orchestra)',
    videoId: 'kq2zDGRgTz4',
    channel: 'Duke Ellington - Topic',
    clean: 'clean',
    review: 'Official audio of the 1942 original, no video. Instrumental.',
  },
  'count-basie': {
    artist: 'Count Basie',
    song: "One O'Clock Jump (Count Basie and His Orchestra)",
    videoId: 'bVZLx-Y4OV8',
    channel: 'Count Basie And His Orchestra - Topic',
    clean: 'clean',
    review: 'Official audio of the 1937 original, no video. Instrumental.',
  },
  'mary-lou-williams': {
    artist: 'Mary Lou Williams',
    song: "Roll 'Em",
    videoId: 'jb6FM92kP3Y',
    channel: 'Mary Lou Williams - Topic',
    clean: 'clean',
    review: 'Official audio (Smithsonian Folkways), no video. Instrumental.',
  },
  'oscar-peterson': {
    artist: 'Oscar Peterson',
    song: 'C Jam Blues (Oscar Peterson Trio)',
    videoId: 'PrEcT2Q51lw',
    channel: 'Oscar Peterson - Topic',
    clean: 'clean',
    review: 'Official audio from Night Train (1963), no video. Instrumental.',
  },
  'horace-silver': {
    artist: 'Horace Silver',
    song: 'Song for My Father',
    videoId: 'mKf1x3CALAE',
    channel: 'Horace Silver - Topic',
    clean: 'clean',
    review: 'Official audio of the 1964 original, no video. Instrumental.',
  },
  'miles-davis': {
    artist: 'Miles Davis',
    song: 'So What',
    videoId: 'ylXk1LBvIqU',
    channel: 'MilesDavisVEVO',
    clean: 'clean',
    review:
      'The Kind of Blue studio audio, chosen over the 1959 TV performance (possible smoking on screen). Instrumental.',
  },
  'bill-evans': {
    artist: 'Bill Evans',
    song: 'Waltz for Debby (Bill Evans Trio)',
    videoId: 'wCINvavqFXk',
    channel: 'Bill Evans',
    clean: 'clean',
    review:
      'Official visualizer of the 1961 Village Vanguard take. Instrumental.',
  },
  'red-garland': {
    artist: 'Red Garland',
    song: 'C-Jam Blues (Red Garland Trio)',
    videoId: 'ptI-8YM0AUQ',
    channel: 'Red Garland',
    clean: 'clean',
    review: 'Official audio from Groovy (1957), no video. Instrumental.',
  },
  'wynton-kelly': {
    artist: 'Wynton Kelly',
    song: 'Kelly Blue',
    videoId: '2C7uknOL_5Y',
    channel: 'Wynton Kelly - Topic',
    clean: 'clean',
    review: 'Official audio of the 1959 album track, no video. Instrumental.',
  },
  'ahmad-jamal': {
    artist: 'Ahmad Jamal',
    song: 'Poinciana (Ahmad Jamal Trio)',
    videoId: 'Z0e2G32f3IU',
    channel: 'Ahmad Jamal - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1958 live recording at the Pershing, no video. Instrumental.',
  },
  'charlie-parker': {
    artist: 'Charlie Parker',
    song: "Now's the Time",
    videoId: '-vnLJ0BOYIA',
    channel: 'Charlie Parker - Topic',
    clean: 'clean',
    review: 'Official audio of the 1945 original, no video. Instrumental.',
  },
  'dizzy-gillespie': {
    artist: 'Dizzy Gillespie',
    song: 'A Night in Tunisia',
    videoId: 'vFli0-NsVFc',
    channel: 'Dizzy Gillespie - Topic',
    clean: 'clean',
    review: 'Official audio of the 1946 original, no video. Instrumental.',
  },
  'thelonious-monk': {
    artist: 'Thelonious Monk',
    song: "'Round Midnight",
    videoId: 'V_h5P2meI5I',
    channel: 'Thelonious Monk - Topic',
    clean: 'clean',
    review: 'Official audio of the 1947 original, no video. Instrumental.',
  },
  'john-coltrane': {
    artist: 'John Coltrane',
    song: 'Giant Steps',
    videoId: 'KwIC6B_dvW4',
    channel: 'John Coltrane',
    clean: 'clean',
    review: 'Official audio (2020 remaster), no video. Instrumental.',
  },
  'mccoy-tyner': {
    artist: 'McCoy Tyner',
    song: 'Passion Dance',
    videoId: '0zdoOyeRTCA',
    channel: 'McCoy Tyner Trio - Topic',
    clean: 'clean',
    review:
      'Official audio from The Real McCoy (1967), no video. Instrumental.',
  },
  'ella-fitzgerald': {
    artist: 'Ella Fitzgerald',
    song: 'How High the Moon (Live in Berlin, 1960)',
    videoId: 'XAwYLQLs3Do',
    channel: 'Ella Fitzgerald - Topic',
    clean: 'clean',
    review:
      'Official audio of the Ella in Berlin scat, chosen over "Mack the Knife" (its lyrics describe stabbings).',
  },
  'art-blakey': {
    artist: 'Art Blakey',
    song: "Moanin' (Art Blakey and the Jazz Messengers)",
    videoId: 'fsJ3JjpZyoA',
    channel: 'Art Blakey - Topic',
    clean: 'clean',
    review: 'Official audio of the 1958 original, no video. Instrumental.',
  },
  'sarah-vaughan': {
    artist: 'Sarah Vaughan',
    song: 'Misty',
    videoId: '-PvOCziJ0UY',
    channel: 'Sarah Vaughan - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1958 recording with Quincy Jones and His Orchestra, no video.',
  },
  'lil-hardin-armstrong': {
    artist: 'Lil Hardin Armstrong',
    song: 'My Heart (Louis Armstrong & His Hot Five)',
    videoId: '-gIH-0qihGk',
    channel: 'Louis Armstrong And The All-Stars - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1925 Hot Five original, no video: her tune, with her piano solo. Instrumental.',
  },
  'shirley-scott': {
    artist: 'Shirley Scott',
    song: 'Blue Seven',
    videoId: '3rADQLG9Su8',
    channel: 'Shirley Scott - Topic',
    clean: 'clean',
    review:
      'Official audio of her 1961 Prestige recording of the Sonny Rollins blues, no video. Instrumental.',
  },
  'marian-mcpartland': {
    artist: 'Marian McPartland',
    song: 'Twilight World',
    videoId: 'QG3PgXVXxXI',
    channel: 'Marian McPartland - Topic',
    clean: 'clean',
    review:
      'Official audio of her own tune, the title track of Twilight World (Concord, 2008), no video. Instrumental.',
  },
  'terri-lyne-carrington': {
    artist: 'Terri Lyne Carrington',
    song: 'Continental Cliff',
    videoId: '_ebeSRc0Xu0',
    channel: 'Terri Lyne Carrington - Topic',
    clean: 'clean',
    review:
      'Official audio, no video, from New Standards Vol. 1 (2022), her album of tunes by women composers; this one is by Patricia Pérez. Check for a vocal.',
  },
  'maria-schneider': {
    artist: 'Maria Schneider',
    song: 'Bluebird (Frankfurt Radio Big Band)',
    videoId: 'sSqxGZknvSw',
    channel: 'hr-Bigband – Frankfurt Radio Big Band',
    clean: 'clean',
    review:
      'Concert video, 2024: she conducts her own piece from Data Lords. Posted by the broadcaster with her permission; she keeps her own recordings off YouTube. Instrumental.',
  },
  'melba-liston': {
    artist: 'Melba Liston',
    song: 'Blues Melba (Melba Liston & Her ’Bones)',
    videoId: '4RB-jvXN3Zs',
    channel: 'Melba Liston and Her Bones - Topic',
    clean: 'clean',
    review:
      'Official audio of her 1958 blues from Melba Liston and Her ’Bones, no video, on a 2012 reissue compilation. Instrumental.',
  },
  // ── Blues ──
  // Duke Ellington, Red Garland, Miles Davis and Shirley Scott are on the
  // Blues Overview too; their Jazz hits above serve both.
  'ma-rainey': {
    artist: 'Ma Rainey',
    song: 'Bo-Weavil Blues',
    videoId: 'L9Z3PoLyEKE',
    channel: 'Ma Rainey - Topic',
    clean: 'clean',
    review:
      'Official audio of the Paramount original (1923–24), no video. Chosen over "See See Rider Blues" (a verse about buying a pistol). Check the lyrics: one line fears a man might poison her.',
  },
  'bessie-smith': {
    artist: 'Bessie Smith',
    song: 'St. Louis Blues (with Louis Armstrong)',
    videoId: '7l4YachmHKc',
    channel: 'Bessie Smith - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1925 original, Louis Armstrong on cornet and Fred Longshaw on harmonium, no video.',
  },
  'big-bill-broonzy': {
    artist: 'Big Bill Broonzy',
    song: 'Key to the Highway',
    videoId: '54lCSinwoJY',
    channel: 'Big Bill Broonzy - Topic',
    clean: 'clean',
    review:
      'Official audio, no video: by its length the 1941 Okeh original, on a 2007 reissue. The eight-bar blues L1 plays.',
  },
  'memphis-minnie': {
    artist: 'Memphis Minnie',
    song: 'When the Levee Breaks (Memphis Minnie & Kansas Joe)',
    videoId: 'WSlt8-fmvas',
    channel: 'Memphis Minnie & Kansas Joe - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1929 original (Columbia/Legacy), no video; Kansas Joe McCoy sings lead. About the 1927 Mississippi flood. Her "Official Artist Channel" shows an unrelated spam name, so this is the Topic upload.',
  },
  'meade-lux-lewis': {
    artist: 'Meade Lux Lewis',
    song: 'Honky Tonk Train Blues',
    videoId: 'FTKJtTaysrA',
    channel: 'Meade "Lux" Lewis - Topic',
    clean: 'clean',
    review:
      'Official audio of his 1940 Blue Note recording, no video. Instrumental.',
  },
  'albert-ammons': {
    artist: 'Albert Ammons',
    song: 'Boogie Woogie Stomp',
    videoId: 'qgVpU6S3fNE',
    channel: 'Albert Ammons - Topic',
    clean: 'clean',
    review:
      'Official audio of his 1939 Blue Note solo recording, no video. Instrumental.',
  },
  'sister-rosetta-tharpe': {
    artist: 'Sister Rosetta Tharpe',
    song: 'Strange Things Happening Every Day',
    videoId: 'x9RU4y7GPxQ',
    channel: 'Sister Rosetta Tharpe - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1940s Decca original, no video. A gospel song.',
  },
  'katie-webster': {
    artist: 'Katie Webster',
    song: 'Katie’s Boogie Woogie',
    videoId: 'UETQ41YsuH0',
    channel: 'Katie Webster - Topic',
    clean: 'clean',
    review:
      'Official audio (Arhoolie, now Smithsonian Folkways), no video. Boogie-woogie piano; check for a vocal.',
  },
  'b-b-king': {
    artist: 'B.B. King',
    song: 'The Thrill Is Gone',
    videoId: 'x2GjCbuQEQc',
    channel: 'B.B. King - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1969 recording in its single edit, no video. A slow minor blues about a love that has ended.',
  },
  'robert-johnson': {
    artist: 'Robert Johnson',
    song: 'Sweet Home Chicago',
    videoId: 'aXTQeNIoiwo',
    channel: 'Robert Johnson - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1936 original (Columbia/Legacy), no video. Check the lyrics: a counting verse, nothing explicit.',
  },
  'muddy-waters': {
    artist: 'Muddy Waters',
    song: 'Got My Mojo Working',
    videoId: 'ThD9xswxxtk',
    channel: 'Muddy Waters - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1957 Chess studio single, no video, chosen over "Hoochie Coochie Man" and "Mannish Boy". A love-charm song; check the lyrics ("…all you women right here at my command").',
  },
  'otis-spann': {
    artist: 'Otis Spann',
    song: 'Great Northern Stomp',
    videoId: '4DBNEnlUBjI',
    channel: 'Candid Records',
    clean: 'clean',
    review:
      'Official audio posted by the label, from Otis Spann Is the Blues (Candid, 1960), his first solo album. Piano instrumental.',
  },
  'big-mama-thornton': {
    artist: 'Big Mama Thornton',
    song: 'Hound Dog',
    videoId: 'q3IYRiAjHkw',
    channel: 'Big Mama Thornton - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1952 Peacock original, produced by Johnny Otis, no video.',
  },
  'professor-longhair': {
    artist: 'Professor Longhair',
    song: 'Tipitina',
    videoId: 'uVX_H0qWi60',
    channel: 'Professor Longhair - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1953 Atlantic original, no video. Mostly nonsense syllables; check the lyrics. His "Official Artist Channel" shows an unrelated spam name, so this is the Topic upload.',
  },
  'freddie-king': {
    artist: 'Freddie King',
    song: 'Hide Away',
    videoId: 'PPbBOZ11l7Q',
    channel: 'Freddie King - Topic',
    clean: 'clean',
    review:
      'Official audio of the Federal original (1961) from the King Records catalog, no video. Instrumental: a 12-bar shuffle in E.',
  },
  'buddy-guy': {
    artist: 'Buddy Guy',
    song: 'Mary Had a Little Lamb',
    videoId: 'uL__B0JExQU',
    channel: 'Buddy Guy - Topic',
    clean: 'clean',
    review:
      'Official audio from A Man and the Blues (Vanguard, 1968), no video: the nursery rhyme as a blues.',
  },
  'koko-taylor': {
    artist: 'Koko Taylor',
    song: 'Let the Good Times Roll',
    videoId: 'HxmRoCVR_TY',
    channel: 'Koko Taylor - Topic',
    clean: 'clean',
    review:
      'Official audio from The Earthshaker (Alligator, 1978), no video: Louis Jordan’s 1946 song. Chosen over her hit "Wang Dang Doodle", whose party guest list names a razor, a butcher knife and a pistol. Check the lyrics.',
  },
  'stevie-ray-vaughan': {
    artist: 'Stevie Ray Vaughan',
    song: 'Pride and Joy (Stevie Ray Vaughan & Double Trouble)',
    videoId: 'hDlSI_-z8Tc',
    channel: 'Stevie Ray Vaughan - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1983 Texas Flood original, no video. A Texas shuffle.',
  },
  't-bone-walker': {
    artist: 'T-Bone Walker',
    song: 'Call It Stormy Monday (But Tuesday Is Just as Bad)',
    videoId: '98MeVUjqyTo',
    channel: 'T-Bone Walker - Topic',
    clean: 'clean',
    review:
      'Official audio, no video: the 1947 Black & White original (its length matches the 78), on an Acrobat reissue.',
  },
  'ray-charles': {
    artist: 'Ray Charles',
    song: 'Hallelujah, I Love Her So',
    videoId: '0mho53TgoKw',
    channel: 'Ray Charles - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1955 Atlantic original, no video, chosen over "What’d I Say".',
  },
  'etta-james': {
    artist: 'Etta James',
    song: "I'd Rather Go Blind",
    videoId: 'Bcus42ihkTI',
    channel: 'Etta James - Topic',
    clean: 'clean',
    review:
      'Official audio of the original from Tell Mama (1968), no video. A heartbreak song.',
  },
  'bonnie-raitt': {
    artist: 'Bonnie Raitt',
    song: 'Something to Talk About',
    videoId: 'mJ58TVYNFro',
    channel: 'BonnieRaittVEVO',
    clean: 'clean',
    review:
      'Official music video (1991): pop-rock rather than blues, chosen as her biggest hit. Check the video.',
  },
  'bernard-purdie': {
    artist: 'Bernard Purdie',
    song: 'Home at Last (Steely Dan)',
    videoId: 'Hx5ZlTyzU-k',
    channel: 'Steely Dan - Topic',
    clean: 'clean',
    review:
      'Official audio from Aja (1977), no video: his half-time shuffle, the groove L2 teaches. Check the lyrics: they retell the Odyssey, and one line names retsina, a Greek wine.',
  },
  'milt-jackson': {
    artist: 'Milt Jackson',
    song: 'Bags’ Groove',
    videoId: 'Q0FgtYzjkoo',
    channel: 'Milt Jackson - Topic',
    clean: 'clean',
    review:
      'Official audio of the 1952 Blue Note original, no video. Instrumental.',
  },
  'jimmy-smith': {
    artist: 'Jimmy Smith',
    song: 'Back at the Chicken Shack',
    videoId: '3Q1GFRbeMMk',
    channel: 'Jimmy Smith - Topic',
    clean: 'clean',
    review:
      'Official audio of the title track (Blue Note; recorded 1960, released 1963), no video. Instrumental.',
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
