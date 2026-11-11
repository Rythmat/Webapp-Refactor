// ── Guided Tours — place-based, hand-authored globe tours ──────────────────
// A region or city opens one of these tours (`?tour=`, from the Globe's Tours
// tab, a slide, a prompt or the palette). A tour is an ordered list of stops;
// the Tours card (Panels/ToursPanel) flies the camera to each and shows its blurb.
//
// Region tours open on a wide "region overview" stop and then step through the
// region's notable music cities. City tours stay anchored on the city and step
// through its musical eras. Stops reference a real `cityId` so coordinates come
// from CITIES (single source of truth) — authoring here is prose only.

import type { RegionId, TourSong } from '@/components/atlas/types';
import { CITIES } from './cities';
import { REGIONS } from './regions';
import { cityTourId, regionTourId } from './tourIds';

export { cityTourId, regionTourId };

export interface TourStop {
  /** Stop heading (a city, scene, or era). */
  title: string;
  /** Authored insight — 1–2 sentences. */
  blurb: string;
  /** Resolve lat/lng from CITIES. */
  cityId?: string;
  /** Explicit camera target (overrides cityId), e.g. a region-overview stop. */
  lat?: number;
  lng?: number;
  /** Camera zoom (1–12). Falls back per stop kind in resolveTourStops. */
  zoom?: number;
  /**
   * Optional: pin this exact event when the stop is shown (overrides the
   * per-city event heuristic in resolveStopEvent). Use for a hand-picked stop.
   */
  eventId?: string;
  /** Learn's songs that belong to the stop (their lead sheets). */
  songs?: TourSong[];
}

export interface GuidedTour {
  /** `region-<regionId>` or `city-<cityId>`. */
  id: string;
  kind: 'region' | 'city';
  /** RegionId or city id this tour is about. */
  placeId: string;
  /** Shown in the Tours card's header. */
  title: string;
  subtitle: string;
  stops: TourStop[];
  /** The Learn genre courses it leads to (genreCourses.ts slugs). */
  learnGenres?: string[];
}

export interface ResolvedTourStop {
  title: string;
  blurb: string;
  lat: number;
  lng: number;
  zoom: number;
  cityId?: string;
  eventId?: string;
  songs?: TourSong[];
}

const REGION_STOP_ZOOM = 7; // frames a city with some regional context
const CITY_STOP_BASE_ZOOM = 7.5; // city tours gently push in per stop

/** A city stop as authored: its scene, words, own event and songs. */
interface AuthoredStop {
  cityId: string;
  title: string;
  blurb: string;
  /** The event the stop is about, in that city. */
  eventId?: string;
  songs?: TourSong[];
  zoom?: number;
}

/** Build a region tour: a wide overview stop + one stop per city. */
function regionTour(
  regionId: RegionId,
  subtitle: string,
  overview: string,
  stops: AuthoredStop[],
  learnGenres: string[] = [],
): GuidedTour {
  const region = REGIONS.find((r) => r.id === regionId);
  const label = region?.label ?? regionId;
  const [lat, lng] = region?.center ?? [0, 0];
  return {
    id: regionTourId(regionId),
    kind: 'region',
    placeId: regionId,
    title: label,
    subtitle,
    stops: [
      { title: label, blurb: overview, lat, lng, zoom: region?.zoom ?? 4 },
      ...stops.map((s) => ({
        title: s.title,
        blurb: s.blurb,
        cityId: s.cityId,
        eventId: s.eventId,
        songs: s.songs,
        zoom: s.zoom ?? REGION_STOP_ZOOM,
      })),
    ],
    learnGenres,
  };
}

/** Build a city tour: successive era stops, all anchored on the city. */
function cityTour(
  cityId: string,
  subtitle: string,
  stops: Omit<AuthoredStop, 'cityId' | 'zoom'>[],
  learnGenres: string[] = [],
): GuidedTour {
  const city = CITIES.find((c) => c.id === cityId);
  return {
    id: cityTourId(cityId),
    kind: 'city',
    placeId: cityId,
    title: city?.name ?? cityId,
    subtitle,
    stops: stops.map((s, i) => ({
      title: s.title,
      blurb: s.blurb,
      cityId,
      eventId: s.eventId,
      songs: s.songs,
      // Push in a little each stop so the camera isn't perfectly static.
      zoom: CITY_STOP_BASE_ZOOM + i * 0.6,
    })),
    learnGenres,
  };
}

