import type { HistoricalEvent } from '@/components/atlas/types';

export const MUSICFORMEDIA_EVENTS: HistoricalEvent[] = [
  // =============================================
  // OPERA TO MUSICAL THEATER
  // =============================================
  {
    id: 'evt-media-mantua-1607-orfeo',
    year: 1607,
    location: { lat: 45.1564, lng: 10.7914, city: 'Mantua', country: 'Italy' },
    genre: ['Opera', 'Classical'],
    title: 'Monteverdi\'s "L\'Orfeo" establishes opera as an art form',
    description:
      'Claudio Monteverdi\'s "L\'Orfeo" premieres at the ducal palace in Mantua, transforming the experimental Florentine "dramma per musica" into a fully realized dramatic art form. Its sophisticated use of orchestration, recitative, and aria creates the blueprint that opera composers would follow for the next four centuries. This is widely considered the first great opera in the Western canon.',
    tags: [
      'monteverdi',
      'orfeo',
      'opera',
      'baroque',
      'mantua',
      'dramma per musica',
    ],
  },
  {
    id: 'evt-media-vienna-1786-figaro',
    year: 1786,
    location: {
      lat: 48.2082,
      lng: 16.3738,
      city: 'Vienna',
      country: 'Austria',
    },
    genre: ['Opera', 'Classical'],
    title: 'Mozart\'s "The Marriage of Figaro" revolutionizes comic opera',
    description:
      'Mozart and librettist Lorenzo Da Ponte premiere "Le nozze di Figaro" at Vienna\'s Burgtheater, elevating opera buffa from light entertainment into psychologically complex drama. The opera\'s ensemble finales, where multiple characters sing simultaneously with distinct emotions, represent a quantum leap in musical storytelling. Its subversive class commentary — servants outwitting aristocrats — also made it politically charged.',
    tags: [
      'mozart',
      'da ponte',
      'marriage of figaro',
      'opera buffa',
      'vienna',
      'classical era',
      'burgtheater',
    ],
  },
  {
    id: 'evt-media-venice-1853-traviata',
    year: 1853,
    location: {
      lat: 45.4408,
      lng: 12.3155,
      city: 'Venice',
      country: 'Italy',
    },
    genre: ['Opera', 'Classical'],
    title: 'Verdi\'s "La Traviata" brings realism to opera',
    description:
      "Giuseppe Verdi's \"La Traviata\" premieres at Venice's La Fenice theater, shocking audiences by setting an opera in contemporary Parisian society rather than in myth or distant history. Based on Alexandre Dumas' novel about a courtesan dying of tuberculosis, it pioneers operatic verismo — raw emotional realism — and becomes one of the most performed operas in history.",
    tags: [
      'verdi',
      'la traviata',
      'la fenice',
      'italian opera',
      'verismo',
      'romanticism',
    ],
  },
  {
    id: 'evt-media-turin-1896-boheme',
    year: 1896,
    location: { lat: 45.0703, lng: 7.6869, city: 'Turin', country: 'Italy' },
    genre: ['Opera', 'Classical'],
    title: 'Puccini\'s "La Bohème" perfects emotional opera',
    description:
      'Giacomo Puccini\'s "La Bohème" premieres at Turin\'s Teatro Regio under the baton of a young Arturo Toscanini, telling the story of struggling Parisian artists with unprecedented melodic beauty and emotional directness. Its influence extends far beyond the opera house — it directly inspires Jonathan Larson\'s "Rent" a century later and remains the gateway opera for new audiences worldwide.',
    tags: [
      'puccini',
      'la boheme',
      'turin',
      'toscanini',
      'italian opera',
      'romanticism',
    ],
  },
  {
    id: 'evt-media-london-1878-savoy',
    year: 1878,
    location: {
      lat: 51.5074,
      lng: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    },
    genre: ['Operetta', 'Musical Theatre'],
    title: 'Gilbert & Sullivan invent the modern musical',
    description:
      'W.S. Gilbert and Arthur Sullivan premiere "H.M.S. Pinafore" in London, launching a series of comic operettas that bridge European opera and what will become the Broadway musical. Their witty librettos, catchy melodies, and satirical plots create a popular entertainment model that directly influences Cole Porter, Rodgers and Hammerstein, and Stephen Sondheim. The Savoy Theatre, built specifically for their works, becomes synonymous with English-language musical theater.',
    tags: [
      'gilbert and sullivan',
      'operetta',
      'savoy theatre',
      'hms pinafore',
      'comic opera',
      'victorian era',
    ],
  },
  {
    id: 'evt-media-nyc-1911-treemonisha',
    year: 1911,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Opera', 'Ragtime'],
    title: 'Scott Joplin composes "Treemonisha," the first Black opera',
    description:
      'Scott Joplin, already the undisputed king of ragtime, self-publishes "Treemonisha," a grand opera incorporating ragtime, spirituals, and folk music into a story about education lifting Black communities out of superstition. Largely ignored during his lifetime and staged only in a partial, unpaid rehearsal, the opera is posthumously recognized as a groundbreaking fusion of African American musical traditions with European operatic form. Joplin receives a posthumous Pulitzer Prize in 1976.',
    tags: [
      'scott joplin',
      'treemonisha',
      'ragtime',
      'black opera',
      'harlem',
      'african american',
      'pulitzer',
    ],
  },
  {
    id: 'evt-media-nyc-1935-porgy',
    year: 1935,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Opera', 'Jazz'],
    title: 'Gershwin\'s "Porgy and Bess" fuses opera with jazz and blues',
    description:
      'George Gershwin\'s "Porgy and Bess" premieres on Broadway, creating what he calls a "folk opera" that weaves jazz harmonies, blues melodies, and spirituals into a fully operatic framework. Standards like "Summertime" and "It Ain\'t Necessarily So" become jazz repertoire staples. Though controversial for its portrayal of Black life by a white composer, it remains a landmark in bringing African American musical idioms into the operatic canon.',
    tags: [
      'gershwin',
      'porgy and bess',
      'folk opera',
      'summertime',
      'broadway',
      'jazz opera',
      'african american',
    ],
  },
  {
    id: 'evt-media-nyc-1943-oklahoma',
    year: 1943,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Musical Theatre'],
    title:
      'Rodgers & Hammerstein\'s "Oklahoma!" invents the integrated musical',
    description:
      '"Oklahoma!" opens at the St. James Theatre and runs for an unprecedented 2,212 performances, establishing the template for the modern American musical. Richard Rodgers and Oscar Hammerstein II integrate songs, dialogue, and Agnes de Mille\'s dream ballet choreography into a unified dramatic narrative — replacing the loosely plotted revue format. Every major musical that follows owes a debt to this structural revolution.',
    tags: [
      'rodgers and hammerstein',
      'oklahoma',
      'broadway',
      'integrated musical',
      'agnes de mille',
      'golden age',
    ],
  },
  {
    id: 'evt-media-nyc-1957-westsidestory',
    year: 1957,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Musical Theatre', 'Jazz'],
    title: 'Bernstein\'s "West Side Story" brings symphonic jazz to Broadway',
    description:
      "Leonard Bernstein, Stephen Sondheim, and Jerome Robbins reimagine \"Romeo and Juliet\" in the gang-ridden streets of Manhattan's West Side. Bernstein's score fuses jazz, Latin rhythms, and dissonant modernism with theatrical song, while Robbins' athletic choreography turns street violence into ballet. It raises the artistic ambitions of Broadway permanently and proves musical theater can tackle serious social issues like racism and immigration.",
    tags: [
      'bernstein',
      'sondheim',
      'robbins',
      'west side story',
      'broadway',
      'latin jazz',
      'romeo and juliet',
    ],
  },
  {
    id: 'evt-media-nyc-1970-company',
    year: 1970,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Musical Theatre'],
    title: 'Sondheim\'s "Company" reinvents the concept musical',
    description:
      'Stephen Sondheim and director Hal Prince premiere "Company" on Broadway, abandoning linear narrative entirely in favor of a thematic exploration of modern relationships and urban loneliness. Its non-chronological structure, sophisticated lyrics, and willingness to leave questions unanswered rather than tie up neatly pioneered the "concept musical" form. Sondheim\'s subsequent works — "Follies," "Sweeney Todd," "Into the Woods" — build on this foundation to make him the most influential theater composer of the late 20th century.',
    tags: [
      'sondheim',
      'company',
      'concept musical',
      'hal prince',
      'broadway',
      'modern musical',
    ],
  },
  {
    id: 'evt-media-london-1971-superstar',
    year: 1971,
    location: {
      lat: 51.5074,
      lng: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    },
    genre: ['Musical Theatre', 'Rock'],
    title:
      'Andrew Lloyd Webber\'s "Jesus Christ Superstar" launches the rock musical',
    description:
      'Andrew Lloyd Webber and Tim Rice\'s "Jesus Christ Superstar" premieres in London after its concept album becomes a worldwide hit, proving that rock music and theater could merge commercially and artistically. The sung-through format — no spoken dialogue — becomes Lloyd Webber\'s signature and dominates the West End and Broadway for decades through "Evita," "Cats," and "Phantom of the Opera." It opens the door for rock-influenced musicals from "Hair" to "Rent."',
    tags: [
      'andrew lloyd webber',
      'tim rice',
      'jesus christ superstar',
      'rock musical',
      'west end',
      'sung through',
      'concept album',
    ],
  },
  {
    id: 'evt-media-nyc-1996-rent',
    year: 1996,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Musical Theatre', 'Rock'],
    title:
      'Larson\'s "Rent" brings rock authenticity and the AIDS crisis to Broadway',
    description:
      'Jonathan Larson\'s "Rent" opens off-Broadway at New York Theatre Workshop, updating Puccini\'s "La Bohème" to 1990s East Village bohemia amid the AIDS epidemic. Larson tragically dies the night before opening, but his rock-driven score — featuring raw, emotionally direct songs — shatters Broadway\'s MOR aesthetic and attracts a younger, more diverse audience. It runs for 12 years and proves musical theater can speak to contemporary counterculture.',
    tags: [
      'jonathan larson',
      'rent',
      'la boheme',
      'aids crisis',
      'east village',
      'broadway',
      'rock musical',
    ],
  },
  {
    id: 'evt-media-nyc-2015-hamilton',
    year: 2015,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Musical Theatre', 'Hip Hop'],
    title:
      'Lin-Manuel Miranda\'s "Hamilton" fuses hip hop with American history',
    description:
      '"Hamilton" opens on Broadway, using hip hop, R&B, and rap battles to tell the story of founding father Alexander Hamilton with a deliberately multiracial cast. Lin-Manuel Miranda\'s score collapses the distance between 18th-century political debate and 21st-century freestyle, making the show a once-in-a-generation cultural phenomenon. It wins 11 Tony Awards, becomes the hardest ticket on Broadway, and fundamentally expands who musical theater is for.',
    tags: [
      'lin-manuel miranda',
      'hamilton',
      'hip hop musical',
      'broadway',
      'rap',
      'tony awards',
      'american history',
    ],
  },

  // =============================================
  // SILENT FILM TO GOLDEN AGE HOLLYWOOD
  // =============================================
  {
    id: 'evt-media-nyc-1900-silentfilm',
    year: 1900,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Classical'],
    title: 'Silent film orchestras create the first movie music',
    description:
      "As nickelodeons and early movie palaces spread across American cities, live orchestras and pianists begin accompanying silent films, creating the first demand for music synchronized to visual narrative. New York's grand theaters like the Strand and Roxy employ full orchestras, and composers begin writing original scores rather than relying on improvisation. This tradition establishes the foundational idea that music is inseparable from the cinematic experience.",
    tags: [
      'silent film',
      'nickelodeon',
      'movie palace',
      'orchestra',
      'accompaniment',
      'early cinema',
    ],
  },
  {
    id: 'evt-media-la-1927-jazzsinger',
    year: 1927,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Jazz'],
    title: '"The Jazz Singer" ushers in the sound era of cinema',
    description:
      'Warner Bros.\' "The Jazz Singer" starring Al Jolson premieres as the first feature-length "talkie" with synchronized dialogue and musical numbers, ending the silent film era virtually overnight. The film\'s commercial success forces every studio to adopt sound technology, creating an entirely new industry for film music and destroying the careers of silent film musicians. It also establishes Hollywood\'s complicated relationship with Black music — Jolson performs in blackface while singing jazz and blues.',
    tags: [
      'jazz singer',
      'al jolson',
      'talkie',
      'warner bros',
      'sound film',
      'vitaphone',
      'hollywood',
    ],
  },
  {
    id: 'evt-media-la-1933-kingkong',
    year: 1933,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Classical'],
    title: 'Max Steiner\'s "King Kong" invents the Hollywood film score',
    description:
      'Max Steiner\'s wall-to-wall orchestral score for "King Kong" at RKO Pictures establishes the template for Hollywood film music — leitmotifs for characters, Mickey Mousing for action, and lush Romantic-era orchestration for emotion. Steiner, a Vienna-trained composer, essentially imports the Wagnerian tradition into cinema and proves that original scores dramatically enhance audience engagement. His approach dominates film scoring for the next 90 years.',
    tags: [
      'max steiner',
      'king kong',
      'rko',
      'leitmotif',
      'orchestral score',
      'golden age hollywood',
    ],
  },
  {
    id: 'evt-media-la-1940-fantasia',
    year: 1940,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Classical'],
    title: 'Disney\'s "Fantasia" merges animation with classical masterworks',
    description:
      'Walt Disney\'s "Fantasia" pairs animated sequences with classical works by Bach, Beethoven, Stravinsky, and others, conducted by Leopold Stokowski with the Philadelphia Orchestra. The film introduces millions of Americans to classical music and pioneers Fantasound, an early surround-sound system. Though initially a commercial disappointment, it becomes a cultural touchstone that proves classical music can be a mass-market visual experience.',
    tags: [
      'disney',
      'fantasia',
      'stokowski',
      'classical animation',
      'stravinsky',
      'bach',
      'fantasound',
    ],
  },
  {
    id: 'evt-media-la-1960-psycho',
    year: 1960,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring'],
    title: 'Bernard Herrmann\'s "Psycho" score redefines suspense in film',
    description:
      "Bernard Herrmann's all-strings score for Alfred Hitchcock's \"Psycho\" — particularly the shrieking violins of the shower scene — becomes the most iconic moment in film music history. Herrmann's decision to use only strings creates a monochromatic, claustrophobic sound world that mirrors the film's black-and-white photography. The score demonstrates that film music can be as avant-garde as concert hall modernism while remaining viscerally effective for mass audiences.",
    tags: [
      'bernard herrmann',
      'hitchcock',
      'psycho',
      'strings',
      'suspense',
      'shower scene',
      'paramount',
    ],
  },
  {
    id: 'evt-media-la-1961-moonriver',
    year: 1961,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Jazz'],
    title: 'Henry Mancini\'s "Moon River" bridges jazz and Hollywood',
    description:
      'Henry Mancini\'s "Moon River," sung by Audrey Hepburn in "Breakfast at Tiffany\'s," wins the Academy Award and becomes one of the most covered songs in history. Mancini\'s approach — blending cool jazz sophistication with memorable pop melody — creates a new model for film music that is simultaneously atmospheric and commercially viable. His scores for "The Pink Panther" and "Peter Gunn" further establish jazz as a cinematic language for wit and urbanity.',
    tags: [
      'henry mancini',
      'moon river',
      'audrey hepburn',
      'breakfast at tiffanys',
      'oscar',
      'jazz score',
      'cool jazz',
    ],
  },
  {
    id: 'evt-media-london-1962-bond',
    year: 1962,
    location: {
      lat: 51.5074,
      lng: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    },
    genre: ['Film Scoring', 'Jazz'],
    title: 'John Barry creates the James Bond sound',
    description:
      "John Barry arranges and expands Monty Norman's James Bond theme for \"Dr. No,\" then composes the scores for the next eleven Bond films, creating one of cinema's most recognizable sonic identities. Barry's fusion of surf guitar, big band brass, lush strings, and jazzy sophistication defines cinematic cool and influences spy-film music for decades. The Bond theme becomes arguably the most famous piece of film music ever written.",
    tags: [
      'john barry',
      'james bond',
      'dr no',
      'spy music',
      'monty norman',
      'eon productions',
      'theme song',
    ],
  },
  {
    id: 'evt-media-la-1966-missionimpossible',
    year: 1966,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Jazz'],
    title:
      'Lalo Schifrin\'s "Mission: Impossible" theme fuses jazz with suspense',
    description:
      'Argentine-born composer Lalo Schifrin writes the iconic "Mission: Impossible" theme in 5/4 time for the CBS television series, bringing Latin jazz rhythms and big band energy into mainstream American television. Schifrin, a student of Olivier Messiaen who played piano for Dizzy Gillespie, represents the sophisticated jazz musicians who brought genuine harmonic complexity to Hollywood. The theme remains instantly recognizable across six decades of franchise reboots.',
    tags: [
      'lalo schifrin',
      'mission impossible',
      'five four time',
      'latin jazz',
      'tv theme',
      'cbs',
      'spy music',
    ],
  },
  {
    id: 'evt-media-rome-1966-morricone',
    year: 1966,
    location: {
      lat: 41.9028,
      lng: 12.4964,
      city: 'Rome',
      country: 'Italy',
    },
    genre: ['Film Scoring'],
    title:
      "Ennio Morricone's Spaghetti Western scores revolutionize film music",
    description:
      'Ennio Morricone\'s score for Sergio Leone\'s "The Good, the Bad and the Ugly" uses electric guitars, whistling, whip cracks, and wordless vocals to create a completely new sonic language for cinema. Breaking from the orchestral tradition, Morricone treats the film score as a standalone art form with its own sonic world. His partnership with Leone across the Dollars Trilogy and "Once Upon a Time" films makes him the most influential European film composer of the 20th century.',
    tags: [
      'ennio morricone',
      'sergio leone',
      'spaghetti western',
      'ecstasy of gold',
      'dollars trilogy',
      'cinecitta',
      'italian cinema',
    ],
  },
  {
    id: 'evt-media-la-1967-quincyjones',
    year: 1967,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Jazz'],
    title: 'Quincy Jones breaks the color barrier in Hollywood film scoring',
    description:
      'Quincy Jones scores Sidney Poitier\'s "In the Heat of the Night," becoming one of the first African American composers to score a major Hollywood studio film. Jones brings authentic jazz, blues, and soul sensibility to the soundtrack, enhancing the film\'s exploration of racial tension in the Deep South. His Hollywood career paves the way for Black composers in film and foreshadows his transformation into the most powerful producer in popular music.',
    tags: [
      'quincy jones',
      'in the heat of the night',
      'sidney poitier',
      'jazz score',
      'hollywood',
      'civil rights',
      'united artists',
    ],
  },
  {
    id: 'evt-media-memphis-1971-shaft',
    year: 1971,
    location: {
      lat: 35.1495,
      lng: -90.049,
      city: 'Memphis',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Funk', 'Soul'],
    title: 'Isaac Hayes\' "Shaft" launches the Blaxploitation soundtrack era',
    description:
      'Isaac Hayes\' "Theme from Shaft" — with its wah-wah guitar, hi-hat sixteenths, and orchestral funk — wins the Academy Award for Best Original Song, making Hayes the first African American to win an Oscar in a non-acting category. The score proves that Black popular music can drive mainstream cinema and launches the Blaxploitation soundtrack era, inspiring Curtis Mayfield\'s "Super Fly" and countless funk-driven scores. Hayes\' approach directly influences hip hop sampling decades later.',
    tags: [
      'isaac hayes',
      'shaft',
      'blaxploitation',
      'oscar',
      'wah wah guitar',
      'stax records',
      'funk soundtrack',
    ],
  },
  {
    id: 'evt-media-la-1969-bacharach',
    year: 1969,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Pop'],
    title: "Burt Bacharach's film work bridges Tin Pan Alley and Hollywood",
    description:
      'Burt Bacharach\'s score for "Butch Cassidy and the Sundance Kid" — including the Oscar-winning "Raindrops Keep Fallin\' on My Head" — represents the peak of pop songwriting in film. Bacharach\'s sophisticated chord progressions and unusual time signatures bring a Brill Building craftsmanship to Hollywood that contrasts with both the orchestral tradition and the rock era. His approach proves that a pop hit can be the emotional centerpiece of a major motion picture.',
    tags: [
      'burt bacharach',
      'hal david',
      'butch cassidy',
      'raindrops',
      'oscar',
      'pop score',
      'brill building',
    ],
  },

  // =============================================
  // NEW HOLLYWOOD TO MODERN BLOCKBUSTERS
  // =============================================
  {
    id: 'evt-media-la-1975-jaws',
    year: 1975,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Classical'],
    title: 'John Williams\' "Jaws" theme proves two notes can terrify millions',
    description:
      "John Williams' alternating E and F two-note motif for Steven Spielberg's \"Jaws\" becomes the most primal piece of film music ever composed — a heartbeat of dread that audiences associate with unseen danger. The score wins Williams his second Academy Award and begins his partnership with Spielberg that will define blockbuster film music for 50 years. Williams' return to Romantic-era orchestral grandeur reverses the trend toward jazz and pop scores.",
    tags: [
      'john williams',
      'spielberg',
      'jaws',
      'oscar',
      'shark theme',
      'orchestral',
      'blockbuster',
    ],
  },
  {
    id: 'evt-media-la-1977-starwars',
    year: 1977,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Classical'],
    title:
      'John Williams\' "Star Wars" score becomes the most iconic in cinema history',
    description:
      "John Williams' score for George Lucas' \"Star Wars\" — recorded with the London Symphony Orchestra — revives the Wagnerian leitmotif technique on an unprecedented scale, giving every character, location, and emotion its own musical identity. The main theme, Imperial March, and Force theme become part of global cultural vocabulary. The score's massive commercial success (the album goes quadruple platinum) proves that orchestral film music can be a standalone cultural product.",
    tags: [
      'john williams',
      'star wars',
      'george lucas',
      'london symphony orchestra',
      'leitmotif',
      'imperial march',
      'force theme',
    ],
  },
  {
    id: 'evt-media-munich-1978-moroder',
    year: 1978,
    location: {
      lat: 48.1351,
      lng: 11.582,
      city: 'Munich',
      country: 'Germany',
    },
    genre: ['Film Scoring', 'Electronic'],
    title: 'Giorgio Moroder brings synthesizers to the Academy Awards',
    description:
      "Giorgio Moroder's electronic score for \"Midnight Express\" wins the Academy Award for Best Original Score, legitimizing synthesizer-based music in Hollywood and breaking the orchestral monopoly. Working from his Munich studio, the Italo-disco pioneer applies the same Moog and sequencer techniques that powered Donna Summer's disco hits to create a tense, propulsive film score. This opens the door for Vangelis, Tangerine Dream, and eventually Hans Zimmer's hybrid approach.",
    tags: [
      'giorgio moroder',
      'midnight express',
      'synthesizer',
      'oscar',
      'electronic score',
      'munich',
      'moog',
    ],
  },
  {
    id: 'evt-media-london-1981-chariots',
    year: 1981,
    location: {
      lat: 51.5074,
      lng: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    },
    genre: ['Film Scoring', 'Electronic'],
    title:
      'Vangelis\' "Chariots of Fire" synthesizer theme becomes a global hit',
    description:
      'Greek composer Vangelis\' entirely electronic score for "Chariots of Fire" wins the Academy Award and the main theme reaches #1 on the Billboard Hot 100 — an astonishing feat for an instrumental synthesizer piece. The score\'s shimmering Yamaha CS-80 arpeggios become universally associated with slow-motion triumph and are endlessly parodied. Vangelis proves that electronic music can convey the same emotional grandeur as a full orchestra.',
    tags: [
      'vangelis',
      'chariots of fire',
      'cs-80',
      'synthesizer',
      'oscar',
      'electronic score',
      'greek',
    ],
  },
  {
    id: 'evt-media-tokyo-1987-sakamoto',
    year: 1987,
    location: {
      lat: 35.6762,
      lng: 139.6503,
      city: 'Tokyo',
      country: 'Japan',
    },
    genre: ['Film Scoring'],
    title: 'Ryuichi Sakamoto\'s "The Last Emperor" wins the Oscar',
    description:
      'Yellow Magic Orchestra co-founder Ryuichi Sakamoto, collaborating with David Byrne and Cong Su, wins the Academy Award for "The Last Emperor," bridging Japanese electronic music, Western orchestration, and Chinese traditional music in a single score. Sakamoto\'s dual career as a pop innovator and film composer opens the door for electronic musicians to work in cinema. His later scores for films like "The Revenant" continue to push the boundaries of ambient and textural film music.',
    tags: [
      'ryuichi sakamoto',
      'last emperor',
      'ymo',
      'oscar',
      'david byrne',
      'bernardo bertolucci',
      'east meets west',
    ],
  },
  {
    id: 'evt-media-la-1989-elfman',
    year: 1989,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring'],
    title: 'Danny Elfman\'s "Batman" creates the dark blockbuster sound',
    description:
      'Former Oingo Boingo frontman Danny Elfman scores Tim Burton\'s "Batman," creating a brooding, gothic orchestral sound that stands in dramatic contrast to John Williams\' heroic bombast. Elfman\'s collaboration with Burton — extending through "Edward Scissorhands," "The Nightmare Before Christmas," and beyond — establishes an alternative aesthetic for blockbuster scoring: whimsical, dark, and tinged with carnival macabre. He proves that rock musicians can reinvent themselves as top-tier film composers.',
    tags: [
      'danny elfman',
      'batman',
      'tim burton',
      'gothic score',
      'oingo boingo',
      'warner bros',
      'dark orchestral',
    ],
  },
  {
    id: 'evt-media-london-1994-lionking',
    year: 1994,
    location: {
      lat: 51.5074,
      lng: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    },
    genre: ['Film Scoring', 'Classical'],
    title: 'Hans Zimmer\'s "The Lion King" launches a film scoring empire',
    description:
      'Hans Zimmer\'s Oscar-winning score for "The Lion King" — blending African choral music with orchestral grandeur and Elton John\'s songs — establishes him as Hollywood\'s most commercially powerful composer. Working from his London studio before relocating to Santa Monica, the German-born Zimmer pioneers a collaborative "media ventures" model where teams of composers work under his supervision. This factory approach transforms how Hollywood scores are produced and makes Zimmer the defining sound of modern blockbuster cinema.',
    tags: [
      'hans zimmer',
      'lion king',
      'disney',
      'oscar',
      'elton john',
      'african choral',
      'media ventures',
    ],
  },
  {
    id: 'evt-media-tokyo-1984-ghibli',
    year: 1984,
    location: {
      lat: 35.6762,
      lng: 139.6503,
      city: 'Tokyo',
      country: 'Japan',
    },
    genre: ['Film Scoring', 'Classical'],
    title: 'Joe Hisaishi begins his legendary Studio Ghibli partnership',
    description:
      'Joe Hisaishi composes the score for Hayao Miyazaki\'s "Nausicaä of the Valley of the Wind," launching a composer-director partnership that rivals Williams-Spielberg in its cultural impact. Hisaishi\'s scores for "My Neighbor Totoro," "Princess Mononoke," and "Spirited Away" blend Western classical traditions with Japanese minimalism and childlike wonder, creating some of the most beloved film music in history. His work introduces millions of Western audiences to Japanese animation through its universally emotional music.',
    tags: [
      'joe hisaishi',
      'studio ghibli',
      'miyazaki',
      'nausicaa',
      'totoro',
      'spirited away',
      'anime',
    ],
  },
  {
    id: 'evt-media-wellington-2001-lotr',
    year: 2001,
    location: {
      lat: -41.2865,
      lng: 174.7762,
      city: 'Wellington',
      country: 'New Zealand',
    },
    genre: ['Film Scoring', 'Classical'],
    title:
      'Howard Shore\'s "Lord of the Rings" creates cinema\'s grandest score',
    description:
      "Canadian composer Howard Shore records his massive \"Lord of the Rings\" score in Wellington, New Zealand, creating over 10 hours of interconnected music with dozens of leitmotifs representing the cultures, characters, and themes of Middle-earth. The trilogy's scores — performed by the London Philharmonic and recorded at Wellington's Town Hall — represent the most ambitious film music project ever undertaken. Shore's work wins three Academy Awards and is studied as a modern symphonic cycle on par with Wagner's Ring.",
    tags: [
      'howard shore',
      'lord of the rings',
      'peter jackson',
      'wellington',
      'leitmotif',
      'london philharmonic',
      'oscar',
      'tolkien',
    ],
  },
  {
    id: 'evt-media-la-2005-santaolalla-bbm',
    year: 2005,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Folk'],
    title: "Gustavo Santaolalla's spare guitar work wins back-to-back Oscars",
    description:
      'Argentine musician Gustavo Santaolalla wins consecutive Academy Awards for "Brokeback Mountain" and "Babel," using little more than solo guitar to create devastating emotional landscapes. His minimalist approach — rooted in Argentine folk and nueva cancion traditions — represents a radical departure from the orchestral maximalism dominating Hollywood. Santaolalla proves that sometimes a single instrument can be more powerful than a hundred-piece orchestra, influencing a generation of indie film composers.',
    tags: [
      'gustavo santaolalla',
      'brokeback mountain',
      'babel',
      'oscar',
      'argentine folk',
      'minimalist score',
      'guitar',
    ],
  },
  {
    id: 'evt-media-london-2007-greenwood',
    year: 2007,
    location: {
      lat: 51.5074,
      lng: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    },
    genre: ['Film Scoring'],
    title:
      'Jonny Greenwood brings Radiohead\'s experimentalism to "There Will Be Blood"',
    description:
      "Radiohead guitarist Jonny Greenwood scores Paul Thomas Anderson's \"There Will Be Blood\" with dissonant string writing influenced by Penderecki and Ligeti, creating one of the most unsettling and critically acclaimed film scores of the 21st century. Greenwood's refusal to provide conventional emotional cues — instead using avant-garde techniques to mirror the protagonist's inner madness — earns him recognition as one of cinema's most daring composers. His subsequent Anderson collaborations cement a partnership that rivals the greatest composer-director pairings.",
    tags: [
      'jonny greenwood',
      'radiohead',
      'paul thomas anderson',
      'there will be blood',
      'avant-garde',
      'penderecki',
      'strings',
    ],
  },
  {
    id: 'evt-media-chennai-2008-rahman',
    year: 2008,
    location: {
      lat: 13.0827,
      lng: 80.2707,
      city: 'Chennai',
      country: 'India',
    },
    genre: ['Film Scoring', 'Bollywood'],
    title:
      'A.R. Rahman\'s "Slumdog Millionaire" brings Bollywood to the Oscars',
    description:
      "A.R. Rahman, already India's most celebrated film composer, wins two Academy Awards for \"Slumdog Millionaire,\" introducing global audiences to the ecstatic energy of Bollywood film music. His score fuses electronic beats, Sufi devotional singing, Indian classical instruments, and Western orchestration into a kinetic whole that mirrors Mumbai's chaotic vitality. Rahman's crossover success spotlights India's massive film music industry — the world's largest — for Western audiences.",
    tags: [
      'ar rahman',
      'slumdog millionaire',
      'bollywood',
      'oscar',
      'danny boyle',
      'jai ho',
      'chennai',
      'indian cinema',
    ],
  },
  {
    id: 'evt-media-la-2010-socialnetwork',
    year: 2010,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Electronic'],
    title:
      'Trent Reznor & Atticus Ross redefine film scoring with "The Social Network"',
    description:
      "Nine Inch Nails' Trent Reznor and producer Atticus Ross win the Academy Award for their cold, ambient electronic score for David Fincher's \"The Social Network.\" Their approach — layered synthesizers, processed textures, and industrial atmospherics rather than traditional orchestration — permanently expands the sonic palette of mainstream film scoring. The score's commercial success (it debuts in the Billboard top 20) and critical acclaim open Hollywood's doors to electronic and ambient composers.",
    tags: [
      'trent reznor',
      'atticus ross',
      'nine inch nails',
      'social network',
      'david fincher',
      'oscar',
      'electronic score',
      'ambient',
    ],
  },
  {
    id: 'evt-media-london-2010-inception',
    year: 2010,
    location: {
      lat: 51.5074,
      lng: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    },
    genre: ['Film Scoring', 'Electronic'],
    title: 'Hans Zimmer\'s "Inception" BRAAAM changes blockbuster sound design',
    description:
      'Hans Zimmer\'s score for Christopher Nolan\'s "Inception" introduces the "BRAAAM" — a massive, distorted brass note that becomes the defining sound of 2010s blockbuster trailers and scores. Built on a slowed-down version of Edith Piaf\'s "Non, je ne regrette rien," the score\'s hybrid of electronic processing and orchestral power creates an oppressive, dream-like atmosphere. The BRAAAM sound is so widely imitated that it transforms the entire aesthetic of action film marketing for a decade.',
    tags: [
      'hans zimmer',
      'inception',
      'christopher nolan',
      'braaam',
      'edith piaf',
      'hybrid score',
      'blockbuster',
    ],
  },

  // =============================================
  // TELEVISION MUSIC
  // =============================================
  {
    id: 'evt-media-la-1951-tvtheme',
    year: 1951,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Pop'],
    title: '"I Love Lucy" launches the TV theme song era',
    description:
      '"I Love Lucy" debuts on CBS with one of television\'s first iconic theme songs, establishing the tradition of catchy, instantly recognizable opening music that will define the medium for decades. As television rapidly enters American homes, theme songs become some of the most-heard music in the country — cultural earworms that unite millions of viewers in shared ritual. The TV theme becomes a distinct compositional art form, spawning hit singles and shaping how Americans experience music in daily life.',
    tags: [
      'i love lucy',
      'cbs',
      'tv theme',
      'television',
      'lucille ball',
      'theme song era',
    ],
  },
  {
    id: 'evt-media-la-1990-lawandorder',
    year: 1990,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring'],
    title: "Mike Post's TV themes define an era of American television",
    description:
      'Mike Post composes the iconic "doink doink" sound and theme for "Law & Order," capping a career that includes themes for "The A-Team," "Hill Street Blues," "NYPD Blue," and "Magnum, P.I." Post\'s ability to capture a show\'s essence in 30 seconds of music makes him the most prolific and successful TV composer in history. The "Law & Order" sound effect alone becomes one of the most recognized audio cues in American culture.',
    tags: [
      'mike post',
      'law and order',
      'tv theme',
      'nbc',
      'doink doink',
      'hill street blues',
      'television',
    ],
  },
  {
    id: 'evt-media-la-1990-twinpeaks',
    year: 1990,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Jazz'],
    title:
      'Angelo Badalamenti\'s "Twin Peaks" score creates a new TV atmosphere',
    description:
      'Angelo Badalamenti\'s dreamy, jazz-noir score for David Lynch\'s "Twin Peaks" — anchored by the haunting "Falling" theme with Julee Cruise\'s ethereal vocals — proves that television music can be as artistically ambitious as cinema scoring. The soundtrack album reaches #22 on the Billboard 200, unprecedented for a TV score. Badalamenti\'s moody blend of cool jazz, ambient textures, and surrealist dread establishes the template for "prestige TV" music that shows like "The Sopranos" and "True Detective" later follow.',
    tags: [
      'angelo badalamenti',
      'david lynch',
      'twin peaks',
      'julee cruise',
      'jazz noir',
      'ambient',
      'prestige tv',
    ],
  },
  {
    id: 'evt-media-la-2011-gameofthrones',
    year: 2011,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Classical'],
    title:
      'Ramin Djawadi\'s "Game of Thrones" elevates TV scoring to blockbuster scale',
    description:
      'Iranian-German composer Ramin Djawadi\'s orchestral score for HBO\'s "Game of Thrones" — with its cello-driven main theme — brings cinematic grandeur to television, matching the show\'s unprecedented production scale. His score for the "Light of the Seven" sequence in season six, built on a piano ostinato that builds to devastating orchestral catharsis, is widely considered the greatest piece of television scoring ever composed. Djawadi proves that the golden age of TV demands golden-age-quality music.',
    tags: [
      'ramin djawadi',
      'game of thrones',
      'hbo',
      'light of the seven',
      'cello',
      'prestige tv',
      'orchestral',
    ],
  },
  {
    id: 'evt-media-nyc-2018-succession',
    year: 2018,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Classical'],
    title: 'Nicholas Britell\'s "Succession" theme becomes a cultural meme',
    description:
      "Nicholas Britell's piano-and-strings theme for HBO's \"Succession\" — a baroque, anxious composition that mirrors the Roy family's obscene wealth and dysfunction — becomes one of the most recognized TV themes of the streaming era. Britell's classical training (Juilliard, collaboration with Barry Jenkins) brings concert-hall sophistication to television while remaining endlessly memeable. The theme's fusion of classical gravitas and hip hop percussion reflects Britell's unique background producing for Jay-Z and Kanye West.",
    tags: [
      'nicholas britell',
      'succession',
      'hbo',
      'piano',
      'baroque',
      'prestige tv',
      'hip hop classical',
    ],
  },
  {
    id: 'evt-media-la-2019-mandalorian',
    year: 2019,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring'],
    title:
      'Ludwig Goransson\'s "Mandalorian" score wins the first streaming-era Emmy',
    description:
      'Swedish composer Ludwig Goransson — fresh from his Oscar for "Black Panther" — creates the score for Disney+\'s "The Mandalorian," blending recorders, bass flutes, and electronic production to give Star Wars a spaghetti-western-meets-world-music sound that deliberately departs from John Williams\' symphonic tradition. Goransson\'s dual career producing Childish Gambino\'s Grammy-winning "This Is America" and scoring blockbusters makes him the most versatile composer of his generation.',
    tags: [
      'ludwig goransson',
      'mandalorian',
      'disney plus',
      'star wars',
      'emmy',
      'childish gambino',
      'spaghetti western',
    ],
  },
  {
    id: 'evt-media-la-2021-whitelotus',
    year: 2021,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Electronic'],
    title: 'Cristobal Tapia de Veer\'s "White Lotus" theme goes viral',
    description:
      "Chilean-Canadian composer Cristobal Tapia de Veer creates the unhinged, percussion-and-chant theme for HBO's \"The White Lotus\" that becomes a TikTok sensation and one of the most discussed TV themes in years. His use of distorted vocals, tribal percussion, and deliberately unsettling textures creates a sonic identity that perfectly captures the show's satirical unease. The theme's virality demonstrates how streaming-era TV music can break through the cultural noise in ways that traditional advertising cannot.",
    tags: [
      'cristobal tapia de veer',
      'white lotus',
      'hbo',
      'viral theme',
      'tiktok',
      'percussion',
      'electronic',
    ],
  },
  {
    id: 'evt-media-la-2004-bsg',
    year: 2004,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring'],
    title:
      'Bear McCreary\'s "Battlestar Galactica" fuses world music with sci-fi',
    description:
      'Bear McCreary\'s score for the reimagined "Battlestar Galactica" on Syfy rejects the standard sci-fi orchestral template in favor of taiko drums, duduk, erhu, and gamelan instruments, creating an intensely percussive and ethnically diverse sound world for a space opera. His approach — treating an alien civilization\'s music as genuinely unfamiliar rather than conventionally "futuristic" — influences a generation of sci-fi scoring. McCreary becomes one of the most in-demand TV composers, later scoring "The Walking Dead" and "Outlander."',
    tags: [
      'bear mccreary',
      'battlestar galactica',
      'syfy',
      'world music',
      'taiko',
      'sci-fi score',
      'percussion',
    ],
  },
  {
    id: 'evt-media-la-2013-houseofcards',
    year: 2013,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Jazz'],
    title:
      'Jeff Beal\'s "House of Cards" score helps legitimize streaming originals',
    description:
      "Jeff Beal composes the dark, trumpet-and-piano jazz score for Netflix's \"House of Cards\" — the streamer's first prestige original series. The score's smoky, Washingtonian atmosphere and Beal's improvisational approach bring cinematic sophistication to what many still dismissed as a tech company's vanity project. The show's success, aided by Beal's Emmy-nominated music, proves that streaming platforms can produce content rivaling HBO and the major networks.",
    tags: [
      'jeff beal',
      'house of cards',
      'netflix',
      'trumpet',
      'jazz score',
      'streaming original',
      'prestige tv',
    ],
  },
  {
    id: 'evt-media-nyc-2009-madmen',
    year: 2009,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Jazz'],
    title: '"Mad Men" revives curated soundtrack culture on television',
    description:
      'AMC\'s "Mad Men" uses carefully curated period music — from Don Draper\'s jazz LPs to the Beatles\' "Tomorrow Never Knows" — as a narrative device, making licensed music as important as original scoring in prestige television. The show\'s music supervisor creates emotional resonance through song placement rather than traditional underscore, influencing the soundtrack approach of "Breaking Bad," "Stranger Things," and every prestige drama that follows. This model transforms music supervision into a respected creative role.',
    tags: [
      'mad men',
      'amc',
      'music supervision',
      'curated soundtrack',
      'sixties',
      'prestige tv',
      'licensed music',
    ],
  },

  // =============================================
  // VIDEO GAME MUSIC
  // =============================================
  {
    id: 'evt-media-kyoto-1985-mario',
    year: 1985,
    location: {
      lat: 35.0116,
      lng: 135.7681,
      city: 'Kyoto',
      country: 'Japan',
    },
    genre: ['Electronic', 'Pop'],
    title:
      'Koji Kondo\'s "Super Mario Bros." theme becomes gaming\'s first anthem',
    description:
      'Working within the severe limitations of the Nintendo Entertainment System\'s sound chip — just three melodic channels and one noise channel — Koji Kondo composes the "Super Mario Bros." theme, which becomes the most recognized piece of video game music in history. The infectious, syncopated melody proves that memorable composition can overcome any technical constraint. The theme transcends gaming to become a universally known cultural artifact, recognizable across generations and continents.',
    tags: [
      'koji kondo',
      'super mario bros',
      'nintendo',
      'nes',
      'chiptune',
      '8-bit',
      'kyoto',
    ],
  },
  {
    id: 'evt-media-kyoto-1986-zelda',
    year: 1986,
    location: {
      lat: 35.0116,
      lng: 135.7681,
      city: 'Kyoto',
      country: 'Japan',
    },
    genre: ['Classical', 'Electronic'],
    title:
      'Koji Kondo\'s "Legend of Zelda" brings orchestral ambition to 8-bit',
    description:
      "Koji Kondo composes the overworld theme for \"The Legend of Zelda,\" creating a sweeping, adventurous melody that sounds orchestral despite the NES's primitive sound hardware. The dungeon theme's ominous tritones and the title screen's fanfare establish the idea that game music can create distinct emotional worlds for different gameplay contexts. Kondo's Zelda scores evolve across 35 years of sequels, eventually performed by full orchestras at concerts worldwide.",
    tags: [
      'koji kondo',
      'legend of zelda',
      'nintendo',
      'nes',
      'overworld theme',
      'adventure',
      '8-bit',
    ],
  },
  {
    id: 'evt-media-tokyo-1987-finalfantasy',
    year: 1987,
    location: {
      lat: 35.6762,
      lng: 139.6503,
      city: 'Tokyo',
      country: 'Japan',
    },
    genre: ['Classical', 'Electronic'],
    title: 'Nobuo Uematsu\'s "Final Fantasy" scores elevate game music to art',
    description:
      'Nobuo Uematsu begins composing for Square\'s "Final Fantasy" series, eventually creating some of the most emotionally ambitious music in any medium. His scores — from the operatic "Aria di Mezzo Carattere" in FFVI to "One-Winged Angel" in FFVII — draw on classical, progressive rock, and Celtic folk traditions to create music that rivals film scores in scope. Uematsu\'s work is performed by orchestras worldwide and is central to the argument that video game music is a legitimate art form.',
    tags: [
      'nobuo uematsu',
      'final fantasy',
      'square',
      'one winged angel',
      'jrpg',
      'orchestral',
      'tokyo',
    ],
  },
  {
    id: 'evt-media-tokyo-1991-streetsofrage',
    year: 1991,
    location: {
      lat: 35.6762,
      lng: 139.6503,
      city: 'Tokyo',
      country: 'Japan',
    },
    genre: ['Electronic'],
    title: 'Yuzo Koshiro\'s "Streets of Rage" brings club music to consoles',
    description:
      'Yuzo Koshiro composes the "Streets of Rage" soundtrack for Sega Genesis, programming house, techno, and early rave music directly into the console\'s Yamaha FM synthesis chip. His approach — treating the game console as a synthesizer rather than a limitation — produces genuinely club-worthy electronic music years before the mainstream discovers electronica. The "Streets of Rage 2" soundtrack is widely considered the greatest 16-bit game soundtrack ever made and directly influences future game composers.',
    tags: [
      'yuzo koshiro',
      'streets of rage',
      'sega genesis',
      'fm synthesis',
      'house music',
      'techno',
      '16-bit',
    ],
  },
  {
    id: 'evt-media-twycross-1998-banjokazooie',
    year: 1998,
    location: {
      lat: 52.6733,
      lng: -1.4561,
      city: 'Twycross',
      country: 'United Kingdom',
    },
    genre: ['Classical', 'Pop'],
    title: 'Grant Kirkhope\'s "Banjo-Kazooie" perfects adaptive game music',
    description:
      'Working at Rare\'s studio in rural Leicestershire, Grant Kirkhope composes the score for "Banjo-Kazooie," pioneering an adaptive music system where the soundtrack dynamically shifts instrumentation based on the player\'s location. Moving from a grassy field to an underwater cave seamlessly transforms the same melody from banjo-and-fiddle to muted, bubbling tones. This technical and compositional innovation becomes the gold standard for interactive music design in 3D platformers.',
    tags: [
      'grant kirkhope',
      'banjo-kazooie',
      'rare',
      'nintendo 64',
      'adaptive music',
      'interactive',
      'leicestershire',
    ],
  },
  {
    id: 'evt-media-seattle-2001-halo',
    year: 2001,
    location: {
      lat: 47.6062,
      lng: -122.3321,
      city: 'Seattle',
      country: 'United States',
    },
    genre: ['Classical', 'Electronic'],
    title:
      'Martin O\'Donnell\'s "Halo" theme merges Gregorian chant with electronica',
    description:
      'Martin O\'Donnell\'s score for Bungie\'s "Halo: Combat Evolved" opens with Gregorian-style chanting over driving electronic beats, creating an instantly iconic sound that elevates the Xbox launch title into a cultural event. The score proves that game music can be as cinematic as anything Hollywood produces and helps establish the first-person shooter as a vehicle for serious artistic expression. "Halo" essentially does for game music what "Star Wars" did for film scores — it makes people take the medium seriously.',
    tags: [
      'martin odonnell',
      'halo',
      'bungie',
      'xbox',
      'gregorian chant',
      'microsoft',
      'fps',
    ],
  },
  {
    id: 'evt-media-copenhagen-2007-assassinscreed',
    year: 2007,
    location: {
      lat: 55.6761,
      lng: 12.5683,
      city: 'Copenhagen',
      country: 'Denmark',
    },
    genre: ['Electronic', 'Classical'],
    title:
      'Jesper Kyd\'s "Assassin\'s Creed" blends electronic and period music',
    description:
      'Danish composer Jesper Kyd scores Ubisoft\'s "Assassin\'s Creed," fusing electronic ambient textures with Middle Eastern instruments and Renaissance-era musical idioms to create an immersive historical soundscape. His approach — using authentic period instruments processed through modern production — becomes a template for how open-world games handle historically diverse settings. Kyd\'s work across the "Hitman" and "Assassin\'s Creed" franchises establishes him as a pioneer of atmospheric game scoring.',
    tags: [
      'jesper kyd',
      'assassins creed',
      'ubisoft',
      'ambient',
      'middle eastern',
      'renaissance',
      'open world',
    ],
  },
  {
    id: 'evt-media-la-2012-journey',
    year: 2012,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Classical'],
    title:
      'Austin Wintory\'s "Journey" earns the first Grammy-nominated game score',
    description:
      "Austin Wintory's score for thatgamecompany's \"Journey\" becomes the first video game soundtrack nominated for a Grammy Award, featuring a solo cello that dynamically responds to the player's actions throughout the entire game. The score's integration with gameplay — building from sparse solo instrument to full orchestral catharsis as the player progresses — represents the medium's most sophisticated fusion of music and interactivity. \"Journey\" proves to the music establishment that game scores deserve the same recognition as film and concert music.",
    tags: [
      'austin wintory',
      'journey',
      'grammy nomination',
      'cello',
      'thatgamecompany',
      'interactive music',
      'indie game',
    ],
  },
  {
    id: 'evt-media-melbourne-2016-doom',
    year: 2016,
    location: {
      lat: -37.8136,
      lng: 144.9631,
      city: 'Melbourne',
      country: 'Australia',
    },
    genre: ['Electronic', 'Metal'],
    title: 'Mick Gordon\'s "DOOM" soundtrack weaponizes heavy metal for gaming',
    description:
      'Australian composer Mick Gordon creates the "DOOM (2016)" soundtrack by processing nine-string guitar riffs through chains of synthesizers, creating an unholy fusion of djent metal and industrial electronics that perfectly matches the game\'s hyper-violent demon-slaying. Gordon\'s innovative technique of feeding distorted guitar through modular synths produces a sound that is neither purely metal nor electronic but something entirely new. The soundtrack becomes a phenomenon on YouTube and streaming platforms, often listened to independently of the game.',
    tags: [
      'mick gordon',
      'doom',
      'id software',
      'djent',
      'industrial',
      'metal',
      'modular synth',
    ],
  },
  {
    id: 'evt-media-la-2013-lastofus',
    year: 2013,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Folk'],
    title:
      'Gustavo Santaolalla scores "The Last of Us," bridging film and games',
    description:
      "Gustavo Santaolalla's spare acoustic guitar score for Naughty Dog's \"The Last of Us\" brings his Oscar-winning film sensibility to gaming, creating one of the most emotionally devastating soundtracks in any medium. The score's heartbreaking simplicity — often just a single guitar against silence — matches the game's post-apocalyptic intimacy. When the game is adapted into an HBO series, Santaolalla's music carries over directly, symbolizing the convergence of film and game scoring into a single art form.",
    tags: [
      'gustavo santaolalla',
      'last of us',
      'naughty dog',
      'playstation',
      'acoustic guitar',
      'post-apocalyptic',
      'hbo adaptation',
    ],
  },
  {
    id: 'evt-media-la-2005-vglive',
    year: 2005,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Classical'],
    title: 'Video Games Live launches the game music concert movement',
    description:
      "Composer Tommy Tallarico and conductor Jack Wall launch Video Games Live, a touring concert series performing orchestral arrangements of video game music with synchronized visuals and audience interaction. The concerts sell out symphony halls worldwide, proving that game music has a passionate audience that rivals classical music's traditional base. VGL and similar events like the Zelda Symphony and Distant Worlds (Final Fantasy) establish game music as a legitimate concert genre that helps introduce younger audiences to orchestral performance.",
    tags: [
      'video games live',
      'tommy tallarico',
      'jack wall',
      'orchestral',
      'concert tour',
      'game music',
      'symphony',
    ],
  },
  {
    id: 'evt-media-seattle-2018-celeste',
    year: 2018,
    location: {
      lat: 47.6062,
      lng: -122.3321,
      city: 'Seattle',
      country: 'United States',
    },
    genre: ['Electronic'],
    title: 'Lena Raine\'s "Celeste" score redefines indie game music',
    description:
      'Lena Raine\'s score for the indie platformer "Celeste" — a game about climbing a mountain while battling anxiety and depression — uses layered synths, piano, and dynamic music systems to mirror the protagonist\'s emotional journey. The soundtrack becomes a breakout hit on streaming platforms, demonstrating that indie game music can achieve cultural impact without orchestral budgets. Raine\'s subsequent work on "Minecraft" and other titles establishes her as one of the most important voices in modern game composition.',
    tags: [
      'lena raine',
      'celeste',
      'indie game',
      'mental health',
      'synth',
      'dynamic music',
      'minecraft',
    ],
  },

  // =============================================
  // ADDITIONAL VIDEO GAME MUSIC
  // =============================================
  {
    id: 'evt-media-tokyo-1996-pokemon',
    year: 1996,
    location: {
      lat: 35.6762,
      lng: 139.6503,
      city: 'Tokyo',
      country: 'Japan',
    },
    genre: ['Electronic', 'Pop'],
    title:
      'Junichi Masuda\'s "Pokemon" music becomes a global childhood anthem',
    description:
      'Junichi Masuda composes the music for "Pokemon Red and Green" on Game Boy, creating chiptune melodies — especially the battle theme and Pallet Town — that become embedded in the childhood memories of an entire generation worldwide. The Pokemon franchise grows into the highest-grossing media property in history, and Masuda\'s compositions are recognizable across cultures. The music\'s evolution from 8-bit to orchestral across 25 years of sequels mirrors the maturation of game music as a whole.',
    tags: [
      'junichi masuda',
      'pokemon',
      'game boy',
      'nintendo',
      'chiptune',
      'battle theme',
      'franchise',
    ],
  },
  {
    id: 'evt-media-la-2018-godsofwar',
    year: 2018,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Classical'],
    title:
      'Bear McCreary\'s "God of War" score proves games rival film in orchestral ambition',
    description:
      'Bear McCreary composes a massive orchestral and choral score for Santa Monica Studio\'s "God of War" reboot, featuring Icelandic and Old Norse vocal performances recorded with a full orchestra. The score wins the BAFTA for Best Music and is widely considered one of the greatest game scores ever written. Its cinematic quality and emotional depth demonstrate that AAA game music has reached full artistic parity with Hollywood film scoring.',
    tags: [
      'bear mccreary',
      'god of war',
      'playstation',
      'norse mythology',
      'orchestral',
      'bafta',
      'choral',
    ],
  },
  {
    id: 'evt-media-la-2020-ffviiremake',
    year: 2020,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Classical', 'Electronic'],
    title:
      '"Final Fantasy VII Remake" reinvents Uematsu\'s classic score for a new generation',
    description:
      "Square Enix's \"Final Fantasy VII Remake\" reimagines Nobuo Uematsu's iconic 1997 score with fully orchestrated and dynamically adaptive arrangements that shift seamlessly between exploration, battle, and cinematic modes. The soundtrack becomes the best-selling game soundtrack album in years and introduces Uematsu's melodies to an audience born after the original release. The project demonstrates how beloved game music can be preserved, expanded, and made newly relevant through modern production techniques.",
    tags: [
      'nobuo uematsu',
      'final fantasy vii',
      'square enix',
      'remake',
      'orchestral',
      'adaptive music',
      'nostalgia',
    ],
  },

  // =============================================
  // ADDITIONAL OPERA & MUSICAL THEATER
  // =============================================
  {
    id: 'evt-media-berlin-1928-threepenny',
    year: 1928,
    location: {
      lat: 52.52,
      lng: 13.405,
      city: 'Berlin',
      country: 'Germany',
    },
    genre: ['Musical Theatre', 'Jazz'],
    title:
      'Kurt Weill\'s "The Threepenny Opera" merges cabaret with social critique',
    description:
      'Kurt Weill and Bertolt Brecht\'s "Die Dreigroschenoper" premieres in Berlin, using jazz, cabaret, and popular song forms to deliver biting Marxist social commentary. "Mack the Knife" becomes one of the 20th century\'s most recorded songs, covered by Louis Armstrong, Bobby Darin, and Ella Fitzgerald. Weill\'s deliberate use of "low" popular music in a theatrical context — designed to alienate audiences from comfortable emotion — profoundly influences Sondheim, Kander and Ebb, and the entire tradition of the dark, politically engaged musical.',
    tags: [
      'kurt weill',
      'bertolt brecht',
      'threepenny opera',
      'mack the knife',
      'weimar republic',
      'cabaret',
      'berlin',
    ],
  },
  {
    id: 'evt-media-la-2016-lalaland',
    year: 2016,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Jazz'],
    title:
      '"La La Land" revives the Hollywood musical and jazz on the big screen',
    description:
      'Damien Chazelle\'s "La La Land," with a jazz-infused score by Justin Hurwitz, wins six Academy Awards and grosses over $440 million worldwide, proving that the original movie musical is commercially viable in the 21st century. The score\'s nostalgic blend of classic Hollywood musical language with modern jazz sensibility introduces jazz to millions of younger viewers. Its success triggers a wave of new musical films and demonstrates that jazz can still be a mainstream cinematic language.',
    tags: [
      'la la land',
      'justin hurwitz',
      'damien chazelle',
      'jazz',
      'hollywood musical',
      'oscar',
      'ryan gosling',
    ],
  },
  {
    id: 'evt-media-la-2018-blackpanther',
    year: 2018,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring', 'Hip Hop'],
    title:
      '"Black Panther" fuses orchestral scoring with African music and hip hop',
    description:
      'Ludwig Goransson\'s Oscar-winning score for "Black Panther" incorporates talking drums, fula flute, and senegalese sabar alongside a full orchestra, while Kendrick Lamar curates a companion hip hop album that charts at #1. The dual approach — authentic African instrumentation in the score, contemporary Black American music in the album — represents a new model for blockbuster music that honors cultural specificity. Goransson\'s meticulous research trip to Senegal and South Africa sets a new standard for cultural authenticity in film scoring.',
    tags: [
      'ludwig goransson',
      'black panther',
      'kendrick lamar',
      'oscar',
      'african instruments',
      'marvel',
      'wakanda',
      'senegalese music',
    ],
  },
  {
    id: 'evt-media-la-2017-getout',
    year: 2017,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Film Scoring'],
    title:
      'Michael Abels\' "Get Out" score channels the Black experience into horror',
    description:
      'Composer Michael Abels creates the score for Jordan Peele\'s "Get Out," using Swahili vocals singing warnings like "Run! Listen to your ancestors!" to create a horror score rooted specifically in the Black American experience. Abels\' approach — where the music literally tells the protagonist what the genre conventions prevent him from seeing — invents a new form of culturally specific horror scoring. The film\'s massive commercial and critical success launches a wave of socially conscious horror with equally inventive scores.',
    tags: [
      'michael abels',
      'get out',
      'jordan peele',
      'horror score',
      'swahili',
      'social horror',
      'blumhouse',
    ],
  },
  {
    id: 'evt-media-nyc-2021-tick',
    year: 2021,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Musical Theatre', 'Pop'],
    title:
      '"Tick, Tick... Boom!" film brings awareness to musical theater\'s creative process',
    description:
      "Netflix's film adaptation of Jonathan Larson's autobiographical musical \"Tick, Tick... Boom!\" — directed by Lin-Manuel Miranda and starring Andrew Garfield — introduces a new generation to the anguished creative process behind musical theater. The film's streaming success demonstrates that Broadway stories can thrive on digital platforms and honors Larson's legacy as the bridge between Sondheim's art musical tradition and the pop-influenced musicals of the 21st century.",
    tags: [
      'jonathan larson',
      'tick tick boom',
      'lin-manuel miranda',
      'netflix',
      'andrew garfield',
      'broadway',
      'musical film',
    ],
  },

  // =============================================
  // JINGLES, COMMERCIALS & SONIC BRANDING
  // =============================================
  {
    id: 'evt-media-minneapolis-1926-wheaties',
    year: 1926,
    location: {
      lat: 44.9778,
      lng: -93.265,
      city: 'Minneapolis',
      country: 'United States',
    },
    genre: ['Jingles'],
    title: "Wheaties airs the world's first radio jingle",
    description:
      'A barbershop quartet sings "Have You Tried Wheaties?" on WCCO radio in Minneapolis, creating the world\'s first singing commercial jingle. General Mills notices that Wheaties sales spike dramatically in the Minneapolis broadcast area compared to the rest of the country, proving that catchy music can sell products. This discovery launches the jingle industry and fundamentally changes the relationship between music and commerce for the next century.',
    tags: [
      'wheaties',
      'radio jingle',
      'wcco',
      'general mills',
      'advertising',
      'barbershop quartet',
    ],
  },
  {
    id: 'evt-media-nyc-1970-manilow',
    year: 1970,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Jingles', 'Pop'],
    title:
      "Barry Manilow's jingle work creates America's commercial soundtrack",
    description:
      'Before becoming a pop superstar, Barry Manilow works as a jingle writer in New York, composing some of the most memorable advertising music in history — including "I Am Stuck on Band-Aid" and the State Farm "Like a Good Neighbor" theme. His melodic gift, honed in the jingle trenches, translates directly to his pop career. Manilow represents the golden age of jingle writing when Madison Avenue\'s best musical minds created 30-second songs that embedded themselves permanently in the American subconscious.',
    tags: [
      'barry manilow',
      'jingle',
      'band-aid',
      'state farm',
      'madison avenue',
      'advertising',
      'commercial',
    ],
  },
  {
    id: 'evt-media-london-1971-coke',
    year: 1971,
    location: {
      lat: 51.5074,
      lng: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    },
    genre: ['Jingles', 'Pop'],
    title: '"I\'d Like to Buy the World a Coke" becomes the ultimate jingle',
    description:
      'Songwriter Billy Davis and the New Seekers record "I\'d Like to Buy the World a Coke" (later reworked as "I\'d Like to Teach the World to Sing") for Coca-Cola, creating arguably the most famous advertising jingle ever made. The song crosses over to become a legitimate pop hit, reaching #7 on the Billboard Hot 100 in its non-commercial version. It establishes the template for brands using aspirational, anthem-like music to associate products with universal human emotions.',
    tags: [
      'coca-cola',
      'hilltop ad',
      'new seekers',
      'billy davis',
      'advertising',
      'crossover hit',
      'anthem',
    ],
  },
  {
    id: 'evt-media-vienna-1994-intel',
    year: 1994,
    location: {
      lat: 48.2082,
      lng: 16.3738,
      city: 'Vienna',
      country: 'Austria',
    },
    genre: ['Jingles', 'Electronic'],
    title: "Walter Werzowa's Intel bong pioneers sonic branding",
    description:
      'Austrian composer Walter Werzowa (of the band Edelweiss) creates the five-note "Intel Inside" sonic logo — a 3-second mnemonic that plays billions of times through TV ads and computer startups. This tiny composition pioneers the modern field of sonic branding, where companies invest in audio identities as carefully as visual logos. The Intel bong\'s ubiquity inspires Netflix\'s "ta-dum," HBO\'s static buzz, and every other corporate sound mark that follows.',
    tags: [
      'walter werzowa',
      'intel',
      'sonic branding',
      'audio logo',
      'mnemonic',
      'edelweiss',
      'corporate sound',
    ],
  },
  {
    id: 'evt-media-nyc-1999-moby',
    year: 1999,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'United States',
    },
    genre: ['Electronic'],
    title: 'Moby\'s "Play" revolutionizes music licensing for advertising',
    description:
      'Moby licenses every track from his album "Play" to films, TV shows, and commercials — an unprecedented move that transforms the economics of independent music. The album goes on to sell over 12 million copies worldwide, largely driven by its ubiquitous presence in advertising from Volkswagen to American Express. While criticized for "selling out," Moby\'s strategy becomes the standard model for independent artists seeking income beyond record sales, permanently blurring the line between art and commerce.',
    tags: [
      'moby',
      'play',
      'music licensing',
      'sync deals',
      'advertising',
      'electronic',
      'independent music',
    ],
  },
  {
    id: 'evt-media-cupertino-2003-ipod',
    year: 2003,
    location: {
      lat: 37.323,
      lng: -122.0322,
      city: 'Cupertino',
      country: 'United States',
    },
    genre: ['Pop'],
    title:
      "Apple's iPod silhouette ads merge music marketing with product design",
    description:
      'Apple\'s iconic iPod silhouette campaign — featuring black silhouettes dancing against neon backgrounds with white earbuds — transforms how music is marketed and consumed. The ads launch the careers of artists like Feist ("1234") and Jet ("Are You Gonna Be My Girl") while establishing Apple as a cultural tastemaker. The campaign proves that a tech company can shape musical taste as powerfully as any record label, foreshadowing Apple Music\'s later influence on the industry.',
    tags: [
      'apple',
      'ipod',
      'silhouette ads',
      'feist',
      'music marketing',
      'white earbuds',
      'tech culture',
    ],
  },
  {
    id: 'evt-media-pasadena-1993-superbowl',
    year: 1993,
    location: {
      lat: 34.1478,
      lng: -118.1445,
      city: 'Pasadena',
      country: 'United States',
    },
    genre: ['Pop'],
    title:
      "Michael Jackson's Super Bowl halftime transforms the event into a music spectacle",
    description:
      "Michael Jackson's 1993 Super Bowl XXVII halftime performance at the Rose Bowl in Pasadena — featuring his trademark entrance of standing motionless for 90 seconds as 100,000 fans scream — transforms the halftime show from a marching band intermission into the most-watched annual music event on Earth. From this point forward, the Super Bowl halftime becomes a career-defining platform for the world's biggest artists, from Prince's legendary rain-soaked performance to Shakira and J.Lo's cultural statements.",
    tags: [
      'michael jackson',
      'super bowl',
      'halftime show',
      'rose bowl',
      'nfl',
      'spectacle',
      'cultural event',
    ],
  },
  {
    id: 'evt-media-la-2017-tiktok',
    year: 2017,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Pop', 'Hip Hop', 'Electronic'],
    title: 'TikTok fundamentally reshapes how music is discovered and consumed',
    description:
      'ByteDance\'s TikTok (originally Musical.ly) transforms music discovery by making 15-60 second clips the primary way young audiences encounter new songs. The platform\'s algorithm can turn decades-old tracks into viral hits overnight — Fleetwood Mac\'s "Dreams" re-charts 43 years after release — while unknown artists like Lil Nas X ("Old Town Road") and Olivia Rodrigo launch careers from TikTok virality. The platform fundamentally changes how songs are written, with artists now optimizing for the "TikTok moment" in every track.',
    tags: [
      'tiktok',
      'bytedance',
      'viral music',
      'algorithm',
      'lil nas x',
      'music discovery',
      'short form video',
    ],
  },

  // =============================================
  // STREAMING ERA
  // =============================================
  {
    id: 'evt-media-sanmateo-1999-napster',
    year: 1999,
    location: {
      lat: 37.563,
      lng: -122.3255,
      city: 'San Mateo',
      country: 'United States',
    },
    genre: ['Electronic'],
    title: 'Napster shatters the music industry business model',
    description:
      'Shawn Fanning and Sean Parker launch Napster from San Mateo, California, enabling free peer-to-peer music file sharing that reaches 80 million users in two years. The service is eventually shut down after lawsuits from Metallica and the RIAA, but the damage is done — global music revenue drops from $23.8 billion in 1999 to $15 billion by 2004. Napster proves that digital distribution is inevitable and forces the industry into a decade-long crisis that ultimately produces the streaming economy.',
    tags: [
      'napster',
      'shawn fanning',
      'sean parker',
      'file sharing',
      'piracy',
      'metallica',
      'riaa',
      'p2p',
    ],
  },
  {
    id: 'evt-media-cupertino-2003-itunes',
    year: 2003,
    location: {
      lat: 37.323,
      lng: -122.0322,
      city: 'Cupertino',
      country: 'United States',
    },
    genre: ['Pop'],
    title: 'iTunes Store launches the legal digital music economy',
    description:
      'Steve Jobs launches the iTunes Music Store with 200,000 songs at 99 cents each, selling one million tracks in the first week and proving that consumers will pay for digital music if the experience is convenient. iTunes rescues the music industry from the Napster-era freefall by creating a legal digital marketplace, but its a la carte model — buying individual songs rather than full albums — fundamentally disrupts the album format that artists had relied on since the 1960s.',
    tags: [
      'itunes',
      'apple',
      'steve jobs',
      'digital download',
      '99 cents',
      'legal music',
      'single track',
    ],
  },
  {
    id: 'evt-media-sanbruno-2005-youtube',
    year: 2005,
    location: {
      lat: 37.6305,
      lng: -122.4111,
      city: 'San Bruno',
      country: 'United States',
    },
    genre: ['Pop'],
    title: 'YouTube democratizes music video distribution',
    description:
      "YouTube launches from San Bruno, California, and quickly becomes the world's de facto music discovery platform. By allowing anyone to upload video, it demolishes MTV's monopoly on music video distribution and creates a meritocratic system where a teenager's bedroom cover can compete with major label productions. Justin Bieber, discovered through YouTube in 2007, becomes the platform's first homegrown superstar, proving that the traditional A&R talent pipeline has been permanently disrupted.",
    tags: [
      'youtube',
      'music video',
      'user generated',
      'justin bieber',
      'google',
      'democratization',
      'viral',
    ],
  },
  {
    id: 'evt-media-berlin-2008-soundcloud',
    year: 2008,
    location: {
      lat: 52.52,
      lng: 13.405,
      city: 'Berlin',
      country: 'Germany',
    },
    genre: ['Electronic', 'Hip Hop'],
    title: 'SoundCloud democratizes music distribution from Berlin',
    description:
      "Swedish founders Alexander Ljung and Eric Wahlforss launch SoundCloud in Berlin, creating a platform where anyone can upload and share music without a label, distributor, or gatekeeper. SoundCloud becomes the incubator for entire genres — SoundCloud rap (XXXTentacion, Juice WRLD, Lil Uzi Vert), future bass, and lo-fi hip hop all emerge from the platform's creative ecosystem. Though financially troubled, SoundCloud's impact on democratizing music creation and distribution is second only to YouTube.",
    tags: [
      'soundcloud',
      'berlin',
      'independent music',
      'soundcloud rap',
      'upload culture',
      'democratization',
      'xxxtentacion',
    ],
  },
  {
    id: 'evt-media-oakland-2008-bandcamp',
    year: 2008,
    location: {
      lat: 37.8044,
      lng: -122.2712,
      city: 'Oakland',
      country: 'United States',
    },
    genre: ['Indie Rock'],
    title: 'Bandcamp launches the artist-direct digital model',
    description:
      'Ethan Diamond launches Bandcamp from Oakland, California, creating a platform that lets artists sell music directly to fans with an artist-favorable revenue split (artists keep 82-90%). In contrast to streaming platforms that pay fractions of a penny per play, Bandcamp\'s model — particularly its "Bandcamp Fridays" where the platform waives its cut — becomes a lifeline for independent and experimental musicians. The platform proves that a viable alternative to the streaming economy exists for artists willing to cultivate direct fan relationships.',
    tags: [
      'bandcamp',
      'independent music',
      'artist direct',
      'revenue share',
      'oakland',
      'bandcamp friday',
      'ethan diamond',
    ],
  },
  {
    id: 'evt-media-stockholm-2008-spotify',
    year: 2008,
    location: {
      lat: 59.3293,
      lng: 18.0686,
      city: 'Stockholm',
      country: 'Sweden',
    },
    genre: ['Pop'],
    title: 'Spotify launches and invents the modern streaming model',
    description:
      "Daniel Ek and Martin Lorentzon launch Spotify in Stockholm, offering legal, on-demand music streaming through both a free ad-supported tier and a paid subscription. By providing instant access to millions of songs, Spotify finally offers a legal alternative that matches piracy's convenience. The platform's algorithmic playlists — Discover Weekly, Release Radar — fundamentally reshape how listeners find new music, shifting power from radio programmers and critics to data scientists and algorithms.",
    tags: [
      'spotify',
      'daniel ek',
      'streaming',
      'algorithm',
      'playlists',
      'freemium',
      'swedish tech',
    ],
  },
  {
    id: 'evt-media-la-2022-renaissance',
    year: 2022,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States',
    },
    genre: ['Pop', 'Electronic', 'R&B'],
    title:
      'Beyonce\'s "Renaissance" resurrects dance music through streaming culture',
    description:
      'Beyonce\'s "Renaissance" arrives as a streaming-era album that pays tribute to Black and queer dance music history — from disco and house to ballroom and Afrobeats — while dominating every digital platform simultaneously. The album\'s first-day Spotify record and subsequent Grammy wins demonstrate that streaming-era release strategy and artistic ambition are not mutually exclusive. "Renaissance" proves that albums can still be cultural events in the playlist era if the artist commands sufficient cultural authority.',
    tags: [
      'beyonce',
      'renaissance',
      'house music',
      'disco',
      'ballroom',
      'streaming era',
      'grammy',
      'dance music',
    ],
  },
  {
    id: 'evt-media-toronto-2024-drakevsken',
    year: 2024,
    location: {
      lat: 43.6532,
      lng: -79.3832,
      city: 'Toronto',
      country: 'Canada',
    },
    genre: ['Hip Hop'],
    title: 'Drake vs. Kendrick Lamar becomes the first streaming-era rap beef',
    description:
      "The longstanding tension between Drake and Kendrick Lamar erupts into the most consequential rap beef in decades, played out entirely through streaming platforms and social media rather than radio or physical media. Kendrick's diss track \"Not Like Us\" becomes one of the most-streamed songs of 2024, while Drake's responses arrive as surprise drops on Instagram and streaming services. The battle demonstrates that the streaming era has transformed hip hop's competitive tradition — diss tracks now compete for streams rather than airplay, and social media reaction is as important as the music itself.",
    tags: [
      'drake',
      'kendrick lamar',
      'rap beef',
      'not like us',
      'streaming battle',
      'diss track',
      'social media',
      'toronto',
    ],
  },
];
