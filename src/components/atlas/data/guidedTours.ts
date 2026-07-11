// ── Guided Tours — place-based, hand-authored globe tours ──────────────────
// Each region/city tile on the Globe dashboard deep-links into one of these
// tours (see GlobeRegionsCities). A tour is an ordered list of stops; the
// GuidedTourBar flies the camera to each stop and shows its blurb.
//
// Region tours open on a wide "region overview" stop and then step through the
// region's notable music cities. City tours stay anchored on the city and step
// through its musical eras. Stops reference a real `cityId` so coordinates come
// from CITIES (single source of truth) — authoring here is prose only.

import type { RegionId } from '@/components/atlas/types';
import { CITIES } from './cities';
import { REGIONS } from './regions';

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
}

export interface GuidedTour {
  /** `region-<regionId>` or `city-<cityId>`. */
  id: string;
  kind: 'region' | 'city';
  /** RegionId or city id this tour is about. */
  placeId: string;
  /** Shown in the tour bar header. */
  title: string;
  subtitle: string;
  stops: TourStop[];
}

export interface ResolvedTourStop {
  title: string;
  blurb: string;
  lat: number;
  lng: number;
  zoom: number;
  cityId?: string;
  eventId?: string;
}

export const regionTourId = (regionId: RegionId | string) =>
  `region-${regionId}`;
export const cityTourId = (cityId: string) => `city-${cityId}`;

const REGION_STOP_ZOOM = 7; // frames a city with some regional context
const CITY_STOP_BASE_ZOOM = 7.5; // city tours gently push in per stop

/** Build a region tour: a wide overview stop + one stop per city. */
function regionTour(
  regionId: RegionId,
  subtitle: string,
  overview: string,
  stops: Array<{ cityId: string; title: string; blurb: string; zoom?: number }>,
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
        zoom: s.zoom ?? REGION_STOP_ZOOM,
      })),
    ],
  };
}

/** Build a city tour: successive era stops, all anchored on the city. */
function cityTour(
  cityId: string,
  subtitle: string,
  stops: Array<{ title: string; blurb: string }>,
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
      // Push in a little each stop so the camera isn't perfectly static.
      zoom: CITY_STOP_BASE_ZOOM + i * 0.6,
    })),
  };
}