// ── Region tours (all 18) ─────────────────────────────────────────────────
const REGION_TOURS: GuidedTour[] = [
  regionTour(
    'north-america',
    'From New Orleans brass to a Bronx block party: how Black American music remade pop',
    'The American South gave the 20th century its biggest new sounds. This route follows them from the brass bands of New Orleans and the Mississippi Delta to the studios of Memphis, Chicago and Detroit, and ends at the Bronx block party where hip hop began.',
    [
      {
        cityId: 'new-orleans',
        title: 'Jazz takes shape',
        blurb:
          'Around 1890, brass bands, Creole string orchestras, blues singers and ragtime pianists collide in the streets of New Orleans. Congo Square drums, Caribbean habanera rhythms and West African call-and-response all feed in, laying the fuse for jazz. Upriver, the blues is taking its own shape.',
        eventId: 'evt-jazz-origins-nola-1890',
      },
      {
        cityId: 'clarksdale-ms',
        title: 'Delta blues',
        blurb:
          "In 1929 Charley Patton records the rough style he built on a Mississippi Delta plantation: percussive guitar, a gravelly voice, big showmanship. He mentors Son House and Howlin' Wolf, and his tradition leads to Robert Johnson, Muddy Waters and rock and roll, which breaks out in Memphis.",
        eventId: 'evt-blues-clarksdale-1929-patton',
      },
      {
        cityId: 'memphis',
        title: 'Rock and roll at Sun',
        blurb:
          "In 1954 Elvis Presley records “That's All Right” at Sam Phillips' Sun Studio, blending blues, country and gospel into a new sound, and rock and roll explodes. Up in Chicago, the Delta blues is plugging in too.",
        eventId: 'evt-elvis-memphis-1954',
        songs: [
          {
            id: 'cant_help_falling_in_love',
            title: 'Can’t Help Falling In Love',
            artist: 'Elvis Presley',
          },
        ],
      },
      {
        cityId: 'chicago',
        title: 'Electric Chicago blues',
        blurb:
          "At Chess Records on South Michigan Avenue, Muddy Waters, Howlin' Wolf and Little Walter amplify the Delta blues with electric guitars and harmonicas. The Chicago sound crosses the Atlantic and inspires the Rolling Stones and the British Invasion. In Detroit, gospel voices are about to go pop.",
        eventId: 'evt-rnb-chicago-1955',
      },
      {
        cityId: 'detroit',
        title: 'Motown',
        blurb:
          "Berry Gordy's Hitsville U.S.A. joins gospel voices, doo-wop harmony and jazz-trained session players into polished pop-soul that crosses racial lines on AM radio. Its blueprint shapes nearly every pop-R&B act that follows. Ten years later, the next big idea comes from a Bronx party.",
        eventId: 'evt-motown-detroit-1963',
        songs: [
          { id: 'my_girl', title: 'My Girl', artist: 'The Temptations' },
          {
            id: 'i_cant_help_myself_sugar_pie_honey_bunch',
            title: 'I Can’t Help Myself (Sugar Pie, Honey Bunch)',
            artist: 'Four Tops',
          },
        ],
      },
      {
        cityId: 'new-york',
        title: 'Hip hop is born',
        blurb:
          'At a Bronx block party in 1973, DJ Kool Herc isolates and loops the drum breaks of funk records, drawing on Jamaican sound-system culture. From that idea grow MCing, turntablism, breakdancing and graffiti, a culture that becomes the dominant popular music of the 21st century.',
        eventId: 'evt-hiphop-nyc-1973',
      },
    ],
    ['jazz', 'blues', 'rock', 'rnb', 'hip-hop'],
  ),
  regionTour(
    'central-america',
    "Calypso, son, bachata, reggae and reggaeton: the Caribbean's dance-floor rhythms",
    "The Caribbean turned African and Spanish roots into some of the world's most danced-to music. This route hops from Trinidad's calypso and Havana's son to Santo Domingo, Kingston and Panama City, and ends in San Juan, where reggaeton went global.",
    [
      {
        cityId: 'port-of-spain',
        title: 'Calypso',
        blurb:
          'Calypso takes shape in Port of Spain from kaiso, a storytelling song brought by enslaved West Africans. Carnival chantwells use wit, metaphor and call-and-response to comment on politics and daily life. In Havana, son cubano is heading for its golden age.',
        eventId: 'evt-diaspora-portofspain-calypso-1914',
      },
      {
        cityId: 'havana',
        title: 'Son cubano',
        blurb:
          "Around 1930 the Sexteto Habanero, Septeto Nacional and Trío Matamoros bring son cubano from rural Oriente to Havana's cabarets and radio. Built on the Spanish tres guitar and African-derived clave, it becomes the ancestor of mambo, cha-cha-chá and salsa. Next door, the Dominican Republic finds its own guitar song.",
        eventId: 'evt-son-havana-1930',
      },
      {
        cityId: 'santo-domingo',
        title: 'The first bachata',
        blurb:
          "In 1962 José Manuel Calderón records “Borracho de Amor,” widely called the first bachata. Born in Santo Domingo's working-class barrios, it joins bolero's romance to guitar-driven Dominican rhythm, and later reaches the world through Juan Luis Guerra and Romeo Santos. In Kingston, reggae is rising.",
        eventId: 'evt-bachata-santodomingo-1962',
      },
      {
        cityId: 'kingston',
        title: 'Reggae goes global',
        blurb:
          "Growing out of rocksteady's relaxed pulse and Rastafarian faith, Bob Marley and the Wailers carry reggae from Kingston's streets to the world. Its offbeat skank and heavy bass shape punk, dub poetry and dancehall. Jamaican dancehall soon finds Spanish words in Panama.",
        eventId: 'evt-reggae-kingston-1971',
        songs: [
          {
            id: 'three_little_birds',
            title: 'Three Little Birds',
            artist: 'Bob Marley',
          },
          {
            id: 'i_shot_the_sheriff',
            title: 'I Shot The Sheriff',
            artist: 'Bob Marley',
          },
        ],
      },
      {
        cityId: 'panama-city',
        title: 'Reggae en español',
        blurb:
          "In Panama City's West Indian neighbourhoods, El General and other artists start singing Jamaican dancehall in Spanish over sound systems, and “Tu Pum Pum” becomes an international hit. This reggae en español is the direct ancestor of reggaeton, which takes its final shape in Puerto Rico.",
        eventId: 'evt-reggae-espanol-panamacity-1985',
      },
      {
        cityId: 'san-juan',
        title: 'Reggaeton explodes',
        blurb:
          "In 2004 Daddy Yankee's “Gasolina” carries reggaeton from Puerto Rico's underground to global radio. Its dembow beat, rooted in Jamaican dancehall that passed through Panama and was refined in San Juan, becomes the main pulse of Latin music for the next two decades.",
        eventId: 'evt-reggaeton-san-juan-2004',
        songs: [{ id: 'despacito', title: 'Despacito', artist: 'Luis Fonsi' }],
      },
    ],
    ['latin', 'reggae'],
  ),
  regionTour(
    'south-america',
    'Candomblé drums, tango, bossa nova, cumbia, nueva canción and reggaeton',
    "South America's music grows from African drums, European instruments and Andean folk meeting in its cities. This route runs from Salvador's sacred rhythms through Buenos Aires, Rio and Barranquilla to Santiago's protest songs, and ends in Medellín's reggaeton boom.",
    [
      {
        cityId: 'salvador',
        title: 'Candomblé drums',
        blurb:
          'In Salvador da Bahia, Yoruba, Fon and Bantu traditions survive in Candomblé temples: atabaque drums, agogô bells and praise songs to the orixás. These rhythms flow into samba de roda, capoeira songs and, in time, all of Brazilian popular music. Far to the south, a port city is building its own dance.',
        eventId: 'evt-diaspora-salvador-candomble-1830',
      },
      {
        cityId: 'buenos-aires',
        title: 'Tango',
        blurb:
          'Born in the working-class barrios and port districts of Buenos Aires, tango conquers the dance halls of Paris and becomes a global craze. The bandoneon, brought by German immigrants, gives it its melancholy, and Carlos Gardel becomes its greatest voice. Back in Brazil, samba is about to cool down.',
        eventId: 'evt-tango-buenosaires-1913',
      },
      {
        cityId: 'rio',
        title: 'Bossa nova',
        blurb:
          "In 1958 João Gilberto records “Chega de Saudade,” by Antonio Carlos Jobim and Vinícius de Moraes. His syncopated, intimate guitar mixes samba rhythm with cool jazz harmony, and bossa nova is born, starting a global movement. On Colombia's Caribbean coast, cumbia is reaching its peak.",
        eventId: 'evt-joao-gilberto-bossanova-1958',
      },
      {
        cityId: 'barranquilla',
        title: "Cumbia's golden age",
        blurb:
          "Drawing on Afro-Colombian gaita flutes and Caribbean brass bands, orchestras like Los Corraleros de Majagual and Lucho Bermúdez bring cumbia to its peak at Barranquilla's Carnival. From here it spreads across Latin America, spawning chicha in Peru and cumbia villera in Argentina. In Chile, song turns political.",
        eventId: 'evt-cumbia-barranquilla-1962',
      },
      {
        cityId: 'santiago',
        title: 'Nueva canción',
        blurb:
          "Víctor Jara, Violeta Parra, Inti-Illimani and Quilapayún join Andean folk instruments to committed lyrics in nueva canción chilena, the voice of Salvador Allende's Popular Unity movement. After the 1973 coup Jara is murdered, and his songs become global anthems of human rights. Decades on, Colombia leads again.",
        eventId: 'evt-nueva-cancion-santiago-1969',
      },
      {
        cityId: 'medellin',
        title: 'Reggaeton capital',
        blurb:
          "In 2017 J Balvin's “Mi Gente” goes viral worldwide while Maluma's “Felices los 4” rules the charts. Medellín becomes Latin music's hottest creative hub, blending reggaeton, Latin trap and Colombian cumbia for a global audience.",
        eventId: 'evt-latin-urban-medellin-2017',
      },
    ],
    ['latin'],
  ),
  regionTour(
    'north-europe',
    'Finlandia, ABBA, Nordic jazz, Irish rock, black metal and Björk',
    'The Nordic countries and Ireland are small places with a big musical reach. This route runs from a Finnish anthem of independence through Swedish pop, Danish jazz and Dublin rock, then north to the 1993 scenes of Oslo and Reykjavik.',
    [
      {
        cityId: 'helsinki',
        title: 'Finlandia',
        blurb:
          'In 1899 Jean Sibelius composes Finlandia in defiance of Russian imperial censorship, and the tone poem becomes an anthem of Finnish independence. His seven symphonies build a sound world of icy Nordic austerity. Later in the century, Sweden turns to pop.',
        eventId: 'evt-sibelius-helsinki-1899',
      },
      {
        cityId: 'stockholm',
        title: 'ABBA and Swedish pop',
        blurb:
          "ABBA's 1976 album “Arrival,” with “Dancing Queen,” their only US No. 1, makes Sweden a global pop factory. Their blueprint of layered harmonies, catchy hooks and a touch of melancholy inspires Max Martin and a dynasty of Swedish producers. Across the water, Copenhagen is Europe's jazz home.",
        eventId: 'evt-pop-stockholm-1976-abba',
        songs: [
          { id: 'dancing_queen', title: 'Dancing Queen', artist: 'ABBA' },
        ],
      },
      {
        cityId: 'copenhagen',
        title: "Europe's jazz home",
        blurb:
          "The Copenhagen Jazz Festival launches in 1979 and grows into one of Europe's largest. Since the 1960s the city's Montmartre club had hosted Dexter Gordon, Ben Webster and Kenny Drew, making Denmark jazz's European home. Next, Dublin rock goes worldwide.",
        eventId: 'evt-jazz-copenhagen-1979',
      },
      {
        cityId: 'dublin',
        title: 'Dublin rock',
        blurb:
          "U2, formed at Dublin's Mount Temple school, release “War” in 1983 with “Sunday Bloody Sunday,” turning Ireland's political turmoil into anthemic post-punk. With The Cranberries, Sinéad O'Connor and My Bloody Valentine, Irish rock enters a golden era. Meanwhile, Oslo's underground gets darker.",
        eventId: 'evt-u2-dublin-1983',
        songs: [
          {
            id: 'nothing_compares_2_u',
            title: 'Nothing Compares 2 U',
            artist: "Sinead O'Connor",
          },
        ],
      },
      {
        cityId: 'oslo',
        title: 'Norwegian black metal',
        blurb:
          'In Oslo, Mayhem, Burzum, Darkthrone and Emperor create Norwegian black metal, a ferocious lo-fi sound whose scene also brings church burnings and murder. The Helvete record shop is its base, and its inner circle shapes extreme metal worldwide. In Iceland that same year, a very different voice goes solo.',
        eventId: 'evt-black-metal-oslo-1993',
      },
      {
        cityId: 'reykjavik',
        title: "Björk's Debut",
        blurb:
          "After fronting the Sugarcubes, Björk releases “Debut” in 1993, mixing house beats, jazz and avant-garde songwriting. Sigur Rós, múm and the Iceland Airwaves festival follow, making a nation of 370,000 one of music's most productive scenes per person.",
        eventId: 'evt-bjork-reykjavik-1993',
      },
    ],
    ['pop', 'jazz', 'rock', 'electronic'],
  ),
  regionTour(
    'west-europe',
    'Flamenco, Beethoven, jazz-age Paris, the Beatles, the Clash and Berlin techno',
    "Western Europe wrote much of the classical canon and later remade rock and dance music. This route moves from Seville's flamenco and Beethoven's Vienna to jazz-age Paris, then to Liverpool and London, and ends in a Berlin techno club.",
    [
      {
        cityId: 'seville',
        title: "Flamenco's forge",
        blurb:
          "In Seville's Triana quarter, Romani communities absorb Moorish maqam scales, Sephardic Jewish chant and Andalusian folk song into early flamenco. The result is cante jondo, or deep song, with anguished melismas and complex compás rhythms. Two centuries later, Vienna is the capital of the symphony.",
        eventId: 'evt-flamenco-seville-1600',
      },
      {
        cityId: 'vienna',
        title: "Beethoven's symphonies",
        blurb:
          "In a four-hour concert at the Theater an der Wien in 1808, the deaf Beethoven premieres his Fifth and Sixth Symphonies. The Fifth's journey from darkness to triumph becomes the model of Romantic heroism. A century later, Paris falls for a new American music.",
        eventId: 'evt-beethoven-vienna-1808',
      },
      {
        cityId: 'paris',
        title: 'Jazz-age Paris',
        blurb:
          "Josephine Baker debuts in “La Revue Nègre” in 1925 and launches a jazz craze across Europe. African American musicians escaping racism find freedom in Montmartre's clubs, Sidney Bechet settles for good, and Paris becomes jazz's second home. By the 1960s, the spotlight moves to Liverpool.",
        eventId: 'evt-jazz-age-paris-1925',
      },
      {
        cityId: 'liverpool',
        title: 'Merseybeat',
        blurb:
          "After sharpening their act at the Cavern Club and in Hamburg, the Beatles release “Please Please Me” in 1963 and Beatlemania grips Britain. Liverpool's Merseybeat scene sends dozens of bands into the charts. In London, punk later tears up the rules.",
        eventId: 'evt-beatles-liverpool-1963',
        songs: [
          {
            id: 'she_loves_you',
            title: 'She Loves You',
            artist: 'The Beatles',
          },
          {
            id: 'all_my_loving',
            title: 'All My Loving',
            artist: 'The Beatles',
          },
        ],
      },
      {
        cityId: 'london',
        title: 'London Calling',
        blurb:
          "The Clash's 1979 double album “London Calling” breaks punk's own limits, pulling in reggae, ska, rockabilly, jazz and R&B. Joe Strummer's political lyrics and Mick Jones's melodic guitar make it one of the most praised albums ever made. Next stop: a reunited Berlin.",
        eventId: 'evt-clash-london-1979',
        songs: [
          { id: 'train_in_vain', title: 'Train in Vain', artist: 'The Clash' },
        ],
      },
      {
        cityId: 'berlin',
        title: 'Techno at Tresor',
        blurb:
          "In 1991 Tresor opens in the vault of a former department store near Potsdamer Platz. In the euphoria after German reunification it becomes ground zero for Berlin techno, linking Detroit's techno pioneers with a new European audience.",
        eventId: 'evt-techno-berlin-1991',
      },
    ],
    ['jazz', 'rock', 'electronic'],
  ),
  regionTour(
    'east-europe',
    'Choirs, folk song, rebetiko and Balkan brass from the Baltic to the Balkans',
    "From the Baltic to the Balkans, Eastern Europe keeps rich singing and dance traditions alive, sometimes as an act of defiance. This route runs from Latvia's first song festival through Bartók's Budapest, Athens and Sofia to Estonia's Singing Revolution, and ends among Serbia's brass bands.",
    [
      {
        cityId: 'riga',
        title: "Latvia's Song Festival",
        blurb:
          'The first Latvian Song Festival gathers thousands of choral singers in Riga in 1873. Held every five years, it grows to more than 30,000 singers and keeps Latvian identity alive through Soviet occupation. In Budapest, two composers set out to record village songs.',
        eventId: 'evt-song-festival-riga-1873',
      },
      {
        cityId: 'budapest',
        title: 'Collecting folk song',
        blurb:
          'In 1906 Béla Bartók and Zoltán Kodály begin recording Hungarian, Romanian and Slovak folk music on an Edison phonograph. Their thousands of recordings change both the study of folk music and classical composition, as Bartók weaves peasant melodies into modernist works. In Greece, port tavernas have their own blues.',
        eventId: 'evt-bartok-budapest-1906',
      },
      {
        cityId: 'athens',
        title: 'Rebetiko',
        blurb:
          "Rebetiko, Greece's “blues,” peaks in the port tavernas of Piraeus and Athens. Markos Vamvakaris and Rosa Eskenazi sing of poverty, love and the underworld over bouzouki, and refugees from Asia Minor add Turkish and Middle Eastern colour. Next, Bulgarian voices astonish the West.",
        eventId: 'evt-rebetiko-athens-1932',
      },
      {
        cityId: 'sofia',
        title: 'Bulgarian voices',
        blurb:
          'The Bulgarian State Television Female Vocal Choir, later known as Le Mystère des Voix Bulgares, records extraordinary folk polyphony. Its dissonant harmonies and open-throated village singing stun Western listeners and win a Grammy. In Estonia, singing becomes a political act.',
        eventId: 'evt-bulgarian-voices-sofia-1975',
      },
      {
        cityId: 'tallinn',
        title: 'The Singing Revolution',
        blurb:
          "In September 1988, 300,000 Estonians, nearly a third of the population, gather at Tallinn's Song Festival Grounds to sing forbidden national songs against Soviet rule. This Singing Revolution leads to Estonian independence in 1991. In the Balkans, the answer comes in brass.",
        eventId: 'evt-singing-revolution-tallinn-1988',
      },
      {
        cityId: 'belgrade',
        title: 'Turbo-folk and Guča brass',
        blurb:
          "Ceca and Dragana Mirković lead turbo-folk, mixing Serbian folk with electronic beats and pop production into one of the Balkans' most popular and controversial genres. Meanwhile the Guča Trumpet Festival draws hundreds of thousands to celebrate the fierce brass band tradition of Boban Marković.",
        eventId: 'evt-turbofolk-belgrade-1990',
      },
    ],
    [],
  ),
  regionTour(
    'north-asia',
    'Overtone singing from the Mongolian steppe to Tuva',
    'Across the steppe of Mongolia and southern Siberia, nomadic herders developed khoomei, the art of singing several notes at once. After decades of Soviet suppression, the early 1990s carried it to world stages, and this short route follows it from Ulaanbaatar to Kyzyl.',
    [
      {
        cityId: 'ulaanbaatar',
        title: 'Throat singing returns',
        blurb:
          'After decades of Soviet suppression, Mongolian and Tuvan throat singing has a renaissance. The ensemble Huun-Huur-Tu starts touring abroad, bringing khoomei overtone singing and old nomadic herding songs to global audiences. Their home is Tuva, in southern Siberia.',
        eventId: 'evt-throatsinging-ulaanbaatar-1992',
      },
      {
        cityId: 'kyzyl',
        title: 'Tuvan khoomei',
        blurb:
          'Huun-Huur-Tu, from the remote Republic of Tuva, astonish audiences abroad with khoomei, one singer sounding several notes at once. Their music grows from nomadic herding life, copying wind, rivers and horses through overtone harmonics.',
        eventId: 'evt-throat-singing-kyzyl-1993',
      },
    ],
    [],
  ),
  regionTour(
    'central-asia',
    'Silk Road maqam, epic bards and the two-stringed lutes of the steppe',
    "The Silk Road cities of Central Asia built the classical Shashmaqam suites and kept alive bards who sing epics from memory. This route runs from Bukhara's courts to post-Soviet Almaty, Bishkek's Manas epic, Dushanbe's mountain songs and the bakhshi bards of Ashgabat.",
    [
      {
        cityId: 'bukhara',
        title: 'Shashmaqam',
        blurb:
          'At the courts of the Bukhara Khanate, the “six maqams” reach their final form: huge suites blending Persian, Turkic and local Sogdian traditions, played on tanbur, dutar, sato and doira. Each maqam moves from instrumental to sung sections of rising rhythmic complexity. Centuries later, the steppe reclaims its own lute.',
        eventId: 'evt-shashmaqam-bukhara-1600',
      },
      {
        cityId: 'almaty',
        title: 'The dombra returns',
        blurb:
          "After decades of Soviet cultural sameness, Kazakh musicians reclaim the two-stringed dombra as a national symbol. Bands like Roksonaki mix throat singing, epic poetry and steppe melodies with electric guitars. In Kyrgyzstan, the bards' great epic is about to be celebrated.",
        eventId: 'evt-dombra-almaty-1990',
      },
      {
        cityId: 'bishkek',
        title: 'The Manas epic',
        blurb:
          "In 1995 Bishkek hosts a huge celebration of the Manas epic's 1,000th anniversary. Twenty times longer than the Iliad, Manas is performed from memory by manaschi bards with the komuz, and the event revives Kyrgyz improvised poetry contests. In Tajikistan, masters keep two traditions alive.",
        eventId: 'evt-manas-epic-bishkek-1995',
      },
      {
        cityId: 'dushanbe',
        title: 'Shashmaqam and falak',
        blurb:
          'The Shashmaqam, shared by Tajikistan and Uzbekistan and rooted in the courts of Bukhara and Samarkand, wins UNESCO Masterpiece status in 2003. In Dushanbe, masters also keep falak alive: Pamiri mountain songs of love, loss and longing. In Turkmenistan, bards carry their own epics.',
        eventId: 'evt-falak-dushanbe-2003',
      },
      {
        cityId: 'ashgabat',
        title: 'Bakhshi bards',
        blurb:
          'In 2015 UNESCO inscribes the art of the Turkmen bakhshi: wandering bards who sing epic tales of Gorogly and other heroes while playing the two-stringed dutar. In Ashgabat, state ensembles keep this Silk Road storytelling tradition alive.',
        eventId: 'evt-bakhshi-ashgabat-2015',
      },
    ],
    [],
  ),
  regionTour(
    'west-asia',
    "The maqam, from Baghdad's golden age to Fairuz, mugham-jazz and Anatolian rock",
    "West Asia gave the world the maqam, a system of melodic modes shared from Baghdad to Istanbul. This route follows it from the Abbasid court through Persian and Syrian classical song to Fairuz's Beirut, Baku's jazz clubs and Istanbul's psychedelic rock.",
    [
      {
        cityId: 'baghdad',
        title: 'The Abbasid golden age',
        blurb:
          'In Abbasid Baghdad, al-Kindi writes the first Arabic treatise on music theory, and the maqam system, oud, qanun and ney become foundations across the Islamic world. The court musician Ziryab later flees to Cordoba and adds a fifth string to the oud. In Persia, a parallel system grows.',
        eventId: 'evt-arabic-classical-baghdad-800',
      },
      {
        cityId: 'isfahan',
        title: 'Persian dastgah',
        blurb:
          'Under the Safavids, Isfahan nurtures the dastgah system: seven modal frameworks organising Persian classical music into suites of composed and improvised sections. Tar, setar, santur, kamancheh, ney and tombak give it great subtlety, and it shapes Hindustani music through the Mughal court. In Damascus, Andalusian song lives on.',
        eventId: 'evt-persian-classical-isfahan-1501',
      },
      {
        cityId: 'damascus',
        title: 'The muwashah',
        blurb:
          'Sabah Fakhri, a young singer from Aleppo, begins performing the muwashah, an ornate Andalusian-Arab song form, in Damascus concert halls. His marathon concerts, sometimes ten hours without a repeat, keep alive a link from medieval Al-Andalus to the Levant. In Lebanon, a new voice rises.',
        eventId: 'evt-muwashah-damascus-1950',
      },
      {
        cityId: 'beirut',
        title: 'Fairuz at Baalbeck',
        blurb:
          'In 1957 Fairuz sings at the Baalbeck International Festival among the ruins of a Roman temple. With the Rahbani brothers composing, she blends Lebanese mountain folk songs with orchestral grandeur and becomes the most loved voice in the Arab world. In Baku, the modes meet jazz.',
        eventId: 'evt-fairuz-beirut-1957',
      },
      {
        cityId: 'baku',
        title: 'Mugham-jazz',
        blurb:
          "Pianist Vagif Mustafazadeh joins Azerbaijan's mugham modal system with American jazz improvisation and electrifies Baku's jazz clubs. His daughter Aziza Mustafa Zadeh later carries mugham-jazz worldwide. In Istanbul, Turkish folk is going electric.",
        eventId: 'evt-mugham-jazz-baku-1960',
      },
      {
        cityId: 'istanbul',
        title: 'Anatolian rock',
        blurb:
          "Barış Manço, Erkin Koray, Cem Karaca and Moğollar plug Turkish folk into fuzz guitars, wah pedals and rock drums. Anatolian rock blends bağlama melodies with the psychedelic sound of the era into one of rock's most sought-after styles.",
        eventId: 'evt-anatolian-rock-istanbul-1972',
      },
    ],
    [],
  ),
  regionTour(
    'east-asia',
    'Court orchestras, Peking opera, Tokyo technopop and K-pop',
    "East Asia keeps some of the world's oldest court musics alive and runs two of its biggest pop industries. This route goes from Kyoto's gagaku and Taiwan's nanguan to Peking opera, then to Tokyo's synthesizers and Seoul's K-pop.",
    [
      {
        cityId: 'kyoto',
        title: 'Gagaku',
        blurb:
          "When Japan's capital moves to Kyoto, gagaku, the world's oldest continuously performed orchestral tradition, reaches its final form. Brought from Tang China, Korea and Southeast Asia, it is refined into an austere Japanese sound of sho, hichiriki, flute, biwa and taiko. Old Chinese court music also travels to Taiwan.",
        eventId: 'evt-gagaku-kyoto-794',
      },
      {
        cityId: 'taipei',
        title: 'Nanguan',
        blurb:
          "Nanguan, one of China's oldest surviving traditions and descended from Tang and Song court music, reaches Taiwan with Hokkien traders and settlers. Pipa, dongxiao flute, sanxian and erxian create a slow, meditative sound. In Beijing, regional opera troupes are about to merge.",
        eventId: 'evt-nanguan-taipei-1600',
      },
      {
        cityId: 'beijing',
        title: 'Peking opera',
        blurb:
          "Four Anhui opera troupes arrive in Beijing in 1790 for Emperor Qianlong's 80th birthday. Their xipi and erhuang singing styles fuse into Peking opera, which joins singing, acting, acrobatics and martial arts. Nearly two centuries later, Tokyo plugs in synthesizers.",
        eventId: 'evt-peking-opera-beijing-1790',
      },
      {
        cityId: 'tokyo',
        title: 'Technopop',
        blurb:
          "Haruomi Hosono, Ryuichi Sakamoto and Yukihiro Takahashi form Yellow Magic Orchestra in 1978, joining synthesizers, drum machines and computers with Eastern melodies. YMO pioneer sampling and synth-pop production and influence hip hop, house and electronic music worldwide. Next, Seoul's pop machine goes global.",
        eventId: 'evt-ymo-tokyo-1978',
      },
      {
        cityId: 'seoul',
        title: 'K-pop goes global',
        blurb:
          "In 2020 BTS become the first all-South Korean act to top the Billboard Hot 100 with “Dynamite,” while BLACKPINK break YouTube records. K-pop's carefully produced songs, intense choreography and devoted fans set a new model for 21st-century pop stardom.",
        eventId: 'evt-kpop-global-2020',
      },
    ],
    ['electronic', 'pop'],
  ),
  regionTour(
    'south-asia',
    "Film song, baila, qawwali and Baul, from Bombay's studios to the Oscars",
    "South Asia's music runs from classical raga to the world's largest film-music industry. This route starts with Bombay's playback singers, visits Colombo, Kabul, Lahore and Dhaka, and ends with a film composer at the Oscars.",
    [
      {
        cityId: 'mumbai',
        title: 'Playback singing',
        blurb:
          "In Bombay's film studios, playback singing creates invisible singers whose voices seem to come from actors' mouths. K.L. Saigal becomes India's first recording superstar, blending Hindustani ragas with Western orchestration, and Bollywood grows into the world's largest film-music industry. In Sri Lanka, a party music is rising.",
        eventId: 'evt-bollywood-mumbai-1935',
      },
      {
        cityId: 'colombo',
        title: 'Baila',
        blurb:
          "Wally Bastiansz and M.S. Fernando take baila, Sri Lanka's Portuguese-Afro-Asian dance music, to its commercial peak in Colombo. Rooted in the Burgher community's kaffrinha traditions, its 6/8 rhythms and witty Sinhala lyrics define island celebrations. In Kabul, a golden age begins.",
        eventId: 'evt-baila-colombo-1960',
      },
      {
        cityId: 'kabul',
        title: "Kabul's golden age",
        blurb:
          "Ahmad Zahir starts recording during Afghanistan's brief cosmopolitan golden age, blending Pashto and Dari poetry with rubab, harmonium and Western instruments. Radio Kabul carries his songs nationwide until his death in 1979 and the Soviet invasion end the era. In Lahore, Sufi song is about to reach the world.",
        eventId: 'evt-rubab-kabul-1965',
      },
      {
        cityId: 'lahore',
        title: 'Qawwali',
        blurb:
          "In 1985 Nusrat Fateh Ali Khan sings at Peter Gabriel's WOMAD festival, bringing Sufi devotional qawwali to Western audiences. His huge range and ecstatic improvisations turn a shrine tradition into a global music that later influences Jeff Buckley and Massive Attack. In Bengal, wandering mystics are honoured.",
        eventId: 'evt-qawwali-lahore-1985',
      },
      {
        cityId: 'dhaka',
        title: 'Baul songs',
        blurb:
          "In 2005 UNESCO recognises the Baul tradition of Bangladesh: wandering mystic minstrels singing ecstatic devotional songs to the one-stringed ektara and the dotara lute. Rooted in Bengal's Sufi-Hindu traditions, Baul music influenced Rabindranath Tagore and Bob Dylan. Last, film music takes the spotlight again.",
        eventId: 'evt-baul-dhaka-2005',
      },
      {
        cityId: 'chennai',
        title: 'A.R. Rahman at the Oscars',
        blurb:
          "A.R. Rahman, India's most celebrated film composer, wins two Academy Awards in 2008 for “Slumdog Millionaire.” His score mixes electronic beats, Sufi singing, Indian classical instruments and Western orchestra, and puts India's film-music industry in front of Western audiences.",
        eventId: 'evt-media-chennai-2008-rahman',
      },
    ],
    [],
  ),
  regionTour(
    'southeast-asia',
    'Bronze gongs and court ensembles, then luk thung, dangdut and the Manila Sound',
    "Southeast Asia's oldest musics are ensembles of gongs, drums and winds that served kings and spirits. This route runs from Angkor's pinpeat and Hue's court music through Yangon's drum circle to the pop of Bangkok, Jakarta and Manila.",
    [
      {
        cityId: 'phnom-penh',
        title: 'Pinpeat at Angkor',
        blurb:
          "When Jayavarman II founds the Angkorian kingdom, the pinpeat ensemble of xylophones, drums, oboe and gongs becomes the voice of Khmer royal ceremony. Carved into the walls of Angkor Wat, it survives even the Khmer Rouge's murder of musicians to remain Cambodia's classical tradition. Vietnam's court music comes next.",
        eventId: 'evt-pinpeat-phnompenh-802',
      },
      {
        cityId: 'hue',
        title: 'Nha nhac',
        blurb:
          'Emperor Gia Long founds the Nguyen dynasty in Hue in 1802 and formalises nha nhac, court music for royal ceremonies and Confucian rites. Dan tranh zither, moon lute and drums create an airy sound with a distinctly Vietnamese character. In Burma, a master later protects another great ensemble.',
        eventId: 'evt-nhanhac-hue-1802',
      },
      {
        cityId: 'yangon',
        title: 'Hsaing waing',
        blurb:
          "In newly independent Burma, U Ba Than works to preserve the hsaing waing percussion ensemble. Its circular drum set, gong circles and oboe-like hne make one of Southeast Asia's most distinctive orchestral sounds, heard at nat spirit ceremonies and festivals. In Bangkok, rural songs go pop.",
        eventId: 'evt-hsaingwaing-yangon-1950',
      },
      {
        cityId: 'bangkok',
        title: 'Luk thung',
        blurb:
          'Suraphol Sombatcharoen, the King of Luk Thung, dominates Thai popular music with songs of rural life and heartbreak. His mix of Thai classical melody with Latin, rock and country influences defines luk thung, “children of the fields.” In Jakarta, dangdut is about to go electric.',
        eventId: 'evt-lukthung-bangkok-1964',
      },
      {
        cityId: 'jakarta',
        title: 'Dangdut',
        blurb:
          "Rhoma Irama, the self-proclaimed King of Dangdut, electrifies Indonesia's favourite genre with rock guitars, Indian film melodies and Arabic rhythms. His band Soneta's hit films and albums make dangdut the main popular music of the archipelago. In Manila, a disco-funk sound peaks.",
        eventId: 'evt-dangdut-jakarta-1975',
      },
      {
        cityId: 'manila',
        title: 'Manila Sound and OPM',
        blurb:
          'The Manila Sound peaks as Hotdog, VST & Company and Hagibis mix disco, funk and Tagalog lyrics. The first Metro Manila Popular Music Festival launches at the same time and becomes the main stage for Original Pilipino Music.',
        eventId: 'evt-opm-manila-1978',
      },
    ],
    [],
  ),
  regionTour(
    'north-africa',
    'Andalusian suites, chaabi, haqiba, Umm Kulthum and Gnawa trance',
    "North Africa's music joins Arab-Andalusian classical suites, Berber and Gnawa traditions, and the grand song of Cairo. This route starts in Fez in 1492 and moves through Algiers, Tunis, Khartoum and Cairo to the Gnawa trance of Marrakech.",
    [
      {
        cityId: 'fez',
        title: 'Andalusi refuge',
        blurb:
          "After the fall of Granada, Muslim and Jewish musicians expelled from Iberia carry the nuba suite to North Africa, and Fez becomes its foremost centre. These suites, ending in accelerating rhythmic finales, preserve a medieval blend of Arabic, Berber and Iberian music. In Algiers it later becomes the people's music.",
        eventId: 'evt-andalusi-fez-1492',
      },
      {
        cityId: 'algiers',
        title: 'Chaabi',
        blurb:
          "In the Casbah of Algiers, El Hadj M'Hamed El Anka turns Andalusian-rooted melodies into chaabi, “the people's music.” Singing in everyday Arabic with the mandole, he creates Algeria's most loved genre for the next century. In Tunis, an institute protects the old suites.",
        eventId: 'evt-chaabi-algiers-1920',
      },
      {
        cityId: 'tunis',
        title: 'Malouf',
        blurb:
          "The Rashidiya Institute is founded in Tunis in 1934 to teach malouf, Tunisia's Andalusian art music brought by Moorish refugees from Spain. It trains a generation of musicians, so the tradition survives into the modern era. In Sudan, song has its own golden age.",
        eventId: 'evt-malouf-tunis-1934',
      },
      {
        cityId: 'khartoum',
        title: 'Haqiba',
        blurb:
          'Poets and singers like Khalil Farah and Ibrahim al-Abadi perfect haqiba, joining classical Arabic poetry to pentatonic melodies. Sung at weddings, political gatherings and on Radio Omdurman, it becomes the soundtrack of Sudanese nationalism. In Cairo, one voice holds the whole Arab world.',
        eventId: 'evt-haqiba-khartoum-1940',
      },
      {
        cityId: 'cairo',
        title: "Umm Kulthum's Thursdays",
        blurb:
          "Umm Kulthum's monthly Thursday-night radio concerts from Cairo become a ritual across the Arab world. From Casablanca to Baghdad, streets empty as millions hear her hours-long improvisations, which define tarab, the ecstatic state Arabic music can bring. In Morocco, an older trance music meets new beats.",
        eventId: 'evt-umm-kulthum-cairo-1944',
      },
      {
        cityId: 'marrakech',
        title: 'Gnawa trance',
        blurb:
          "Gnawa trance, healing ceremonies with the guembri bass lute and metal castanets brought by sub-Saharan Africans, draws electronic producers to the Essaouira Gnawa Festival and Marrakech's growing scene. The meeting helps launch North African electronic music, influencing producers from Acid Arab to DJ Snake.",
        eventId: 'evt-gnawa-marrakech-2005',
      },
    ],
    [],
  ),
  regionTour(
    'central-africa',
    "Congolese rumba, makossa, kuduro and the rainforest's oldest polyphony",
    'Central Africa gave the continent its most influential modern pop, Congolese rumba, built on Cuban records and finger-picked guitars. This route follows rumba between Kinshasa and Brazzaville, then makossa in Douala and kuduro in Luanda, and closes in the Congo Basin rainforest.',
    [
      {
        cityId: 'kinshasa',
        title: 'Congolese rumba',
        blurb:
          "In Léopoldville's bars and record shops, Congolese musicians hear Cuban son records and recognise their own ancestral rhythms coming home. Wendo Kolosoy and others create Congolese rumba, with Lingala vocals and finger-picked guitars, the most influential pop in sub-Saharan Africa. Across the river, a rival scene grows.",
        eventId: 'evt-rumba-kinshasa-1950',
      },
      {
        cityId: 'brazzaville',
        title: 'Twin capital of rumba',
        blurb:
          "Across the Congo River from Kinshasa, Brazzaville builds its own rumba scene with bands like Les Bantous de la Capitale. The twin cities' rivalry produces Africa's most influential popular music for generations. In Cameroon, a saxophonist's B-side is about to cross the Atlantic.",
        eventId: 'evt-brazza-rumba-1960',
      },
      {
        cityId: 'douala',
        title: 'Soul Makossa',
        blurb:
          "Manu Dibango records “Soul Makossa” as a B-side for a World Cup anthem. Its bassline crosses the Atlantic, becomes a disco hit in New York and is later sampled by Michael Jackson, making it one of pop's most borrowed riffs. In Angola, dance music takes an electronic turn.",
        eventId: 'evt-makossa-douala-1972',
      },
      {
        cityId: 'luanda',
        title: 'Kuduro',
        blurb:
          "Producers in Luanda's musseques mix Angolan semba and kizomba with house music from Lisbon's diaspora into kuduro, a raw, fast electronic dance music with acrobatic moves. It feeds Lisbon's batida scene and links Lusophone Africa to European clubs. The route closes with the region's oldest music.",
        eventId: 'evt-kuduro-luanda-2000',
      },
      {
        cityId: 'bangui',
        title: 'Aka polyphony',
        blurb:
          'In 2003 UNESCO proclaims the oral traditions of the Aka a Masterpiece of Intangible Heritage. In their polyphonic singing, many voices weave independent melodies without a conductor, a sophisticated art developed over millennia in the Congo Basin rainforest.',
        eventId: 'evt-aka-polyphony-bangui-2003',
      },
    ],
    ['african'],
  ),
  regionTour(
    'west-africa',
    'From griot epics to highlife, desert blues, mbalax and global Afrobeats',
    "West Africa is home to the griot tradition and to rhythms that crossed the Atlantic and helped seed the blues. This route runs from Timbuktu's griots through Freetown, Accra, Bamako and Dakar, and ends in Lagos, where Afrobeats reached the Grammy stage.",
    [
      {
        cityId: 'timbuktu',
        title: 'The griot tradition',
        blurb:
          'Under the Songhai Empire, griots, hereditary musician-historians who keep genealogies and epics with kora, balafon and ngoni, are formally codified at the courts of Timbuktu and Gao. Their music and stories later cross the Atlantic, seeding the blues and banjo traditions. Centuries on, guitars shape a coastal sound.',
        eventId: 'evt-griot-timbuktu-1500',
      },
      {
        cityId: 'freetown',
        title: 'Palm wine guitar',
        blurb:
          "Ebenezer Calendar and His Maringa Band bring palm wine music to its peak in Freetown's waterfront bars. Named for the palm wine shared while playing, this gentle acoustic guitar style mixes Krio, Mende and Caribbean influences and shapes highlife guitar. In Accra, highlife is ready to boom.",
        eventId: 'evt-palmwine-freetown-1952',
      },
      {
        cityId: 'accra',
        title: 'Highlife and independence',
        blurb:
          "In the euphoria of Ghana's independence, E.T. Mensah and the Tempos welcome American jazz musicians to Accra. Highlife, mixing West African rhythm, calypso and swing, peaks as the soundtrack of Pan-African optimism and influences Fela Kuti's Afrobeat experiments in Lagos. In Mali, the guitar takes another path.",
        eventId: 'evt-highlife-accra-1958',
      },
      {
        cityId: 'bamako',
        title: 'Desert blues',
        blurb:
          "Rooted in the string traditions of the Songhai and Mandé peoples along the Niger River, Ali Farka Touré's hypnotic guitar reveals the African ancestry of American blues. His work opens Western ears to Malian music and leads to Tinariwen and the global desert blues movement. In Dakar, sabar drums power a new pop.",
        eventId: 'evt-desert-blues-bamako-1980',
      },
      {
        cityId: 'dakar',
        title: 'Mbalax',
        blurb:
          "Youssou N'Dour, already Senegal's biggest star, releases “Set” in 1990, polishing mbalax, the sabar-drum-driven Wolof dance music, into sophisticated pop. His soaring tenor catches Peter Gabriel's attention and sets up his global crossover. The route ends in Lagos, where Fela's legacy goes global.",
        eventId: 'evt-mbalax-dakar-1990-ndour',
      },
      {
        cityId: 'lagos',
        title: 'Afrobeats on the Grammy stage',
        blurb:
          "Drawing on Fela Kuti's Afrobeat, dancehall and the Afrobeats production scene built by Don Jazzy and Wizkid, Burna Boy wins the Grammy for Best Global Music Album with “Twice As Tall.” Tems, Rema and Ayra Starr follow, completing a circle from Fela's Lagos to the Grammy stage.",
        eventId: 'evt-burna-boy-lagos-2020',
      },
    ],
    ['african'],
  ),
  regionTour(
    'east-africa',
    'Royal drums, benga guitar, Ethio-jazz, Somali funk, salegy and bongo flava',
    "East Africa ranges from Burundi's royal drums and Kenya's guitar pop to the Ethiopian scales of Ethio-jazz and the Swahili coast. This route moves through Bujumbura, Nairobi, Addis Ababa and Mogadishu, crosses to Madagascar and ends in Dar es Salaam.",
    [
      {
        cityId: 'bujumbura',
        title: 'Royal drummers',
        blurb:
          'The Royal Drummers of Burundi, performing the sacred karyenda ritual on massive amashako drums, begin touring the world. Their thunderous polyrhythms influence artists from Joni Mitchell to Def Leppard and are sampled widely in pop and electronic music. In Kenya, guitars take the lead.',
        eventId: 'evt-drummers-bujumbura-1964',
      },
      {
        cityId: 'nairobi',
        title: 'Benga',
        blurb:
          "Shirati Jazz and D.O. Misiani pioneer benga, a high-energy guitar style rooted in Luo traditions from the shores of Lake Victoria. Interlocking electric guitars, pulsing bass and call-and-response vocals make it Kenya's most popular music. In Addis Ababa, jazz meets Ethiopian scales.",
        eventId: 'evt-benga-nairobi-1967',
      },
      {
        cityId: 'addis-ababa',
        title: 'Ethio-jazz',
        blurb:
          "After studying at Berklee and in London, Mulatu Astatke returns to Addis Ababa and fuses pentatonic Ethiopian scales with Latin jazz, vibraphone and organ. His Ethio-jazz, later showcased on the Éthiopiques compilations, becomes one of Africa's most sampled sounds. In Mogadishu, funk arrives too.",
        eventId: 'evt-ethiojazz-addis-1969-mulatu',
      },
      {
        cityId: 'mogadishu',
        title: "Mogadishu's golden age",
        blurb:
          'The Waaberi band, Dur-Dur Band and Iftin Band fuse Somali pentatonic melodies with funk, disco and Bollywood. The golden era ends with civil war in 1991 and is rediscovered decades later through the Awesome Tapes from Africa label. Offshore, Madagascar dances in 6/8.',
        eventId: 'evt-waaberi-mogadishu-1972',
      },
      {
        cityId: 'antananarivo',
        title: 'Salegy',
        blurb:
          "Eusèbe Jaojoby, the King of Salegy, brings Madagascar's most popular dance music to the world. Salegy's fast 6/8 rhythm, driven by electric guitar and accordion, shows off traditions that grew apart from mainland Africa. Back on the mainland, Tanzania's youth pick up the mic.",
        eventId: 'evt-salegy-antananarivo-1992',
      },
      {
        cityId: 'dar-es-salaam',
        title: 'Bongo flava',
        blurb:
          "Young Tanzanians create bongo flava, Swahili hip hop that blends American rap with taarab melodies, dansi guitar and Swahili poetry. Mr. II (Sugu) and Professor Jay make Dar es Salaam East Africa's hip hop capital, using street slang to talk about politics and daily life.",
        eventId: 'evt-bongo-flava-dar-1990',
      },
    ],
    ['african'],
  ),
  regionTour(
    'south-africa',
    'Marrabenta, famo, Zamrock, Cape jazz, chimurenga and amapiano',
    "Southern Africa's music grew from migrant workers, township life and the long fight against colonial and apartheid rule. This route runs from Maputo and Lesotho's mountains to Lusaka, Cape Town and Harare, and ends in Johannesburg's townships with amapiano.",
    [
      {
        cityId: 'maputo',
        title: 'Marrabenta',
        blurb:
          "Guitarist Fany Pfumo electrifies Lourenço Marques, now Maputo, with marrabenta, a fast, syncopated style born from homemade tin-can instruments in the city's cane suburbs. Its frenzied energy reflects a colonized people dancing toward freedom. In Lesotho, miners bring home their own sound.",
        eventId: 'evt-marrabenta-maputo-1955',
      },
      {
        cityId: 'maseru',
        title: 'Famo',
        blurb:
          "Famo, a raw, accordion-driven music created by Basotho migrant miners, becomes Lesotho's most distinctive musical export. Sung in Sesotho about love, hardship and mountain life, its rhythms echo the gallop of Basotho ponies. In Zambia, rock gets fuzzy.",
        eventId: 'evt-famo-maseru-1970',
      },
      {
        cityId: 'lusaka',
        title: 'Zamrock',
        blurb:
          "WITCH, Rikki Ililonga, Paul Ngozi and Amanaz create Zamrock, a fierce mix of psychedelic rock, garage fuzz and Zambian rhythm played in Lusaka's hotels and mining-town clubs. Crate diggers rediscover it decades later. That same year, Cape Town records an anthem.",
        eventId: 'evt-zamrock-lusaka-1974',
      },
      {
        cityId: 'cape-town',
        title: 'Mannenberg',
        blurb:
          "Abdullah Ibrahim records “Mannenberg — Is Where It's Happening” in a Cape Town studio. Named after a Cape Flats township, the jazz piece becomes the unofficial anthem of the anti-apartheid movement, its piano melody both joyful and defiant. In Zimbabwe, the mbira joins the struggle.",
        eventId: 'evt-cape-jazz-capetown-1974',
      },
      {
        cityId: 'harare',
        title: 'Chimurenga',
        blurb:
          "Thomas Mapfumo adapts sacred mbira melodies to electric guitar, creating chimurenga, “struggle music.” His Shona songs carry coded political messages during Zimbabwe's liberation war, and the Rhodesian government bans his records and jails him. The route ends in Johannesburg's townships.",
        eventId: 'evt-chimurenga-harare-1977',
      },
      {
        cityId: 'johannesburg',
        title: 'Amapiano',
        blurb:
          'Built from deep house, kwaito bass and jazz piano in Soweto and Alexandra, amapiano spreads worldwide through TikTok as Kabza De Small, DJ Maphorisa and Vigro Deep take its log drum and piano stabs global. It goes on to shape Afrobeats producers in Lagos and UK garage artists in London.',
        eventId: 'evt-amapiano-johannesburg-2019',
      },
    ],
    ['african'],
  ),
  regionTour(
    'oceania',
    'Māori haka and waiata, Pacific choirs and string bands, and Aboriginal rock',
    "Oceania's music is tied to land and community, from Māori haka to Pacific church harmony and Melanesian string bands. This route sails from Auckland through Apia, Honiara, Port Moresby and Suva, and lands in Melbourne with an Aboriginal song about land rights.",
    [
      {
        cityId: 'auckland',
        title: 'Haka and waiata',
        blurb:
          "As Māori communities move into Auckland, the haka war dance, waiata songs and taonga pūoro instruments like the pūtātara conch and koauau flute adapt to modern life. These traditions become central to New Zealand's identity and later reach world stages. In Samoa, independence brings out the choirs.",
        eventId: 'evt-maori-haka-auckland-1900',
      },
      {
        cityId: 'apia',
        title: 'Samoan choirs',
        blurb:
          "Western Samoa becomes the first Pacific Island nation to gain independence in 1962, and Apia celebrates with church choirs in four-part harmony, the fierce fa'ataupati slap dance and the graceful siva Samoa. In the Solomon Islands, a scholar records panpipes.",
        eventId: 'evt-choral-apia-1962',
      },
      {
        cityId: 'honiara',
        title: "'Are'are panpipes",
        blurb:
          "Ethnomusicologist Hugo Zemp records the 'Are'are people of Malaita island, whose bamboo panpipe ensembles play up to eight interlocking parts. These orchestras are among the most sophisticated indigenous music traditions on Earth. In Papua New Guinea, ukuleles and guitars build a national sound.",
        eventId: 'evt-panpipe-honiara-1969',
      },
      {
        cityId: 'port-moresby',
        title: 'String bands',
        blurb:
          'Around independence in 1975, Papua New Guinea grows its own string band music: ukuleles, guitars and bamboo bass playing love songs and social commentary in Tok Pisin and hundreds of local languages. String bands become the soundtrack of island life across Melanesia. In Fiji, the Pacific gathers.',
        eventId: 'evt-stringband-portmoresby-1970',
      },
      {
        cityId: 'suva',
        title: 'Festival of Pacific Arts',
        blurb:
          'Fiji hosts the Festival of Pacific Arts in Suva, showing off choral harmony rooted in Methodist hymn singing and indigenous meke dance-songs, alongside Indo-Fijian music. The result is a uniquely multicultural Pacific soundscape. The route ends in Melbourne with a song about land.',
        eventId: 'evt-choral-suva-1985',
      },
      {
        cityId: 'melbourne',
        title: 'Treaty',
        blurb:
          "Yolngu band Yothu Yindi from Arnhem Land release the Filthy Lucre remix of “Treaty,” mixing didgeridoo, bilma clapsticks and Yolngu song cycles with rock and dance beats. It becomes Australia's most politically significant pop song, demanding recognition of Indigenous land rights.",
        eventId: 'evt-aboriginal-melbourne-1991',
      },
    ],
    [],
  ),
];