// ── Region tours (all 18) ─────────────────────────────────────────────────
const REGION_TOURS: GuidedTour[] = [
  regionTour(
    'north-america',
    "How the American South's Black musical traditions reshaped the world",
    'The United States and Canada gave the 20th century its dominant popular musics — nearly all rooted in the African-American South and carried north by the Great Migration.',
    [
      {
        cityId: 'new-orleans',
        title: 'New Orleans, Louisiana',
        blurb:
          'Where brass bands, ragtime, blues and Caribbean rhythm fused into jazz around 1900 — the first great American art form.',
      },
      {
        cityId: 'memphis',
        title: 'Memphis, Tennessee',
        blurb:
          "Beale Street blues, Sun Records rock 'n' roll and Stax soul all radiated from this Mississippi River city.",
      },
      {
        cityId: 'chicago',
        title: 'Chicago, Illinois',
        blurb:
          'The Great Migration plugged the Delta blues into electric amps here, and decades later the same city birthed house music.',
      },
      {
        cityId: 'detroit',
        title: 'Detroit, Michigan',
        blurb:
          "Berry Gordy's Motown minted the sound of young America, and in the 1980s the city invented techno.",
      },
      {
        cityId: 'nashville',
        title: 'Nashville, Tennessee',
        blurb:
          'The Grand Ole Opry and Music Row made this the capital of country music and a songwriting powerhouse.',
      },
    ],
  ),
  regionTour(
    'central-america',
    'Afro-Caribbean rhythms that conquered global dance floors',
    'The islands and isthmus between the Americas turned African, Spanish and Indigenous inheritances into son, reggae, salsa and reggaeton.',
    [
      {
        cityId: 'havana',
        title: 'Havana, Cuba',
        blurb:
          'Spanish guitar met African percussion in the clave-driven son, which grew into mambo, cha-cha and modern salsa.',
      },
      {
        cityId: 'kingston',
        title: 'Kingston, Jamaica',
        blurb:
          "Sound systems, ska and rocksteady evolved into reggae — Bob Marley's global gospel — then dub and dancehall.",
      },
      {
        cityId: 'san-juan',
        title: 'San Juan, Puerto Rico',
        blurb:
          'Bomba and plena underpin the island that, with Panama and New York, gave the world reggaeton.',
      },
      {
        cityId: 'port-of-spain',
        title: 'Port of Spain, Trinidad',
        blurb:
          'Home of calypso, soca and the steelpan — the only acoustic instrument family invented in the 20th century.',
      },
    ],
  ),
  regionTour(
    'south-america',
    'From Afro-Brazilian drums to Andean panpipes and Argentine tango',
    "A continent of staggering musical range, from the Atlantic's Afro-Brazilian rhythms to the tango of the River Plate and the flutes of the Andes.",
    [
      {
        cityId: 'rio',
        title: 'Rio de Janeiro, Brazil',
        blurb:
          'Samba was born in its hillside neighbourhoods; decades later bossa nova cooled it into worldwide sophistication.',
      },
      {
        cityId: 'salvador',
        title: 'Salvador, Brazil',
        blurb:
          'The heart of Afro-Brazilian culture, where Candomblé drumming feeds axé, samba-reggae and the blocos of Carnival.',
      },
      {
        cityId: 'buenos-aires',
        title: 'Buenos Aires, Argentina',
        blurb:
          "The melancholy tango grew in the port city's immigrant tenements before conquering the ballrooms of the world.",
      },
      {
        cityId: 'barranquilla',
        title: 'Barranquilla, Colombia',
        blurb:
          "Colombia's Caribbean coast fused African, Indigenous and Spanish threads into cumbia and vallenato.",
      },
    ],
  ),
  regionTour(
    'north-europe',
    'Nordic and Celtic folk, sacred choirs and heavy metal',
    'The Nordic countries and Ireland balance deep folk traditions — joik, ballad, Celtic dance — with a striking modern output from pop to extreme metal.',
    [
      {
        cityId: 'dublin',
        title: 'Dublin, Ireland',
        blurb:
          'Sean-nós song, fiddle and uilleann pipes anchor an Irish tradition that later gave the world The Dubliners and U2.',
      },
      {
        cityId: 'copenhagen',
        title: 'Copenhagen, Denmark',
        blurb:
          'A Nordic jazz capital since the 1960s, when American exiles like Dexter Gordon made it home.',
      },
      {
        cityId: 'stockholm',
        title: 'Stockholm, Sweden',
        blurb:
          'From ABBA to a globe-spanning pop-songwriting industry, Sweden punches far above its size.',
      },
      {
        cityId: 'reykjavik',
        title: 'Reykjavik, Iceland',
        blurb:
          'A tiny, tight-knit scene that produced Björk, Sigur Rós and a distinctive atmospheric sound.',
      },
    ],
  ),
  regionTour(
    'west-europe',
    'Classical masters, flamenco fire and club-culture revolutions',
    'Western Europe wrote the classical canon and, in the 20th century, exported rock, punk, flamenco and electronic dance music.',
    [
      {
        cityId: 'vienna',
        title: 'Vienna, Austria',
        blurb:
          'The imperial capital of Mozart, Beethoven, Schubert and the waltz — for a century the centre of Western classical music.',
      },
      {
        cityId: 'seville',
        title: 'Seville, Spain',
        blurb:
          "Andalusia's crucible of flamenco, where Romani, Moorish and Andalusian traditions meet in song, guitar and dance.",
      },
      {
        cityId: 'paris',
        title: 'Paris, France',
        blurb:
          'From chanson and musette to the Jazz Age and French Touch house, the city has long been a magnet for musical reinvention.',
      },
      {
        cityId: 'london',
        title: 'London, England',
        blurb:
          'British blues, punk, and a lineage of Black British sound — jungle, grime, drill — remade global pop again and again.',
      },
      {
        cityId: 'berlin',
        title: 'Berlin, Germany',
        blurb:
          "Kraftwerk's electronics and, after 1989, the techno of its warehouse clubs made Berlin an electronic-music capital.",
      },
    ],
  ),
  regionTour(
    'east-europe',
    'Balkan brass, Roma virtuosity and ancient vocal harmony',
    "From the Baltic to the Balkans, Eastern Europe preserves some of the world's richest vocal and dance traditions, often carried by Roma musicians.",
    [
      {
        cityId: 'athens',
        title: 'Athens, Greece',
        blurb:
          "Rebetiko — the 'Greek blues' of the urban underworld — grew from refugees of Asia Minor around the bouzouki.",
      },
      {
        cityId: 'belgrade',
        title: 'Belgrade, Serbia',
        blurb:
          'The frenetic Balkan brass tradition, celebrated at the Guča trumpet festival, meets modern turbo-folk.',
      },
      {
        cityId: 'sofia',
        title: 'Sofia, Bulgaria',
        blurb:
          "Bulgaria's asymmetric rhythms and haunting female choirs — 'Le Mystère des Voix Bulgares' — stunned the world.",
      },
      {
        cityId: 'bucharest',
        title: 'Bucharest, Romania',
        blurb:
          'The lăutari, hereditary Roma musicians, carry a dazzling virtuosic tradition from wedding song to modern manele.',
      },
    ],
  ),
  regionTour(
    'north-asia',
    'Overtone singing and the sound of the Siberian steppe',
    'Across the vast Siberian expanse, nomadic peoples developed extraordinary vocal arts — above all the overtone singing of Tuva and its neighbours.',
    [
      {
        cityId: 'kyzyl',
        title: 'Kyzyl, Tuva',
        blurb:
          'The capital of Tuvan khöömei, where a single singer sounds a low drone and a whistling melody at once, echoing wind and river.',
      },
    ],
  ),
  regionTour(
    'central-asia',
    'Silk Road maqom, epic bards and long-necked lutes',
    'The Silk Road cities of Central Asia cultivated the classical Shashmaqom suites and a living tradition of epic-singing bards.',
    [
      {
        cityId: 'bukhara',
        title: 'Bukhara, Uzbekistan',
        blurb:
          'A cradle of Shashmaqom, the classical suite tradition of sung poetry shared between Uzbek and Tajik cultures.',
      },
      {
        cityId: 'tashkent',
        title: 'Tashkent, Uzbekistan',
        blurb:
          'A hub of Uzbek maqom and the long-necked dutar and tanbur lutes.',
      },
      {
        cityId: 'almaty',
        title: 'Almaty, Kazakhstan',
        blurb:
          'Home of the Kazakh dombra and the küy — instrumental tone-poems that narrate stories without words.',
      },
      {
        cityId: 'bishkek',
        title: 'Bishkek, Kyrgyzstan',
        blurb:
          'Where manaschi bards recite the vast Manas epic and the komuz lute leads Kyrgyz music.',
      },
    ],
  ),
  regionTour(
    'west-asia',
    'The maqam modal system, from Ottoman court to Arab pop',
    'The Middle East gave the world the maqam — an intricate system of modes and microtones — heard from Istanbul to Baghdad.',
    [
      {
        cityId: 'istanbul',
        title: 'Istanbul, Turkey',
        blurb:
          'Ottoman classical music, Sufi ceremony and Turkish makam meet in the city bridging Europe and Asia.',
      },
      {
        cityId: 'beirut',
        title: 'Beirut, Lebanon',
        blurb:
          'The Rahbani brothers and the beloved Fairuz made Beirut a capital of modern Arabic song.',
      },
      {
        cityId: 'baghdad',
        title: 'Baghdad, Iraq',
        blurb:
          'Home of the Iraqi maqam, an ornate classical vocal tradition performed with the santur and joza.',
      },
      {
        cityId: 'tehran',
        title: 'Tehran, Iran',
        blurb:
          'The centre of Persian classical music, whose radif repertoire is organised around the dastgah modes.',
      },
    ],
  ),
  regionTour(
    'east-asia',
    'Court traditions, the pentatonic scale and the K-pop wave',
    'East Asia balances ancient court and folk musics built on pentatonic scales with the world-conquering pop industries of Seoul and Tokyo.',
    [
      {
        cityId: 'kyoto',
        title: 'Kyoto, Japan',
        blurb:
          'The old imperial capital preserves gagaku court music and the koto, shakuhachi and shamisen of classical Japan.',
      },
      {
        cityId: 'beijing',
        title: 'Beijing, China',
        blurb:
          'Home of Peking opera and the guqin zither, and later a cradle of Chinese rock.',
      },
      {
        cityId: 'seoul',
        title: 'Seoul, South Korea',
        blurb:
          'From the folk pansori epic to the global juggernaut of K-pop, led by BTS and BLACKPINK.',
      },
      {
        cityId: 'tokyo',
        title: 'Tokyo, Japan',
        blurb:
          "City pop, enka and a vast J-pop industry radiate from one of the world's largest music markets.",
      },
    ],
  ),
  regionTour(
    'south-asia',
    'Raga and tala, from temple and court to Bollywood',
    "The Indian subcontinent's classical systems — Hindustani in the north, Carnatic in the south — organise music around raga (melody) and tala (rhythm).",
    [
      {
        cityId: 'varanasi',
        title: 'Varanasi, India',
        blurb:
          'The sacred city on the Ganges is a heartland of Hindustani classical music, sitar and tabla.',
      },
      {
        cityId: 'chennai',
        title: 'Chennai, India',
        blurb:
          "The capital of Carnatic music, whose December season is one of the world's great concert gatherings.",
      },
      {
        cityId: 'lahore',
        title: 'Lahore, Pakistan',
        blurb:
          'A centre of qawwali, the ecstatic Sufi devotional song raised to global fame by Nusrat Fateh Ali Khan.',
      },
      {
        cityId: 'mumbai',
        title: 'Mumbai, India',
        blurb:
          "Home of Bollywood's playback singers and film songs — the soundtrack of a billion listeners.",
      },
    ],
  ),
  regionTour(
    'southeast-asia',
    'Gongs, gamelan and the pop of the archipelago',
    "From the bronze gamelan of Indonesia to the luk thung of Thailand, Southeast Asia's musics prize interlocking ensembles and ornamented voice.",
    [
      {
        cityId: 'jakarta',
        title: 'Jakarta, Indonesia',
        blurb:
          "Gateway to the gamelan traditions of Java, and home of dangdut, Indonesia's beloved pop.",
      },
      {
        cityId: 'bangkok',
        title: 'Bangkok, Thailand',
        blurb:
          "The centre of luk thung and mor lam, Thailand's rural-rooted popular songs.",
      },
      {
        cityId: 'manila',
        title: 'Manila, Philippines',
        blurb:
          "Kundiman ballads and a deep pop tradition — the Philippines is one of Asia's great singing cultures.",
      },
      {
        cityId: 'hanoi',
        title: 'Hanoi, Vietnam',
        blurb: 'Guardian of ca trù chamber song and the đàn bầu monochord.',
      },
    ],
  ),
  regionTour(
    'north-africa',
    "Andalusian suites, Gnawa trance and the diva's orchestra",
    'The Maghreb and Egypt blend Arab-Andalusian classical suites, Berber and Gnawa traditions, and the grand orchestral song of Cairo.',
    [
      {
        cityId: 'cairo',
        title: 'Cairo, Egypt',
        blurb:
          "The Hollywood of Arabic music, home of Umm Kulthum's epic concerts and, lately, street-electronic mahraganat.",
      },
      {
        cityId: 'fez',
        title: 'Fez, Morocco',
        blurb:
          'A stronghold of Andalusi classical music, carried across the strait after 1492.',
      },
      {
        cityId: 'marrakech',
        title: 'Marrakech, Morocco',
        blurb:
          'The trance music of the Gnawa, descendants of enslaved West Africans, with its iron castanets and guembri.',
      },
      {
        cityId: 'algiers',
        title: 'Algiers, Algeria',
        blurb:
          'Home of chaabi, and gateway to raï, the rebellious pop of Oran that went global in the 1980s.',
      },
    ],
  ),
  regionTour(
    'central-africa',
    'Congolese rumba and the guitar sound of a continent',
    'Central Africa gave Africa its most influential modern pop: Congolese rumba and soukous, whose guitars are heard across the continent.',
    [
      {
        cityId: 'kinshasa',
        title: 'Kinshasa, DR Congo',
        blurb:
          'Cuban records returning across the Atlantic sparked Congolese rumba here, which evolved into fast, guitar-driven soukous.',
      },
      {
        cityId: 'brazzaville',
        title: 'Brazzaville, Congo',
        blurb:
          'Across the river from Kinshasa, a twin capital of rumba and its dance-floor offspring.',
      },
      {
        cityId: 'luanda',
        title: 'Luanda, Angola',
        blurb:
          'Home of semba and the romantic kizomba, plus the electronic kuduro that spread worldwide.',
      },
      {
        cityId: 'douala',
        title: 'Douala, Cameroon',
        blurb:
          "The birthplace of makossa, whose basslines circled the globe via Manu Dibango's 'Soul Makossa'.",
      },
    ],
  ),
  regionTour(
    'west-africa',
    'From griot praise-song to global Afrobeats',
    'West Africa is the wellspring of the griot tradition and of rhythms that, carried across the Atlantic, seeded blues, jazz and hip-hop — and today it exports Afrobeats.',
    [
      {
        cityId: 'bamako',
        title: 'Bamako, Mali',
        blurb:
          "Mali's capital, where ancient griot lineages birthed Ali Farka Touré's desert blues and Oumou Sangaré's Wassoulou.",
      },
      {
        cityId: 'accra',
        title: 'Accra, Ghana',
        blurb:
          'The home of highlife, the guitar-and-horns dance music that swept West Africa from the 1950s.',
      },
      {
        cityId: 'lagos',
        title: 'Lagos, Nigeria',
        blurb:
          'Fela Kuti forged Afrobeat here in the 1970s; today the city drives the global Afrobeats explosion.',
      },
      {
        cityId: 'dakar',
        title: 'Dakar, Senegal',
        blurb:
          "Where Youssou N'Dour's mbalax fused Wolof drumming with Cuban son into a national sound.",
      },
    ],
  ),
  regionTour(
    'east-africa',
    'Ethio-jazz, taarab and the benga guitar',
    "East Africa ranges from the unique scales of Ethiopian music to the Swahili coast's taarab and Kenya's benga guitar pop.",
    [
      {
        cityId: 'addis-ababa',
        title: 'Addis Ababa, Ethiopia',
        blurb:
          "Home of Ethiopia's distinctive pentatonic modes and the 'Ethio-jazz' fusion of Mulatu Astatke.",
      },
      {
        cityId: 'nairobi',
        title: 'Nairobi, Kenya',
        blurb:
          "The centre of benga, the fast, bright guitar pop that became Kenya's national dance music.",
      },
      {
        cityId: 'dar-es-salaam',
        title: 'Dar es Salaam, Tanzania',
        blurb:
          'A capital of Swahili taarab and, later, the bongo flava that dominates East African pop.',
      },
      {
        cityId: 'antananarivo',
        title: 'Antananarivo, Madagascar',
        blurb:
          "Gateway to Madagascar's singular music, from salegy to the valiha tube-zither.",
      },
    ],
  ),
  regionTour(
    'south-africa',
    'Mbube harmony, township jazz and amapiano',
    "Southern Africa's choral harmony and township jazz gave the world Ladysmith Black Mambazo and, more recently, the global groove of amapiano.",
    [
      {
        cityId: 'johannesburg',
        title: 'Johannesburg, South Africa',
        blurb:
          "The mines and townships birthed marabi, mbaqanga and kwaito — and lately amapiano conquered the world's dance floors.",
      },
      {
        cityId: 'cape-town',
        title: 'Cape Town, South Africa',
        blurb:
          'Home of Cape jazz and the goema rhythms of the Kaapse Klopse carnival.',
      },
      {
        cityId: 'harare',
        title: 'Harare, Zimbabwe',
        blurb:
          'Where Thomas Mapfumo translated the sacred mbira into electric chimurenga music.',
      },
      {
        cityId: 'maputo',
        title: 'Maputo, Mozambique',
        blurb:
          "The birthplace of marrabenta, Mozambique's buoyant urban dance music.",
      },
    ],
  ),
  regionTour(
    'oceania',
    'Songlines, Māori waiata and Pacific harmony',
    "From the didgeridoo and songlines of Aboriginal Australia to Māori waiata and Pacific island harmony, Oceania's music is deeply tied to land and voyage.",
    [
      {
        cityId: 'melbourne',
        title: 'Melbourne, Australia',
        blurb:
          "The engine of Australia's rock and indie scene, and a stage where Aboriginal artists like Yothu Yindi reached the world.",
      },
      {
        cityId: 'auckland',
        title: 'Auckland, New Zealand',
        blurb:
          'The largest Polynesian city, where Māori and Pasifika roots feed a distinctive reggae, soul and hip-hop scene.',
      },
      {
        cityId: 'suva',
        title: 'Suva, Fiji',
        blurb:
          'A Pacific crossroads of Fijian meke chant-dance and island reggae.',
      },
      {
        cityId: 'port-moresby',
        title: 'Port Moresby, Papua New Guinea',
        blurb:
          "Gateway to PNG's string-band music and the astonishing diversity of Melanesian song.",
      },
    ],
  ),
];