// ── City tours (the 12 featured Music Cities) ─────────────────────────────
const CITY_TOURS: GuidedTour[] = [
  cityTour(
    'new-orleans',
    'From Congo Square drums to brass bands, jazz and second-line funk',
    [
      {
        title: 'Congo Square',
        blurb:
          'On Sundays, enslaved Africans gather in the Place des Nègres, later called Congo Square, to drum, sing and dance in traditions from West and Central Africa. Its polyrhythms and call-and-response become a foundation for jazz and blues. Decades later, that call-and-response fills the streets on Mardi Gras day.',
        eventId: 'evt-jazz-congo-square-nola-1819',
      },
      {
        title: 'Mardi Gras Indians',
        blurb:
          'African American communities begin “masking Indian,” sewing beaded, feathered suits and parading through Black neighborhoods on Mardi Gras day. Their chants, like “Indian Red,” trade call and response over tambourines and hand percussion. Meanwhile, the city’s dance halls fill with brass, blues and ragtime.',
        eventId: 'evt-diaspora-nola-mardi-gras-indians-1885',
      },
      {
        title: 'Brass, Blues & Ragtime',
        blurb:
          'Brass bands, Creole string orchestras, blues singers and ragtime pianists collide in the streets and dance halls of New Orleans. They draw on Congo Square drumming, French quadrilles, Caribbean habanera rhythms and Baptist hymns. Out of this mix, jazz ignites over the next two decades.',
        eventId: 'evt-jazz-origins-nola-1890',
      },
      {
        title: 'Jazz on Record',
        blurb:
          'King Oliver’s Creole Jazz Band, with a young Louis Armstrong on second cornet, records its first sides for Gennett Records in Richmond, Indiana. The sessions capture the sound of New Orleans jazz for listeners everywhere. Decades later, the city’s groove moves from the horns to the rhythm section.',
        eventId: 'evt-jazz-nola-1923',
        songs: [
          {
            id: 'what_a_wonderful_world',
            title: 'What A Wonderful World',
            artist: 'Louis Armstrong',
          },
        ],
      },
      {
        title: 'New Orleans Funk',
        blurb:
          'The Meters, Art Neville, Leo Nocentelli, George Porter Jr. and Zigaboo Modeliste, release “Sophisticated Cissy” and their first album. Their stripped-down, syncopated funk grows straight out of second line parade rhythms. That blueprint passes to the Neville Brothers and, later, to Galactic.',
        eventId: 'evt-meters-neworleans-1969',
        songs: [
          { id: 'cissy_strut', title: 'Cissy Strut', artist: 'The Meters' },
          {
            id: 'hey_pocky_a_way',
            title: 'Hey Pocky A-Way',
            artist: 'The Meters',
          },
        ],
      },
      {
        title: 'Funk Lives On',
        blurb:
          'Galactic grows out of the city’s club scene, with a long residency at the Maple Leaf Bar, mixing New Orleans funk and R&B with jam band improvisation. They play with Allen Toussaint and Cyril Neville and take the city’s music to festivals. It shows how a local sound survives by changing.',
        eventId: 'evt-jamband-neworleans-1994-galactic',
      },
    ],
    ['jazz', 'blues', 'funk'],
  ),
  cityTour(
    'kingston',
    'From yard sound systems to ska, rocksteady, reggae, dub and digital dancehall',
    [
      {
        title: 'Sound Systems',
        blurb:
          'Coxsone Dodd, Duke Reid and Prince Buster build huge mobile sound systems in Kingston’s yards and dance halls, spinning American R&B records for packed crowds. Soon they start recording local artists instead. That step starts a run of new Jamaican sounds, beginning with ska.',
        eventId: 'evt-soundsystem-kingston-1956',
      },
      {
        title: 'Ska',
        blurb:
          'As Jamaica wins its independence, Kingston’s sound-system operators and studio bands fuse mento with American R&B. The result is ska: walking basslines, a chopped offbeat guitar “skank” and jazzy horn lines, the sound of a new nation. Within a few years, the tempo starts to slow.',
        eventId: 'evt-ska-kingston-1962',
      },
      {
        title: 'Rocksteady',
        blurb:
          'Ska’s frantic tempo gives way to a slower, bass-heavy groove shaped by American soul records. Rocksteady brings tighter vocal harmonies and roomy rhythmic pockets to Kingston’s studios. It becomes the direct rhythmic step toward reggae.',
        eventId: 'evt-rocksteady-kingston-1966',
      },
      {
        title: 'Reggae',
        blurb:
          'Growing out of rocksteady’s relaxed pulse and Rastafarian spiritual consciousness, Bob Marley and the Wailers carry reggae from Jamaican streets to the world. Its offbeat skank and heavy bass become a voice of anti-colonial resistance. Back in the studios, engineers start taking the songs apart.',
        eventId: 'evt-reggae-kingston-1971',
        songs: [
          {
            id: 'three_little_birds',
            title: 'Three Little Birds',
            artist: 'Bob Marley',
          },
          { id: 'stir_it_up', title: 'Stir It Up', artist: 'Bob Marley' },
        ],
      },
      {
        title: 'Dub',
        blurb:
          'In his small Waterhouse home studio, King Tubby strips reggae songs down to bass and drums, then adds delay, reverb and phasing on a custom-built mixing board. The mixing desk itself becomes an instrument. A decade later, the riddim goes digital.',
        eventId: 'evt-dub-kingston-1972-tubby',
      },
      {
        title: 'Digital Dancehall',
        blurb:
          'King Jammy’s “Sleng Teng,” the first fully digital reggae riddim, made on a Casio keyboard, changes Jamaican music overnight. Dancehall replaces roots reggae as the main sound, with DJs like Yellowman, Shabba Ranks and Super Cat riding computer rhythms. Kingston keeps reinventing the riddim.',
        eventId: 'evt-dancehall-kingston-1985',
      },
    ],
    ['reggae'],
  ),
  cityTour(
    'havana',
    'Rumba, son, mambo and cha-cha-chá: the Cuban rhythms beneath Latin music',
    [
      {
        title: 'Rumba',
        blurb:
          'After slavery is abolished in Cuba, Afro-Cuban communities in Havana’s crowded solares create rumba, a drum-and-dance music with Congolese and Yoruba roots. Its three styles, yambú, guaguancó and columbia, are played on cajón boxes and later congas and claves. Rumba becomes the rhythmic engine of son.',
        eventId: 'evt-diaspora-havana-rumba-1886',
      },
      {
        title: 'Son Cubano',
        blurb:
          'Groups like the Sexteto Habanero, Septeto Nacional and Trío Matamoros bring son from rural Oriente province to Havana’s cabarets and radio stations. Son joins the Spanish tres guitar to the African-derived clave rhythm and becomes Cuba’s national music. Big bands soon push it toward mambo.',
        eventId: 'evt-son-havana-1930',
      },
      {
        title: 'Mambo',
        blurb:
          'Pérez Prado, Beny Moré and the house bands of the Tropicana nightclub make Havana the mambo capital of the world. Cuban big bands blend Afro-Cuban percussion with jazz arrangements into dance music that sweeps across the Americas. A few years later, one violinist makes the steps simpler.',
        eventId: 'evt-mambo-havana-1950',
      },
      {
        title: 'Cha-cha-chá',
        blurb:
          'At Havana’s Silver Star club, violinist Enrique Jorrín of Orquesta América simplifies mambo’s rhythms and adds a triple-step dance. Named for the sound of dancers’ shoes shuffling on the floor, it becomes the biggest Latin dance craze of the 1950s. Then politics changes everything.',
        eventId: 'evt-chacha-havana-1953',
      },
      {
        title: 'Revolution & Exile',
        blurb:
          'Fidel Castro’s revolution and the U.S. embargo close the Tropicana-era nightclubs and scatter Cuban musicians across the Americas. Those who leave carry Cuban rhythm to New York, Miami and Mexico City, seeding salsa, Latin jazz and boogaloo. Those who stay keep playing behind the embargo.',
        eventId: 'evt-revolution-havana-1959',
      },
      {
        title: 'Buena Vista Social Club',
        blurb:
          'Ry Cooder and producer Nick Gold gather veteran Cuban musicians, Ibrahim Ferrer, Compay Segundo, Rubén González and Omara Portuondo, at EGREM Studios in Havana. The Buena Vista Social Club album sells 8 million copies, and a Wim Wenders film follows. Cuba’s forgotten musical treasures reach the world.',
        eventId: 'evt-buena-vista-havana-1996',
      },
    ],
    ['latin'],
  ),
  cityTour(
    'lagos',
    'Highlife, Afrobeat and jùjú, then the Afrobeats wave that went global',
    [
      {
        title: 'Highlife',
        blurb:
          'E.T. Mensah tours Lagos with the Tempos, and Bobby Benson’s hotel bands mix Yoruba rhythms with jazz, calypso and Cuban son. The joyful, horn-driven result is highlife, the soundtrack of decolonization. It lays the rhythmic ground for jùjú and Afrobeat.',
        eventId: 'evt-highlife-lagos-1952',
      },
      {
        title: 'Afrobeat',
        blurb:
          'Fela Kuti opens the Afrika Shrine, a nightclub and commune that becomes the spiritual home of Afrobeat. With his band Africa 70, he fuses Yoruba rhythms, jazz, funk and political fire in marathon shows that challenge Nigeria’s military government. Next, jùjú heads for the world stage.',
        eventId: 'evt-afrobeat-lagos-1971',
      },
      {
        title: 'Jùjú',
        blurb:
          'King Sunny Ade signs with Island Records, the label that launched Bob Marley, and releases “Juju Music.” Western listeners hear a web of talking drums, steel guitar and call-and-response vocals, and Ade earns a Grammy nomination. A generation later, Lagos pop goes further still.',
        eventId: 'evt-juju-lagos-1982-ade',
      },
      {
        title: 'Afrobeats',
        blurb:
          'A new generation, including Wizkid, Davido and Burna Boy, blends West African rhythms with dancehall, hip hop and R&B. Powered by social media and diaspora networks, Lagos becomes the center of a global Afrobeats movement. Ten years on, one album shows how far it has come.',
        eventId: 'evt-afrobeats-lagos-2010',
      },
      {
        title: 'Made in Lagos',
        blurb:
          'Wizkid’s “Made in Lagos” offers a refined, minimal Afrobeats sound, led by “Essence” featuring Tems. “Essence” becomes the first Afrobeats song to chart on the US Billboard Hot 100, proving the music can win on its own terms. The next year, the Grammys take notice.',
        eventId: 'evt-afrobeats-lagos-2020-wizkid',
      },
      {
        title: 'The Global Stage',
        blurb:
          'Drawing on Fela Kuti’s Afrobeat and dancehall rhythms, Burna Boy wins the Grammy for Best Global Music Album with “Twice As Tall.” Tems, Rema and Ayra Starr follow him onto the world’s biggest stages. The story comes full circle, from Fela’s Lagos to the Grammy stage.',
        eventId: 'evt-burna-boy-lagos-2020',
      },
    ],
    ['african'],
  ),
  cityTour(
    'new-york',
    'Harlem jazz, bebop, Latin jazz, Bronx salsa and the birth of hip-hop',
    [
      {
        title: 'Harlem Jazz',
        blurb:
          'Duke Ellington and his orchestra begin a residency at the Cotton Club in Harlem, broadcast nationally on radio. Ellington turns the jazz band into a vehicle for composition, with growling brass and works like “Black and Tan Fantasy.” In the 1940s, younger players push jazz somewhere faster.',
        eventId: 'evt-jazz-ellington-cotton-club-1927',
      },
      {
        title: 'Bebop',
        blurb:
          'In Manhattan clubs like Minton’s Playhouse, the Three Deuces and the Onyx, Charlie Parker, Dizzy Gillespie, Thelonious Monk and Bud Powell remake jazz. Bebop trades swing for dizzying tempos, complex harmonies and virtuoso improvisation. Soon, bebop meets Cuban rhythm.',
        eventId: 'evt-bebop-nyc-1945',
      },
      {
        title: 'Palladium Latin Jazz',
        blurb:
          'Tito Puente, Machito and his Afro-Cubans, and Tito Rodríguez make the Palladium Ballroom on Broadway the center of Afro-Cuban jazz and mambo. Arranger Mario Bauzá merges bebop harmony with clave-driven Cuban rhythm. That Latin dance tradition grows into something new in the Bronx.',
        eventId: 'evt-jazz-tito-puente-machito-nyc-1949',
      },
      {
        title: 'Salsa',
        blurb:
          'In the Bronx barrios, Cuban son, Puerto Rican plena and bomba, and New York Latin jazz come together as salsa. Fania Records and bandleaders like Willie Colón and Héctor Lavoe make it the leading pan-Latin dance music. Two years later, a Bronx block party starts something else.',
        eventId: 'evt-salsa-nyc-1971',
      },
      {
        title: 'Hip-Hop',
        blurb:
          'At a Bronx block party, DJ Kool Herc isolates and loops the drum breaks of funk records, drawing on Jamaican sound-system culture. From that idea grow MCing, turntablism, breakdancing and graffiti. Two decades later, a rapper from Queens shows how far the words can go.',
        eventId: 'evt-hiphop-nyc-1973',
      },
      {
        title: 'Illmatic',
        blurb:
          'Twenty-year-old Nas releases “Illmatic,” a vivid, poetic picture of life in the Queensbridge housing projects. Produced by DJ Premier, Pete Rock, Q-Tip and Large Professor, its storytelling rides on jazz-inflected beats, closing a loop with the city’s jazz past. It becomes a benchmark for lyrical rap.',
        eventId: 'evt-hiphop-queens-1994-nas',
      },
    ],
    ['jazz', 'latin', 'hip-hop'],
  ),
  cityTour(
    'london',
    'Caribbean arrivals, British blues, punk, lovers rock, jungle and grime',
    [
      {
        title: 'Windrush',
        blurb:
          'The HMT Empire Windrush docks at Tilbury with 492 Caribbean migrants, among them the calypsonian Lord Kitchener, who sings “London Is the Place for Me.” They bring calypso, mento and the seeds of Black British music. Meanwhile, young London bands are listening hard to American blues.',
        eventId: 'evt-windrush-london-1948',
      },
      {
        title: 'British Blues Boom',
        blurb:
          'The Rolling Stones and the Yardbirds take the electric Chicago blues of Muddy Waters and Howlin’ Wolf and play it back to a global audience. Their blues boom lays the groundwork for hard rock and the British Invasion. A decade on, a faster, angrier sound arrives.',
        eventId: 'evt-british-blues-london-1962',
        songs: [
          {
            id: 'gimme_shelter',
            title: 'Gimme Shelter',
            artist: 'The Rolling Stones',
          },
          {
            id: 'honky_tonk_women',
            title: 'Honky Tonk Women',
            artist: 'The Rolling Stones',
          },
        ],
      },
      {
        title: 'Punk',
        blurb:
          'The Sex Pistols headline the 100 Club Punk Special on Oxford Street, with The Clash, Siouxsie and the Banshees and Subway Sect also on the bill. The two-night event turns punk rock into a movement. At the same time, the children of the Windrush generation are making music of their own.',
        eventId: 'evt-punk-london-1976',
        songs: [
          { id: 'train_in_vain', title: 'Train in Vain', artist: 'The Clash' },
        ],
      },
      {
        title: 'Lovers Rock',
        blurb:
          'In South London and Notting Hill bedrooms and community centers, children of Caribbean immigrants create lovers rock, a softer, romantic strain of reggae. Louisa Mark’s “Caught You in a Lie,” produced by Dennis Bovell, is a founding track of the first Black British genre. Its influence reaches into jungle.',
        eventId: 'evt-diaspora-london-lovers-rock-1977',
      },
      {
        title: 'Jungle',
        blurb:
          'In London’s multiethnic underground, jungle chops amen breaks at furious tempos and layers on dancehall vocals, dub basslines and the energy of acid house raves. Through Goldie and LTJ Bukem it grows into drum and bass. Its rhythms will resurface in grime.',
        eventId: 'evt-jungle-london-1993',
      },
      {
        title: 'Grime',
        blurb:
          'Dizzee Rascal’s debut “Boy in da Corner” wins the Mercury Prize and lifts grime from East London pirate radio into the mainstream. Born on Bow’s council estates, grime fuses UK garage, jungle and MCing into a British sound that produces Skepta, Wiley and Stormzy. The lineage that began with Windrush lives on.',
        eventId: 'evt-grime-london-2003',
      },
    ],
    ['rock', 'reggae', 'electronic', 'hip-hop'],
  ),
  cityTour(
    'rio',
    'From lundu and the first samba school to bossa nova and baile funk',
    [
      {
        title: 'Lundu & Maxixe',
        blurb:
          'In Rio’s dance halls, the lundu, a song-and-dance form with Angolan and Congolese roots, fuses with polka and habanera to create the maxixe, Brazil’s first urban popular dance. It shocks polite society. It also lays the rhythmic groundwork for samba.',
        eventId: 'evt-lundu-rio-1895',
      },
      {
        title: 'Samba Schools',
        blurb:
          'Deixa Falar, the first samba school, is founded in Rio’s Estácio neighborhood. Samba becomes a community art form tied to Carnival parades, moving from the favela hills to the heart of Brazilian identity. Thirty years later, a quiet guitarist changes its feel.',
        eventId: 'evt-samba-rio-1928',
      },
      {
        title: 'Bossa Nova',
        blurb:
          'João Gilberto records “Chega de Saudade,” written by Antonio Carlos Jobim with lyrics by Vinícius de Moraes. His batida guitar, syncopated and intimate, fuses samba rhythm with cool jazz harmony, and bossa nova is born. Within five years it reaches the world.',
        eventId: 'evt-joao-gilberto-bossanova-1958',
      },
      {
        title: 'The Girl from Ipanema',
        blurb:
          'Jobim and Gilberto record “Garota de Ipanema” (“The Girl from Ipanema”) with Stan Getz. It becomes the second most recorded song in history after “Yesterday,” taking bossa nova to the world stage. The same year, another Rio guitarist mixes funk and rock into samba.',
        eventId: 'evt-bossanova-rio-1962',
      },
      {
        title: 'Samba Rock',
        blurb:
          'Jorge Ben Jor records “Mas Que Nada,” blending samba with funk, rock and bossa nova into a style he calls samba rock. Later covered by Sérgio Mendes, it bridges traditional samba and the funk-soul sound of 1970s Brazil. Decades later, funk returns from the favelas in a rougher form.',
        eventId: 'evt-jorge-ben-jor-rio-1963',
      },
      {
        title: 'Baile Funk',
        blurb:
          'DJ Marlboro takes baile funk from Rio’s favelas to São Paulo’s huge club scene, where it grows harder and bass-heavier. Built on Miami bass samples and Portuguese-language MCs, its raw DIY sound inspires Diplo, M.I.A. and the global bass music movement. Rio’s rhythms keep traveling.',
        eventId: 'evt-baile-funk-saopaulo-2004',
      },
    ],
    ['latin'],
  ),
  cityTour(
    'bamako',
    'Desert blues, griot voices, kora and Wassoulou from Mali’s capital',
    [
      {
        title: 'Desert Blues',
        blurb:
          'Ali Farka Touré’s hypnotic guitar draws on centuries-old Songhai and Mandé string traditions along the Niger River. It reveals the deep African ancestry of the American blues and opens Western ears to Malian music. Soon a singer from Malian nobility takes Mandé song into pop.',
        eventId: 'evt-desert-blues-bamako-1980',
      },
      {
        title: 'Mandé Pop',
        blurb:
          'Born an albino into Malian nobility, Salif Keita overcomes deep social stigma to become the “Golden Voice of Africa.” His Paris-recorded album “Soro” mixes Mandé griot vocals with synthesizers and rock guitar, opening European and American markets to Malian artists. A year later, the kora gets its own spotlight.',
        eventId: 'evt-mande-pop-bamako-1987-keita',
      },
      {
        title: 'Solo Kora',
        blurb:
          'Toumani Diabaté, heir to a seventy-generation griot dynasty, records “Kaira” in a single session in a London hotel room. It is the first album of unaccompanied kora, showing the 21-string harp-lute as a solo concert voice. The next year, a young singer brings new words to an old rhythm.',
        eventId: 'evt-kora-bamako-1988-toumani',
      },
      {
        title: 'Wassoulou',
        blurb:
          'At nineteen, Oumou Sangaré releases “Moussolou” (“Women”), championing women’s rights over the hunter’s harp rhythms of Wassoulou from southern Mali. It sells over 200,000 copies across West Africa and puts Wassoulou on the global stage. Fifteen years later, Bamako’s street sounds travel the world.',
        eventId: 'evt-wassoulou-bamako-1989-sangare',
      },
      {
        title: 'Dimanche à Bamako',
        blurb:
          'Amadou Bagayoko and Mariam Doumbia, a blind Malian couple, record “Dimanche à Bamako” (“Sunday in Bamako”) with Manu Chao. Malian blues guitar meets Afro-pop and lo-fi rock energy in an international breakthrough. A new generation of Malian women singers is next.',
        eventId: 'evt-afropop-bamako-2004-amadou',
      },
      {
        title: 'A New Generation',
        blurb:
          'Actress-turned-singer Fatoumata Diawara debuts with “Fatou,” blending Wassoulou tradition, Mandé guitar and modern production. Her songs take on forced marriage, female empowerment and migration. She follows the path Oumou Sangaré opened, carrying Bamako’s music forward.',
        eventId: 'evt-mande-bamako-2011-diawara',
      },
    ],
    ['african'],
  ),
  cityTour(
    'memphis',
    'Beale Street blues, Sun Studio rock ’n’ roll, and Stax and Hi soul',
    [
      {
        title: 'Memphis Blues',
        blurb:
          'W.C. Handy publishes “Memphis Blues,” one of the first blues compositions put to sheet music. He heard Delta blues players at a train station in Tutwiler, Mississippi, and wrote that folk sound down. It helps spread the blues from Beale Street to the nation.',
        eventId: 'evt-handy-memphis-1912',
      },
      {
        title: 'Beale Street',
        blurb:
          'Memphis Minnie (Lizzie Douglas) records “Bumble Bee,” a hit that makes her the most commercially successful female blues guitarist before the war. She records over 200 sides and outplays rivals in Beale Street cutting contests. Two decades on, the blues starts to get louder.',
        eventId: 'evt-blues-memphis-1929-minnie',
      },
      {
        title: 'Rocket 88',
        blurb:
          'At Sam Phillips’ Memphis Recording Service, Jackie Brenston and his Delta Cats, Ike Turner’s band, record “Rocket 88.” A damaged amplifier gives the guitar a distorted tone, and the song is often cited as one of the first rock and roll records. Three years later, Phillips finds a new voice.',
        eventId: 'evt-blues-memphis-1951',
      },
      {
        title: 'Sun Studio',
        blurb:
          'Elvis Presley records “That’s All Right” at Sun Studio, blending blues, country and gospel into a new sound. Rock and roll explodes out of Memphis. A few years later, another studio in town gives soul a Southern accent.',
        eventId: 'evt-elvis-memphis-1954',
        songs: [
          {
            id: 'cant_help_falling_in_love',
            title: 'Can’t Help Falling In Love',
            artist: 'Elvis Presley',
          },
        ],
      },
      {
        title: 'Stax Soul',
        blurb:
          'Stax Records on East McLemore Avenue becomes the home of Southern soul, with Booker T. & the M.G.’s, Otis Redding, Sam & Dave and later Isaac Hayes. Its integrated house band plays a raw, horn-driven sound, gritty where Motown is polished. In the 1970s, another Memphis label adds a smoother side.',
        eventId: 'evt-soul-memphis-1962',
        songs: [
          {
            id: 'these_arms_of_mine',
            title: 'These Arms Of Mine',
            artist: 'Otis Redding',
          },
          { id: 'soul_man', title: 'Soul Man', artist: 'Sam and Dave' },
        ],
      },
      {
        title: 'Hi Records',
        blurb:
          'Al Green releases “Let’s Stay Together” on Hi Records, produced by Willie Mitchell at Royal Studios. Green’s tender falsetto rides tremolo guitar, lush strings and the Hi Rhythm Section’s locked-in groove, and the album sells over four million copies. Memphis is now a soul capital beyond Stax.',
        eventId: 'evt-al-green-memphis-1972',
        songs: [
          {
            id: 'lets_stay_together',
            title: 'Let’s Stay Together',
            artist: 'Al Green',
          },
          {
            id: 'love_and_happiness',
            title: 'Love And Happiness',
            artist: 'Al Green',
          },
        ],
      },
    ],
    ['blues', 'rock', 'rnb'],
  ),
  cityTour(
    'dakar',
    'Griot roots, Afro-Cuban bands, mbalax and Senegal’s hip-hop',
    [
      {
        title: 'Griots & the Blues',
        blurb:
          'As West African nations gain independence, musicians and scholars trace the blues back to the Wolof and Mandinka griots of Senegal and Gambia. Griots play kora, xalam and balafon, and the one-stringed xalam is recognized as an ancestor of the banjo. In Dakar, bands begin mixing these roots with Cuban son.',
        eventId: 'evt-diaspora-dakar-blues-roots-1960',
      },
      {
        title: 'Orchestra Baobab',
        blurb:
          'At Dakar’s Club Baobab, Orchestra Baobab blends Wolof griot traditions, Cuban son and Mandinka kora into a cosmopolitan sound. With the Star Band de Dakar, which spawns Youssou N’Dour’s Étoile de Dakar, they lay the foundation for mbalax. By the late 1980s, electric mbalax rules Senegal.',
        eventId: 'evt-mbalax-dakar-1970',
      },
      {
        title: 'Fula Folk',
        blurb:
          'Baaba Maal, a Fula singer from the remote town of Podor, teams with blind guitarist Mansour Seck on “Djam Leelii.” Its acoustic Pulaar folk songs offer a quiet counterpoint to the electric mbalax dominating Senegal. Mbalax’s biggest star is about to polish it further.',
        eventId: 'evt-afropop-dakar-1989-maal',
      },
      {
        title: 'Mbalax',
        blurb:
          'Youssou N’Dour, already Senegal’s biggest star, releases “Set,” turning sabar-drum-driven Wolof mbalax into sophisticated pop. His tenor voice and the Super Étoile de Dakar’s tight arrangements catch Peter Gabriel’s attention, on the way to “7 Seconds.” Meanwhile, young Dakar rappers are listening to the Bronx.',
        eventId: 'evt-mbalax-dakar-1990-ndour',
      },
      {
        title: 'Hip-Hop in Wolof',
        blurb:
          'Positive Black Soul take golden-age Bronx hip hop and channel it through the Wolof language, mbalax rhythms and griot storytelling. They become Senegal’s first hip-hop group to win international recognition. Their success sparks a Francophone African hip-hop movement, carrying the griot’s storytelling into a new form.',
        eventId: 'evt-hiphop-dakar-1991',
      },
    ],
    ['african'],
  ),
  cityTour(
    'vienna',
    'Haydn, Mozart, Beethoven, Schubert and the break with tonality',
    [
      {
        title: 'Haydn',
        blurb:
          'Joseph Haydn becomes Vice-Kapellmeister to Prince Esterhazy at Eisenstadt, near Vienna, beginning a 30-year post. He writes 104 symphonies and 68 string quartets and shapes sonata form, the four-movement symphony and the modern string quartet. He also mentors the young Mozart.',
        eventId: 'evt-haydn-vienna-1761',
      },
      {
        title: 'Mozart',
        blurb:
          'Mozart premieres “The Marriage of Figaro” at Vienna’s Burgtheater, an opera that gives servants more emotional depth than their masters. In his last five years he also writes Don Giovanni, The Magic Flute, his last three symphonies and the Requiem. Next, Beethoven pushes the Classical style toward Romantic drama.',
        eventId: 'evt-mozart-vienna-1786',
      },
      {
        title: 'Beethoven',
        blurb:
          'In a four-hour concert at the Theater an der Wien, Beethoven premieres his Fifth and Sixth Symphonies, plus the Fourth Piano Concerto and the Choral Fantasy. The Fifth’s journey from darkness to triumph becomes the model of Romantic heroism. Meanwhile, a teenager is changing what a song can be.',
        eventId: 'evt-beethoven-vienna-1808',
      },
      {
        title: 'Schubert & Song',
        blurb:
          'At seventeen, Franz Schubert sets Goethe’s poem “Gretchen am Spinnrade,” with a piano figure that captures a spinning wheel and the singer’s turmoil. He goes on to write over 600 Lieder and nine symphonies, and his Schubertiade evenings shape Vienna’s salon culture. By 1900, the city is still classical music’s center.',
        eventId: 'evt-schubert-vienna-1814',
      },
      {
        title: 'Mahler’s Vienna',
        blurb:
          'Gustav Mahler directs the Vienna Court Opera and makes it one of the most respected opera houses anywhere. In the same city, Arnold Schoenberg begins composing, developing ideas that will shatter tonal music. Twenty years later, he does exactly that.',
        eventId: 'evt-classical-vienna-1900',
      },
      {
        title: 'Twelve Tones',
        blurb:
          'Schoenberg announces his “method of composing with twelve tones related only to one another,” a new way to organize music after the collapse of tonality. His students Berg and Webern join him in the Second Viennese School. From Haydn’s symphonies to Schoenberg’s twelve tones, Vienna keeps rewriting the rules.',
        eventId: 'evt-schoenberg-vienna-1921',
      },
    ],
    [],
  ),
  cityTour(
    'chicago',
    'Hot jazz, gospel, electric blues, soul, house and South Side rap',
    [
      {
        title: 'Hot Five',
        blurb:
          'Louis Armstrong, urged by Lil Hardin Armstrong to leave King Oliver’s band, records with his Hot Five and Hot Seven for OKeh Records in Chicago. Tracks like “West End Blues” and “Heebie Jeebies” make the solo the center of jazz and turn scat singing into an art. A few years later, the blues walks into church.',
        eventId: 'evt-jazz-armstrong-hotfive-chicago-1925',
        songs: [
          {
            id: 'what_a_wonderful_world',
            title: 'What A Wonderful World',
            artist: 'Louis Armstrong',
          },
        ],
      },
      {
        title: 'Gospel',
        blurb:
          'Thomas A. Dorsey, once a barrelhouse blues pianist called “Georgia Tom,” fuses the feeling of the blues with the spirituals and hymns of the Black church at Pilgrim Baptist Church. His “Take My Hand, Precious Lord” becomes a gospel standard. Next, the blues itself plugs in.',
        eventId: 'evt-diaspora-chicago-gospel-1932',
      },
      {
        title: 'Chess Blues',
        blurb:
          'Muddy Waters, Howlin’ Wolf and Little Walter record at Chess Records on South Michigan Avenue, amplifying Delta blues with electric guitars and harmonicas. The Chicago blues sound crosses the Atlantic and inspires The Rolling Stones. In the 1970s, Chicago soul takes on the movies.',
        eventId: 'evt-rnb-chicago-1955',
      },
      {
        title: 'Superfly',
        blurb:
          'Curtis Mayfield’s “Superfly” soundtrack critiques the cycle of poverty and addiction that the film itself glamorizes. Built on wah-wah guitar, soaring strings and Mayfield’s falsetto, the album outsells the film. A decade later, a South Side club gives the world a new dance music.',
        eventId: 'evt-curtis-mayfield-chicago-1972',
        songs: [
          { id: 'move_on_up', title: 'Move On Up', artist: 'Curtis Mayfield' },
        ],
      },
      {
        title: 'House',
        blurb:
          'At the Warehouse nightclub on the South Side, Frankie Knuckles blends disco, electronic beats and soul vocals on a Roland drum machine. House music is born and becomes a foundation of modern dance music. Chicago’s next big sound comes from its rappers.',
        eventId: 'evt-house-chicago-1984',
      },
      {
        title: 'South Side Rap',
        blurb:
          'Chance the Rapper’s “Coloring Book” becomes the first streaming-only album to win a Grammy, for Best Rap Album. Its gospel choirs and jazz horns echo the city’s church and jazz roots. It carries Chicago’s hip hop line from Common and Kanye West to a new, community-minded generation.',
        eventId: 'evt-hiphop-chicago-2016-chancetherapper',
      },
    ],
    ['jazz', 'blues', 'funk', 'electronic', 'hip-hop'],
  ),
];

export const GUIDED_TOURS: GuidedTour[] = [...REGION_TOURS, ...CITY_TOURS];

export function getTour(id: string): GuidedTour | undefined {
  return GUIDED_TOURS.find((t) => t.id === id);
}

/**
 * Resolve a tour's stops to concrete camera targets. Fills lat/lng from CITIES
 * for `cityId` stops (unless explicit lat/lng given) and drops any stop whose
 * coordinates can't be resolved.
 */
export function resolveTourStops(tour: GuidedTour): ResolvedTourStop[] {
  const resolved: ResolvedTourStop[] = [];
  for (const stop of tour.stops) {
    let lat = stop.lat;
    let lng = stop.lng;
    if ((lat == null || lng == null) && stop.cityId) {
      const city = CITIES.find((c) => c.id === stop.cityId);
      if (city) [lat, lng] = city.coordinates;
    }
    if (lat == null || lng == null) continue;
    resolved.push({
      title: stop.title,
      blurb: stop.blurb,
      lat,
      lng,
      zoom: stop.zoom ?? REGION_STOP_ZOOM,
      cityId: stop.cityId,
      eventId: stop.eventId,
      songs: stop.songs,
    });
  }
  return resolved;
}