// ── City tours (the 12 featured Music Cities) ─────────────────────────────
const CITY_TOURS: GuidedTour[] = [
  cityTour('new-orleans', 'The birthplace of jazz', [
    {
      title: 'Congo Square',
      blurb:
        'On Sundays, enslaved and free Africans gathered in Congo Square to drum and dance — a rare survival of African rhythm that seeded everything to come.',
    },
    {
      title: 'Birth of Jazz',
      blurb:
        'Around 1900, brass bands, ragtime, blues and Creole song fused into jazz, with Buddy Bolden and a young Louis Armstrong.',
    },
    {
      title: 'Second Line & Brass',
      blurb:
        "The city's marching brass bands and 'second line' parades keep the street tradition alive to this day.",
    },
    {
      title: 'Rhythm & Beyond',
      blurb:
        "New Orleans R&B — Fats Domino, Professor Longhair, the Meters — laid deep foundations for funk and rock 'n' roll.",
    },
  ]),
  cityTour('kingston', 'Where reggae was born', [
    {
      title: 'Sound Systems',
      blurb:
        "In the 1950s mobile sound systems turned Kingston's streets into open-air dancehalls, and the DJs became stars.",
    },
    {
      title: 'Ska & Rocksteady',
      blurb:
        'Post-independence energy produced the horn-driven ska, then the slower, bass-forward rocksteady.',
    },
    {
      title: 'Reggae',
      blurb:
        'The one-drop groove and the conscious lyrics of Bob Marley and the Wailers carried Rastafari worldwide.',
    },
    {
      title: 'Dub & Dancehall',
      blurb:
        'Engineers like King Tubby remixed the riddim into echoing dub, and the deejay-led dancehall took over.',
    },
  ]),
  cityTour('havana', 'The clave at the heart of Latin music', [
    {
      title: 'Son Cubano',
      blurb:
        'Spanish guitar and African percussion locked into the clave to create son, the root of most Cuban popular music.',
    },
    {
      title: 'Mambo & Cha-Cha',
      blurb:
        "Big bands turned son into the mambo and cha-cha that swept the world's ballrooms mid-century.",
    },
    {
      title: "Salsa's Source",
      blurb:
        'Cuban forms, refashioned by musicians in New York, became the pan-Latin sound of salsa.',
    },
    {
      title: 'Buena Vista Revival',
      blurb:
        "In the 1990s the Buena Vista Social Club brought the island's veteran soneros back to global stages.",
    },
  ]),
  cityTour('salvador', 'The Afro-Brazilian soul of Bahia', [
    {
      title: 'Candomblé',
      blurb:
        'The drumming of the Candomblé religion preserves West African rhythm at the core of Bahian music.',
    },
    {
      title: 'Samba de Roda',
      blurb:
        "The circle samba of the Recôncavo is an ancestor of Rio's carnival samba, honoured by UNESCO.",
    },
    {
      title: 'Axé & Samba-Reggae',
      blurb:
        "Blocos like Olodum forged samba-reggae, and axé became Bahia's exuberant carnival pop.",
    },
    {
      title: 'Tropicália Roots',
      blurb:
        'Bahian artists Caetano Veloso and Gilberto Gil launched the Tropicália movement that remade Brazilian music.',
    },
  ]),
  cityTour('lagos', 'From highlife to global Afrobeats', [
    {
      title: 'Highlife & Jùjú',
      blurb:
        'Guitar-band highlife and the talking-drum jùjú of King Sunny Adé filled Lagos dancehalls.',
    },
    {
      title: 'Afrobeat',
      blurb:
        'Fela Kuti fused Yoruba rhythm, jazz and funk into Afrobeat — long, political, unstoppable grooves.',
    },
    {
      title: 'Afrobeats',
      blurb:
        "A new century's Lagos pop — Wizkid, Burna Boy, Davido — turned 'Afrobeats' into a worldwide sound.",
    },
    {
      title: 'Alté & Beyond',
      blurb:
        'A restless alternative scene keeps reinventing what Nigerian pop can be.',
    },
  ]),
  cityTour('new-york', 'The city of hip-hop, salsa and so much more', [
    {
      title: 'Jazz Uptown',
      blurb:
        "Harlem's Cotton Club and 52nd Street hosted the swing era and, in the 1940s, the bebop revolution.",
    },
    {
      title: 'Salsa',
      blurb:
        'Puerto Rican and Cuban musicians in the barrios refashioned son into the fiery salsa of the 1970s.',
    },
    {
      title: 'Hip-Hop',
      blurb:
        'At a 1973 Bronx block party, DJ Kool Herc looped the break — and hip-hop was born.',
    },
    {
      title: 'Disco & Punk',
      blurb:
        'From downtown lofts came disco and, at CBGB, the punk and new wave that reset rock.',
    },
  ]),
  cityTour('london', 'A restless engine of British and Black British sound', [
    {
      title: 'British Blues Boom',
      blurb:
        'In the 1960s London bands studied American blues and handed it back as rock — the Stones, the Yardbirds, Led Zeppelin.',
    },
    {
      title: 'Punk',
      blurb:
        '1976: the Sex Pistols and The Clash detonated punk, reggae-fuelled and furious.',
    },
    {
      title: 'Rave & Jungle',
      blurb:
        "Acid house, then the breakneck breakbeats of jungle and drum & bass, rose from the city's warehouses.",
    },
    {
      title: 'Grime & Drill',
      blurb:
        "East London's grime, and later UK drill, gave British youth a homegrown, globally exported voice.",
    },
  ]),
  cityTour('rio', 'Samba, bossa nova and the sound of Carnival', [
    {
      title: 'Samba',
      blurb:
        "In the hillside favelas of the early 1900s, samba took shape — soon the beating heart of Rio's Carnival.",
    },
    {
      title: 'Bossa Nova',
      blurb:
        'In 1950s Copacabana, João Gilberto and Tom Jobim cooled samba into the whispered sophistication of bossa nova.',
    },
    {
      title: 'Tropicália & MPB',
      blurb:
        "The 1960s brought Tropicália's fearless fusion and the broad river of Música Popular Brasileira.",
    },
    {
      title: 'Funk Carioca',
      blurb:
        "The favelas' baile funk turned Miami bass into one of Brazil's most vital street sounds.",
    },
  ]),
  cityTour('bamako', 'The griot heartland of the Mande world', [
    {
      title: 'Griot Tradition',
      blurb:
        'Bamako is a capital of the jali (griot) — hereditary musicians who are historians, praise-singers and kora masters.',
    },
    {
      title: 'Desert Blues',
      blurb:
        "From Mali's north came the hypnotic desert blues of Ali Farka Touré and Tinariwen.",
    },
    {
      title: 'Wassoulou',
      blurb:
        "Oumou Sangaré's Wassoulou music gave voice to a proudly female, hunters'-song tradition.",
    },
    {
      title: 'Modern Mali',
      blurb:
        'Kora virtuoso Toumani Diabaté and duos like Amadou & Mariam carry Malian music to the world.',
    },
  ]),
  cityTour('memphis', "Blues, rock 'n' roll and Southern soul", [
    {
      title: 'Beale Street Blues',
      blurb:
        "W.C. Handy published the first blues here, and Beale Street became the blues' urban home.",
    },
    {
      title: 'Sun Records',
      blurb:
        "At Sun, Sam Phillips recorded Howlin' Wolf, then a young Elvis Presley — and rock 'n' roll took off.",
    },
    {
      title: 'Stax Soul',
      blurb:
        "Stax Records built Southern soul — Otis Redding, Booker T. & the M.G.'s — with its raw, horn-driven sound.",
    },
    {
      title: 'Hi & Beyond',
      blurb:
        "Al Green's Hi Records added a smoother, deeper soul to the city's legacy.",
    },
  ]),
  cityTour('dakar', 'The mbalax capital of Senegal', [
    {
      title: 'Griot Roots',
      blurb:
        'Wolof and Serer griot traditions and the sabar drum underlie Senegalese music.',
    },
    {
      title: 'Cuban Currents',
      blurb:
        'Mid-century, Dakar bands adored Cuban son, laying the ground for a national fusion.',
    },
    {
      title: 'Mbalax',
      blurb:
        "Youssou N'Dour welded sabar drumming to that fusion, creating the electrifying mbalax.",
    },
    {
      title: 'Hip-Hop Galsen',
      blurb:
        "Dakar became one of Africa's great hip-hop cities, its MCs a force in public life.",
    },
  ]),
  cityTour('vienna', 'The classical capital of Europe', [
    {
      title: 'Viennese Classicism',
      blurb:
        'Haydn, Mozart and Beethoven made Vienna the centre of the Classical style around 1800.',
    },
    {
      title: 'The Waltz',
      blurb:
        "The Strauss family turned the whirling waltz into the city's — and the ballroom's — signature.",
    },
    {
      title: 'Schubert & Song',
      blurb:
        "Franz Schubert perfected the German art song (Lied) in the city's salons.",
    },
    {
      title: 'The Second Viennese School',
      blurb:
        'Schoenberg, Berg and Webern broke tonality itself, reshaping 20th-century music.',
    },
  ]),
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
    });
  }
  return resolved;
}
