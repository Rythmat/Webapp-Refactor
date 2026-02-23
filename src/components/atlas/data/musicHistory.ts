import type { HistoricalEvent } from '@/components/atlas/types'
import { CITIES } from './cities'

export const MUSIC_HISTORY: HistoricalEvent[] = [
  {
    id: 'evt-jazz-nola-1923',
    year: 1923,
    location: { lat: 29.9511, lng: -90.0715, city: 'New Orleans', country: 'US' },
    genre: ['Jazz'],
    title: "King Oliver's Creole Jazz Band records first sides",
    description: 'King Oliver and his Creole Jazz Band, featuring a young Louis Armstrong on second cornet, record their first sessions for Gennett Records in Richmond, Indiana. These recordings capture the sound of New Orleans jazz and mark a pivotal moment in recorded music history.',
    tags: ['king oliver', 'louis armstrong', 'creole jazz band', 'gennett records', 'dixieland', 'brass'],
  },
  {
    id: 'evt-blues-memphis-1951',
    year: 1951,
    location: { lat: 35.1495, lng: -90.049, city: 'Memphis', country: 'US' },
    genre: ['Blues', 'Rock & Roll'],
    title: 'Ike Turner records "Rocket 88" at Sun Studio',
    description: 'Often cited as one of the first rock and roll records, "Rocket 88" is recorded by Jackie Brenston and his Delta Cats (Ike Turner\'s band) at Sam Phillips\' Memphis Recording Service. The distorted guitar tone, caused by a damaged amplifier, becomes a landmark in music history.',
    tags: ['ike turner', 'rocket 88', 'sun studio', 'sam phillips', 'rock and roll origins'],
  },
  {
    id: 'evt-elvis-memphis-1954',
    year: 1954,
    location: { lat: 35.1495, lng: -90.049, city: 'Memphis', country: 'US' },
    genre: ['Rock & Roll'],
    title: 'Elvis Presley records at Sun Studio',
    description: 'Elvis Presley records "That\'s All Right" at Sun Studio, blending blues, country, and gospel into a new sound. Sam Phillips finally finds what he\'s been looking for: a white man who can sing with the feel of a Black artist. Rock and roll explodes.',
    tags: ['elvis presley', 'sun studio', 'sam phillips', 'thats all right', 'rockabilly'],
  },
  {
    id: 'evt-doors-la-1965',
    year: 1965,
    location: { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', country: 'US' },
    genre: ['Rock', 'Psychedelic'],
    title: 'The Doors form in Venice Beach',
    description: 'Jim Morrison and Ray Manzarek meet on Venice Beach and form The Doors. Their blend of psychedelic rock, blues, and Morrison\'s poetic lyrics will make them one of the most iconic bands of the 1960s LA scene, alongside Love, The Byrds, and Buffalo Springfield.',
    tags: ['the doors', 'jim morrison', 'ray manzarek', 'venice beach', 'sunset strip', 'whisky a go go', 'psychedelic rock'],
  },
  {
    id: 'evt-motown-detroit-1966',
    year: 1966,
    location: { lat: 42.3314, lng: -83.0458, city: 'Detroit', country: 'US' },
    genre: ['Motown', 'Soul', 'R&B'],
    title: 'Motown Records hits its golden era',
    description: 'Berry Gordy\'s Motown Records reaches its commercial peak with The Supremes, The Temptations, Stevie Wonder, and Marvin Gaye dominating the charts. Hitsville U.S.A. on West Grand Boulevard becomes the most successful independent record label in history.',
    tags: ['berry gordy', 'hitsville', 'the supremes', 'temptations', 'stevie wonder', 'marvin gaye', 'diana ross'],
  },
  {
    id: 'evt-bossanova-rio-1962',
    year: 1962,
    location: { lat: -22.9068, lng: -43.1729, city: 'Rio de Janeiro', country: 'Brazil' },
    genre: ['Bossa Nova', 'Jazz'],
    title: '"The Girl from Ipanema" is recorded',
    description: 'Antonio Carlos Jobim and Joao Gilberto record "Garota de Ipanema" (The Girl from Ipanema) with Stan Getz. The song becomes the second most recorded song in history after "Yesterday", bringing bossa nova to the world stage.',
    tags: ['jobim', 'joao gilberto', 'stan getz', 'ipanema', 'astrud gilberto', 'brazilian music'],
  },
  {
    id: 'evt-punk-london-1976',
    year: 1976,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Punk'],
    title: 'Sex Pistols play the 100 Club Punk Special',
    description: 'The Sex Pistols headline the 100 Club Punk Special festival on Oxford Street, alongside The Clash, Siouxsie and the Banshees, and Subway Sect. This two-night event crystallizes punk rock as a movement and launches a cultural revolution in British music.',
    tags: ['sex pistols', 'the clash', 'siouxsie', '100 club', 'johnny rotten', 'malcolm mclaren', 'anarchy'],
  },
  {
    id: 'evt-reggae-kingston-1977',
    year: 1977,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Reggae'],
    title: "Bob Marley releases 'Exodus'",
    description: 'After surviving an assassination attempt in Kingston, Bob Marley records Exodus in London. The album is later named the greatest album of the 20th century by Time magazine. Tracks like "Jamming", "One Love", and "Three Little Birds" become global anthems.',
    tags: ['bob marley', 'exodus', 'wailers', 'one love', 'jamming', 'island records', 'rastafari'],
  },
  {
    id: 'evt-disco-nyc-1977',
    year: 1977,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Disco'],
    title: 'Studio 54 opens its doors',
    description: 'Studio 54 opens in a former CBS studio on West 54th Street in Manhattan. The legendary nightclub becomes the epicenter of disco culture, attracting celebrities, artists, and musicians. DJs pioneer the art of mixing records into continuous dance sets.',
    tags: ['studio 54', 'disco', 'nightclub', 'manhattan', 'dj culture', 'donna summer', 'bee gees'],
  },
  {
    id: 'evt-hiphop-nyc-1984',
    year: 1984,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Hip Hop', 'Rap'],
    title: 'Run-DMC releases self-titled debut album',
    description: 'Run-DMC releases their debut album, becoming the first hip hop act to achieve mainstream crossover success. Their hard-hitting beats and street-smart lyrics from Hollis, Queens define the sound of hip hop for a generation and pave the way for rap as a dominant genre.',
    tags: ['run-dmc', 'hollis queens', 'def jam', 'rick rubin', 'russell simmons', 'sucker mcs', 'rap debut'],
  },
  {
    id: 'evt-techno-berlin-1991',
    year: 1991,
    location: { lat: 52.52, lng: 13.405, city: 'Berlin', country: 'Germany' },
    genre: ['Techno', 'Electronic'],
    title: 'Tresor club opens in a former bank vault',
    description: 'Tresor opens in the vault of the former Wertheim department store near Potsdamer Platz. In the euphoria following German reunification, the club becomes ground zero for Berlin\'s techno scene, connecting Detroit techno pioneers with a new European audience.',
    tags: ['tresor', 'techno', 'detroit connection', 'reunification', 'underground', 'jeff mills', 'juan atkins'],
  },
  {
    id: 'evt-grunge-seattle-1991',
    year: 1991,
    location: { lat: 47.6062, lng: -122.3321, city: 'Seattle', country: 'US' },
    genre: ['Grunge', 'Alternative Rock'],
    title: "Nirvana releases 'Nevermind'",
    description: 'Nirvana\'s second album Nevermind, featuring "Smells Like Teen Spirit", is released on DGC Records. It unexpectedly dethrones Michael Jackson from #1 on the Billboard 200, bringing grunge and alternative rock from the Seattle underground to global dominance.',
    tags: ['nirvana', 'kurt cobain', 'nevermind', 'smells like teen spirit', 'sub pop', 'dgc', 'generation x'],
  },
  {
    id: 'evt-afrobeats-lagos-2010',
    year: 2010,
    location: { lat: 6.5244, lng: 3.3792, city: 'Lagos', country: 'Nigeria' },
    genre: ['Afrobeats'],
    title: 'Afrobeats goes global from Lagos',
    description: 'A new generation of Nigerian artists including Wizkid, Davido, and Burna Boy begin fusing West African rhythms with dancehall, hip hop, and R&B. Powered by social media and diaspora networks, Lagos becomes the epicenter of a global Afrobeats movement.',
    tags: ['wizkid', 'davido', 'burna boy', 'afropop', 'naija', 'starboy', 'afrofusion', 'lagos nightlife'],
  },
  {
    id: 'evt-hiphop-atlanta-2003',
    year: 2003,
    location: { lat: 33.749, lng: -84.388, city: 'Atlanta', country: 'US' },
    genre: ['Hip Hop', 'Southern Hip Hop', 'Crunk'],
    title: "OutKast's 'Speakerboxxx/The Love Below' wins Album of the Year",
    description: "OutKast's double album Speakerboxxx/The Love Below wins the Grammy for Album of the Year, cementing Atlanta as hip hop's new capital. The city's influence grows with Lil Jon's crunk, T.I.'s trap origins, and a wave of Southern innovation.",
    tags: ['outkast', 'andre 3000', 'big boi', 'grammy', 'crunk', 'lil jon', 'southern rap', 'dirty south'],
  },

  // --- Classical & Early 20th Century ---
  {
    id: 'evt-classical-vienna-1900',
    year: 1900,
    location: { lat: 48.2082, lng: 16.3738, city: 'Vienna', country: 'Austria' },
    genre: ['Classical', 'Opera'],
    title: 'Vienna at the turn of the century: Mahler leads the Court Opera',
    description: 'Gustav Mahler reigns as director of the Vienna Court Opera, transforming it into the world\'s most prestigious opera house. Arnold Schoenberg begins composing in the city, developing ideas that will shatter tonal music. Vienna is the undisputed center of Western classical tradition.',
    tags: ['mahler', 'schoenberg', 'court opera', 'strauss', 'brahms', 'secession', 'jugendstil', 'fin de siecle'],
  },
  {
    id: 'evt-tango-buenos-aires-1917',
    year: 1917,
    location: { lat: -34.6037, lng: -58.3816, city: 'Buenos Aires', country: 'Argentina' },
    genre: ['Tango'],
    title: 'Carlos Gardel records "Mi Noche Triste"',
    description: 'Carlos Gardel records "Mi Noche Triste", the first tango-canción (tango song), transforming tango from a purely instrumental dance music into a vocal art form. The song becomes a massive hit and launches tango\'s golden age in Buenos Aires\' smoky milongas.',
    tags: ['carlos gardel', 'tango', 'milonga', 'bandoneon', 'la boca', 'porteno', 'arrabal'],
  },
  {
    id: 'evt-samba-rio-1928',
    year: 1928,
    location: { lat: -22.9068, lng: -43.1729, city: 'Rio de Janeiro', country: 'Brazil' },
    genre: ['Samba'],
    title: 'First samba school founded in Rio',
    description: 'Deixa Falar, the first samba school, is founded in the Estácio neighborhood of Rio de Janeiro. This marks the formalization of samba as a community art form, tied to Carnival parades. The sound migrates from the hills of the favelas to the heart of Brazilian national identity.',
    tags: ['samba school', 'carnival', 'estacio', 'deixa falar', 'favela', 'percussion', 'batucada'],
  },
  {
    id: 'evt-blues-mississippi-1936',
    year: 1936,
    location: { lat: 33.4504, lng: -88.8184, city: 'Clarksdale', country: 'US' },
    genre: ['Blues'],
    title: 'Robert Johnson records at a San Antonio hotel',
    description: 'Robert Johnson records 29 songs over two sessions that will define the Delta blues and influence every rock guitarist to come. Legends grow about his deal with the devil at the crossroads. Songs like "Cross Road Blues" and "Hellhound on My Trail" become foundational American music.',
    tags: ['robert johnson', 'delta blues', 'crossroads', 'hellhound', 'mississippi', 'acoustic blues'],
  },

  // --- 1940s-1950s ---
  {
    id: 'evt-bebop-nyc-1945',
    year: 1945,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Jazz', 'Bebop'],
    title: 'Charlie Parker and Dizzy Gillespie invent bebop on 52nd Street',
    description: 'The clubs of 52nd Street in Manhattan — Minton\'s Playhouse, the Three Deuces, the Onyx — become the laboratory where Charlie Parker, Dizzy Gillespie, Thelonious Monk, and Bud Powell transform jazz. Bebop replaces swing with dizzying tempos, complex harmonies, and virtuosic improvisation.',
    tags: ['charlie parker', 'dizzy gillespie', 'monk', 'bud powell', '52nd street', 'mintons', 'harlem', 'bebop'],
  },
  {
    id: 'evt-fado-lisbon-1950',
    year: 1950,
    location: { lat: 38.7223, lng: -9.1393, city: 'Lisbon', country: 'Portugal' },
    genre: ['Fado'],
    title: 'Amália Rodrigues brings fado to the world',
    description: 'Amália Rodrigues, the "Queen of Fado", tours internationally and records prolifically, bringing the melancholic Portuguese art form to global audiences. Her voice echoes through the narrow streets of Alfama and Mouraria, where fado houses serve wine and saudade in equal measure.',
    tags: ['amalia rodrigues', 'fado', 'alfama', 'saudade', 'portuguese guitar', 'mouraria', 'casas de fado'],
  },
  {
    id: 'evt-mambo-havana-1950',
    year: 1950,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Mambo', 'Son Cubano'],
    title: 'Pérez Prado ignites the mambo craze',
    description: 'Pérez Prado, Beny Moré, and the legendary house bands of the Tropicana nightclub turn Havana into the mambo capital of the world. Cuban big bands blend Afro-Cuban percussion with jazz arrangements, creating an irresistible dance music that sweeps across the Americas.',
    tags: ['perez prado', 'beny more', 'tropicana', 'mambo', 'afro-cuban', 'conga', 'big band'],
  },
  {
    id: 'evt-rnb-chicago-1955',
    year: 1955,
    location: { lat: 41.8781, lng: -87.6298, city: 'Chicago', country: 'US' },
    genre: ['Chicago Blues', 'R&B'],
    title: 'Muddy Waters and Chess Records electrify the blues',
    description: 'Muddy Waters, Howlin\' Wolf, and Little Walter record at Chess Records on South Michigan Avenue, amplifying the Delta blues with electric guitars and harmonicas. The Chicago blues sound reverberates across the Atlantic, directly inspiring The Rolling Stones and British Invasion bands.',
    tags: ['muddy waters', 'chess records', 'howlin wolf', 'little walter', 'electric blues', 'south side', 'maxwell street'],
  },

  // --- 1960s ---
  {
    id: 'evt-psychedelic-sf-1967',
    year: 1967,
    location: { lat: 37.7749, lng: -122.4194, city: 'San Francisco', country: 'US' },
    genre: ['Psychedelic Rock', 'Folk Rock'],
    title: 'Summer of Love transforms Haight-Ashbury',
    description: 'Over 100,000 young people descend on San Francisco\'s Haight-Ashbury district. The Grateful Dead, Jefferson Airplane, and Janis Joplin play free concerts in Golden Gate Park. The Monterey Pop Festival showcases Jimi Hendrix and Ravi Shankar. The counterculture reaches its peak.',
    tags: ['summer of love', 'grateful dead', 'jefferson airplane', 'janis joplin', 'haight ashbury', 'monterey pop', 'hippie', 'acid rock'],
  },
  {
    id: 'evt-soul-memphis-1962',
    year: 1962,
    location: { lat: 35.1495, lng: -90.049, city: 'Memphis', country: 'US' },
    genre: ['Soul', 'R&B'],
    title: 'Stax Records and the Memphis Soul sound',
    description: 'Stax Records on East McLemore Avenue becomes the home of Southern soul with Booker T. & the M.G.\'s, Otis Redding, Sam & Dave, and later Isaac Hayes. The integrated house band creates a raw, horn-driven sound that rivals Motown\'s polish with deep, gritty emotion.',
    tags: ['stax records', 'otis redding', 'booker t', 'sam and dave', 'isaac hayes', 'memphis soul', 'southern soul'],
  },
  {
    id: 'evt-beatles-liverpool-1963',
    year: 1963,
    location: { lat: 53.4084, lng: -2.9916, city: 'Liverpool', country: 'UK' },
    genre: ['Rock', 'Merseybeat'],
    title: 'Beatlemania explodes from the Cavern Club',
    description: 'The Beatles release "Please Please Me" and Beatlemania grips Britain. Having honed their craft at the Cavern Club and in Hamburg\'s Reeperbahn, John, Paul, George, and Ringo transform popular music forever. Liverpool\'s Merseybeat scene launches dozens of bands into the charts.',
    tags: ['beatles', 'cavern club', 'merseybeat', 'brian epstein', 'please please me', 'british invasion', 'george martin'],
  },
  {
    id: 'evt-highlife-accra-1960',
    year: 1960,
    location: { lat: 5.6037, lng: -0.187, city: 'Accra', country: 'Ghana' },
    genre: ['Highlife'],
    title: 'Ghana\'s independence fuels highlife golden age',
    description: 'In the glow of Ghanaian independence, highlife music reaches its peak. E.T. Mensah and the Tempos, King Bruce, and dance bands fill venues across Accra with a joyful fusion of West African rhythms, jazz, and calypso. Highlife becomes the soundtrack of Pan-African optimism.',
    tags: ['highlife', 'et mensah', 'tempos', 'ghana independence', 'kwame nkrumah', 'dance band', 'palm wine music'],
  },
  {
    id: 'evt-raga-mumbai-1966',
    year: 1966,
    location: { lat: 19.076, lng: 72.8777, city: 'Mumbai', country: 'India' },
    genre: ['Indian Classical', 'Bollywood'],
    title: 'Ravi Shankar bridges East and West',
    description: 'Ravi Shankar\'s sitar performances captivate Western audiences as George Harrison studies under him. Meanwhile, Bollywood composers R.D. Burman and S.D. Burman blend classical ragas with Western orchestration, creating the golden age of Hindi film music in Bombay\'s studios.',
    tags: ['ravi shankar', 'sitar', 'george harrison', 'rd burman', 'bollywood', 'film music', 'raga', 'asha bhosle'],
  },

  // --- 1970s ---
  {
    id: 'evt-afrobeat-lagos-1971',
    year: 1971,
    location: { lat: 6.5244, lng: 3.3792, city: 'Lagos', country: 'Nigeria' },
    genre: ['Afrobeat', 'Funk'],
    title: 'Fela Kuti opens the Afrika Shrine',
    description: 'Fela Kuti establishes the Afrika Shrine in Lagos, a nightclub and commune that becomes the spiritual home of Afrobeat. Fusing Yoruba rhythms, jazz, funk, and political fire, Fela and his band Africa 70 create marathon performances that challenge the Nigerian military government.',
    tags: ['fela kuti', 'afrika shrine', 'africa 70', 'tony allen', 'afrobeat', 'yoruba', 'political music', 'kalakuta republic'],
  },
  {
    id: 'evt-salsa-nyc-1973',
    year: 1973,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Salsa', 'Latin'],
    title: 'Fania All-Stars concert at Yankee Stadium',
    description: 'The Fania All-Stars — featuring Celia Cruz, Héctor Lavoe, Willie Colón, and Rubén Blades — perform to 44,000 fans at Yankee Stadium. Fania Records\' salsa revolution, born in the barrios of the South Bronx and Spanish Harlem, reaches its ecstatic peak.',
    tags: ['fania records', 'celia cruz', 'hector lavoe', 'willie colon', 'ruben blades', 'salsa', 'nuyorican', 'south bronx'],
  },
  {
    id: 'evt-funk-minneapolis-1979',
    year: 1979,
    location: { lat: 44.9778, lng: -93.265, city: 'Minneapolis', country: 'US' },
    genre: ['Funk', 'Minneapolis Sound'],
    title: 'Prince releases debut and invents the Minneapolis Sound',
    description: 'A 20-year-old Prince releases his second album "Prince" and begins crafting the Minneapolis Sound — a fusion of funk, synth-pop, rock, and R&B that will define 1980s music. First Avenue nightclub becomes his proving ground and the epicenter of a musical revolution.',
    tags: ['prince', 'first avenue', 'minneapolis sound', 'funk', 'synth', 'purple rain', 'the revolution'],
  },
  {
    id: 'evt-krautrock-dusseldorf-1974',
    year: 1974,
    location: { lat: 51.2277, lng: 6.7735, city: 'Düsseldorf', country: 'Germany' },
    genre: ['Electronic', 'Krautrock'],
    title: 'Kraftwerk releases "Autobahn"',
    description: 'Kraftwerk releases "Autobahn" from their Kling Klang studio in Düsseldorf, pioneering electronic pop. The 22-minute title track uses synthesizers and drum machines to create a sonic landscape of motorway driving. This album lays the groundwork for synth-pop, techno, and hip hop.',
    tags: ['kraftwerk', 'autobahn', 'kling klang', 'synthesizer', 'electronic music', 'krautrock', 'motorik'],
  },
  {
    id: 'evt-roots-nashville-1972',
    year: 1972,
    location: { lat: 36.1627, lng: -86.7816, city: 'Nashville', country: 'US' },
    genre: ['Country', 'Outlaw Country'],
    title: 'Outlaw country challenges the Nashville establishment',
    description: 'Willie Nelson, Waylon Jennings, and Kris Kristofferson reject Nashville\'s polished "countrypolitan" sound for rawer, more personal songwriting. Willie moves to Austin and the outlaw movement redefines country music as an artist-driven genre free from Music Row\'s control.',
    tags: ['willie nelson', 'waylon jennings', 'kris kristofferson', 'outlaw country', 'music row', 'grand ole opry', 'honky tonk'],
  },
  {
    id: 'evt-roots-reggae-kingston-1973',
    year: 1973,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Reggae', 'Dub'],
    title: 'Lee "Scratch" Perry builds Black Ark Studio',
    description: 'Lee "Scratch" Perry builds his Black Ark studio in Washington Gardens, Kingston, and begins producing some of reggae\'s most innovative recordings. Using a 4-track tape machine, he invents dub — stripping songs to their bass and drums, drenching them in echo and reverb.',
    tags: ['lee scratch perry', 'black ark', 'dub', 'king tubby', 'studio one', 'sound system', 'producer'],
  },

  // --- 1980s ---
  {
    id: 'evt-house-chicago-1984',
    year: 1984,
    location: { lat: 41.8781, lng: -87.6298, city: 'Chicago', country: 'US' },
    genre: ['House'],
    title: 'House music emerges from the Warehouse',
    description: 'Frankie Knuckles, the "Godfather of House", creates a new genre at the Warehouse nightclub on the South Side of Chicago. By blending disco, electronic beats, and soul vocals on a Roland drum machine, he gives birth to house music — the foundation of all modern dance music.',
    tags: ['frankie knuckles', 'warehouse', 'house music', 'roland 808', 'trax records', 'dj', 'south side', 'acid house'],
  },
  {
    id: 'evt-hiphop-nyc-1979',
    year: 1979,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Hip Hop'],
    title: 'Sugar Hill Gang releases "Rapper\'s Delight"',
    description: 'The Sugarhill Gang\'s "Rapper\'s Delight" becomes the first hip hop single to reach the Top 40, introducing rap music to mainstream America. Born from DJ Kool Herc\'s block parties in the Bronx, hip hop becomes the most influential cultural movement of the late 20th century.',
    tags: ['sugar hill gang', 'rappers delight', 'dj kool herc', 'bronx', 'block party', 'breakdancing', 'graffiti', 'old school'],
  },
  {
    id: 'evt-newwave-london-1981',
    year: 1981,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['New Wave', 'Synth-Pop'],
    title: 'MTV launches and New Romantics conquer the world',
    description: 'Duran Duran, Depeche Mode, Spandau Ballet, and Culture Club emerge from London\'s Blitz Kids scene. MTV launches in America hungry for British videos, and the New Romantic/synth-pop movement becomes a transatlantic phenomenon blending fashion, art, and electronic music.',
    tags: ['duran duran', 'depeche mode', 'new romantics', 'blitz club', 'synth pop', 'mtv', 'culture club', 'new wave'],
  },
  {
    id: 'evt-rai-oran-1985',
    year: 1985,
    location: { lat: 35.697, lng: -0.6331, city: 'Oran', country: 'Algeria' },
    genre: ['Raï'],
    title: 'Cheb Khaled electrifies raï music',
    description: 'Cheb Khaled, Cheb Mami, and Chaba Fadela transform raï from a regional Algerian folk tradition into a modern pop phenomenon by adding synthesizers, drum machines, and Western rock instrumentation. The music becomes the voice of frustrated North African youth.',
    tags: ['cheb khaled', 'rai', 'cheb mami', 'algeria', 'north africa', 'oran', 'wahrani', 'didi'],
  },
  {
    id: 'evt-dancehall-kingston-1985',
    year: 1985,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Dancehall', 'Reggae'],
    title: 'Digital dancehall revolutionizes Jamaican music',
    description: 'King Jammy\'s "Sleng Teng" riddim, the first fully digital reggae beat made on a Casio keyboard, transforms Jamaican music overnight. Dancehall replaces roots reggae as the dominant sound, with DJs like Yellowman, Shabba Ranks, and Super Cat riding computerized rhythms.',
    tags: ['king jammy', 'sleng teng', 'dancehall', 'digital', 'yellowman', 'shabba ranks', 'sound system', 'riddim'],
  },
  {
    id: 'evt-westcoast-la-1988',
    year: 1988,
    location: { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', country: 'US' },
    genre: ['Hip Hop', 'West Coast Hip Hop', 'G-Funk'],
    title: 'N.W.A releases "Straight Outta Compton"',
    description: 'N.W.A — Ice Cube, Dr. Dre, Eazy-E, MC Ren, and DJ Yella — release "Straight Outta Compton", a raw depiction of life in South Central LA. The album invents gangsta rap, triggers an FBI warning letter, and shifts hip hop\'s center of gravity from New York to the West Coast.',
    tags: ['nwa', 'ice cube', 'dr dre', 'eazy-e', 'compton', 'gangsta rap', 'ruthless records', 'south central'],
  },
  {
    id: 'evt-citypop-tokyo-1982',
    year: 1982,
    location: { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan' },
    genre: ['City Pop', 'J-Pop'],
    title: 'City pop captures Japan\'s bubble economy glamour',
    description: 'Tatsuro Yamashita\'s "Ride on Time" and Mariya Takeuchi\'s music define city pop — a uniquely Japanese fusion of funk, AOR, boogie, and soft rock that soundtracks Tokyo\'s neon-lit economic boom. Decades later, the genre is rediscovered globally through YouTube algorithms.',
    tags: ['tatsuro yamashita', 'mariya takeuchi', 'city pop', 'bubble economy', 'shibuya', 'plastic love', 'japanese funk'],
  },

  // --- 1990s ---
  {
    id: 'evt-britpop-london-1995',
    year: 1995,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Britpop', 'Alternative Rock'],
    title: 'Oasis vs Blur: the Battle of Britpop',
    description: 'Oasis and Blur release competing singles on the same day in a media-fueled "Battle of Britpop" that captures the nation. Cool Britannia is in full swing, with Pulp, Suede, and Elastica filling Camden Town venues. British guitar music experiences its biggest moment since the 1960s.',
    tags: ['oasis', 'blur', 'britpop', 'noel gallagher', 'damon albarn', 'pulp', 'camden', 'cool britannia'],
  },
  {
    id: 'evt-electronic-ibiza-1988',
    year: 1988,
    location: { lat: 38.9067, lng: 1.4206, city: 'Ibiza', country: 'Spain' },
    genre: ['Electronic', 'House', 'Balearic Beat'],
    title: 'The Second Summer of Love: acid house hits Ibiza',
    description: 'British DJs Paul Oakenfold, Danny Rampling, and Nicky Holloway discover Amnesia nightclub in Ibiza and DJ Alfredo\'s eclectic Balearic mix. They bring acid house back to the UK, igniting the Second Summer of Love — a rave revolution that transforms British youth culture.',
    tags: ['ibiza', 'amnesia', 'acid house', 'rave', 'balearic beat', 'paul oakenfold', 'ecstasy', 'summer of love'],
  },
  {
    id: 'evt-tropicalia-sao-paulo-1968',
    year: 1968,
    location: { lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brazil' },
    genre: ['Tropicália', 'MPB'],
    title: 'Tropicália movement explodes in Brazil',
    description: 'Caetano Veloso, Gilberto Gil, Tom Zé, and Os Mutantes launch the Tropicália movement, fusing bossa nova with psychedelic rock, concrete poetry, and avant-garde art. The Brazilian military dictatorship jails Veloso and Gil, but the movement reshapes Brazilian music forever.',
    tags: ['caetano veloso', 'gilberto gil', 'os mutantes', 'tom ze', 'tropicalia', 'mpb', 'brazilian psychedelic', 'dictatorship'],
  },
  {
    id: 'evt-trip-hop-bristol-1994',
    year: 1994,
    location: { lat: 51.4545, lng: -2.5879, city: 'Bristol', country: 'UK' },
    genre: ['Trip-Hop', 'Electronic'],
    title: 'Massive Attack, Portishead, and Tricky define the Bristol sound',
    description: 'Portishead releases "Dummy" and Tricky releases "Maxinquaye", joining Massive Attack\'s "Blue Lines" to form the holy trinity of trip-hop. Bristol\'s sound system culture blends hip hop beats with cinematic atmospherics, creating the moody, nocturnal genre that defines the decade.',
    tags: ['massive attack', 'portishead', 'tricky', 'trip hop', 'bristol sound', 'wild bunch', 'blue lines', 'dummy'],
  },
  {
    id: 'evt-chopped-houston-1995',
    year: 1995,
    location: { lat: 29.7604, lng: -95.3698, city: 'Houston', country: 'US' },
    genre: ['Chopped & Screwed', 'Southern Hip Hop'],
    title: 'DJ Screw invents chopped and screwed',
    description: 'DJ Screw, working out of his South Side Houston home, slows down, chops, and pitches records to create the hypnotic "chopped and screwed" technique. His Screwtapes become essential Texas hip hop artifacts, inspiring a movement that influences the entire sound of Southern rap.',
    tags: ['dj screw', 'chopped and screwed', 'screwtapes', 'south side', 'swisha house', 'codeine', 'screwed up click'],
  },
  {
    id: 'evt-kpop-seoul-1996',
    year: 1996,
    location: { lat: 37.5665, lng: 126.978, city: 'Seoul', country: 'South Korea' },
    genre: ['K-Pop'],
    title: 'Seo Taiji and Boys spark the K-pop revolution',
    description: 'Seo Taiji and Boys retire after pioneering Korean idol pop, leaving a blueprint. H.O.T. debuts under SM Entertainment, and the modern K-pop idol system is born — combining rigorous training, synchronized choreography, and catchy hooks that will eventually conquer the global charts.',
    tags: ['seo taiji', 'hot', 'sm entertainment', 'idol', 'kpop', 'hallyu', 'korean wave', 'boy band'],
  },
  {
    id: 'evt-cumbia-monterrey-1990',
    year: 1990,
    location: { lat: 25.6866, lng: -100.3161, city: 'Monterrey', country: 'Mexico' },
    genre: ['Cumbia', 'Norteño'],
    title: 'Cumbia and norteño music dominate northern Mexico',
    description: 'Selena Quintanilla rises to fame performing Tejano cumbia across the border region, while groups like Los Tigres del Norte and Celso Piña reinvent cumbia for Mexican audiences. Monterrey\'s music scene bridges traditional accordion-driven norteño with modern cumbia sonidera.',
    tags: ['selena', 'cumbia', 'norteno', 'los tigres del norte', 'celso pina', 'tejano', 'accordion', 'border music'],
  },

  // --- 2000s ---
  {
    id: 'evt-grime-london-2003',
    year: 2003,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Grime', 'Electronic'],
    title: 'Dizzee Rascal wins the Mercury Prize with "Boy in da Corner"',
    description: 'Dizzee Rascal\'s debut "Boy in da Corner" wins the Mercury Prize, launching grime from East London pirate radio stations into the mainstream. Born on Bow\'s council estates, grime fuses UK garage, jungle, and MCing into a uniquely British genre that produces Skepta, Wiley, and Stormzy.',
    tags: ['dizzee rascal', 'grime', 'boy in da corner', 'bow', 'east london', 'pirate radio', 'wiley', 'roll deep'],
  },
  {
    id: 'evt-reggaeton-san-juan-2004',
    year: 2004,
    location: { lat: 18.4655, lng: -66.1057, city: 'San Juan', country: 'Puerto Rico' },
    genre: ['Reggaeton', 'Latin'],
    title: 'Daddy Yankee\'s "Gasolina" ignites the reggaeton explosion',
    description: 'Daddy Yankee releases "Gasolina", bringing reggaeton from Puerto Rico\'s underground to global radio. The genre\'s dembow rhythm — rooted in Jamaican dancehall brought to Panama and refined in San Juan\'s caseríos — becomes the dominant beat in Latin music for the next two decades.',
    tags: ['daddy yankee', 'gasolina', 'reggaeton', 'dembow', 'puerto rico', 'don omar', 'tego calderon', 'perreo'],
  },
  {
    id: 'evt-edm-miami-2006',
    year: 2006,
    location: { lat: 25.7617, lng: -80.1918, city: 'Miami', country: 'US' },
    genre: ['EDM', 'Electronic'],
    title: 'Ultra Music Festival and the EDM explosion',
    description: 'Ultra Music Festival in downtown Miami grows from a small beach party into a massive electronic music event. Along with Tomorrowland and Electric Daisy Carnival, it ushers in the EDM era where DJs like Tiësto, Deadmau5, and Skrillex become stadium-filling superstars.',
    tags: ['ultra', 'edm', 'tiesto', 'deadmau5', 'skrillex', 'electronic dance music', 'festival', 'dj culture'],
  },
  {
    id: 'evt-indie-brooklyn-2005',
    year: 2005,
    location: { lat: 40.6782, lng: -73.9442, city: 'Brooklyn', country: 'US' },
    genre: ['Indie Rock', 'Alternative'],
    title: 'Williamsburg becomes the indie rock capital',
    description: 'Brooklyn\'s Williamsburg neighborhood overtakes Manhattan as the center of American indie music. TV on the Radio, Yeah Yeah Yeahs, Grizzly Bear, and Animal Collective play intimate venues like Death by Audio and Glasslands. The neighborhood becomes synonymous with DIY culture and indie credibility.',
    tags: ['williamsburg', 'brooklyn', 'tv on the radio', 'yeah yeah yeahs', 'grizzly bear', 'indie', 'diy', 'death by audio'],
  },
  {
    id: 'evt-kuduro-luanda-2005',
    year: 2005,
    location: { lat: -8.8399, lng: 13.2894, city: 'Luanda', country: 'Angola' },
    genre: ['Kuduro', 'Electronic'],
    title: 'Kuduro takes over Angola and Portugal',
    description: 'Kuduro — a frenetic blend of Angolan semba, house music, and Caribbean rhythms — explodes from Luanda\'s musseques (shantytowns). Artists like Buraka Som Sistema bridge it to Lisbon\'s immigrant communities. The hyperkinetic dance music becomes Africa\'s most exciting electronic export.',
    tags: ['kuduro', 'buraka som sistema', 'semba', 'luanda', 'angola', 'portuguese', 'electronic', 'dance'],
  },

  // --- 2010s-2020s ---
  {
    id: 'evt-trap-atlanta-2012',
    year: 2012,
    location: { lat: 33.749, lng: -84.388, city: 'Atlanta', country: 'US' },
    genre: ['Trap', 'Hip Hop'],
    title: 'Trap music takes over from Atlanta',
    description: 'Future, Young Thug, Migos, and 21 Savage push Atlanta\'s trap sound to global dominance. Producer Metro Boomin crafts the hi-hat-heavy, bass-drenched beats that define the 2010s. Trap\'s influence spreads beyond hip hop into pop, EDM, and Latin music worldwide.',
    tags: ['future', 'young thug', 'migos', 'metro boomin', '21 savage', 'trap', 'atlanta', 'quality control'],
  },
  {
    id: 'evt-streaming-global-2015',
    year: 2015,
    location: { lat: 59.3293, lng: 18.0686, city: 'Stockholm', country: 'Sweden' },
    genre: ['Pop', 'Electronic'],
    title: 'Streaming reshapes global music from Sweden',
    description: 'Spotify, born in Stockholm, surpasses 75 million users and transforms how the world discovers music. Swedish producers Max Martin and Shellback dominate global pop, while the country\'s influence extends from ABBA\'s legacy to a new generation of pop craftsmanship and music-tech innovation.',
    tags: ['spotify', 'max martin', 'streaming', 'digital music', 'pop production', 'abba', 'robyn', 'swedish pop'],
  },
  {
    id: 'evt-amapiano-joburg-2019',
    year: 2019,
    location: { lat: -26.2041, lng: 28.0473, city: 'Johannesburg', country: 'South Africa' },
    genre: ['Amapiano'],
    title: 'Amapiano emerges as South Africa\'s global sound',
    description: 'Amapiano — a laid-back, piano-driven fusion of deep house, jazz, and kwaito — spreads from Johannesburg\'s townships to international playlists. Kabza De Small, DJ Maphorisa, and Focalistic lead the movement. The genre\'s log drum bass lines and shaker rhythms become instantly recognizable worldwide.',
    tags: ['amapiano', 'kabza de small', 'dj maphorisa', 'focalistic', 'kwaito', 'soweto', 'deep house', 'south africa'],
  },
  {
    id: 'evt-latin-urban-medellin-2017',
    year: 2017,
    location: { lat: 6.2476, lng: -75.5658, city: 'Medellín', country: 'Colombia' },
    genre: ['Reggaeton', 'Latin Trap'],
    title: 'J Balvin and Maluma put Medellín on the global music map',
    description: 'J Balvin\'s "Mi Gente" goes viral worldwide while Maluma\'s "Felices los 4" dominates. Medellín transforms from a city known for its troubled past into Latin music\'s hottest creative hub, blending reggaeton, Latin trap, and Colombian cumbia influences for a global audience.',
    tags: ['j balvin', 'maluma', 'medellin', 'mi gente', 'latin trap', 'reggaeton', 'colombia', 'urban latino'],
  },
  {
    id: 'evt-drill-london-2019',
    year: 2019,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Drill', 'Hip Hop'],
    title: 'UK drill reshapes British hip hop',
    description: 'UK drill, originating from South London estates, evolves from its Chicago roots into a distinct British sound with sliding 808s and rapid-fire flows. Artists like Headie One, Central Cee, and Dave break chart records, while the sound spreads to New York, where it influences Pop Smoke and a new era of East Coast rap.',
    tags: ['uk drill', 'headie one', 'central cee', 'dave', 'pop smoke', 'south london', '808', 'british rap'],
  },
  {
    id: 'evt-flamenco-seville-1922',
    year: 1922,
    location: { lat: 37.3891, lng: -5.9845, city: 'Seville', country: 'Spain' },
    genre: ['Flamenco'],
    title: 'Concurso de Cante Jondo preserves flamenco',
    description: 'Federico García Lorca and Manuel de Falla organize the Concurso de Cante Jondo in Granada, a competition to preserve deep flamenco singing. The event crystallizes flamenco as a serious art form, drawing from Andalusia\'s Roma, Arab, and Jewish musical traditions.',
    tags: ['flamenco', 'cante jondo', 'garcia lorca', 'manuel de falla', 'andalusia', 'roma', 'gitano', 'guitar'],
  },
  {
    id: 'evt-hiphop-paris-1990',
    year: 1990,
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    genre: ['Hip Hop', 'Rap'],
    title: 'French hip hop erupts from the banlieues',
    description: 'MC Solaar, IAM, and NTM emerge from the Parisian banlieues (suburbs), creating a vibrant French rap scene. Drawing from African and Arab diaspora cultures, French hip hop becomes the country\'s most popular music genre, rivaling American rap in lyrical sophistication.',
    tags: ['mc solaar', 'iam', 'ntm', 'french rap', 'banlieue', 'marseille', 'hip hop francais', 'seine saint denis'],
  },
  {
    id: 'evt-gnawa-marrakech-2000',
    year: 2000,
    location: { lat: 31.6295, lng: -7.9811, city: 'Marrakech', country: 'Morocco' },
    genre: ['Gnawa', 'World Music'],
    title: 'Gnawa World Music Festival puts Essaouira on the map',
    description: 'The Gnawa and World Music Festival in Essaouira brings ancient West African spiritual music to international audiences. Gnawa masters like Mahmoud Guinea and Mustapha Bakbou collaborate with jazz and rock musicians, bridging Moroccan trance traditions with contemporary global sounds.',
    tags: ['gnawa', 'essaouira', 'mahmoud guinea', 'trance', 'morocco', 'sufi', 'spiritual music', 'festival'],
  },
  {
    id: 'evt-techno-detroit-1985',
    year: 1985,
    location: { lat: 42.3314, lng: -83.0458, city: 'Detroit', country: 'US' },
    genre: ['Techno', 'Electronic'],
    title: 'The Belleville Three invent Detroit techno',
    description: 'Juan Atkins, Derrick May, and Kevin Saunderson — three friends from Belleville, Michigan — create techno music by fusing Kraftwerk\'s electronic futurism with Parliament-Funkadelic\'s groove and the alienated poetry of post-industrial Detroit. The sound will transform global dance culture.',
    tags: ['juan atkins', 'derrick may', 'kevin saunderson', 'belleville three', 'detroit techno', 'metroplex', 'model 500'],
  },
  {
    id: 'evt-kpop-global-2020',
    year: 2020,
    location: { lat: 37.5665, lng: 126.978, city: 'Seoul', country: 'South Korea' },
    genre: ['K-Pop', 'Pop'],
    title: 'BTS and BLACKPINK make K-pop a global force',
    description: 'BTS becomes the first all-South Korean act to top the Billboard Hot 100 with "Dynamite", while BLACKPINK breaks YouTube records. K-pop\'s meticulously produced music, intense choreography, and devoted global fandoms (ARMY, Blinks) represent a new model for 21st-century pop stardom.',
    tags: ['bts', 'blackpink', 'k-pop', 'billboard', 'hallyu', 'army', 'hybe', 'yg entertainment', 'dynamite'],
  },
  {
    id: 'evt-austin-sxsw-2007',
    year: 2007,
    location: { lat: 30.2672, lng: -97.7431, city: 'Austin', country: 'US' },
    genre: ['Indie', 'Alternative', 'Folk'],
    title: 'SXSW becomes the world\'s music discovery platform',
    description: 'South by Southwest grows into the world\'s premier music festival and industry showcase. Over 2,000 bands from around the globe play 90+ venues on 6th Street and Red River. Austin\'s "Keep Austin Weird" spirit and live music ecosystem make it a pilgrimage site for emerging artists.',
    tags: ['sxsw', 'south by southwest', '6th street', 'red river', 'live music capital', 'indie', 'music industry'],
  },

  // --- Events for missing regions ---

  // EAST EUROPE
  {
    id: 'evt-bartok-budapest-1906',
    year: 1906,
    location: { lat: 47.4979, lng: 19.0402, city: 'Budapest', country: 'Hungary' },
    genre: ['Classical', 'Folk'],
    title: 'Béla Bartók and Kodály begin collecting Hungarian folk music',
    description: 'Béla Bartók and Zoltán Kodály begin their revolutionary field recordings of Hungarian, Romanian, and Slovak folk music using an Edison phonograph. Their thousands of recordings transform both ethnomusicology and classical composition, as Bartók weaves peasant melodies into modernist masterpieces.',
    tags: ['bela bartok', 'kodaly', 'hungarian folk', 'ethnomusicology', 'phonograph', 'field recording', 'folk music', 'magyar'],
  },

  // NORTH ASIA
  {
    id: 'evt-throat-singing-kyzyl-1993',
    year: 1993,
    location: { lat: 51.7191, lng: 94.4378, city: 'Kyzyl', country: 'Russia' },
    genre: ['Throat Singing', 'World Music'],
    title: 'Huun-Huur-Tu brings Tuvan throat singing to the world',
    description: 'Huun-Huur-Tu, from the remote Republic of Tuva in southern Siberia, tours internationally and astonishes audiences with khoomei — the art of singing multiple notes simultaneously. Their music draws from nomadic herding traditions, imitating wind, rivers, and horses through overtone harmonics.',
    tags: ['huun-huur-tu', 'khoomei', 'tuva', 'throat singing', 'overtone', 'siberia', 'nomadic', 'shamanism'],
  },

  // CENTRAL ASIA
  {
    id: 'evt-shashmaqam-tashkent-2003',
    year: 2003,
    location: { lat: 41.2995, lng: 69.2401, city: 'Tashkent', country: 'Uzbekistan' },
    genre: ['Shashmaqam', 'Classical'],
    title: 'UNESCO inscribes Shashmaqam as Intangible Cultural Heritage',
    description: 'The Shashmaqam — the grand classical music tradition of Central Asia\'s Silk Road cities — receives UNESCO recognition. This ancient system of six maqams (modes) has been performed in Bukhara and Samarkand for centuries, blending Persian poetry, Turkic rhythms, and spiritual Sufi devotion into elaborate court music suites.',
    tags: ['shashmaqam', 'maqam', 'silk road', 'bukhara', 'samarkand', 'uzbek', 'sufi', 'unesco', 'dutar', 'tanbur'],
  },

  // WEST ASIA
  {
    id: 'evt-fairuz-beirut-1957',
    year: 1957,
    location: { lat: 33.8938, lng: 35.5018, city: 'Beirut', country: 'Lebanon' },
    genre: ['Arabic Classical', 'Lebanese Folk'],
    title: 'Fairuz performs at the Baalbeck International Festival',
    description: 'Fairuz, the "Jewel of Lebanon", performs at the Baalbeck International Festival in the ruins of the Roman temple of Jupiter. With the Rahbani brothers composing, she fuses Lebanese mountain folk songs with orchestral grandeur, becoming the most beloved voice in the Arab world.',
    tags: ['fairuz', 'rahbani brothers', 'baalbeck', 'lebanese music', 'arabic', 'mount lebanon', 'dabke', 'arab world'],
  },

  // SOUTH AFRICA (Johannesburg now correctly mapped to south-africa)
  {
    id: 'evt-cape-jazz-capetown-1974',
    year: 1974,
    location: { lat: -33.9249, lng: 18.4241, city: 'Cape Town', country: 'South Africa' },
    genre: ['Jazz', 'Cape Jazz'],
    title: 'Abdullah Ibrahim records "Mannenberg" — the anti-apartheid anthem',
    description: 'Abdullah Ibrahim (Dollar Brand) records "Mannenberg — Is Where It\'s Happening" at a Cape Town studio. The jazz instrumental, named after a Cape Flats township, becomes the unofficial anthem of the anti-apartheid movement. Its piano melody — both joyful and defiant — echoes through protest marches and shebeens across South Africa.',
    tags: ['abdullah ibrahim', 'dollar brand', 'mannenberg', 'cape jazz', 'anti-apartheid', 'cape town', 'township', 'shebeen'],
  },

  // OCEANIA
  {
    id: 'evt-pubrock-melbourne-1975',
    year: 1975,
    location: { lat: -37.8136, lng: 144.9631, city: 'Melbourne', country: 'Australia' },
    genre: ['Rock', 'Pub Rock'],
    title: 'AC/DC and Australian pub rock conquer the world',
    description: 'AC/DC, formed by Scottish-born brothers Malcolm and Angus Young in Sydney, release "High Voltage" and begin their rise from Melbourne\'s sweaty pub circuit to global rock stardom. The Australian pub rock scene — raw, loud, and unpretentious — also launches The Saints, Radio Birdman, and later Nick Cave\'s Birthday Party.',
    tags: ['ac/dc', 'angus young', 'pub rock', 'high voltage', 'melbourne', 'radio birdman', 'the saints', 'nick cave'],
  },

  // --- Additional events for thin decades ---

  // 1910s (only had Buenos Aires 1917)
  {
    id: 'evt-handy-memphis-1912',
    year: 1912,
    location: { lat: 35.1495, lng: -90.049, city: 'Memphis', country: 'US' },
    genre: ['Blues'],
    title: 'W.C. Handy publishes "Memphis Blues"',
    description: 'W.C. Handy publishes "Memphis Blues", one of the first blues compositions put to sheet music. Having heard Delta blues musicians at a train station in Tutwiler, Mississippi, Handy translates the raw folk tradition into written form, earning him the title "Father of the Blues" and helping spread the music from Beale Street to the nation.',
    tags: ['wc handy', 'memphis blues', 'beale street', 'sheet music', 'father of the blues', 'delta', 'tutwiler'],
  },

  // 1930s (only had Clarksdale 1936)
  {
    id: 'evt-swing-nyc-1938',
    year: 1938,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Jazz', 'Swing'],
    title: 'Benny Goodman\'s historic Carnegie Hall concert',
    description: 'Benny Goodman and his orchestra perform the first jazz concert at Carnegie Hall, legitimizing jazz as a serious art form. The racially integrated band — featuring Teddy Wilson, Lionel Hampton, and Count Basie\'s sidemen — tears through swing standards in what becomes the most famous jazz concert in history.',
    tags: ['benny goodman', 'carnegie hall', 'swing', 'big band', 'teddy wilson', 'lionel hampton', 'integration', 'jazz concert'],
  },

  // 1940s (only had NYC 1945)
  {
    id: 'evt-umm-kulthum-cairo-1944',
    year: 1944,
    location: { lat: 30.0444, lng: 31.2357, city: 'Cairo', country: 'Egypt' },
    genre: ['Arabic Classical', 'Tarab'],
    title: 'Umm Kulthum\'s "Thursday Night" concerts captivate the Arab world',
    description: 'Umm Kulthum\'s monthly Thursday night radio broadcasts from Cairo become a sacred ritual across the Arab world. From Casablanca to Baghdad, streets empty as millions tune in to hear "The Star of the East" perform hours-long improvisations that define tarab — the ecstatic state that Arabic music can induce.',
    tags: ['umm kulthum', 'tarab', 'thursday concert', 'cairo', 'arabic music', 'radio', 'star of the east', 'egyptian music'],
  },

  // 2020s (only had Seoul 2020)
  {
    id: 'evt-afrobeats-lagos-2023',
    year: 2023,
    location: { lat: 6.5244, lng: 3.3792, city: 'Lagos', country: 'Nigeria' },
    genre: ['Afrobeats', 'Afro-Fusion'],
    title: 'Burna Boy headlines a sold-out London Stadium',
    description: 'Burna Boy becomes the first African artist to headline a sold-out London Stadium to 60,000 fans, cementing Afrobeats as a dominant global genre. Alongside Wizkid, Tems, and Rema, Nigerian artists redefine pop music worldwide, with Afrobeats streams surpassing country and Latin on global platforms.',
    tags: ['burna boy', 'afrobeats', 'london stadium', 'wizkid', 'tems', 'rema', 'nigerian music', 'global pop'],
  },

  // EAST AFRICA (adding a proper event for Nairobi/Kenya)
  {
    id: 'evt-benga-nairobi-1967',
    year: 1967,
    location: { lat: -1.2921, lng: 36.8219, city: 'Nairobi', country: 'Kenya' },
    genre: ['Benga', 'Afro-Pop'],
    title: 'Benga music electrifies Kenya',
    description: 'Shirati Jazz and D.O. Misiani pioneer benga — a high-energy Kenyan guitar style rooted in Luo traditions from the shores of Lake Victoria. Featuring interlocking electric guitar lines, pulsing bass, and call-and-response vocals, benga becomes Kenya\'s most popular music and spreads across East Africa.',
    tags: ['benga', 'shirati jazz', 'do misiani', 'luo', 'lake victoria', 'kenyan guitar', 'nyanza', 'east africa'],
  },

  // Ethio-jazz for east-africa depth
  {
    id: 'evt-ethiojazz-addis-1970',
    year: 1970,
    location: { lat: 9.025, lng: 38.7469, city: 'Addis Ababa', country: 'Ethiopia' },
    genre: ['Ethio-Jazz', 'Funk'],
    title: 'Mulatu Astatke invents Ethio-jazz in Addis Ababa',
    description: 'Mulatu Astatke, having studied at Berklee College of Music, returns to Addis Ababa and creates Ethio-jazz — a hypnotic fusion of Ethiopian pentatonic scales, jazz harmony, Latin percussion, and funk grooves. His recordings for the Amha label become the "Éthiopiques" — later rediscovered and sampled worldwide.',
    tags: ['mulatu astatke', 'ethio-jazz', 'ethiopiques', 'amha records', 'addis ababa', 'pentatonic', 'berklee', 'golden age'],
  },

  // Anatolian Rock for west-asia depth
  {
    id: 'evt-anatolian-rock-istanbul-1972',
    year: 1972,
    location: { lat: 41.0082, lng: 28.9784, city: 'Istanbul', country: 'Turkey' },
    genre: ['Anatolian Rock', 'Psychedelic Rock'],
    title: 'Anatolian rock fuses Turkish folk with psychedelia',
    description: 'Barış Manço, Erkin Koray, Cem Karaca, and Moğollar electrify Turkish folk music with fuzz guitars, wah pedals, and rock drumming. Anatolian rock — blending Anatolian bağlama melodies with the psychedelic sounds of the era — creates one of the most unique and sought-after rock subgenres in music history.',
    tags: ['baris manco', 'erkin koray', 'cem karaca', 'mogollar', 'anatolian rock', 'baglama', 'turkish psychedelic', 'istanbul'],
  },

  // --- Seeding empty cities, thin regions & decades ---

  // NASHVILLE (0 events → 1920s)
  {
    id: 'evt-grand-ole-opry-nashville-1925',
    year: 1925,
    location: { lat: 36.1627, lng: -86.7816, city: 'Nashville', country: 'US' },
    genre: ['Country', 'Folk'],
    title: 'WSM\'s Barn Dance launches what becomes the Grand Ole Opry',
    description: 'Radio station WSM begins broadcasting a weekly barn dance program that becomes the Grand Ole Opry — the longest-running radio broadcast in American history. The show transforms Nashville into "Music City" and establishes country music as a major commercial genre, eventually spawning an entire industry along Music Row.',
    tags: ['grand ole opry', 'wsm', 'barn dance', 'music row', 'country music', 'radio', 'music city'],
  },

  // PHILADELPHIA (0 events → 1970s)
  {
    id: 'evt-philly-soul-philadelphia-1972',
    year: 1972,
    location: { lat: 39.9526, lng: -75.1652, city: 'Philadelphia', country: 'US' },
    genre: ['Soul', 'R&B', 'Disco'],
    title: 'Gamble & Huff launch Philadelphia International Records',
    description: 'Kenny Gamble and Leon Huff found Philadelphia International Records and unleash the lush, orchestral "Sound of Philadelphia" — the O\'Jays\' "Back Stabbers", Harold Melvin & the Blue Notes\' "If You Don\'t Know Me by Now", and MFSB\'s "TSOP". The Philly Sound bridges soul and disco, directly influencing the dance music revolution.',
    tags: ['gamble and huff', 'philadelphia international', 'philly soul', 'ojays', 'harold melvin', 'mfsb', 'tsop', 'disco'],
  },

  // KANSAS CITY (0 events → 1930s)
  {
    id: 'evt-kc-jazz-kansascity-1936',
    year: 1936,
    location: { lat: 39.0997, lng: -94.5786, city: 'Kansas City', country: 'US' },
    genre: ['Jazz', 'Blues', 'Swing'],
    title: 'Count Basie\'s band swings out of Kansas City',
    description: 'Count Basie and his orchestra, forged in the all-night jam sessions of Kansas City\'s 18th & Vine district during Prohibition, sign with Decca Records. KC jazz — rawer, bluesier, and more riff-driven than its East Coast counterpart — launches Basie, Charlie Parker, and Big Joe Turner into national prominence.',
    tags: ['count basie', 'charlie parker', 'big joe turner', '18th and vine', 'swing', 'prohibition', 'jam session', 'riff'],
  },

  // CLEVELAND (0 events → 1950s)
  {
    id: 'evt-moondog-cleveland-1952',
    year: 1952,
    location: { lat: 41.4993, lng: -81.6944, city: 'Cleveland', country: 'US' },
    genre: ['Rock and Roll', 'R&B'],
    title: 'The Moondog Coronation Ball — the first rock and roll concert',
    description: 'DJ Alan Freed organizes the Moondog Coronation Ball at the Cleveland Arena, the event widely regarded as the first rock and roll concert. Over 20,000 fans — far exceeding the 10,000 capacity — show up to hear Paul Williams, Tiny Grimes, and the Dominoes. The event proves the commercial power of the new genre Freed is championing on his radio show.',
    tags: ['alan freed', 'moondog', 'rock and roll', 'cleveland arena', 'paul williams', 'dominoes', 'dj', 'radio'],
  },

  // WASHINGTON D.C. (0 events → 1970s)
  {
    id: 'evt-gogo-dc-1979',
    year: 1979,
    location: { lat: 38.9072, lng: -77.0369, city: 'Washington D.C.', country: 'US' },
    genre: ['Go-Go', 'Funk'],
    title: 'Chuck Brown releases "Bustin\' Loose" and defines Go-Go',
    description: 'Chuck Brown and the Soul Searchers release "Bustin\' Loose", which tops the R&B charts for four weeks and defines go-go — D.C.\'s homegrown fusion of funk, rhythm and blues, and Latin percussion built on an infectious, never-stopping groove. Go-go becomes the soundtrack of Black Washington, thriving in clubs and on street corners for decades.',
    tags: ['chuck brown', 'bustin loose', 'go-go', 'soul searchers', 'funk', 'dc music', 'percussion break'],
  },

  // ST. LOUIS (0 events → 1950s)
  {
    id: 'evt-chuck-berry-stlouis-1955',
    year: 1955,
    location: { lat: 38.627, lng: -90.1994, city: 'St. Louis', country: 'US' },
    genre: ['Rock and Roll', 'R&B'],
    title: 'Chuck Berry records "Maybellene" and invents rock guitar',
    description: 'St. Louis native Chuck Berry walks into Chess Records in Chicago with "Ida Red", which Leonard Chess transforms into "Maybellene" — the song that fuses country rhythms with blues guitar into rock and roll. Berry\'s signature duck walk, showmanship, and guitar style become the template for every rock guitarist who follows.',
    tags: ['chuck berry', 'maybellene', 'chess records', 'duck walk', 'rock guitar', 'rock and roll'],
  },

  // BOSTON (0 events → 1980s)
  {
    id: 'evt-pixies-boston-1988',
    year: 1988,
    location: { lat: 42.3601, lng: -71.0589, city: 'Boston', country: 'US' },
    genre: ['Alternative Rock', 'Indie'],
    title: 'Pixies release "Surfer Rosa" and reshape alternative rock',
    description: 'The Pixies, formed at UMass Amherst and based in Boston, release "Surfer Rosa" — produced by Steve Albini in raw, volcanic sessions. The album\'s quiet-loud-quiet dynamics, surrealist lyrics, and Black Francis\'s primal screaming directly inspire Kurt Cobain to write "Smells Like Teen Spirit". The Boston/Cambridge scene also nurtures Throwing Muses, Dinosaur Jr, and Mission of Burma.',
    tags: ['pixies', 'surfer rosa', 'steve albini', 'black francis', 'quiet loud', 'umass', 'alternative rock', 'mission of burma'],
  },

  // PORTLAND (0 events → 2000s)
  {
    id: 'evt-indie-portland-2003',
    year: 2003,
    location: { lat: 45.5152, lng: -122.6784, city: 'Portland', country: 'US' },
    genre: ['Indie Rock', 'Folk'],
    title: 'Portland becomes America\'s indie music capital',
    description: 'Elliott Smith\'s legacy, the Decemberists\' literary folk-rock, and Modest Mouse\'s signing to Epic Records put Portland on the indie map. The city\'s cheap rent, DIY ethos, and venues like the Crystal Ballroom attract musicians nationwide. Kill Rock Stars and Hush Records thrive, and the Portland indie aesthetic becomes a cultural phenomenon.',
    tags: ['elliott smith', 'decemberists', 'modest mouse', 'kill rock stars', 'crystal ballroom', 'diy', 'indie rock'],
  },

  // BALTIMORE (0 events → 1990s)
  {
    id: 'evt-baltimore-club-baltimore-1993',
    year: 1993,
    location: { lat: 39.2904, lng: -76.6122, city: 'Baltimore', country: 'US' },
    genre: ['Baltimore Club', 'Dance', 'Electronic'],
    title: 'Baltimore Club music erupts from the city\'s house parties',
    description: 'DJs like Miss Tony, DJ Technics, and Rod Lee forge Baltimore Club — a frenetic, sample-heavy form of breakbeat house built on chopped-up vocals, call-and-response chants, and 130 BPM energy. Born in the city\'s Black neighborhoods and spread through mixtapes, the genre influences Jersey Club, Philly Club, and eventually global bass music.',
    tags: ['baltimore club', 'miss tony', 'rod lee', 'breakbeat', 'house party', 'dj technics', 'jersey club', 'bass music'],
  },

  // DALLAS (0 events → 2010s)
  {
    id: 'evt-dallas-soul-dallas-2015',
    year: 2015,
    location: { lat: 32.7767, lng: -96.797, city: 'Dallas', country: 'US' },
    genre: ['Soul', 'R&B', 'Gospel'],
    title: 'Leon Bridges leads a Dallas-Fort Worth soul revival',
    description: 'Leon Bridges, a Fort Worth dishwasher, releases "Coming Home" — a gorgeous throwback to 1960s soul that earns Grammy nominations and critical acclaim. Dallas-Fort Worth\'s deep gospel roots, which also nurtured Erykah Badu\'s neo-soul revolution in the 1990s, continue to produce artists who bridge past and present.',
    tags: ['leon bridges', 'coming home', 'erykah badu', 'fort worth', 'dallas soul', 'gospel roots', 'neo-soul'],
  },

  // MEXICO CITY (0 events → 1950s)
  {
    id: 'evt-mariachi-mexicocity-1950',
    year: 1950,
    location: { lat: 19.4326, lng: -99.1332, city: 'Mexico City', country: 'Mexico' },
    genre: ['Mariachi', 'Ranchera', 'Bolero'],
    title: 'Mexico City\'s Golden Age of music and cinema',
    description: 'Mexico City\'s Golden Age of cinema propels mariachi and ranchera music to international fame. Pedro Infante, Jorge Negrete, and Lola Beltrán sing on screens across Latin America. Meanwhile, at Plaza Garibaldi, hundreds of mariachi groups perform nightly, establishing the tradition that continues today as a UNESCO Intangible Cultural Heritage.',
    tags: ['mariachi', 'pedro infante', 'jorge negrete', 'lola beltran', 'plaza garibaldi', 'ranchera', 'golden age cinema', 'unesco'],
  },

  // MEXICO CITY (2020s depth)
  {
    id: 'evt-latin-streaming-mexicocity-2023',
    year: 2023,
    location: { lat: 19.4326, lng: -99.1332, city: 'Mexico City', country: 'Mexico' },
    genre: ['Reggaeton', 'Regional Mexican', 'Latin Pop'],
    title: 'Latin music dominates global streaming',
    description: 'Bad Bunny becomes Spotify\'s most-streamed artist for the third consecutive year, while Peso Pluma and Fuerza Regida push Mexican regional música into the Billboard Hot 100. Mexico City\'s Foro Sol hosts the biggest concerts in Latin America as Spanish-language music permanently reshapes the global pop landscape.',
    tags: ['bad bunny', 'peso pluma', 'fuerza regida', 'reggaeton', 'regional mexican', 'spotify', 'latin pop', 'foro sol'],
  },

  // DAKAR (0 events → 1970s, west-africa)
  {
    id: 'evt-mbalax-dakar-1970',
    year: 1970,
    location: { lat: 14.7167, lng: -17.4677, city: 'Dakar', country: 'Senegal' },
    genre: ['Mbalax', 'Afro-Cuban', 'Griot'],
    title: 'Orchestra Baobab fuses Cuban and Senegalese sounds',
    description: 'Orchestra Baobab brings together Wolof griot traditions, Cuban son, and Mandinka kora music at Dakar\'s Club Baobab. Their fluid, cosmopolitan sound captures the spirit of newly independent Senegal. Alongside the Star Band de Dakar (which spawns Youssou N\'Dour\'s Étoile de Dakar), they lay the foundation for mbalax — Senegal\'s national music.',
    tags: ['orchestra baobab', 'youssou ndour', 'mbalax', 'griot', 'star band', 'wolof', 'afro-cuban', 'club baobab'],
  },

  // BEIJING (0 events → 1980s, east-asia)
  {
    id: 'evt-chinese-rock-beijing-1986',
    year: 1986,
    location: { lat: 39.9042, lng: 116.4074, city: 'Beijing', country: 'China' },
    genre: ['Rock', 'New Wave'],
    title: 'Cui Jian performs "Nothing to My Name" — Chinese rock is born',
    description: 'Cui Jian performs "Nothing to My Name" at a televised concert in Beijing, electrifying Chinese youth. The song becomes an anthem of personal freedom and is later sung by students in Tiananmen Square. Cui Jian\'s blend of rock guitar with traditional instruments like the suona launches an underground rock movement that endures through decades of censorship.',
    tags: ['cui jian', 'nothing to my name', 'chinese rock', 'tiananmen', 'suona', 'beijing rock', 'yaogun'],
  },

  // MUMBAI (south-asia depth → 1930s)
  {
    id: 'evt-bollywood-mumbai-1935',
    year: 1935,
    location: { lat: 19.076, lng: 72.8777, city: 'Mumbai', country: 'India' },
    genre: ['Film Music', 'Classical Fusion'],
    title: 'Bollywood playback singing transforms Indian music',
    description: 'The rise of playback singing in Bombay\'s film studios creates a new art form — invisible singers whose voices emerge from actors\' mouths onscreen. K.L. Saigal becomes India\'s first recording superstar, blending Hindustani classical ragas with Western orchestration. The Bollywood music industry grows to become the world\'s largest, producing more films and songs than Hollywood.',
    tags: ['bollywood', 'playback singing', 'kl saigal', 'bombay', 'film music', 'hindustani', 'raga', 'indian cinema'],
  },

  // STOCKHOLM (north-europe depth → 2010s)
  {
    id: 'evt-swedish-pop-stockholm-2012',
    year: 2012,
    location: { lat: 59.3293, lng: 18.0686, city: 'Stockholm', country: 'Sweden' },
    genre: ['Pop', 'EDM', 'Electronic'],
    title: 'Swedish producers dominate global pop',
    description: 'Max Martin, who has already written more #1 hits than anyone except Lennon-McCartney, joins forces with a new generation of Swedish producers — Shellback, Avicii, Swedish House Mafia, and Robyn. Stockholm\'s ecosystem of municipal music schools and the melodifestivalen tradition makes Sweden the world\'s third-largest music exporter per capita.',
    tags: ['max martin', 'avicii', 'swedish house mafia', 'robyn', 'shellback', 'melodifestivalen', 'pop production', 'swedish pop'],
  },

  // PARIS (1920s depth, west-europe)
  {
    id: 'evt-jazz-age-paris-1925',
    year: 1925,
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    genre: ['Jazz', 'Chanson'],
    title: 'Josephine Baker and the Jazz Age conquer Paris',
    description: 'Josephine Baker debuts in "La Revue Nègre" at the Théâtre des Champs-Élysées, mesmerizing Parisian audiences and launching a jazz craze across Europe. African American musicians, fleeing racism, find artistic freedom in Montmartre\'s clubs. Sidney Bechet settles permanently, and Paris becomes jazz\'s second home — a tradition that continues through Django Reinhardt and beyond.',
    tags: ['josephine baker', 'revue negre', 'montmartre', 'sidney bechet', 'jazz age', 'django reinhardt', 'expatriate'],
  },

  // TOKYO (east-asia depth → 1980s)
  {
    id: 'evt-city-pop-tokyo-1981',
    year: 1981,
    location: { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan' },
    genre: ['City Pop', 'J-Pop', 'Funk'],
    title: 'City Pop captures Japan\'s bubble-era optimism',
    description: 'Tatsuro Yamashita releases "Ride on Time" and Mariya Takeuchi records "Plastic Love" as city pop — a smooth fusion of funk, AOR, boogie, and Japanese songwriting — becomes the soundtrack of Tokyo\'s economic miracle. Decades later, YouTube algorithms rediscover these tracks, sparking a global city pop revival and the vaporwave aesthetic.',
    tags: ['tatsuro yamashita', 'mariya takeuchi', 'plastic love', 'city pop', 'bubble era', 'vaporwave', 'ride on time', 'aor'],
  },

  // KINGSTON (dancehall → 1980s)
  {
    id: 'evt-dancehall-kingston-1985',
    year: 1985,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Dancehall', 'Dub'],
    title: 'King Jammy\'s "Sleng Teng" launches the digital dancehall era',
    description: 'King Jammy releases Wayne Smith\'s "Under Mi Sleng Teng", built entirely on a Casio MT-40 keyboard preset — the riddim that launches digital dancehall. Overnight, live bands are replaced by electronic production, and hundreds of artists voice new lyrics over the same riddim. Dancehall\'s raw energy and digital sound influence hip-hop, UK garage, and eventually reggaeton.',
    tags: ['king jammy', 'sleng teng', 'wayne smith', 'dancehall', 'casio', 'digital riddim', 'sound system', 'dub'],
  },

  // ISTANBUL (west-asia depth → 1980s)
  {
    id: 'evt-arabesque-istanbul-1985',
    year: 1985,
    location: { lat: 41.0082, lng: 28.9784, city: 'Istanbul', country: 'Turkey' },
    genre: ['Arabesque', 'Turkish Pop'],
    title: 'Arabesque music captures Turkey\'s urban migration',
    description: 'Ibrahim Tatlıses, Müslüm Gürses, and Orhan Gencebay dominate Turkish popular music with arabesque — a melodramatic fusion of Turkish folk, Arabic maqam scales, and Western pop. Born from the experiences of millions of rural Anatolians migrating to Istanbul\'s gecekondu neighborhoods, arabesque expresses longing, heartbreak, and urban alienation.',
    tags: ['ibrahim tatlises', 'muslum gurses', 'orhan gencebay', 'arabesque', 'gecekondu', 'maqam', 'turkish pop', 'migration'],
  },

  // CAIRO (north-africa depth → 2010s)
  {
    id: 'evt-mahraganat-cairo-2012',
    year: 2012,
    location: { lat: 30.0444, lng: 31.2357, city: 'Cairo', country: 'Egypt' },
    genre: ['Mahraganat', 'Electronic', 'Hip Hop'],
    title: 'Mahraganat electro-shaabi explodes from Cairo\'s streets',
    description: 'In the aftermath of the 2011 revolution, DJs from Cairo\'s working-class neighborhoods create mahraganat — a frenetic, auto-tuned fusion of shaabi folk, electronic beats, and hip-hop. Artists like Islam Chipsy, DJ Figo, and Sadat produce tracks on cracked software and distribute them via Bluetooth and tuk-tuk speakers, creating Egypt\'s most vital new genre.',
    tags: ['mahraganat', 'islam chipsy', 'shaabi', 'electro', 'cairo revolution', 'dj figo', 'sadat', 'tuk-tuk'],
  },

  // MELBOURNE (oceania depth → 2010s)
  {
    id: 'evt-melbourne-indie-2015',
    year: 2015,
    location: { lat: -37.8136, lng: 144.9631, city: 'Melbourne', country: 'Australia' },
    genre: ['Electronic', 'Indie', 'Psychedelic'],
    title: 'Melbourne\'s underground music scene goes global',
    description: 'Tame Impala and Melbourne acts like Courtney Barnett, King Gizzard & the Lizard Wizard, and Flume push Australian music into the global mainstream. Melbourne\'s 400+ live music venues, laneway bars, and a fiercely independent scene make it one of the world\'s great music cities.',
    tags: ['tame impala', 'courtney barnett', 'king gizzard', 'flume', 'laneway', 'live music', 'australian music', 'psychedelic'],
  },

  // LONDON (2020s depth)
  {
    id: 'evt-uk-drill-london-2022',
    year: 2022,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['UK Drill', 'Grime', 'Hip Hop'],
    title: 'UK drill goes global from South London',
    description: 'Central Cee, Dave, and Stormzy lead a wave of UK rap that dominates global streaming charts. UK drill — born in Brixton and Kennington from Chicago drill\'s DNA but with distinctly British slang and sliding 808s — becomes the default sound of young London. The genre spawns derivative scenes in Brooklyn, Paris, and Sydney.',
    tags: ['central cee', 'dave', 'stormzy', 'uk drill', 'brixton', 'grime', '808', 'south london'],
  },

  // SÃO PAULO (south-america depth → 2000s)
  {
    id: 'evt-baile-funk-saopaulo-2004',
    year: 2004,
    location: { lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brazil' },
    genre: ['Baile Funk', 'Electronic', 'Hip Hop'],
    title: 'Baile funk erupts from São Paulo\'s favelas',
    description: 'DJ Marlboro brings baile funk from Rio\'s favelas to São Paulo\'s massive club scene, where it mutates into harder, bass-heavier forms. Built on Miami bass samples and Portuguese-language MC\'ing, baile funk\'s raw energy and DIY production inspire Diplo, M.I.A., and the global bass music movement.',
    tags: ['baile funk', 'dj marlboro', 'favela', 'miami bass', 'diplo', 'mia', 'bass music', 'tecnobrega'],
  },

  // HAVANA (1940s depth)
  {
    id: 'evt-mambo-havana-1948',
    year: 1948,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Mambo', 'Afro-Cuban Jazz'],
    title: 'Pérez Prado ignites the mambo craze',
    description: 'Pérez Prado and his orchestra take the mambo — a fierce, brass-driven evolution of Cuban danzón — from Havana\'s Tropicana nightclub to international fame. "Que Rico el Mambo" sparks a dance craze across the Americas, while Machito and Mario Bauzá fuse Afro-Cuban rhythms with jazz in New York, creating Latin jazz.',
    tags: ['perez prado', 'mambo', 'tropicana', 'machito', 'mario bauza', 'latin jazz', 'danzon', 'afro-cuban'],
  },

  // HAVANA (1990s depth)
  {
    id: 'evt-buena-vista-havana-1996',
    year: 1996,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Son Cubano', 'Bolero', 'Traditional'],
    title: 'Buena Vista Social Club recordings revive Cuban music',
    description: 'Ry Cooder and producer Nick Gold gather aging Cuban musicians — Ibrahim Ferrer, Compay Segundo, Rubén González, and Omara Portuondo — at EGREM Studios in Havana. The resulting Buena Vista Social Club album sells 8 million copies and the Wim Wenders documentary introduces the world to Cuba\'s forgotten musical treasures.',
    tags: ['buena vista social club', 'ry cooder', 'ibrahim ferrer', 'compay segundo', 'omara portuondo', 'egrem', 'wim wenders'],
  },

  // RIO DE JANEIRO (1920s depth)
  {
    id: 'evt-samba-rio-1928',
    year: 1928,
    location: { lat: -22.9068, lng: -43.1729, city: 'Rio de Janeiro', country: 'Brazil' },
    genre: ['Samba'],
    title: 'Samba emerges from Rio\'s favelas into the mainstream',
    description: 'The first samba school, Deixa Falar, is founded in Rio\'s Estácio neighborhood, organizing the Afro-Brazilian rhythms of the morros into structured carnival groups. Samba — already Brazil\'s national music since the hit "Pelo Telefone" — explodes as the samba schools transform Rio\'s Carnival into the world\'s greatest musical spectacle.',
    tags: ['samba', 'deixa falar', 'estacio', 'carnival', 'pelo telefone', 'favela', 'afro-brazilian', 'samba school'],
  },

  // BUENOS AIRES (1910s depth)
  {
    id: 'evt-tango-buenosaires-1913',
    year: 1913,
    location: { lat: -34.6037, lng: -58.3816, city: 'Buenos Aires', country: 'Argentina' },
    genre: ['Tango'],
    title: 'Tango sweeps from Buenos Aires to Paris and the world',
    description: 'Tango, born in the working-class barrios and port districts of Buenos Aires, conquers Parisian dance halls and becomes a global craze. Carlos Gardel emerges as tango\'s greatest voice. The bandoneon, brought by German immigrants, becomes tango\'s signature instrument, giving the music its distinctive melancholy and passion.',
    tags: ['tango', 'carlos gardel', 'bandoneon', 'buenos aires', 'paris', 'barrio', 'milonga', 'port'],
  },

  // --- World Music Map: Global Expansion ---
  // NORTH AFRICA

  // 1. Algeria — Algiers
  {
    id: 'evt-chaabi-algiers-1920',
    year: 1920,
    location: { lat: 36.7538, lng: 3.0588, city: 'Algiers', country: 'Algeria' },
    genre: ['Chaabi'],
    title: 'El Hadj M\'Hamed El Anka pioneers Algerian chaabi',
    description: 'In the Casbah of Algiers, El Hadj M\'Hamed El Anka transforms Andalusian-rooted melodies into chaabi — "the people\'s music." Singing in colloquial Arabic with mandole accompaniment, he creates a populist art form that becomes Algeria\'s most beloved genre for the next century.',
    tags: ['el anka', 'chaabi', 'casbah', 'algiers', 'mandole', 'andalusian', 'north africa', 'algerian folk'],
  },

  // 2. Tunisia — Tunis
  {
    id: 'evt-malouf-tunis-1934',
    year: 1934,
    location: { lat: 36.8065, lng: 10.1815, city: 'Tunis', country: 'Tunisia' },
    genre: ['Malouf', 'Arabic Classical'],
    title: 'Rashidiya Institute codifies Tunisian malouf tradition',
    description: 'The Rashidiya Institute is founded in Tunis to preserve and teach malouf — Tunisia\'s Andalusian art music brought by Moorish refugees from Spain. The institute trains a generation of musicians and singers, ensuring this centuries-old tradition survives into the modern era.',
    tags: ['rashidiya', 'malouf', 'andalusian', 'tunis', 'arab classical', 'conservation', 'tunisia', 'ottoman'],
  },

  // 3. Libya — Tripoli
  {
    id: 'evt-maluf-tripoli-1960',
    year: 1960,
    location: { lat: 32.9022, lng: 13.1800, city: 'Tripoli', country: 'Libya' },
    genre: ['Ma\'luf', 'Arabic Classical'],
    title: 'Hassan Araibi leads Libya\'s golden age of ma\'luf',
    description: 'Singer and oud master Hassan Araibi becomes Libya\'s most celebrated musician, performing ma\'luf — the Libyan branch of Andalusian classical music — on national radio. His ornate vocal style and virtuosic oud playing define Tripoli\'s pre-revolution cultural golden era.',
    tags: ['hassan araibi', 'maluf', 'oud', 'tripoli', 'libyan music', 'andalusian', 'radio tripoli', 'arabic classical'],
  },

  // 4. Sudan — Khartoum
  {
    id: 'evt-haqiba-khartoum-1940',
    year: 1940,
    location: { lat: 15.5007, lng: 32.5599, city: 'Khartoum', country: 'Sudan' },
    genre: ['Haqiba', 'Sudanese Folk'],
    title: 'Haqiba singers define Sudan\'s golden age of song',
    description: 'Poets and singers like Khalil Farah and Ibrahim al-Abadi perfect haqiba — a Sudanese vocal art combining classical Arabic poetry with pentatonic melodies. Performed at weddings, political gatherings, and on Radio Omdurman, haqiba becomes the soundtrack of Sudanese nationalism.',
    tags: ['haqiba', 'khalil farah', 'radio omdurman', 'sudanese poetry', 'khartoum', 'pentatonic', 'nationalism', 'sudan'],
  },

  // WEST AFRICA

  // 5. Mali — Bamako
  {
    id: 'evt-desert-blues-bamako-1994',
    year: 1994,
    location: { lat: 12.6392, lng: -8.0029, city: 'Bamako', country: 'Mali' },
    genre: ['Desert Blues', 'World Music'],
    title: 'Ali Farka Touré and Ry Cooder record "Talking Timbuktu"',
    description: 'Malian guitarist Ali Farka Touré collaborates with American slide guitarist Ry Cooder on "Talking Timbuktu," recorded between Bamako and Los Angeles. The album wins a Grammy and reveals the deep connections between West African string traditions and American blues, forever changing world music.',
    tags: ['ali farka toure', 'ry cooder', 'talking timbuktu', 'grammy', 'desert blues', 'mali', 'niafunke', 'world music'],
  },

  // 6. Burkina Faso — Ouagadougou
  {
    id: 'evt-voltaique-ouaga-1983',
    year: 1983,
    location: { lat: 12.3714, lng: -1.5197, city: 'Ouagadougou', country: 'Burkina Faso' },
    genre: ['Afro-Funk', 'Warba'],
    title: 'Thomas Sankara\'s revolution sparks cultural renaissance',
    description: 'Revolutionary president Thomas Sankara bans imported music on state radio, forcing Burkinabé musicians to create original work. Bands like Volta Jazz and Coulibaly Tidiane blend warba rhythms with funk and Mandingue melodies, igniting a golden age of homegrown music in Ouagadougou.',
    tags: ['thomas sankara', 'volta jazz', 'warba', 'burkina faso', 'cultural revolution', 'afro-funk', 'ouagadougou', 'pan-african'],
  },

  // 7. Côte d\'Ivoire — Abidjan
  {
    id: 'evt-coupe-decale-abidjan-2002',
    year: 2002,
    location: { lat: 5.3600, lng: -4.0083, city: 'Abidjan', country: 'Côte d\'Ivoire' },
    genre: ['Coupé-Décalé', 'Zouglou'],
    title: 'Douk Saga invents coupé-décalé in Abidjan',
    description: 'Douk Saga and the Jet Set crew create coupé-décalé — a flashy, high-energy dance music combining Congolese rhythms, electronic production, and ostentatious style. Born amid civil war, it becomes an escapist anthem for Ivorian youth and conquers Francophone Africa.',
    tags: ['douk saga', 'coupe-decale', 'jet set', 'abidjan', 'ivorian music', 'zouglou', 'francophone', 'dance music'],
  },

  // 8. Guinea — Conakry
  {
    id: 'evt-bembeya-conakry-1966',
    year: 1966,
    location: { lat: 9.6412, lng: -13.5784, city: 'Conakry', country: 'Guinea' },
    genre: ['Mandingue', 'Afro-Jazz'],
    title: 'Bembeya Jazz National electrifies revolutionary Guinea',
    description: 'Under Sékou Touré\'s revolutionary government, Bembeya Jazz National becomes Guinea\'s premier state-sponsored orchestra. Fusing Mandingue griot melodies with Cuban son and jazz, they perform at festivals from Algiers to Havana, becoming the most influential band in Francophone West Africa.',
    tags: ['bembeya jazz', 'sekou toure', 'mandingue', 'state orchestra', 'guinea', 'conakry', 'pan-african', 'afro-cuban'],
  },

  // 9. Guinea-Bissau — Bissau
  {
    id: 'evt-gumbe-bissau-1975',
    year: 1975,
    location: { lat: 11.8636, lng: -15.5977, city: 'Bissau', country: 'Guinea-Bissau' },
    genre: ['Gumbe', 'Afro-Portuguese'],
    title: 'Independence unleashes gumbe music revival',
    description: 'Following independence from Portugal, Guinea-Bissau\'s musicians reclaim gumbe — a creole rhythm born from the fusion of West African percussion, Portuguese folk, and Caribbean influences. Artists like José Carlos Schwarz sing revolutionary poetry over calabash and guitar, forging a national sound.',
    tags: ['gumbe', 'jose carlos schwarz', 'independence', 'guinea-bissau', 'creole', 'calabash', 'lusophone', 'revolution'],
  },

  // 10. Sierra Leone — Freetown
  {
    id: 'evt-palmwine-freetown-1952',
    year: 1952,
    location: { lat: 8.4657, lng: -13.2317, city: 'Freetown', country: 'Sierra Leone' },
    genre: ['Palm Wine', 'Maringa'],
    title: 'Ebenezer Calendar perfects Freetown palm wine guitar',
    description: 'Ebenezer Calendar and His Maringa Band bring palm wine music to its peak in Freetown\'s waterfront bars. Named for the palm wine shared while playing, this gentle acoustic guitar style — blending Krio, Mende, and Caribbean influences — spreads across West Africa and shapes highlife guitar.',
    tags: ['ebenezer calendar', 'palm wine', 'maringa', 'freetown', 'krio', 'acoustic guitar', 'sierra leone', 'west african guitar'],
  },

  // 11. Liberia — Monrovia
  {
    id: 'evt-hipco-monrovia-2004',
    year: 2004,
    location: { lat: 6.2907, lng: -10.7605, city: 'Monrovia', country: 'Liberia' },
    genre: ['Hipco', 'Hip Hop'],
    title: 'Hipco emerges as Liberia\'s post-war voice',
    description: 'After fourteen years of devastating civil war, young Liberians create hipco — a raw fusion of hip hop beats with colloquial Liberian English and indigenous languages. Artists like Takun J and F.A. use the genre to process trauma, demand accountability, and rebuild cultural identity.',
    tags: ['hipco', 'takun j', 'fa', 'monrovia', 'post-war', 'liberian english', 'hip hop', 'reconstruction'],
  },

  // 12. Togo — Lomé
  {
    id: 'evt-bella-bellow-lome-1969',
    year: 1969,
    location: { lat: 6.1256, lng: 1.2254, city: 'Lomé', country: 'Togo' },
    genre: ['Afro-Pop', 'Highlife'],
    title: 'Bella Bellow becomes the voice of Togo',
    description: 'Singer Bella Bellow captivates audiences across Africa and Europe with her powerful voice blending Ewe melodies, highlife, and chanson. Her performances at major festivals and her recordings in Paris make her Togo\'s first international star before her tragic death in 1973.',
    tags: ['bella bellow', 'togo', 'ewe', 'highlife', 'chanson', 'lome', 'african diva', 'afro-pop'],
  },

  // 13. Benin — Cotonou
  {
    id: 'evt-gangbe-cotonou-2001',
    year: 2001,
    location: { lat: 6.3703, lng: 2.3912, city: 'Cotonou', country: 'Benin' },
    genre: ['Vodun Music', 'Brass Band'],
    title: 'Gangbé Brass Band fuses Vodun with New Orleans brass',
    description: 'The Gangbé Brass Band emerges from Cotonou, channeling Vodun ceremonial rhythms through brass instruments in a sound that mirrors New Orleans jazz — no coincidence, since Vodun traveled from Benin to Louisiana with enslaved people. They become global festival sensations, closing a 300-year musical circle.',
    tags: ['gangbe brass band', 'vodun', 'cotonou', 'benin', 'brass', 'new orleans', 'ceremony', 'world music'],
  },

  // 14. Niger — Niamey
  {
    id: 'evt-mdou-moctar-niamey-2019',
    year: 2019,
    location: { lat: 13.5127, lng: 2.1128, city: 'Niamey', country: 'Niger' },
    genre: ['Tuareg Blues', 'Desert Rock'],
    title: 'Mdou Moctar electrifies Tuareg guitar on the world stage',
    description: 'Tuareg guitarist Mdou Moctar, from Agadez in northern Niger, releases "Ilana: The Creator" to global acclaim. His blistering electric guitar — learned from homemade instruments and cellphone-shared videos — fuses Tuareg assouf melodies with Hendrix-like distortion, redefining desert rock.',
    tags: ['mdou moctar', 'tuareg', 'agadez', 'assouf', 'desert rock', 'niger', 'guitar', 'sahara'],
  },

  // 15. Mauritania — Nouakchott
  {
    id: 'evt-dimi-mint-abba-nouakchott-1977',
    year: 1977,
    location: { lat: 18.0735, lng: -15.9582, city: 'Nouakchott', country: 'Mauritania' },
    genre: ['Griot Tradition', 'Moorish Classical'],
    title: 'Dimi Mint Abba becomes the diva of the Sahara',
    description: 'Dimi Mint Abba, daughter of one of Mauritania\'s most revered griots, wins a national music competition and begins her rise as the country\'s greatest singer. Her electric ardine harp and soaring voice carry centuries of Moorish poetic tradition, earning her the title "Diva of the Desert."',
    tags: ['dimi mint abba', 'griot', 'ardine', 'mauritania', 'moorish', 'sahara', 'nouakchott', 'desert diva'],
  },

  // 16. Gambia — Banjul
  {
    id: 'evt-kora-banjul-1970',
    year: 1970,
    location: { lat: 13.4549, lng: -16.5790, city: 'Banjul', country: 'Gambia' },
    genre: ['Kora Music', 'Afro-Manding'],
    title: 'Alhaji Bai Konte carries kora mastery to the world',
    description: 'Master kora player Alhaji Bai Konte begins performing the 21-string West African harp for international audiences, introducing the Mandinka griot tradition to the world. His recordings with his sons preserve ancient Gambian oral histories and establish the kora as Africa\'s most iconic stringed instrument.',
    tags: ['alhaji bai konte', 'kora', 'mandinka', 'griot', 'banjul', 'gambia', 'oral history', 'west african harp'],
  },

  // 17. Cape Verde — Praia
  {
    id: 'evt-morna-praia-1988',
    year: 1988,
    location: { lat: 14.9315, lng: -23.5133, city: 'Praia', country: 'Cape Verde' },
    genre: ['Morna', 'World Music'],
    title: 'Cesária Évora records her debut, launching morna worldwide',
    description: 'Cesária Évora, a singer from Mindelo who performed barefoot in smoky harbor bars for decades, records her debut album "La Diva aux Pieds Nus." Her aching morna ballads — infused with sodade (longing) — eventually win a Grammy and make Cape Verde synonymous with Atlantic melancholy.',
    tags: ['cesaria evora', 'morna', 'sodade', 'mindelo', 'cape verde', 'barefoot diva', 'lusophone', 'atlantic'],
  },

  // CENTRAL AFRICA

  // 18. DR Congo — Kinshasa
  {
    id: 'evt-rumba-kinshasa-1956',
    year: 1956,
    location: { lat: -4.4419, lng: 15.2663, city: 'Kinshasa', country: 'DR Congo' },
    genre: ['Rumba Congolaise', 'Soukous'],
    title: 'Franco and OK Jazz ignite the Congolese rumba revolution',
    description: 'Franco Luambo Makiadi and his TPOK Jazz orchestra begin their legendary residency in Léopoldville (now Kinshasa), pioneering Congolese rumba — a reinterpretation of Cuban son with intricate guitar work and Lingala vocals. For the next four decades, Franco becomes Africa\'s most prolific recording artist.',
    tags: ['franco', 'ok jazz', 'congolese rumba', 'lingala', 'leopoldville', 'kinshasa', 'guitar', 'soukous'],
  },

  // 19. Republic of Congo — Brazzaville
  {
    id: 'evt-brazza-rumba-1960',
    year: 1960,
    location: { lat: -4.2634, lng: 15.2429, city: 'Brazzaville', country: 'Republic of Congo' },
    genre: ['Congolese Rumba', 'Soukous'],
    title: 'Brazzaville rivals Kinshasa as rumba capital',
    description: 'Across the Congo River from Kinshasa, Brazzaville develops its own rumba scene with bands like Les Bantous de la Capitale, led by guitarist Célio "Théo Blaise" Nkouka. The twin cities create a musical rivalry that produces Africa\'s most influential popular music for generations.',
    tags: ['les bantous', 'brazzaville', 'congolese rumba', 'celio nkouka', 'congo', 'twin cities', 'independence', 'soukous'],
  },

  // 20. Cameroon — Douala
  {
    id: 'evt-makossa-douala-1972',
    year: 1972,
    location: { lat: 4.0511, lng: 9.7679, city: 'Douala', country: 'Cameroon' },
    genre: ['Makossa', 'Afro-Funk'],
    title: 'Manu Dibango\'s "Soul Makossa" goes global',
    description: 'Cameroonian saxophonist Manu Dibango records "Soul Makossa" as a B-side for a World Cup anthem. The track\'s infectious bassline crosses the Atlantic, becomes a disco hit in New York, and is later sampled by Michael Jackson on "Wanna Be Startin\' Somethin\'." It remains one of the most borrowed riffs in pop history.',
    tags: ['manu dibango', 'soul makossa', 'douala', 'cameroon', 'saxophone', 'disco', 'michael jackson', 'afro-funk'],
  },

  // 21. Gabon — Libreville
  {
    id: 'evt-bwiti-libreville-1950',
    year: 1950,
    location: { lat: 0.4162, lng: 9.4673, city: 'Libreville', country: 'Gabon' },
    genre: ['Bwiti Music', 'Ritual'],
    title: 'Bwiti musical rituals documented for the first time',
    description: 'Ethnomusicologists begin documenting the Bwiti initiation rituals of Gabon\'s Fang and Mitsogo peoples — elaborate all-night ceremonies featuring ngombi harp, polyrhythmic percussion, and polyphonic chanting. The sacred music, tied to iboga plant ceremonies, represents one of Central Africa\'s most complex musical traditions.',
    tags: ['bwiti', 'ngombi', 'fang', 'mitsogo', 'iboga', 'ritual music', 'gabon', 'polyphony'],
  },

  // 22. Equatorial Guinea — Malabo
  {
    id: 'evt-balele-malabo-1968',
    year: 1968,
    location: { lat: 3.7504, lng: 8.7371, city: 'Malabo', country: 'Equatorial Guinea' },
    genre: ['Balélé', 'Spanish-African Fusion'],
    title: 'Independence sparks balélé cultural revival',
    description: 'As Equatorial Guinea gains independence from Spain, the Bubi people of Bioko Island revive balélé — a vibrant communal dance accompanied by drums, bells, and call-and-response singing. The tradition, suppressed under colonial rule, becomes a symbol of national identity in Africa\'s only Spanish-speaking nation.',
    tags: ['balele', 'bubi', 'bioko', 'equatorial guinea', 'independence', 'spanish africa', 'malabo', 'communal dance'],
  },

  // 23. Central African Republic — Bangui
  {
    id: 'evt-aka-polyphony-bangui-2003',
    year: 2003,
    location: { lat: 4.3947, lng: 18.5582, city: 'Bangui', country: 'Central African Republic' },
    genre: ['Pygmy Polyphony', 'Traditional'],
    title: 'UNESCO inscribes Aka Pygmy oral traditions',
    description: 'UNESCO proclaims the oral traditions of the Aka Pygmies a Masterpiece of Intangible Heritage. Their extraordinary polyphonic singing — where multiple voices weave independent melodic lines without a conductor — represents one of humanity\'s most sophisticated musical achievements, developed over millennia in the Congo Basin rainforest.',
    tags: ['aka pygmy', 'polyphony', 'unesco', 'rainforest', 'congo basin', 'bangui', 'intangible heritage', 'oral tradition'],
  },

  // 24. Chad — N\'Djamena
  {
    id: 'evt-sai-ndjamena-1995',
    year: 1995,
    location: { lat: 12.1348, lng: 15.0557, city: 'N\'Djamena', country: 'Chad' },
    genre: ['Sai', 'Desert Blues'],
    title: 'Groupe Tibesti revives Chadian sai music',
    description: 'Groupe Tibesti and other Chadian artists revitalize sai — a hypnotic Saharan genre combining repetitive guitar patterns with call-and-response vocals in Arabic, Gorane, and Sara languages. Born in the desert north, sai reflects Chad\'s position as a musical bridge between Arab North Africa and sub-Saharan traditions.',
    tags: ['groupe tibesti', 'sai', 'saharan', 'chad', 'gorane', 'sara', 'desert music', 'ndjamena'],
  },

  // 25. São Tomé and Príncipe — São Tomé
  {
    id: 'evt-ussua-saotome-1975',
    year: 1975,
    location: { lat: 0.1864, lng: 6.6131, city: 'São Tomé', country: 'São Tomé and Príncipe' },
    genre: ['Ússua', 'Socopé'],
    title: 'Independence revives São Tomé\'s unique creole music',
    description: 'After independence from Portugal, the islands\' unique musical traditions flourish openly. Ússua (a slow, elegant ballroom dance), socopé (faster carnival music), and dexa (hip-swaying social dance) — all born from the fusion of African rhythms and Portuguese colonial culture — become symbols of national pride.',
    tags: ['ussua', 'socope', 'dexa', 'sao tome', 'creole', 'independence', 'lusophone', 'island music'],
  },

  // EAST AFRICA

  // 26. Tanzania — Dar es Salaam
  {
    id: 'evt-bongo-flava-dar-1990',
    year: 1990,
    location: { lat: -6.7924, lng: 39.2083, city: 'Dar es Salaam', country: 'Tanzania' },
    genre: ['Bongo Flava', 'Hip Hop'],
    title: 'Bongo Flava emerges as Tanzania\'s hip hop revolution',
    description: 'Young Tanzanians create Bongo Flava — a Swahili hip hop style blending American rap with taarab melodies, dansi guitar, and Swahili poetry. Artists like Mr. II (Sugu) and Professor Jay transform Dar es Salaam into East Africa\'s hip hop capital, using street slang to tackle politics and daily life.',
    tags: ['bongo flava', 'mr ii', 'professor jay', 'swahili hip hop', 'dar es salaam', 'tanzania', 'taarab', 'east africa'],
  },

  // 27. Uganda — Kampala
  {
    id: 'evt-kadongo-kamu-kampala-1965',
    year: 1965,
    location: { lat: 0.3476, lng: 32.5825, city: 'Kampala', country: 'Uganda' },
    genre: ['Kadongo Kamu', 'Folk'],
    title: 'Elly Wamala pioneers Uganda\'s kadongo kamu guitar ballad',
    description: 'Singer-guitarist Elly Wamala popularizes kadongo kamu — "one little guitar" in Luganda — a deeply personal ballad style where a solo acoustic guitar accompanies narrative storytelling. His songs about love, morality, and Kampala life make him the father of Ugandan popular music.',
    tags: ['elly wamala', 'kadongo kamu', 'luganda', 'kampala', 'acoustic guitar', 'uganda', 'ballad', 'storytelling'],
  },

  // 28. Rwanda — Kigali
  {
    id: 'evt-inanga-kigali-2010',
    year: 2010,
    location: { lat: -1.9403, lng: 29.8739, city: 'Kigali', country: 'Rwanda' },
    genre: ['Hip Hop', 'Afro-Pop'],
    title: 'Rwanda\'s music scene rebuilds with hip hop and hope',
    description: 'A new generation of Rwandan artists including Meddy, The Ben, and rapper Riderman use music to heal and unite a nation still recovering from the 1994 genocide. Kigali\'s growing club scene and annual KigaliUp festival blend traditional inanga chant with modern Afro-pop and hip hop.',
    tags: ['meddy', 'the ben', 'riderman', 'kigali', 'rwanda', 'post-genocide', 'healing', 'kigaliup'],
  },

  // 29. Burundi — Bujumbura
  {
    id: 'evt-drummers-bujumbura-1964',
    year: 1964,
    location: { lat: -3.3731, lng: 29.3644, city: 'Bujumbura', country: 'Burundi' },
    genre: ['Royal Drumming', 'Traditional'],
    title: 'Royal Drummers of Burundi tour the world',
    description: 'The Royal Drummers of Burundi, performing the sacred karyenda ritual with massive amashako drums, begin touring internationally. Their thunderous polyrhythmic performances influence everyone from Joni Mitchell to Def Leppard, and their recordings are sampled extensively in electronic and pop music worldwide.',
    tags: ['royal drummers', 'karyenda', 'amashako', 'burundi', 'polyrhythm', 'ritual', 'bujumbura', 'world percussion'],
  },

  // 30. Somalia — Mogadishu
  {
    id: 'evt-waaberi-mogadishu-1972',
    year: 1972,
    location: { lat: 2.0469, lng: 45.3182, city: 'Mogadishu', country: 'Somalia' },
    genre: ['Somali Jazz', 'Qaraami'],
    title: 'Waaberi band leads Mogadishu\'s golden age of funk',
    description: 'The state-backed Waaberi band, along with artists like Dur-Dur Band and Iftin Band, create a dazzling Mogadishu sound fusing Somali pentatonic melodies with funk, disco, and Bollywood influences. This golden era of Somali music — tragically cut short by civil war in 1991 — is rediscovered decades later through the Awesome Tapes from Africa label.',
    tags: ['waaberi', 'dur-dur band', 'iftin', 'mogadishu', 'somali funk', 'qaraami', 'golden age', 'awesome tapes'],
  },

  // 31. Eritrea — Asmara
  {
    id: 'evt-guayla-asmara-1993',
    year: 1993,
    location: { lat: 15.3229, lng: 38.9251, city: 'Asmara', country: 'Eritrea' },
    genre: ['Guayla', 'Tigrinya Music'],
    title: 'Eritrean independence ignites a guayla celebration',
    description: 'After thirty years of war for independence from Ethiopia, Eritreans celebrate in Asmara\'s streets with guayla — a shoulder-shaking dance accompanied by the krar lyre, kebero drum, and ululating vocals. Musicians like Yemane Barya and Helen Meles channel liberation joy into a new era of Eritrean music.',
    tags: ['guayla', 'independence', 'yemane barya', 'helen meles', 'krar', 'kebero', 'asmara', 'eritrea'],
  },

  // 32. Djibouti — Djibouti City
  {
    id: 'evt-djibouti-folk-1977',
    year: 1977,
    location: { lat: 11.5721, lng: 43.1456, city: 'Djibouti City', country: 'Djibouti' },
    genre: ['Somali Music', 'Afar Folk'],
    title: 'Djibouti independence gives voice to Afar and Issa traditions',
    description: 'Following independence from France, Djibouti\'s musicians celebrate by blending Afar and Issa Somali vocal traditions with oud and modern instruments. Singers like Nima Djama perform at independence festivals, preserving the distinct poetic singing styles of the Horn of Africa\'s smallest nation.',
    tags: ['nima djama', 'afar', 'issa', 'djibouti', 'independence', 'oud', 'horn of africa', 'somali poetry'],
  },

  // 33. South Sudan — Juba
  {
    id: 'evt-juba-music-peace-2012',
    year: 2012,
    location: { lat: 4.8594, lng: 31.5713, city: 'Juba', country: 'South Sudan' },
    genre: ['Gospel', 'Reggae', 'Dinka Chant'],
    title: 'South Sudan\'s artists forge music for a new nation',
    description: 'In the world\'s newest country, artists like Emmanuel Jal — a former child soldier turned hip hop star — and Yaba Angelosi use music to promote peace and reconciliation. Mixing Dinka and Nuer chanting traditions with reggae and gospel, Juba\'s nascent music scene becomes a beacon of hope.',
    tags: ['emmanuel jal', 'yaba angelosi', 'south sudan', 'juba', 'peace music', 'child soldier', 'dinka', 'new nation'],
  },

  // 34. Madagascar — Antananarivo
  {
    id: 'evt-salegy-antananarivo-1992',
    year: 1992,
    location: { lat: -18.8792, lng: 47.5079, city: 'Antananarivo', country: 'Madagascar' },
    genre: ['Salegy', 'World Music'],
    title: 'Jaojoby brings salegy to the world stage',
    description: 'Eusèbe Jaojoby, the "King of Salegy," brings Madagascar\'s most popular dance music to international attention. Salegy — a frenetic 6/8 rhythm driven by electric guitar and accordion from the island\'s northwest — becomes a global festival favorite, showcasing Madagascar\'s musical traditions that developed in isolation from mainland Africa.',
    tags: ['jaojoby', 'salegy', 'madagascar', 'antananarivo', 'six-eight', 'island music', 'accordion', 'world music'],
  },

  // 35. Comoros — Moroni
  {
    id: 'evt-twarab-moroni-1985',
    year: 1985,
    location: { lat: -11.7172, lng: 43.2551, city: 'Moroni', country: 'Comoros' },
    genre: ['Twarab', 'Mgodro'],
    title: 'Comorian twarab blends Swahili coast with Arab oud',
    description: 'Comorian musicians develop their own variant of Swahili coast twarab, blending Arabic oud and qanun with the driving rhythms of mgodro and chigoma. Wedding celebrations in Moroni become week-long musical marathons where these traditions merge under moonlit skies fragrant with ylang-ylang.',
    tags: ['twarab', 'mgodro', 'comoros', 'moroni', 'oud', 'swahili coast', 'wedding music', 'indian ocean'],
  },

  // 36. Mauritius — Port Louis
  {
    id: 'evt-sega-portlouis-1964',
    year: 1964,
    location: { lat: -20.1609, lng: 57.5012, city: 'Port Louis', country: 'Mauritius' },
    genre: ['Sega', 'Seggae'],
    title: 'Ti Frère becomes the king of Mauritian sega',
    description: 'Alphonse "Ti Frère" Ravaton transforms sega from a marginalized creole music into Mauritius\'s national genre. Playing ravanne frame drum and singing in Kreol, he gives voice to the island\'s Afro-Creole majority. His legacy leads directly to Kaya\'s 1980s invention of seggae — sega fused with reggae.',
    tags: ['ti frere', 'sega', 'ravanne', 'kreol', 'mauritius', 'port louis', 'kaya', 'seggae'],
  },

  // 37. Seychelles — Victoria
  {
    id: 'evt-moutya-victoria-2011',
    year: 2011,
    location: { lat: -4.6191, lng: 55.4513, city: 'Victoria', country: 'Seychelles' },
    genre: ['Moutya', 'Sega'],
    title: 'Seychelles nominates moutya for UNESCO recognition',
    description: 'The Seychelles government begins the process of nominating moutya for UNESCO Intangible Heritage status. This nocturnal drum-and-voice tradition — where dancers move in hypnotic circles under coconut palms — was created by enslaved Africans on the islands and remains a powerful symbol of creole resistance and cultural survival.',
    tags: ['moutya', 'unesco', 'seychelles', 'victoria', 'creole', 'drum dance', 'enslaved heritage', 'cultural survival'],
  },

  // SOUTHERN AFRICA

  // 38. Mozambique — Maputo
  {
    id: 'evt-marrabenta-maputo-1955',
    year: 1955,
    location: { lat: -25.9692, lng: 32.5732, city: 'Maputo', country: 'Mozambique' },
    genre: ['Marrabenta', 'Afro-Pop'],
    title: 'Fany Pfumo pioneers marrabenta guitar in Lourenço Marques',
    description: 'Guitarist Fany Pfumo electrifies Lourenço Marques (now Maputo) with marrabenta — a fast, syncopated guitar style born from homemade tin-can instruments in the city\'s cane suburbs. Named from the Portuguese "rebentar" (to break), marrabenta\'s frenzied energy reflects the spirit of a colonized people dancing toward freedom.',
    tags: ['fany pfumo', 'marrabenta', 'lourenco marques', 'maputo', 'mozambique', 'guitar', 'tin can', 'colonial resistance'],
  },

  // 39. Zimbabwe — Harare
  {
    id: 'evt-chimurenga-harare-1977',
    year: 1977,
    location: { lat: -17.8292, lng: 31.0522, city: 'Harare', country: 'Zimbabwe' },
    genre: ['Chimurenga', 'Mbira'],
    title: 'Thomas Mapfumo weaponizes mbira for Zimbabwe\'s liberation',
    description: 'Thomas Mapfumo adapts the sacred mbira thumb piano melodies to electric guitar, creating chimurenga — "struggle music." His songs in Shona, laden with coded political messages, become anthems of Zimbabwe\'s liberation war. The Rhodesian government bans his records and imprisons him, only increasing his legend.',
    tags: ['thomas mapfumo', 'chimurenga', 'mbira', 'harare', 'zimbabwe', 'liberation war', 'shona', 'rhodesia'],
  },

  // 40. Zambia — Lusaka
  {
    id: 'evt-zamrock-lusaka-1974',
    year: 1974,
    location: { lat: -15.3875, lng: 28.3228, city: 'Lusaka', country: 'Zambia' },
    genre: ['Zamrock', 'Afro-Psych'],
    title: 'WITCH and Zamrock explode in Lusaka\'s nightclubs',
    description: 'WITCH (We Intend To Cause Havoc), Rikki Ililonga, Paul Ngozi, and Amanaz create Zamrock — a ferocious fusion of psychedelic rock, garage fuzz, and Zambian rhythms. Playing in Lusaka\'s hotels and mining town clubs, they produce some of the most raw and exciting rock music anywhere in the 1970s, later rediscovered by crate diggers worldwide.',
    tags: ['witch', 'zamrock', 'rikki ililonga', 'paul ngozi', 'amanaz', 'lusaka', 'psychedelic', 'crate digging'],
  },

  // 41. Malawi — Blantyre
  {
    id: 'evt-malipenga-blantyre-1960',
    year: 1960,
    location: { lat: -15.7667, lng: 35.0168, city: 'Blantyre', country: 'Malawi' },
    genre: ['Malipenga', 'Brass Band'],
    title: 'Malipenga brass bands march toward Malawian independence',
    description: 'As Nyasaland moves toward independence as Malawi, malipenga brass bands — originally mimicking European military parades with homemade instruments — become vehicles of cultural pride. The Tonga and Ngoni peoples transform colonial brass traditions into exuberant African performance art featuring elaborate costumes and athletic dancing.',
    tags: ['malipenga', 'brass band', 'nyasaland', 'malawi', 'independence', 'tonga', 'ngoni', 'military parade'],
  },

  // 42. Botswana — Gaborone
  {
    id: 'evt-motswako-gaborone-2005',
    year: 2005,
    location: { lat: -24.6282, lng: 25.9231, city: 'Gaborone', country: 'Botswana' },
    genre: ['Motswako', 'Hip Hop'],
    title: 'Zeus and motswako put Botswana rap on the map',
    description: 'Rapper Zeus and fellow artists pioneer motswako — a hip hop style rapping in Setswana over beats mixing kwaito, house, and traditional rhythms. Meanwhile, Botswana\'s underground heavy metal scene, with fans wearing cowboy-leather hybrids in the Kalahari, becomes a viral global fascination.',
    tags: ['zeus', 'motswako', 'setswana rap', 'gaborone', 'botswana', 'kwaito', 'heavy metal', 'kalahari'],
  },

  // 43. Namibia — Windhoek
  {
    id: 'evt-shambo-windhoek-2000',
    year: 2000,
    location: { lat: -22.5609, lng: 17.0658, city: 'Windhoek', country: 'Namibia' },
    genre: ['Shambo', 'Kwaito'],
    title: 'The Dogg launches Namibian kwaito and shambo',
    description: 'Rapper and producer The Dogg (Martin Morocky) becomes Namibia\'s first hip hop star, blending South African kwaito with Oshiwambo-language lyrics and dancehall energy. His success sparks the shambo movement — a distinctly Namibian party sound that fills clubs from Windhoek to the Caprivi Strip.',
    tags: ['the dogg', 'shambo', 'kwaito', 'oshiwambo', 'windhoek', 'namibia', 'dancehall', 'namibian hip hop'],
  },

  // 44. Eswatini — Mbabane
  {
    id: 'evt-umhlanga-mbabane-1940',
    year: 1940,
    location: { lat: -26.3054, lng: 31.1367, city: 'Mbabane', country: 'Eswatini' },
    genre: ['Swazi Traditional', 'Sibhaca'],
    title: 'Umhlanga Reed Dance preserves Swazi musical heritage',
    description: 'The annual Umhlanga Reed Dance ceremony, featuring thousands of young women singing and dancing before the Queen Mother, becomes central to Eswatini\'s cultural identity. Accompanied by sibhaca stomping dances and ligugu songs, the ceremony preserves musical traditions dating back centuries in the last absolute monarchy in Africa.',
    tags: ['umhlanga', 'reed dance', 'sibhaca', 'eswatini', 'swazi', 'queen mother', 'ceremony', 'monarchy'],
  },

  // 45. Lesotho — Maseru
  {
    id: 'evt-famo-maseru-1970',
    year: 1970,
    location: { lat: -29.3167, lng: 27.4833, city: 'Maseru', country: 'Lesotho' },
    genre: ['Famo', 'Sesotho Traditional'],
    title: 'Famo music echoes through Lesotho\'s mountain kingdom',
    description: 'Famo — a raw, accordion-driven genre created by Basotho migrant miners — becomes Lesotho\'s most distinctive musical export. Sung in Sesotho with lyrics about love, hardship, and mountain life, famo\'s rhythms mirror the galloping hooves of Basotho ponies. Artists like Puseletso Seema carry the sound from mineshafts to concert stages.',
    tags: ['famo', 'accordion', 'basotho', 'migrant miners', 'lesotho', 'maseru', 'sesotho', 'mountain kingdom'],
  },
  // --- NORTH EUROPE EVENTS ---

  // 1. Norway — Oslo
  {
    id: 'evt-black-metal-oslo-1993',
    year: 1993,
    location: { lat: 59.9139, lng: 10.7522, city: 'Oslo', country: 'Norway' },
    genre: ['Black Metal'],
    title: 'Norwegian black metal erupts from Oslo\'s underground',
    description: 'Mayhem, Burzum, Darkthrone, and Emperor create Norwegian black metal — a ferocious, lo-fi genre accompanied by church burnings and murder that becomes the most controversial music movement of the 1990s. Oslo\'s Helvete record shop serves as the scene\'s headquarters, and the "inner circle" shapes extreme metal worldwide.',
    tags: ['mayhem', 'burzum', 'darkthrone', 'emperor', 'helvete', 'black metal', 'euronymous', 'norwegian metal'],
  },

  // 2. Finland — Helsinki
  {
    id: 'evt-metal-helsinki-2006',
    year: 2006,
    location: { lat: 60.1699, lng: 24.9384, city: 'Helsinki', country: 'Finland' },
    genre: ['Metal', 'Classical'],
    title: 'Lordi wins Eurovision and Finland becomes heavy metal\'s homeland',
    description: 'Monster-costumed hard rock band Lordi wins Eurovision with "Hard Rock Hallelujah", shocking Europe and confirming Finland as heavy metal\'s spiritual home. With more metal bands per capita than any nation, Finland treats heavy metal as folk music — Nightwish, HIM, Children of Bodom, and Apocalyptica (who play Metallica on cellos) are national treasures.',
    tags: ['lordi', 'eurovision', 'nightwish', 'him', 'children of bodom', 'apocalyptica', 'finnish metal'],
  },

  // 3. Denmark — Copenhagen
  {
    id: 'evt-jazz-copenhagen-1979',
    year: 1979,
    location: { lat: 55.6761, lng: 12.5683, city: 'Copenhagen', country: 'Denmark' },
    genre: ['Jazz', 'Free Jazz'],
    title: 'Copenhagen Jazz Festival becomes Europe\'s premier jazz event',
    description: 'The Copenhagen Jazz Festival launches, quickly growing into one of Europe\'s largest and most prestigious jazz events. Copenhagen\'s Montmartre jazz club had hosted legends like Dexter Gordon, Ben Webster, and Kenny Drew since the 1960s, establishing Denmark as jazz\'s European home. The festival cements this legacy with 1,000+ concerts across the city each July.',
    tags: ['copenhagen jazz festival', 'montmartre', 'dexter gordon', 'ben webster', 'kenny drew', 'scandinavian jazz'],
  },

  // 4. Iceland — Reykjavik
  {
    id: 'evt-bjork-reykjavik-1993',
    year: 1993,
    location: { lat: 64.1466, lng: -21.9426, city: 'Reykjavik', country: 'Iceland' },
    genre: ['Electronic', 'Art Pop'],
    title: 'Björk\'s "Debut" puts Iceland on the global music map',
    description: 'After fronting the Sugarcubes, Björk releases her solo album "Debut" — a revolutionary fusion of house beats, jazz, and avant-garde songwriting that catapults Reykjavik onto the world stage. Sigur Rós, múm, and the Iceland Airwaves festival follow, making this nation of 370,000 one of music\'s most prolific creative forces per capita.',
    tags: ['bjork', 'debut', 'sugarcubes', 'sigur ros', 'iceland airwaves', 'reykjavik', 'icelandic music'],
  },

  // 5. Ireland — Dublin
  {
    id: 'evt-u2-dublin-1983',
    year: 1983,
    location: { lat: 53.3498, lng: -6.2603, city: 'Dublin', country: 'Ireland' },
    genre: ['Rock', 'Post-Punk'],
    title: 'U2\'s "War" launches Dublin\'s post-punk scene globally',
    description: 'U2 releases "War" featuring "Sunday Bloody Sunday", becoming one of the biggest rock bands in the world. Formed at Mount Temple school in Dublin, U2 channels Ireland\'s political turmoil into anthemic post-punk. Alongside The Cranberries, Sinéad O\'Connor, and My Bloody Valentine, Irish rock enters a golden era.',
    tags: ['u2', 'war', 'sunday bloody sunday', 'bono', 'cranberries', 'sinead oconnor', 'dublin rock', 'irish music'],
  },

  // --- WEST EUROPE EVENTS ---

  // 6. Netherlands — Amsterdam
  {
    id: 'evt-edm-amsterdam-2005',
    year: 2005,
    location: { lat: 52.3676, lng: 4.9041, city: 'Amsterdam', country: 'Netherlands' },
    genre: ['EDM', 'Trance', 'Hardstyle'],
    title: 'Amsterdam Dance Event becomes the world\'s electronic music summit',
    description: 'The Amsterdam Dance Event grows into the world\'s largest electronic music conference and festival, with 2,500+ artists across 200 venues. Dutch DJs Tiësto, Armin van Buuren, Martin Garrix, and Afrojack dominate global EDM, while the Netherlands\' hardstyle and gabber scenes maintain a fierce underground tradition dating back to the early 1990s.',
    tags: ['amsterdam dance event', 'tiesto', 'armin van buuren', 'martin garrix', 'hardstyle', 'gabber', 'dutch edm'],
  },

  // 7. Belgium — Brussels
  {
    id: 'evt-new-beat-brussels-1988',
    year: 1988,
    location: { lat: 50.8503, lng: 4.3517, city: 'Brussels', country: 'Belgium' },
    genre: ['New Beat', 'EBM', 'Electronic'],
    title: 'New Beat movement erupts from Belgian clubs',
    description: 'Belgian DJs create New Beat by playing EBM and synth records at 33 RPM instead of 45, producing a slow, hypnotic dancefloor sound. Front 242 and Neon Judgement pioneer EBM (Electronic Body Music), while the Tomorrowland festival later makes Belgium a global electronic music destination. The R&S and Antler Subway labels fuel the movement.',
    tags: ['new beat', 'front 242', 'neon judgement', 'ebm', 'tomorrowland', 'r&s records', 'belgian electronic'],
  },

  // 8. Luxembourg — Luxembourg City
  {
    id: 'evt-rtl-luxembourg-1954',
    year: 1954,
    location: { lat: 49.6117, lng: 6.1319, city: 'Luxembourg City', country: 'Luxembourg' },
    genre: ['Pop', 'Rock'],
    title: 'Radio Luxembourg broadcasts pop music across Europe',
    description: 'Radio Luxembourg reaches its peak influence as the most powerful commercial radio station in Europe, broadcasting rock and roll and pop to millions who cannot hear such music on their national stations. The station introduces Elvis, The Beatles, and rock culture to a generation of Europeans, profoundly shaping the continent\'s musical taste.',
    tags: ['radio luxembourg', 'rtl', 'pirate radio', 'european pop', 'rock and roll', 'broadcasting', 'commercial radio'],
  },

  // 9. Switzerland — Zurich
  {
    id: 'evt-dada-zurich-1916',
    year: 1916,
    location: { lat: 47.3769, lng: 8.5417, city: 'Zurich', country: 'Switzerland' },
    genre: ['Avant-Garde', 'Sound Art'],
    title: 'Cabaret Voltaire and Dada revolutionize sound art',
    description: 'Hugo Ball, Tristan Tzara, and Emmy Hennings open Cabaret Voltaire in Zurich, launching the Dada movement. Their sound poetry, noise performances, and radical anti-art philosophy lay the groundwork for a century of avant-garde music from musique concrète to industrial to noise rock. Switzerland later becomes home to the Montreux Jazz Festival.',
    tags: ['cabaret voltaire', 'dada', 'hugo ball', 'tristan tzara', 'sound poetry', 'montreux jazz', 'avant-garde'],
  },

  // 10. Italy — Naples
  {
    id: 'evt-neapolitan-naples-1898',
    year: 1898,
    location: { lat: 40.8518, lng: 14.2681, city: 'Naples', country: 'Italy' },
    genre: ['Neapolitan Song', 'Opera'],
    title: 'Enrico Caruso and the golden age of Neapolitan song',
    description: 'Enrico Caruso begins performing in Naples, the city that invented canzone napoletana — the tradition that produced "O Sole Mio", "Santa Lucia", and "Funiculi Funicula". These songs, carried by millions of Italian emigrants, become the foundation of popular song worldwide. Caruso becomes the first musician to sell a million records.',
    tags: ['enrico caruso', 'canzone napoletana', 'o sole mio', 'opera', 'italian emigration', 'naples', 'tenor'],
  },

  // 11. Monaco — Monte Carlo
  {
    id: 'evt-philharmonic-montecarlo-1911',
    year: 1911,
    location: { lat: 43.7384, lng: 7.4246, city: 'Monte Carlo', country: 'Monaco' },
    genre: ['Classical', 'Opera'],
    title: 'Monte Carlo Opera premieres Ravel and Massenet',
    description: 'The Opéra de Monte-Carlo, under the patronage of Prince Albert I, premieres works by Ravel, Massenet, and Poulenc. Diaghilev\'s Ballets Russes performs regularly, with Stravinsky conducting. Monaco\'s tiny principality sustains one of Europe\'s most prestigious classical music institutions through princely patronage.',
    tags: ['opera de monte-carlo', 'ravel', 'diaghilev', 'ballets russes', 'stravinsky', 'classical music', 'princely patronage'],
  },

  // 12. Liechtenstein — Vaduz
  {
    id: 'evt-choral-vaduz-1960',
    year: 1960,
    location: { lat: 47.1410, lng: 9.5209, city: 'Vaduz', country: 'Liechtenstein' },
    genre: ['Choral', 'Classical'],
    title: 'Liechtenstein\'s choral societies preserve Alpine singing traditions',
    description: 'Liechtenstein\'s network of Gesangvereine (choral societies) and brass bands sustain a rich musical life in the Alpine principality of 38,000 people. The Liechtenstein Musical Society coordinates concerts and festivals, while the national anthem — set to the melody of "God Save the King" — reflects the tiny nation\'s European musical connections.',
    tags: ['gesangvereine', 'choral tradition', 'brass band', 'liechtenstein', 'alpine music', 'vaduz', 'principality'],
  },

  // 13. Andorra — Andorra la Vella
  {
    id: 'evt-folk-andorra-1990',
    year: 1990,
    location: { lat: 42.5063, lng: 1.5218, city: 'Andorra la Vella', country: 'Andorra' },
    genre: ['Folk', 'Rock'],
    title: 'Andorran folk revival preserves Catalan musical heritage',
    description: 'Andorra\'s musicians revive traditional Catalan folk music — sardana circle dances, contrapàs, and mountain shepherd songs — while a growing rock and electronic scene emerges in the Pyrenean microstate. Annual festivals like Andorra la Vella\'s Cirque du Soleil and the Colors de Música bring international acts to the tiny principality.',
    tags: ['catalan folk', 'sardana', 'contrapas', 'andorra', 'pyrenees', 'mountain music', 'microstate'],
  },

  // 14. San Marino — San Marino
  {
    id: 'evt-eurovision-sanmarino-2011',
    year: 2011,
    location: { lat: 43.9424, lng: 12.4578, city: 'San Marino', country: 'San Marino' },
    genre: ['Pop', 'Folk'],
    title: 'San Marino debuts at Eurovision, forging a musical identity',
    description: 'The world\'s oldest republic makes its Eurovision Song Contest debut, using the platform to cultivate a national musical identity. Despite having only 33,000 citizens, San Marino recruits international artists and gains a devoted following. The country\'s folk traditions, rooted in Italian and Romagnol culture, find new expression through the contest.',
    tags: ['eurovision', 'san marino', 'oldest republic', 'italian folk', 'romagnol', 'music contest', 'national identity'],
  },

  // 15. Malta — Valletta
  {
    id: 'evt-ghana-valletta-1962',
    year: 1962,
    location: { lat: 35.8989, lng: 14.5146, city: 'Valletta', country: 'Malta' },
    genre: ['Ghana', 'Folk'],
    title: 'Ghana folk singing tradition thrives in Maltese harbors',
    description: 'Malta\'s għana (pronounced "ana") — an improvised folk singing tradition where two singers compete in witty poetic duels accompanied by guitar — remains a living art form in the harbor towns. Similar to Portuguese fado and Sicilian folk, għana reflects Malta\'s Mediterranean crossroads identity. Singers like Fredu Abela become national treasures.',
    tags: ['ghana', 'folk singing', 'malta', 'fredu abela', 'mediterranean', 'poetic duel', 'harbor tradition'],
  },

  // 16. Vatican City — Vatican City
  {
    id: 'evt-sistine-vatican-1956',
    year: 1956,
    location: { lat: 41.9029, lng: 12.4534, city: 'Vatican City', country: 'Vatican City' },
    genre: ['Sacred Music', 'Gregorian Chant'],
    title: 'Sistine Chapel Choir records Palestrina\'s sacred polyphony',
    description: 'The Sistine Chapel Choir — the world\'s oldest active choir, founded in 1471 — records Palestrina\'s masses and motets, preserving Renaissance sacred polyphony for modern audiences. Under Monsignor Domenico Bartolucci, the choir maintains the tradition of a cappella singing that has accompanied papal ceremonies for over five centuries.',
    tags: ['sistine chapel choir', 'palestrina', 'sacred polyphony', 'vatican', 'gregorian chant', 'bartolucci', 'papal music'],
  },

  // --- EAST EUROPE EVENTS ---

  // 17. Poland — Warsaw
  {
    id: 'evt-chopin-warsaw-1927',
    year: 1927,
    location: { lat: 52.2297, lng: 21.0122, city: 'Warsaw', country: 'Poland' },
    genre: ['Classical'],
    title: 'First International Chopin Piano Competition held in Warsaw',
    description: 'Warsaw hosts the inaugural International Chopin Piano Competition, establishing what becomes the world\'s most prestigious piano contest. Poland\'s devotion to its greatest composer — whose music was banned by Nazi and Soviet occupiers — makes Chopin a symbol of national identity and resistance through culture.',
    tags: ['chopin', 'piano competition', 'warsaw', 'polish classical', 'national identity', 'piano', 'romanticism'],
  },

  // 18. Czechia — Prague
  {
    id: 'evt-plastic-people-prague-1976',
    year: 1976,
    location: { lat: 50.0755, lng: 14.4378, city: 'Prague', country: 'Czechia' },
    genre: ['Rock', 'Experimental'],
    title: 'The Plastic People of the Universe defy communist censorship',
    description: 'The arrest and trial of The Plastic People of the Universe — a Czech psychedelic rock band inspired by Frank Zappa and The Velvet Underground — sparks the Charter 77 human rights movement led by Václav Havel. Their music, banned by the communist regime, proves that rock can be a weapon of political resistance.',
    tags: ['plastic people', 'charter 77', 'vaclav havel', 'frank zappa', 'communist censorship', 'prague', 'czech rock'],
  },

  // 19. Slovakia — Bratislava
  {
    id: 'evt-slovak-folk-bratislava-1960',
    year: 1960,
    location: { lat: 48.1486, lng: 17.1077, city: 'Bratislava', country: 'Slovakia' },
    genre: ['Folk', 'Classical'],
    title: 'Slovak folk revival preserves Central European musical heritage',
    description: 'The SĽUK (Slovak Folk Art Ensemble) reaches its artistic peak, performing elaborate staged versions of Slovak folk music and dance that preserve the country\'s rich musical heritage. Slovakia\'s fujara — a massive overtone shepherd\'s flute — later receives UNESCO recognition as a Masterpiece of Intangible Cultural Heritage.',
    tags: ['sluk', 'fujara', 'slovak folk', 'unesco', 'bratislava', 'shepherds flute', 'central european folk'],
  },

  // 20. Romania — Bucharest
  {
    id: 'evt-minimal-techno-bucharest-2007',
    year: 2007,
    location: { lat: 44.4268, lng: 26.1025, city: 'Bucharest', country: 'Romania' },
    genre: ['Minimal Techno', 'Electronic'],
    title: 'Romania\'s minimal techno scene rivals Berlin',
    description: 'Romanian producers [a]pendics.shuffle, Rhadoo, Pedro, and Raresh establish Bucharest as a global minimal techno capital. The Sunwaves festival on the Black Sea coast becomes a legendary marathon rave. Meanwhile, manele — Romania\'s Roma-influenced pop — dominates the mainstream with its infectious rhythms and over-the-top vocals.',
    tags: ['minimal techno', 'rhadoo', 'sunwaves', 'manele', 'bucharest', 'romanian electronic', 'black sea'],
  },

  // 21. Bulgaria — Sofia
  {
    id: 'evt-bulgarian-voices-sofia-1975',
    year: 1975,
    location: { lat: 42.6977, lng: 23.3219, city: 'Sofia', country: 'Bulgaria' },
    genre: ['Choral', 'Folk'],
    title: 'Le Mystère des Voix Bulgares astonishes the world',
    description: 'The Bulgarian State Television Female Vocal Choir, later known as Le Mystère des Voix Bulgares, records albums of extraordinary Bulgarian folk polyphony. Their haunting, dissonant harmonies and powerful vocal techniques — diaphonic singing, open-throated village style — stun Western listeners and win a Grammy, revealing one of Europe\'s most remarkable musical traditions.',
    tags: ['bulgarian voices', 'le mystere', 'polyphony', 'grammy', 'diaphonic singing', 'folk choir', 'sofia'],
  },

  // 22. Croatia — Zagreb
  {
    id: 'evt-punk-zagreb-1978',
    year: 1978,
    location: { lat: 45.8150, lng: 15.9819, city: 'Zagreb', country: 'Croatia' },
    genre: ['Punk', 'New Wave'],
    title: 'Zagreb punk and New Wave challenge Yugoslav conformity',
    description: 'Bands like Prljavo Kazalište, Azra, and Film launch Zagreb\'s punk and new wave scene, part of the broader Yugoslav New Wave (Novi Val) that parallels Western punk. Johnny Štulić of Azra becomes the Croatian Bob Dylan, writing poetic protests against both communist conformity and nationalist extremism.',
    tags: ['prljavo kazaliste', 'azra', 'johnny stulic', 'novi val', 'yugoslav punk', 'zagreb', 'new wave'],
  },

  // 23. Serbia — Belgrade
  {
    id: 'evt-turbofolk-belgrade-1990',
    year: 1990,
    location: { lat: 44.7866, lng: 20.4489, city: 'Belgrade', country: 'Serbia' },
    genre: ['Turbo-Folk', 'Brass Band'],
    title: 'Turbo-folk and Guča trumpet festival define Serbian sound',
    description: 'Ceca, Dragana Mirković, and the turbo-folk movement blend Serbian folk music with electronic beats and pop production, creating one of the Balkans\' most controversial and popular genres. Meanwhile, the Guča Trumpet Festival in western Serbia draws hundreds of thousands to celebrate the fierce Balkan brass band tradition of Boban Marković.',
    tags: ['ceca', 'turbo-folk', 'guca festival', 'boban markovic', 'balkan brass', 'belgrade nightlife', 'serbian pop'],
  },

  // 24. Bosnia and Herzegovina — Sarajevo
  {
    id: 'evt-bijelo-dugme-sarajevo-1974',
    year: 1974,
    location: { lat: 43.8563, lng: 18.4131, city: 'Sarajevo', country: 'Bosnia and Herzegovina' },
    genre: ['Rock', 'Folk Rock'],
    title: 'Bijelo Dugme becomes Yugoslavia\'s biggest rock band',
    description: 'Bijelo Dugme (White Button), led by guitarist Goran Bregović, releases their debut and becomes the most popular rock band in Yugoslav history. Fusing Bosnian sevdah melancholy with hard rock energy, they fill stadiums across Yugoslavia. Bregović later scores Emir Kusturica\'s films, bringing Balkan music to global cinema audiences.',
    tags: ['bijelo dugme', 'goran bregovic', 'sevdah', 'yugoslav rock', 'sarajevo', 'kusturica', 'balkan rock'],
  },

  // 25. Montenegro — Podgorica
  {
    id: 'evt-sea-dance-podgorica-2014',
    year: 2014,
    location: { lat: 42.4304, lng: 19.2594, city: 'Podgorica', country: 'Montenegro' },
    genre: ['Electronic', 'Rock', 'Pop'],
    title: 'Sea Dance Festival puts Montenegro on Europe\'s festival map',
    description: 'The Sea Dance Festival launches on the beach of Jaz near Budva, quickly winning a European Festival Award as Best Medium-Sized Festival. Montenegro\'s Adriatic coast becomes a music tourism destination, while traditional gusle epic singing and Montenegrin folk traditions continue in the mountainous interior.',
    tags: ['sea dance', 'budva', 'jaz beach', 'montenegrin folk', 'gusle', 'festival', 'adriatic', 'european festival'],
  },

  // 26. North Macedonia — Skopje
  {
    id: 'evt-roma-brass-skopje-1990',
    year: 1990,
    location: { lat: 41.9973, lng: 21.4280, city: 'Skopje', country: 'North Macedonia' },
    genre: ['Roma Brass', 'Folk'],
    title: 'Roma brass bands and čalgija ensembles thrive in Skopje',
    description: 'North Macedonia\'s Roma community in Šuto Orizari — the world\'s largest Roma municipality — sustains a vibrant brass band and čalgija (traditional ensemble) tradition. Musicians like Ferus Mustafov fuse Turkish, Romani, and Macedonian folk into ecstatic wedding music that crosses ethnic boundaries and fills Skopje\'s Čaršija bazaar.',
    tags: ['roma brass', 'ferus mustafov', 'suto orizari', 'calgija', 'macedonian folk', 'skopje', 'wedding music'],
  },

  // 27. Albania — Tirana
  {
    id: 'evt-iso-polyphony-tirana-2005',
    year: 2005,
    location: { lat: 41.3275, lng: 19.8187, city: 'Tirana', country: 'Albania' },
    genre: ['Iso-Polyphony', 'Folk'],
    title: 'UNESCO recognizes Albanian iso-polyphony',
    description: 'Albanian iso-polyphony — a multipart singing tradition from southern Albania where a sustained drone (iso) supports elaborate melodic lines — is proclaimed a UNESCO Masterpiece of Intangible Cultural Heritage. This ancient Balkan vocal tradition, performed at weddings, funerals, and festivals, predates written music and links Albania to the deepest roots of European musical culture.',
    tags: ['iso-polyphony', 'unesco', 'albanian folk', 'drone singing', 'southern albania', 'tirana', 'multipart singing'],
  },

  // 28. Slovenia — Ljubljana
  {
    id: 'evt-laibach-ljubljana-1980',
    year: 1980,
    location: { lat: 46.0569, lng: 14.5058, city: 'Ljubljana', country: 'Slovenia' },
    genre: ['Industrial', 'Avant-Garde'],
    title: 'Laibach and NSK launch Slovenian industrial art movement',
    description: 'Laibach forms in Trbovlje and moves to Ljubljana, becoming one of the most provocative bands in music history. Their totalitarian aesthetics and industrial sound — part of the Neue Slowenische Kunst (NSK) art collective — challenge both communist Yugoslavia and Western capitalism. They later become the first Western band to perform in North Korea.',
    tags: ['laibach', 'nsk', 'industrial', 'neue slowenische kunst', 'trbovlje', 'ljubljana', 'north korea concert'],
  },

  // 29. Ukraine — Kyiv
  {
    id: 'evt-dakhabrakha-kyiv-2004',
    year: 2004,
    location: { lat: 50.4501, lng: 30.5234, city: 'Kyiv', country: 'Ukraine' },
    genre: ['Folk', 'World Music'],
    title: 'DakhaBrakha reinvents Ukrainian folk music for the world',
    description: 'DakhaBrakha, formed at Kyiv\'s Dakh Centre for Contemporary Arts, creates "ethno-chaos" — a genre-defying fusion of Ukrainian folk songs with Indian, Arabic, and electronic influences. Wearing striking traditional costumes, they become global festival favorites. The Orange Revolution and later resistance movements make Ukrainian music a symbol of cultural defiance.',
    tags: ['dakhabrakha', 'ethno-chaos', 'dakh centre', 'ukrainian folk', 'orange revolution', 'kyiv', 'world music'],
  },

  // 30. Belarus — Minsk
  {
    id: 'evt-underground-minsk-2000',
    year: 2000,
    location: { lat: 53.9006, lng: 27.5590, city: 'Minsk', country: 'Belarus' },
    genre: ['Rock', 'Folk', 'Electronic'],
    title: 'Belarusian underground music resists state control',
    description: 'Despite heavy state censorship, Minsk nurtures a defiant underground scene. Bands like N.R.M. (Neuro Dubel) and Lyapis Trubetskoy perform Belarusian-language rock, while electronic producers create under pseudonyms. The annual Basovišča festival, often harassed by authorities, becomes a symbol of Belarusian cultural independence from Russian and state influence.',
    tags: ['nrm', 'lyapis trubetskoy', 'basovishcha', 'belarusian rock', 'underground', 'minsk', 'cultural resistance'],
  },

  // 31. Moldova — Chișinău
  {
    id: 'evt-ozone-chisinau-2003',
    year: 2003,
    location: { lat: 47.0105, lng: 28.8638, city: 'Chișinău', country: 'Moldova' },
    genre: ['Pop', 'Electronic'],
    title: 'O-Zone\'s "Dragostea Din Tei" becomes a global viral sensation',
    description: 'Moldovan boy band O-Zone releases "Dragostea Din Tei" (known as the "Numa Numa" song), which becomes one of the first truly viral internet hits. The Romanian-language earworm reaches #1 in dozens of countries. Meanwhile, Moldova\'s lăutari (Roma fiddler) tradition — the inspiration for Fanfare Ciocârlia — keeps traditional wedding music alive.',
    tags: ['o-zone', 'dragostea din tei', 'numa numa', 'moldovan pop', 'lautari', 'roma fiddlers', 'viral hit'],
  },

  // 32. Greece — Athens
  {
    id: 'evt-rebetiko-athens-1932',
    year: 1932,
    location: { lat: 37.9838, lng: 23.7275, city: 'Athens', country: 'Greece' },
    genre: ['Rebetiko'],
    title: 'Rebetiko flourishes in Athens\' port tavernas',
    description: 'Rebetiko — Greece\'s "blues" — reaches its golden age in the hashish dens and port tavernas of Piraeus and Athens. Singers like Markos Vamvakaris and Rosa Eskenazi perform songs of poverty, love, and the underworld over bouzouki accompaniment. After Greek refugees flood in from Asia Minor, rebetiko absorbs Turkish and Middle Eastern influences into raw Greek urban folk.',
    tags: ['rebetiko', 'markos vamvakaris', 'rosa eskenazi', 'bouzouki', 'piraeus', 'asia minor refugees', 'greek blues'],
  },

  // 33. Cyprus — Nicosia
  {
    id: 'evt-cypriot-music-nicosia-1975',
    year: 1975,
    location: { lat: 35.1856, lng: 33.3823, city: 'Nicosia', country: 'Cyprus' },
    genre: ['Greek Folk', 'Turkish Folk'],
    title: 'Divided Nicosia preserves parallel Greek and Turkish musical traditions',
    description: 'After the 1974 partition of Cyprus, Nicosia becomes the world\'s last divided capital. Greek Cypriots in the south preserve their tsampouna (bagpipe) and violin folk traditions, while Turkish Cypriots in the north maintain Ottoman-influenced art music. Despite the division, shared musical elements — the oud, the tanbur, and Mediterranean rhythms — echo on both sides of the Green Line.',
    tags: ['nicosia', 'partition', 'tsampouna', 'greek cypriot', 'turkish cypriot', 'green line', 'divided capital'],
  },

  // 34. Lithuania — Vilnius
  {
    id: 'evt-sutartines-vilnius-2010',
    year: 2010,
    location: { lat: 54.6872, lng: 25.2797, city: 'Vilnius', country: 'Lithuania' },
    genre: ['Folk', 'Polyphony'],
    title: 'Lithuanian sutartinės win UNESCO recognition',
    description: 'Lithuanian sutartinės — ancient multipart songs where two or three singers perform overlapping canons with dissonant seconds — are inscribed as UNESCO Intangible Cultural Heritage. These pre-Christian songs, unique in European music, were nearly lost during Soviet occupation. Young ensembles in Vilnius revive the tradition, connecting Lithuania to its Baltic pagan past.',
    tags: ['sutartines', 'unesco', 'lithuanian folk', 'polyphony', 'pagan songs', 'vilnius', 'baltic tradition'],
  },

  // 35. Latvia — Riga
  {
    id: 'evt-song-festival-riga-1873',
    year: 1873,
    location: { lat: 56.9496, lng: 24.1052, city: 'Riga', country: 'Latvia' },
    genre: ['Choral', 'Folk'],
    title: 'First Latvian Song and Dance Festival unites a nation through music',
    description: 'The first Latvian Song Festival is held in Riga, bringing together thousands of choral singers in a tradition that becomes central to Latvian national identity. Held every five years, the festival grows to feature 30,000+ singers performing simultaneously. During Soviet occupation, the festivals preserve Latvian identity, and in 1988, 300,000 Latvians sing forbidden national songs in the "Singing Revolution."',
    tags: ['song festival', 'latvian choral', 'singing revolution', 'riga', 'national identity', 'soviet resistance', 'mass choir'],
  },

  // 36. Estonia — Tallinn
  {
    id: 'evt-singing-revolution-tallinn-1988',
    year: 1988,
    location: { lat: 59.4370, lng: 24.7536, city: 'Tallinn', country: 'Estonia' },
    genre: ['Choral', 'Folk', 'Rock'],
    title: 'Estonia\'s Singing Revolution topples Soviet rule through music',
    description: 'In September 1988, 300,000 Estonians — nearly a third of the population — gather at the Song Festival Grounds in Tallinn to sing forbidden national songs in defiance of Soviet rule. This "Singing Revolution" leads directly to Estonian independence in 1991. Composer Arvo Pärt, in exile, creates his tintinnabuli style — hauntingly minimal sacred music that becomes the most performed contemporary classical music worldwide.',
    tags: ['singing revolution', 'arvo part', 'tintinnabuli', 'song festival grounds', 'estonian independence', 'tallinn', 'soviet resistance'],
  },
  // ─── WEST ASIA EVENTS ────────────────────────────────────────

  // 1. Iran → Tehran
  {
    id: 'evt-persian-pop-tehran-1970',
    year: 1970,
    location: { lat: 35.6892, lng: 51.3890, city: 'Tehran', country: 'Iran' },
    genre: ['Persian Pop', 'Persian Classical'],
    title: 'Googoosh and the golden age of Persian pop',
    description: 'Googoosh, Iran\'s biggest pop star, records a string of hits that blend Persian classical melodies with Western rock and disco. Alongside Dariush, Ebi, and Hayedeh, she soundtracks a modernizing Tehran where cabarets and concert halls thrive. The 1979 revolution silences this scene overnight, scattering artists into exile.',
    tags: ['googoosh', 'persian pop', 'dariush', 'hayedeh', 'tehran cabaret', 'pre-revolution iran'],
  },

  // 2. Iraq → Baghdad
  {
    id: 'evt-iraqi-maqam-baghdad-1932',
    year: 1932,
    location: { lat: 33.3152, lng: 44.3661, city: 'Baghdad', country: 'Iraq' },
    genre: ['Iraqi Maqam', 'Arabic Classical'],
    title: 'First Congress of Arab Music convenes in Cairo with Iraqi delegation',
    description: 'Iraqi maqam master Muhammad Al-Qubbantchi performs at the landmark 1932 Cairo Congress of Arab Music, stunning international musicologists with Baghdad\'s sophisticated vocal maqam tradition. His recordings help preserve the Iraqi maqam — a UNESCO Intangible Cultural Heritage — and inspire generations of Arab classical musicians.',
    tags: ['iraqi maqam', 'al-qubbantchi', 'cairo congress', 'arab music', 'baghdad', 'unesco'],
  },

  // 3. Syria → Damascus
  {
    id: 'evt-muwashah-damascus-1950',
    year: 1950,
    location: { lat: 33.5138, lng: 36.2765, city: 'Damascus', country: 'Syria' },
    genre: ['Muwashah', 'Arabic Classical'],
    title: 'Sabah Fakhri emerges as master of the Syrian muwashah',
    description: 'Sabah Fakhri, the young singer from Aleppo, begins performing the muwashah — an ornate Andalusian-Arab vocal form — in Damascus concert halls. His legendary marathon performances, sometimes lasting ten hours without repetition, preserve a centuries-old tradition connecting medieval Al-Andalus to the Levant. Fakhri becomes the Arab world\'s greatest living vocalist.',
    tags: ['sabah fakhri', 'muwashah', 'aleppo', 'damascus', 'andalusian', 'arab classical', 'levant'],
  },

  // 4. Jordan → Amman
  {
    id: 'evt-arabic-indie-amman-2015',
    year: 2015,
    location: { lat: 31.9454, lng: 35.9284, city: 'Amman', country: 'Jordan' },
    genre: ['Arabic Indie', 'Electronic', 'Hip Hop'],
    title: 'Amman\'s indie scene breaks through with El Morabba3',
    description: 'El Morabba3, the Jordanian alternative rock band, gains pan-Arab recognition, spearheading Amman\'s growing indie scene. Venues like Jafra Cafe and events like Amman Design Week showcase Arabic electronic producers, hip hop artists like The Synaptik, and a new generation of Jordanian musicians blending Arabic scales with modern production.',
    tags: ['el morabba3', 'amman indie', 'the synaptik', 'jordanian music', 'arabic alternative', 'jafra cafe'],
  },

  // 5. Israel → Tel Aviv
  {
    id: 'evt-psytrance-telaviv-1995',
    year: 1995,
    location: { lat: 32.0853, lng: 34.7818, city: 'Tel Aviv', country: 'Israel' },
    genre: ['Psytrance', 'Electronic'],
    title: 'Israel becomes the global capital of psytrance',
    description: 'Infected Mushroom, Astral Projection, and a wave of Israeli producers make Tel Aviv the world capital of psychedelic trance. Returning travelers bring Goa trance culture from India, and Israeli psytrance evolves into a distinctive, hard-driving sound with complex layered synths. The full-moon parties and desert raves become legendary.',
    tags: ['infected mushroom', 'astral projection', 'psytrance', 'goa trance', 'desert rave', 'tel aviv nightlife'],
  },

  // 6. Palestine → Ramallah
  {
    id: 'evt-palestinian-hiphop-ramallah-2007',
    year: 2007,
    location: { lat: 31.9038, lng: 35.2034, city: 'Ramallah', country: 'Palestine' },
    genre: ['Hip Hop', 'Arabic Indie'],
    title: 'DAM and Palestinian hip hop gain global attention',
    description: 'DAM, the pioneering Palestinian hip hop group from Lod, release their debut album "Dedication" while performing regularly in Ramallah. Their track "Min Irhabi?" (Who\'s the Terrorist?) becomes a viral anthem. Alongside Ramallah Underground, Tamer Nafar, and spoken-word artists, Palestinian hip hop emerges as a powerful voice of resistance and identity.',
    tags: ['dam', 'tamer nafar', 'ramallah underground', 'palestinian hip hop', 'min irhabi', 'resistance music'],
  },

  // 7. Saudi Arabia → Riyadh
  {
    id: 'evt-mdlbeast-riyadh-2019',
    year: 2019,
    location: { lat: 24.7136, lng: 46.6753, city: 'Riyadh', country: 'Saudi Arabia' },
    genre: ['EDM', 'Electronic', 'Arabian Pop'],
    title: 'MDL Beast festival signals Saudi Arabia\'s music revolution',
    description: 'The inaugural MDL Beast festival in Riyadh draws over 130,000 attendees to see David Guetta, Steve Aoki, and Tiesto — unthinkable just years earlier when public concerts were banned. Saudi Arabia\'s Vision 2030 opens the kingdom to live entertainment, and a new generation of Saudi DJs and producers emerges from Riyadh and Jeddah.',
    tags: ['mdl beast', 'riyadh season', 'vision 2030', 'saudi music', 'david guetta', 'electronic festival'],
  },

  // 8. Yemen → Sana'a
  {
    id: 'evt-sanani-song-sanaa-2003',
    year: 2003,
    location: { lat: 15.3694, lng: 44.1910, city: 'Sana\'a', country: 'Yemen' },
    genre: ['Yemeni Folk', 'Al-Ghina Al-San\'ani'],
    title: 'UNESCO inscribes the Song of Sana\'a as Intangible Heritage',
    description: 'The al-ghina al-san\'ani — Sana\'a\'s ancient sung-poetry tradition — receives UNESCO Intangible Cultural Heritage recognition. Performed at weddings and celebrations in the mafraj (sitting rooms) of Sana\'a\'s tower houses, this refined art form features the oud and copper tray percussion, with lyrics drawn from classical Arabic and Yemeni Himyaritic poetry.',
    tags: ['sanani song', 'unesco', 'yemeni folk', 'oud', 'mafraj', 'himyaritic poetry', 'sung poetry'],
  },

  // 9. Oman → Muscat
  {
    id: 'evt-liwa-muscat-1980',
    year: 1980,
    location: { lat: 23.5880, lng: 58.3829, city: 'Muscat', country: 'Oman' },
    genre: ['Omani Folk', 'Liwa'],
    title: 'Royal Oman Symphony Orchestra preserves traditional Omani music',
    description: 'Sultan Qaboos, himself an accomplished musician, establishes systematic efforts to document and preserve Oman\'s diverse musical traditions. The liwa drum tradition — brought by East African communities along the coast — the razha sword-dance chants of Bedouin warriors, and the sea-faring fann at-tanbura are recorded and promoted as living cultural heritage.',
    tags: ['omani folk', 'sultan qaboos', 'liwa', 'razha', 'tanbura', 'oman heritage', 'east african influence'],
  },

  // 10. UAE → Dubai
  {
    id: 'evt-arabic-hiphop-dubai-2017',
    year: 2017,
    location: { lat: 25.2048, lng: 55.2708, city: 'Dubai', country: 'UAE' },
    genre: ['Hip Hop', 'Arabic Pop', 'Electronic'],
    title: 'Dubai emerges as a pan-Arab music production hub',
    description: 'Freek, Swagg Man, and a wave of Arab rappers converge on Dubai as the city\'s studios, festivals, and media companies make it the commercial center of Arab music. The Emirati rapper Bu Kolthoum blends Gulf dialect with trap beats, while Spotify\'s MENA headquarters in Dubai accelerates the streaming revolution across the Arab world.',
    tags: ['dubai music', 'arab hip hop', 'bu kolthoum', 'gulf rap', 'spotify mena', 'arab trap'],
  },

  // 11. Qatar → Doha
  {
    id: 'evt-fijiri-doha-2010',
    year: 2010,
    location: { lat: 25.2854, lng: 51.5310, city: 'Doha', country: 'Qatar' },
    genre: ['Fijiri', 'Khaliji'],
    title: 'Qatar revives fijiri sea chants as cultural heritage',
    description: 'Qatar\'s cultural institutions invest in documenting and performing fijiri — the haunting call-and-response chants once sung by pearl divers plunging into the Persian Gulf. At the Katara Cultural Village in Doha, elderly pearl divers pass down the tradition\'s complex rhythms and lyrics to younger generations, connecting Qatar\'s modernizing society to its maritime past.',
    tags: ['fijiri', 'pearl diving', 'katara', 'qatar heritage', 'sea chants', 'persian gulf', 'maritime music'],
  },

  // 12. Bahrain → Manama
  {
    id: 'evt-sawt-manama-1940',
    year: 1940,
    location: { lat: 26.2285, lng: 50.5860, city: 'Manama', country: 'Bahrain' },
    genre: ['Sawt', 'Khaliji'],
    title: 'Mohammed bin Faris establishes sawt as the Gulf\'s art music',
    description: 'Mohammed bin Faris, Bahrain\'s most revered musician, perfects sawt — a refined vocal style accompanied by oud, mirwas drum, and hand-clapping that blends Arabic, Persian, and East African musical influences. Born from Bahrain\'s cosmopolitan pearl-trading culture, sawt becomes the Gulf region\'s most sophisticated urban music tradition.',
    tags: ['mohammed bin faris', 'sawt', 'bahrain', 'oud', 'mirwas', 'pearl trade', 'gulf art music'],
  },

  // 13. Kuwait → Kuwait City
  {
    id: 'evt-khaliji-pop-kuwait-1975',
    year: 1975,
    location: { lat: 29.3759, lng: 47.9774, city: 'Kuwait City', country: 'Kuwait' },
    genre: ['Khaliji', 'Arabic Pop'],
    title: 'Kuwait pioneers modern Gulf pop music',
    description: 'Abdullah Al-Rowaished and Nabeel Shuail emerge as the first modern Gulf pop superstars, recording in Kuwait\'s state-of-the-art studios. Kuwait\'s oil wealth funds recording studios, television variety shows, and the region\'s first music industry infrastructure, establishing Kuwaiti pop as the template for khaliji music across the Arabian Peninsula.',
    tags: ['abdullah al-rowaished', 'nabeel shuail', 'khaliji pop', 'kuwaiti music', 'gulf pop', 'arabian peninsula'],
  },

  // 14. Georgia → Tbilisi
  {
    id: 'evt-bassiani-tbilisi-2014',
    year: 2014,
    location: { lat: 41.7151, lng: 44.8271, city: 'Tbilisi', country: 'Georgia' },
    genre: ['Electronic', 'Techno'],
    title: 'Bassiani opens and Tbilisi becomes a global techno pilgrimage',
    description: 'Bassiani, a techno club built beneath Tbilisi\'s Dinamo Arena football stadium, opens and quickly earns a reputation as one of the world\'s best nightclubs. In a country with ancient polyphonic singing traditions recognized by UNESCO, Tbilisi\'s youth build a fierce rave culture that becomes a symbol of Georgian liberalism and resistance against conservative politics.',
    tags: ['bassiani', 'tbilisi techno', 'georgian rave', 'dinamo arena', 'polyphony', 'nightlife', 'electronic'],
  },

  // 15. Armenia → Yerevan
  {
    id: 'evt-duduk-yerevan-2005',
    year: 2005,
    location: { lat: 40.1792, lng: 44.4991, city: 'Yerevan', country: 'Armenia' },
    genre: ['Duduk', 'Armenian Folk'],
    title: 'Djivan Gasparyan\'s duduk wins UNESCO recognition',
    description: 'The Armenian duduk and its music are inscribed as a UNESCO Masterpiece of Intangible Heritage, affirming centuries of tradition. Master player Djivan Gasparyan, whose mournful apricot-wood double-reed instrument has graced films from Gladiator to The Last Temptation of Christ, becomes a global ambassador for Armenian musical culture from his base in Yerevan.',
    tags: ['djivan gasparyan', 'duduk', 'unesco', 'armenian folk', 'apricot wood', 'gladiator soundtrack', 'yerevan'],
  },

  // 16. Azerbaijan → Baku
  {
    id: 'evt-mugham-jazz-baku-1960',
    year: 1960,
    location: { lat: 40.4093, lng: 49.8671, city: 'Baku', country: 'Azerbaijan' },
    genre: ['Mugham', 'Jazz', 'Azerbaijani Jazz'],
    title: 'Vagif Mustafazadeh invents mugham-jazz in Baku',
    description: 'Pianist Vagif Mustafazadeh pioneers mugham-jazz, a revolutionary fusion of Azerbaijan\'s ancient mugham modal system with American jazz improvisation. His virtuosic performances electrify Baku\'s jazz clubs and later inspire his daughter Aziza Mustafa Zadeh to carry the tradition worldwide. The mugham tradition itself receives UNESCO Intangible Heritage recognition in 2003.',
    tags: ['vagif mustafazadeh', 'mugham jazz', 'aziza mustafa zadeh', 'baku jazz', 'mugham', 'unesco', 'azerbaijani music'],
  },

  // ─── CENTRAL ASIA EVENTS ───────────────────────────────────

  // 17. Kazakhstan → Almaty
  {
    id: 'evt-dombra-almaty-2014',
    year: 2014,
    location: { lat: 43.2220, lng: 76.8512, city: 'Almaty', country: 'Kazakhstan' },
    genre: ['Kazakh Folk', 'Dombra', 'Post-Punk'],
    title: 'Kazakh dombra tradition meets a post-punk underground',
    description: 'As UNESCO recognizes Kazakh traditional kuy compositions for the two-stringed dombra lute, Almaty simultaneously births a vibrant post-punk and indie scene. Bands like Ninety One pioneer Q-Pop (Kazakh pop sung in Kazakh) while underground acts fuse steppe folk melodies with shoegaze and post-rock, creating a uniquely Central Asian sound.',
    tags: ['dombra', 'kuy', 'ninety one', 'q-pop', 'almaty underground', 'kazakh music', 'steppe folk'],
  },

  // 18. Kyrgyzstan → Bishkek
  {
    id: 'evt-manas-epic-bishkek-1995',
    year: 1995,
    location: { lat: 42.8746, lng: 74.5698, city: 'Bishkek', country: 'Kyrgyzstan' },
    genre: ['Kyrgyz Folk', 'Akyns'],
    title: 'Kyrgyzstan celebrates 1000 years of the Manas Epic',
    description: 'Kyrgyzstan hosts a massive international celebration of the Manas Epic\'s 1000th anniversary. The Manas — twenty times longer than the Iliad — is the world\'s longest oral epic poem, performed from memory by manaschi bards to komuz accompaniment. The celebration in Bishkek revitalizes interest in Kyrgyz oral tradition and akyn improvisational poetry contests.',
    tags: ['manas epic', 'manaschi', 'komuz', 'akyn', 'oral tradition', 'kyrgyz folk', 'bishkek'],
  },

  // 19. Tajikistan → Dushanbe
  {
    id: 'evt-falak-dushanbe-2003',
    year: 2003,
    location: { lat: 38.5598, lng: 68.7740, city: 'Dushanbe', country: 'Tajikistan' },
    genre: ['Falak', 'Shashmaqam', 'Tajik Classical'],
    title: 'Shashmaqam music of Tajikistan-Uzbekistan gains UNESCO recognition',
    description: 'The Shashmaqam — the shared classical music tradition of Tajikistan and Uzbekistan, rooted in the courts of Bukhara and Samarkand — receives UNESCO Masterpiece status. In Dushanbe, master musicians preserve the falak tradition, the haunting Pamiri mountain songs whose melismatic vocal lines echo through the roof of the world, expressing love, loss, and spiritual longing.',
    tags: ['shashmaqam', 'falak', 'bukhara', 'pamiri', 'tajik classical', 'unesco', 'silk road music'],
  },

  // 20. Turkmenistan → Ashgabat
  {
    id: 'evt-bakhshi-ashgabat-2015',
    year: 2015,
    location: { lat: 37.9601, lng: 58.3261, city: 'Ashgabat', country: 'Turkmenistan' },
    genre: ['Turkmen Folk', 'Bakhshi', 'Dutar'],
    title: 'Turkmen bakhshi art of epic storytelling gains UNESCO recognition',
    description: 'The art of Turkmen bakhshi — wandering bards who sing epic tales of Gorogly and other heroes while accompanying themselves on the two-stringed dutar — is inscribed by UNESCO as Intangible Cultural Heritage. In Ashgabat, state-supported ensembles preserve a Central Asian tradition linking Turkmenistan to the ancient Silk Road storytelling culture.',
    tags: ['bakhshi', 'dutar', 'gorogly', 'turkmen epic', 'unesco', 'silk road', 'ashgabat', 'oral tradition'],
  },

  // ─── SOUTH ASIA EVENTS ─────────────────────────────────────

  // 21. Pakistan → Lahore
  {
    id: 'evt-qawwali-lahore-1985',
    year: 1985,
    location: { lat: 31.5497, lng: 74.3436, city: 'Lahore', country: 'Pakistan' },
    genre: ['Qawwali', 'Devotional'],
    title: 'Nusrat Fateh Ali Khan takes qawwali to the world stage',
    description: 'Nusrat Fateh Ali Khan, the supreme qawwali vocalist from Faisalabad and Lahore, performs at WOMAD festival at Peter Gabriel\'s invitation, introducing Sufi devotional music to Western audiences. His superhuman vocal range and ecstatic improvisations transform qawwali from a shrine tradition into a global phenomenon, later influencing Jeff Buckley, Massive Attack, and Eddie Vedder.',
    tags: ['nusrat fateh ali khan', 'qawwali', 'womad', 'peter gabriel', 'sufi music', 'lahore', 'real world records'],
  },

  // 22. Bangladesh → Dhaka
  {
    id: 'evt-baul-dhaka-2005',
    year: 2005,
    location: { lat: 23.8103, lng: 90.4125, city: 'Dhaka', country: 'Bangladesh' },
    genre: ['Baul', 'Bengali Folk'],
    title: 'UNESCO recognizes Baul mystical songs of Bangladesh',
    description: 'The Baul tradition of Bangladesh — wandering mystic minstrels who sing ecstatic devotional songs while playing the ektara one-stringed instrument and dotara lute — receives UNESCO Intangible Cultural Heritage recognition. Rooted in Bengal\'s syncretic Sufi-Hindu spiritual traditions, Baul music influenced Rabindranath Tagore, Bob Dylan, and the psychedelic folk movement.',
    tags: ['baul', 'ektara', 'dotara', 'bengal', 'sufi', 'mystic', 'unesco', 'rabindranath tagore', 'lalon fakir'],
  },

  // 23. Sri Lanka → Colombo
  {
    id: 'evt-baila-colombo-1960',
    year: 1960,
    location: { lat: 6.9271, lng: 79.8612, city: 'Colombo', country: 'Sri Lanka' },
    genre: ['Baila', 'Sri Lankan Pop'],
    title: 'Wally Bastiansz popularizes Sri Lankan baila',
    description: 'Wally Bastiansz and M.S. Fernando bring baila — Sri Lanka\'s infectious Portuguese-Afro-Asian dance music — to its commercial peak in Colombo. Born from the Burgher community\'s kaffrinha music traditions descended from Portuguese colonial-era African slaves, baila becomes Sri Lanka\'s most popular party music, its 6/8 rhythms and witty Sinhala lyrics defining island celebrations.',
    tags: ['baila', 'wally bastiansz', 'ms fernando', 'colombo', 'burgher', 'kaffrinha', 'portuguese influence', 'sri lankan music'],
  },

  // 24. Nepal → Kathmandu
  {
    id: 'evt-nepali-folk-kathmandu-1972',
    year: 1972,
    location: { lat: 27.7172, lng: 85.3240, city: 'Kathmandu', country: 'Nepal' },
    genre: ['Nepali Folk', 'Newari Folk'],
    title: 'Narayan Gopal becomes the "Voice of Nepal"',
    description: 'Narayan Gopal, known as Swar Samrat (Emperor of Voice), records his most beloved songs in Kathmandu\'s Radio Nepal studios. His melancholic voice, singing adhunik geet (modern songs) that blend Nepali folk with Indian film music influences, defines Nepali popular music for decades. Meanwhile, Newari dhime drum processions continue to pulse through Kathmandu\'s ancient durbar squares.',
    tags: ['narayan gopal', 'swar samrat', 'adhunik geet', 'radio nepal', 'newari', 'dhime', 'kathmandu valley'],
  },

  // 25. Bhutan → Thimphu
  {
    id: 'evt-rigsar-thimphu-2000',
    year: 2000,
    location: { lat: 27.4728, lng: 89.6393, city: 'Thimphu', country: 'Bhutan' },
    genre: ['Rigsar', 'Bhutanese Folk'],
    title: 'Rigsar pop emerges as Bhutan opens to the modern world',
    description: 'As Bhutan introduces television and internet for the first time in 1999, a new genre called rigsar ("new melody") emerges in Thimphu — modern Bhutanese pop blending Dzongkha lyrics with Hindi film music and Western instruments. Artists like Jigme Drukpa and Sonam Wangdi navigate the tension between Bhutan\'s Gross National Happiness philosophy and the pull of globalization.',
    tags: ['rigsar', 'bhutan', 'dzongkha', 'thimphu', 'gross national happiness', 'bhutanese pop', 'television era'],
  },

  // 26. Maldives → Male
  {
    id: 'evt-bodu-beru-male-1980',
    year: 1980,
    location: { lat: 4.1755, lng: 73.5093, city: 'Mal\u00e9', country: 'Maldives' },
    genre: ['Bodu Beru', 'Maldivian Folk'],
    title: 'Bodu beru drumming recognized as the Maldives\' national music',
    description: 'Bodu beru ("big drum") — the Maldives\' ancient communal percussion tradition, likely brought by East African sailors centuries ago — gains renewed cultural prominence as Maldivian identity assertions grow. Performed at festivals and celebrations across the atolls, bodu beru features escalating polyrhythmic drumming, call-and-response chanting, and trance-like dancing that builds to ecstatic climaxes.',
    tags: ['bodu beru', 'maldives', 'drumming', 'east african roots', 'atolls', 'communal music', 'trance dance'],
  },

  // 27. Afghanistan → Kabul
  {
    id: 'evt-rubab-kabul-1965',
    year: 1965,
    location: { lat: 34.5553, lng: 69.2075, city: 'Kabul', country: 'Afghanistan' },
    genre: ['Afghan Classical', 'Rubab', 'Pashto Folk'],
    title: 'Ahmad Zahir becomes the "Afghan Elvis" in Kabul\'s golden age',
    description: 'Ahmad Zahir, Afghanistan\'s most beloved singer, begins recording in Kabul during the country\'s brief cosmopolitan golden age. Blending Pashto and Dari poetry with rubab lute, harmonium, and Western instruments, Zahir creates a uniquely Afghan sound. Radio Kabul broadcasts his songs across the country. His 1979 mysterious death and the Soviet invasion end an era of Afghan musical flourishing.',
    tags: ['ahmad zahir', 'afghan elvis', 'rubab', 'radio kabul', 'pashto', 'dari', 'kabul golden age', 'afghan music'],
  },

  // --- EAST ASIA EVENTS ---
  {
    id: 'evt-throatsinging-ulaanbaatar-1992',
    year: 1992,
    location: { lat: 47.9184, lng: 106.9177, city: 'Ulaanbaatar', country: 'Mongolia' },
    genre: ['Throat Singing', 'Mongolian Folk'],
    title: 'Huun-Huur-Tu brings Mongolian throat singing to the world stage',
    description: 'After decades of Soviet suppression, Mongolian and Tuvan throat singing traditions experience a renaissance. The ensemble Huun-Huur-Tu begins international touring, introducing khoomei overtone singing to global audiences. Their fusion of ancient nomadic herding songs with modern performance revitalizes a tradition stretching back centuries across the Mongolian steppe.',
    tags: ['huun-huur-tu', 'khoomei', 'throat singing', 'overtone', 'nomadic', 'steppe'],
  },
  {
    id: 'evt-opera-pyongyang-1971',
    year: 1971,
    location: { lat: 39.0392, lng: 125.7625, city: 'Pyongyang', country: 'North Korea' },
    genre: ['Revolutionary Opera', 'North Korean Pop'],
    title: 'Sea of Blood revolutionary opera premieres in Pyongyang',
    description: 'The revolutionary opera "Sea of Blood" (Pi Bada) premieres at the Pyongyang Grand Theatre, becoming the cornerstone of North Korea\'s state musical culture. Attributed to Kim Il-sung\'s creative guidance, it blends Western orchestration with Korean folk melodies and establishes the template for all five "model revolutionary operas" that dominate the nation\'s musical life.',
    tags: ['sea of blood', 'revolutionary opera', 'juche', 'mansudae', 'kim il-sung', 'pyongyang grand theatre'],
  },

  // --- SOUTHEAST ASIA EVENTS ---
  {
    id: 'evt-hsaingwaing-yangon-1950',
    year: 1950,
    location: { lat: 16.8661, lng: 96.1951, city: 'Yangon', country: 'Myanmar' },
    genre: ['Burmese Classical', 'Thangyat'],
    title: 'U Ba Than codifies the Burmese hsaing waing orchestral tradition',
    description: 'Master musician U Ba Than leads efforts to preserve and systematize Myanmar\'s hsaing waing percussion ensemble tradition in newly independent Burma. The circular drum set (pat waing), gong circles, and oboe-like hne create one of Southeast Asia\'s most distinctive orchestral sounds, performed at nat spirit ceremonies, pwe theatrical events, and the satirical thangyat festivals.',
    tags: ['hsaing waing', 'pat waing', 'hne', 'pwe', 'thingyan', 'nat ceremony'],
  },
  {
    id: 'evt-lukthung-bangkok-1964',
    year: 1964,
    location: { lat: 13.7563, lng: 100.5018, city: 'Bangkok', country: 'Thailand' },
    genre: ['Luk Thung', 'Thai Funk'],
    title: 'Suraphol Sombatcharoen becomes the King of Luk Thung',
    description: 'Suraphol Sombatcharoen, the "King of Luk Thung," dominates Thai popular music with his soulful voice and songs about rural life and heartbreak. His blend of Thai classical melodies with Latin, rock, and country influences creates the definitive luk thung (children of the fields) sound. His mysterious assassination in 1968 makes him a martyred legend of Thai music.',
    tags: ['suraphol', 'luk thung', 'thai country', 'isan', 'ramwong', 'thai pop'],
  },
  {
    id: 'evt-catru-hanoi-2009',
    year: 2009,
    location: { lat: 21.0285, lng: 105.8542, city: 'Hanoi', country: 'Vietnam' },
    genre: ['Ca Tru', 'Vietnamese Folk'],
    title: 'UNESCO recognizes ca tru as intangible cultural heritage',
    description: 'Vietnam\'s ancient ca tru ceremonial singing tradition, dating back to the 11th century, receives UNESCO Intangible Cultural Heritage status. Once performed in royal courts and communal houses of the Red River Delta, ca tru features a female singer accompanied by a three-stringed lute (dan day) and a praise drum.',
    tags: ['ca tru', 'unesco', 'dan day', 'ca nuong', 'red river delta', 'intangible heritage'],
  },
  {
    id: 'evt-khene-vientiane-1960',
    year: 1960,
    location: { lat: 17.9757, lng: 102.6331, city: 'Vientiane', country: 'Laos' },
    genre: ['Lam', 'Khene Music'],
    title: 'Lam singing and khene music flourish in pre-war Laos',
    description: 'Before the upheaval of the Indochina wars, Vientiane experiences a flowering of lam vocal music accompanied by the khene, a mouth organ made of bamboo tubes that produces hauntingly ethereal chords. Lam singers captivate audiences with improvised poetic verses set to pentatonic melodies, a tradition shared with Thailand\'s Isan region.',
    tags: ['khene', 'lam', 'mouth organ', 'bamboo', 'pentatonic', 'isan'],
  },
  {
    id: 'evt-khmerrock-phnompenh-1967',
    year: 1967,
    location: { lat: 11.5564, lng: 104.9282, city: 'Phnom Penh', country: 'Cambodia' },
    genre: ['Cambodian Rock', 'Khmer Pop'],
    title: 'Sinn Sisamouth and Ros Sereysothea define Cambodian rock\'s golden age',
    description: 'Singer Sinn Sisamouth and vocalist Ros Sereysothea lead a golden age of Cambodian popular music, blending Khmer melodies with Western psychedelic rock, surf guitar, Latin rhythms, and soul. Nearly all these artists perish under the Khmer Rouge regime after 1975, making their rediscovered recordings one of music\'s most poignant lost chapters.',
    tags: ['sinn sisamouth', 'ros sereysothea', 'khmer rock', 'psychedelic', 'cambodian pop', 'khmer rouge'],
  },
  {
    id: 'evt-dikir-kualalumpur-1985',
    year: 1985,
    location: { lat: 3.1390, lng: 101.6869, city: 'Kuala Lumpur', country: 'Malaysia' },
    genre: ['Malay Rock', 'Malaysian Pop'],
    title: 'Malaysian rock bands ignite the "Rock Kapak" era',
    description: 'The mid-1980s see the rise of rock kapak (power rock), a distinctly Malaysian rock movement led by bands like Search, Wings, and Lefthanded. Performing in Malay with soaring vocals and virtuosic guitar work, these bands fill stadiums across Malaysia and become cultural icons.',
    tags: ['rock kapak', 'search', 'wings', 'lefthanded', 'malay rock', 'power ballad'],
  },
  {
    id: 'evt-xinyao-singapore-1983',
    year: 1983,
    location: { lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'Singapore' },
    genre: ['Xinyao', 'Mandopop'],
    title: 'Xinyao movement sparks Singaporean Mandarin folk-pop',
    description: 'University students in Singapore launch the xinyao (new songs composed by Singaporeans) movement, writing and performing original Mandarin folk-pop songs. Artists like Liang Wern Fook and Eric Moo compose heartfelt acoustic songs about Singaporean life and identity. The movement produces hit albums and several artists who become major Mandopop stars across Asia.',
    tags: ['xinyao', 'liang wern fook', 'eric moo', 'mandopop', 'folk pop', 'national theatre'],
  },
  {
    id: 'evt-dangdut-jakarta-1975',
    year: 1975,
    location: { lat: -6.2088, lng: 106.8456, city: 'Jakarta', country: 'Indonesia' },
    genre: ['Dangdut', 'Indonesian Pop'],
    title: 'Rhoma Irama becomes the King of Dangdut',
    description: 'Rhoma Irama, the self-proclaimed "King of Dangdut," transforms Indonesia\'s most popular music genre by electrifying it with rock guitars, Indian film music melodies, and Arabic rhythmic patterns. His band Soneta releases a string of hit films and albums that make dangdut the dominant popular music of the world\'s largest archipelago.',
    tags: ['rhoma irama', 'dangdut', 'soneta', 'orkes melayu', 'indian film', 'jakarta'],
  },
  {
    id: 'evt-opm-manila-1978',
    year: 1978,
    location: { lat: 14.5995, lng: 120.9842, city: 'Manila', country: 'Philippines' },
    genre: ['OPM', 'Filipino Rock'],
    title: 'Manila Sound and OPM define Filipino popular music',
    description: 'The Manila Sound reaches its peak with bands like Hotdog, VST & Company, and Hagibis blending disco, funk, and Tagalog lyrics into an infectious pop formula. Simultaneously, the first Metro Manila Popular Music Festival (Metropop) launches, becoming the premier platform for Original Pilipino Music (OPM).',
    tags: ['manila sound', 'hotdog', 'vst company', 'metropop', 'opm', 'tagalog pop'],
  },
  {
    id: 'evt-resistance-dili-1999',
    year: 1999,
    location: { lat: -8.5569, lng: 125.5603, city: 'Dili', country: 'Timor-Leste' },
    genre: ['Resistance Music', 'Fado Timorense'],
    title: 'Timorese resistance songs accompany independence',
    description: 'As Timor-Leste votes for independence from Indonesia, resistance songs that sustained the liberation movement for 24 years ring through the streets of Dili. Musicians blend Portuguese fado, Tetum-language lyrics, and traditional likurai drum rhythms. These songs of struggle become the new nation\'s founding musical identity.',
    tags: ['independence', 'resistance', 'fado', 'likurai', 'tetum', 'dili all stars'],
  },
  {
    id: 'evt-gulingtangan-brunei-1992',
    year: 1992,
    location: { lat: 4.9031, lng: 114.9398, city: 'Bandar Seri Begawan', country: 'Brunei' },
    genre: ['Gulingtangan', 'Malay Classical'],
    title: 'Brunei revives the gulingtangan bronze ensemble tradition',
    description: 'The Brunei Arts and Handicrafts Training Centre launches a formal program to preserve the gulingtangan, a row of small horizontally laid bronze kettlegongs central to Brunei Malay court music. Master musicians teach a new generation the intricate interlocking patterns played at royal ceremonies, weddings, and the aduk-aduk harvest dance.',
    tags: ['gulingtangan', 'bronze ensemble', 'court music', 'aduk-aduk', 'borneo', 'malay classical'],
  },

  // --- OCEANIA EVENTS ---
  {
    id: 'evt-splitenz-auckland-1980',
    year: 1980,
    location: { lat: -36.8485, lng: 174.7633, city: 'Auckland', country: 'New Zealand' },
    genre: ['Indie Rock', 'New Wave'],
    title: 'Split Enz\'s "True Colours" puts New Zealand on the global music map',
    description: 'Auckland band Split Enz releases "True Colours" featuring the worldwide hit "I Got You," becoming New Zealand\'s first internationally successful rock album. Band member Neil Finn goes on to form Crowded House, while Flying Nun Records launches the Dunedin Sound and a fiercely independent Kiwi music scene.',
    tags: ['split enz', 'neil finn', 'true colours', 'i got you', 'flying nun', 'dunedin sound'],
  },
  {
    id: 'evt-singsing-portmoresby-1970',
    year: 1970,
    location: { lat: -9.4438, lng: 147.1803, city: 'Port Moresby', country: 'Papua New Guinea' },
    genre: ['Sing-Sing', 'String Band'],
    title: 'PNG string band music blossoms alongside traditional sing-sing',
    description: 'As Papua New Guinea approaches independence, string band music — featuring ukulele, guitar, and close vocal harmonies — emerges as a unifying national sound alongside the ancient sing-sing ceremonial traditions. The annual Goroka Show brings together hundreds of Highland tribes in spectacular sing-sing performances.',
    tags: ['sing-sing', 'string band', 'paramana strangers', 'goroka show', 'kundu drum', 'highlands'],
  },
  {
    id: 'evt-choral-suva-1985',
    year: 1985,
    location: { lat: -18.1416, lng: 178.4419, city: 'Suva', country: 'Fiji' },
    genre: ['Fijian Choral', 'Island Reggae'],
    title: 'Fijian choral and meke traditions thrive at the Festival of Pacific Arts',
    description: 'Fiji hosts the Festival of Pacific Arts in Suva, showcasing the nation\'s extraordinary choral harmony traditions rooted in Methodist hymn singing and indigenous meke dance-songs. The festival also highlights Indo-Fijian musical traditions, creating a uniquely multicultural Pacific soundscape.',
    tags: ['meke', 'choral harmony', 'festival of pacific arts', 'methodist', 'indo-fijian', 'pacific pop'],
  },
  {
    id: 'evt-panpipe-honiara-1969',
    year: 1969,
    location: { lat: -9.4456, lng: 159.9729, city: 'Honiara', country: 'Solomon Islands' },
    genre: ['Panpipe Ensemble', 'String Band'],
    title: 'Hugo Zemp records \'Are\'are panpipe ensembles of Malaita',
    description: 'Ethnomusicologist Hugo Zemp makes landmark field recordings of the \'Are\'are people of Malaita island, documenting panpipe ensembles of extraordinary complexity. These bamboo panpipe orchestras, with up to eight interlocking parts, are recognized as one of the most sophisticated indigenous musical traditions on Earth.',
    tags: ['are are', 'panpipe', 'malaita', 'hugo zemp', 'polyphony', 'unesco recordings'],
  },
  {
    id: 'evt-stringband-portvila-1980',
    year: 1980,
    location: { lat: -17.7334, lng: 168.3273, city: 'Port Vila', country: 'Vanuatu' },
    genre: ['String Band', 'Custom Music'],
    title: 'Vanuatu string bands celebrate independence with national music',
    description: 'As Vanuatu achieves independence, string bands become the national popular music, blending ukulele, guitar, and kastom (custom) rhythms. The island of Tanna preserves the extraordinary Rom dance and slit-drum ensembles of one of the Pacific\'s most culturally diverse archipelagos.',
    tags: ['string band', 'independence', 'bislama', 'kastom', 'slit drum', 'rom dance'],
  },
  {
    id: 'evt-choral-apia-1962',
    year: 1962,
    location: { lat: -13.8333, lng: -171.7500, city: 'Apia', country: 'Samoa' },
    genre: ['Samoan Choral', 'Fa\'ataupati'],
    title: 'Samoan independence celebrations showcase pese ma siva traditions',
    description: 'Western Samoa becomes the first Pacific Island nation to gain independence, and celebrations in Apia feature the full power of Samoan musical culture. Church choirs perform magnificent hymns in four-part harmony, warriors perform the fierce fa\'ataupati slap dance, and the siva Samoa graceful dance captivates onlookers.',
    tags: ['independence', 'pese', 'siva', 'fa ataupati', 'slap dance', 'fa a samoa'],
  },
  {
    id: 'evt-lakalaka-nukualofa-2003',
    year: 2003,
    location: { lat: -21.2087, lng: -175.1982, city: 'Nuku\'alofa', country: 'Tonga' },
    genre: ['Lakalaka', 'Tongan Choral'],
    title: 'UNESCO proclaims Tongan lakalaka a Masterpiece of cultural heritage',
    description: 'The Tongan lakalaka, a large-scale group dance combining choreography, oratory, and polyphonic choral singing, is proclaimed a UNESCO Masterpiece. Performed at coronations and royal occasions, the lakalaka can involve hundreds of dancers moving in synchronized formation while singing compositions by the nation\'s master poets.',
    tags: ['lakalaka', 'unesco', 'punake', 'polyphonic', 'coronation', 'tongan dance'],
  },
  {
    id: 'evt-tebino-tarawa-1978',
    year: 1978,
    location: { lat: 1.4518, lng: 172.9717, city: 'Tarawa', country: 'Kiribati' },
    genre: ['Te Bino', 'Kiribati Chant'],
    title: 'Kiribati independence revives te bino and te kaimatoa traditions',
    description: 'As Kiribati gains independence from Britain, traditional performing arts experience a cultural revival on Tarawa atoll. The te bino seated dance and the standing te kaimatoa with its rhythmic foot stamping become symbols of I-Kiribati national identity.',
    tags: ['te bino', 'te kaimatoa', 'independence', 'i-kiribati', 'body percussion', 'atoll'],
  },
  {
    id: 'evt-chant-palikir-1986',
    year: 1986,
    location: { lat: 6.9248, lng: 158.1610, city: 'Palikir', country: 'Micronesia' },
    genre: ['Micronesian Chant', 'Stick Dance'],
    title: 'Federated States of Micronesia preserves diverse island traditions',
    description: 'Following the Compact of Free Association with the United States, the newly sovereign Federated States of Micronesia works to preserve the distinct musical traditions of its four states. Yap, Chuuk, Pohnpei, and Kosrae each contribute a unique voice to the Micronesian musical mosaic.',
    tags: ['compact', 'yap dance', 'chuuk', 'pohnpei', 'kosrae', 'micronesian traditions'],
  },
  {
    id: 'evt-jebwa-majuro-1979',
    year: 1979,
    location: { lat: 7.1164, lng: 171.1858, city: 'Majuro', country: 'Marshall Islands' },
    genre: ['Marshallese Chant', 'Gospel'],
    title: 'Marshall Islands self-government renews traditional jebwa music',
    description: 'As the Marshall Islands establishes self-governance, communities on Majuro atoll revive the jebwa, a traditional form of communal choral singing. Rooted in ancient navigation chants that guided canoe voyagers across the Pacific, jebwa blends with the strong gospel choir tradition introduced by missionaries.',
    tags: ['jebwa', 'navigation chant', 'gospel', 'majuro atoll', 'self-governance', 'canoe voyaging'],
  },
  {
    id: 'evt-omengat-ngerulmud-1995',
    year: 1995,
    location: { lat: 7.5006, lng: 134.6243, city: 'Ngerulmud', country: 'Palau' },
    genre: ['Palauan Chant', 'Omengat Song'],
    title: 'Palau\'s first-birth omengat ceremony songs gain cultural recognition',
    description: 'Newly independent Palau formalizes efforts to preserve its unique musical traditions, including the omengat (first-birth ceremony) songs performed exclusively by elder women. These ceremonial chants represent an unbroken oral tradition connecting Palauans to their Austronesian ancestors.',
    tags: ['omengat', 'chesols', 'ruk', 'first-birth ceremony', 'elder women', 'austronesian'],
  },
  {
    id: 'evt-folk-yaren-1968',
    year: 1968,
    location: { lat: -0.5477, lng: 166.9209, city: 'Yaren', country: 'Nauru' },
    genre: ['Nauruan Folk', 'Gospel Choir'],
    title: 'Nauruan independence celebrations feature traditional frigate bird songs',
    description: 'Nauru gains independence, and celebrations feature the island\'s traditional songs including the ancient frigate bird catching songs and communal action dances. Despite its tiny size, Nauru possesses a distinctive musical culture blending Micronesian chant traditions with robust church choir singing.',
    tags: ['independence', 'frigate bird', 'phosphate era', 'church choir', 'action dance', 'micronesian'],
  },
  {
    id: 'evt-fatele-funafuti-2000',
    year: 2000,
    location: { lat: -8.5211, lng: 179.1962, city: 'Funafuti', country: 'Tuvalu' },
    genre: ['Fatele', 'Tuvaluan Choral'],
    title: 'Tuvalu\'s fatele tradition thrives as the nation joins the United Nations',
    description: 'As Tuvalu joins the United Nations, the nation\'s vibrant fatele tradition gains wider recognition. The fatele is a communal action song where seated performers clap, sway, and sing with intensifying tempo and volume, building to an ecstatic climax. Each of Tuvalu\'s nine atolls maintains its own fatele style.',
    tags: ['fatele', 'fakaseasea', 'united nations', 'atoll', 'communal singing', 'polynesian'],
  },
  // --- NORTH AMERICA ---

  // 1. Canada - Montreal
  {
    id: 'evt-arcade-fire-montreal-2004',
    year: 2004,
    location: { lat: 45.5017, lng: -73.5673, city: 'Montreal', country: 'Canada' },
    genre: ['Indie Rock', 'Art Rock'],
    title: 'Arcade Fire\'s "Funeral" launches the Montreal indie explosion',
    description: 'Arcade Fire releases "Funeral", a sweeping, orchestral indie rock masterpiece recorded in a church and a hotel in Montreal. The album transforms the city\'s Mile End neighborhood into the global capital of indie music, alongside Godspeed You! Black Emperor, Wolf Parade, and The Dears. Montreal\'s bilingual scene rivals Brooklyn and London.',
    tags: ['arcade fire', 'funeral', 'mile end', 'godspeed you black emperor', 'wolf parade', 'merge records', 'montreal indie'],
  },
  {
    id: 'evt-jazzfest-montreal-1980',
    year: 1980,
    location: { lat: 45.5017, lng: -73.5673, city: 'Montreal', country: 'Canada' },
    genre: ['Jazz', 'World Music'],
    title: 'Festival International de Jazz de Montréal launches',
    description: 'The Montreal International Jazz Festival debuts and rapidly grows into the world\'s largest jazz festival, drawing over two million visitors annually. The festival transforms downtown Montreal into an open-air concert hall every summer, showcasing everyone from Miles Davis to Ornette Coleman alongside Québécois and international artists.',
    tags: ['jazz festival', 'montreal jazz', 'miles davis', 'world music', 'summer festival', 'quebec'],
  },

  // 2. Canada - Toronto (Ontario)
  {
    id: 'evt-rush-toronto-1974',
    year: 1974,
    location: { lat: 43.6532, lng: -79.3832, city: 'Toronto', country: 'Canada' },
    genre: ['Progressive Rock', 'Hard Rock'],
    title: 'Rush releases debut and begins prog-rock ascent',
    description: 'Toronto trio Rush releases their self-titled debut album, launching one of the most technically virtuosic and influential progressive rock careers in history. With Neil Peart joining on drums later that year, the band would go on to create landmark albums like "2112" and "Moving Pictures," becoming Canada\'s greatest rock export.',
    tags: ['rush', 'prog rock', 'neil peart', 'geddy lee', 'alex lifeson', 'toronto rock', '2112'],
  },
  {
    id: 'evt-drake-toronto-2015',
    year: 2015,
    location: { lat: 43.6532, lng: -79.3832, city: 'Toronto', country: 'Canada' },
    genre: ['Hip Hop', 'R&B', 'Pop'],
    title: 'Drake and The Weeknd make Toronto the global capital of R&B-rap',
    description: 'By 2015, Toronto\'s Aubrey "Drake" Graham and Abel "The Weeknd" Tesfaye had redefined popular music, blending hip hop, R&B, and pop into a moody, atmospheric sound dubbed "the Toronto Sound." Drake\'s OVO label and The Weeknd\'s XO collective turned the city\'s diverse neighborhoods into a recognized global music brand.',
    tags: ['drake', 'the weeknd', 'ovo', 'xo', 'toronto sound', 'hip hop', 'r&b', 'six'],
  },

  // 3. Canada - Vancouver (British Columbia)
  {
    id: 'evt-doa-vancouver-1978',
    year: 1978,
    location: { lat: 49.2827, lng: -123.1207, city: 'Vancouver', country: 'Canada' },
    genre: ['Punk', 'Hardcore Punk'],
    title: 'D.O.A. pioneers hardcore punk in Vancouver',
    description: 'D.O.A. forms in Vancouver and becomes one of the founding bands of North American hardcore punk, coining the term with their 1981 album "Hardcore \'81." Joey Shithead Keithley and the band\'s relentless DIY touring and political activism helped define the punk ethos across Canada and influenced the West Coast punk explosion.',
    tags: ['doa', 'hardcore punk', 'joey keithley', 'vancouver punk', 'diy', 'political punk', 'hardcore 81'],
  },
  {
    id: 'evt-newporn-vancouver-2000',
    year: 2000,
    location: { lat: 49.2827, lng: -123.1207, city: 'Vancouver', country: 'Canada' },
    genre: ['Indie Rock', 'Power Pop'],
    title: 'The New Pornographers launch Vancouver\'s indie golden age',
    description: 'Supergroup The New Pornographers release "Mass Romantic," kickstarting a golden era for Vancouver indie rock alongside Destroyer, Black Mountain, and Japandroids. The city\'s affordable rents and isolation from industry pressures fostered a scene that valued creativity and collaboration over commercial ambition.',
    tags: ['new pornographers', 'destroyer', 'neko case', 'dan bejar', 'vancouver indie', 'mass romantic', 'power pop'],
  },

  // 4. Canada - Edmonton (Alberta)
  {
    id: 'evt-folkfest-edmonton-1980',
    year: 1980,
    location: { lat: 53.5461, lng: -113.4938, city: 'Edmonton', country: 'Canada' },
    genre: ['Folk', 'World Music'],
    title: 'Edmonton Folk Music Festival becomes a Canadian institution',
    description: 'The Edmonton Folk Music Festival launches in Gallagher Park, growing into one of North America\'s most acclaimed folk festivals. The hillside setting overlooking the North Saskatchewan River becomes iconic, attracting legendary performers and cementing Edmonton as a vital gathering place for folk, roots, and world music traditions.',
    tags: ['edmonton folk fest', 'gallagher park', 'folk festival', 'roots music', 'alberta', 'world music'],
  },
  {
    id: 'evt-cadenceweapon-edmonton-2005',
    year: 2005,
    location: { lat: 53.5461, lng: -113.4938, city: 'Edmonton', country: 'Canada' },
    genre: ['Hip Hop', 'Electronic'],
    title: 'Cadence Weapon emerges as Edmonton\'s hip hop innovator',
    description: 'Rollie Pemberton, performing as Cadence Weapon, releases "Breaking Kayfabe" and is named Edmonton\'s poet laureate, blending hip hop with electronic music and prairie identity. His success alongside punk veterans SNFU and indie bands like Shout Out Out Out Out proved Edmonton could nurture diverse, boundary-pushing music far from the usual urban centers.',
    tags: ['cadence weapon', 'edmonton hip hop', 'poet laureate', 'electronic', 'breaking kayfabe', 'alberta'],
  },

  // 5. Canada - Winnipeg (Manitoba)
  {
    id: 'evt-guesswho-winnipeg-1965',
    year: 1965,
    location: { lat: 49.8951, lng: -97.1384, city: 'Winnipeg', country: 'Canada' },
    genre: ['Rock', 'Pop Rock'],
    title: 'The Guess Who put Winnipeg on the rock and roll map',
    description: 'The Guess Who, featuring Burton Cummings and Randy Bachman, begin their rise from Winnipeg\'s community clubs to international stardom with hits like "Shakin\' All Over." They would score massive hits including "American Woman" and "These Eyes," proving that world-class rock could emerge from the Canadian prairies.',
    tags: ['guess who', 'burton cummings', 'randy bachman', 'american woman', 'winnipeg rock', 'these eyes', 'prairie rock'],
  },
  {
    id: 'evt-weakerthans-winnipeg-2000',
    year: 2000,
    location: { lat: 49.8951, lng: -97.1384, city: 'Winnipeg', country: 'Canada' },
    genre: ['Indie Rock', 'Folk Punk'],
    title: 'The Weakerthans define Winnipeg\'s indie identity',
    description: 'The Weakerthans release "Left and Leaving," a landmark of Canadian indie rock that lovingly captures life in Winnipeg with literary precision. Frontman John K. Samson\'s poetic songwriting about frozen prairies, bus routes, and heartbreak became a blueprint for place-specific indie rock and cemented Winnipeg\'s reputation as a fiercely independent music city.',
    tags: ['weakerthans', 'john k samson', 'left and leaving', 'winnipeg indie', 'literary rock', 'folk punk', 'prairie'],
  },

  // 6. Canada - Saskatoon (Saskatchewan)
  {
    id: 'evt-jonimitchell-saskatoon-1964',
    year: 1964,
    location: { lat: 52.1332, lng: -106.6700, city: 'Saskatoon', country: 'Canada' },
    genre: ['Folk', 'Singer-Songwriter'],
    title: 'Joni Mitchell begins performing in Saskatoon coffeehouses',
    description: 'Roberta Joan Anderson, raised in Saskatoon, begins performing in local coffeehouses before moving to Toronto and eventually becoming one of the most important singer-songwriters in music history. Her prairie upbringing and the vast Saskatchewan landscapes profoundly shaped the open, searching quality of masterpieces like "Blue" and "Hejira."',
    tags: ['joni mitchell', 'saskatoon', 'folk music', 'coffeehouse', 'singer-songwriter', 'blue', 'hejira', 'prairie'],
  },
  {
    id: 'evt-sask-jazz-saskatoon-1987',
    year: 1987,
    location: { lat: 52.1332, lng: -106.6700, city: 'Saskatoon', country: 'Canada' },
    genre: ['Jazz', 'Blues'],
    title: 'SaskTel Saskatchewan Jazz Festival launches in Saskatoon',
    description: 'The Saskatchewan Jazz Festival begins in Saskatoon, growing into one of Canada\'s premier jazz and blues events. The festival transforms the riverbank and downtown into a celebration of music that connects the prairies to global jazz traditions, attracting both international headliners and nurturing local talent across genres.',
    tags: ['jazz festival', 'saskatoon jazz', 'blues', 'saskatchewan', 'summer festival', 'prairie jazz'],
  },

  // 7. Canada - Halifax (Nova Scotia)
  {
    id: 'evt-sloan-halifax-1992',
    year: 1992,
    location: { lat: 44.6488, lng: -63.5752, city: 'Halifax', country: 'Canada' },
    genre: ['Indie Rock', 'Power Pop', 'Alternative Rock'],
    title: 'Sloan and the Halifax Pop Explosion',
    description: 'Sloan releases "Smeared" on DGC Records, igniting the Halifax Pop Explosion that put Nova Scotia\'s capital on the international indie map. Alongside Eric\'s Trip, Thrush Hermit, and the Super Friendz, the Halifax scene became one of the most celebrated indie movements of the 1990s, centered around venues on Barrington Street and the local community.',
    tags: ['sloan', 'halifax pop explosion', 'erics trip', 'thrush hermit', 'dgc records', 'barrington street', 'nova scotia indie'],
  },
  {
    id: 'evt-celtic-halifax-1970',
    year: 1970,
    location: { lat: 44.6488, lng: -63.5752, city: 'Halifax', country: 'Canada' },
    genre: ['Celtic', 'Folk', 'Traditional'],
    title: 'Cape Breton fiddle and Celtic music revival in Nova Scotia',
    description: 'Nova Scotia\'s Cape Breton Island and Halifax become the epicenter of a Celtic music revival, with fiddle masters like Buddy MacMaster preserving Scottish and Irish traditions brought by immigrants centuries earlier. The distinctive Cape Breton fiddle style, with its driving rhythms and ornamented melodies, gains international recognition and inspires a new generation of players.',
    tags: ['cape breton', 'celtic fiddle', 'buddy macmaster', 'nova scotia', 'scottish tradition', 'folk revival', 'maritime music'],
  },

  // 8. Canada - Moncton (New Brunswick)
  {
    id: 'evt-acadian-moncton-1994',
    year: 1994,
    location: { lat: 46.0878, lng: -64.7782, city: 'Moncton', country: 'Canada' },
    genre: ['Acadian', 'Folk', 'Rock'],
    title: '1755 and the Acadian music renaissance in Moncton',
    description: 'Building on the groundbreaking work of the band 1755 and the Acadian cultural revival, Moncton\'s French-language music scene blossoms in the 1990s. Artists blend traditional Acadian folk with rock, punk, and hip hop, creating a vibrant bilingual music community that celebrates Maritime identity and the Acadian diaspora\'s resilience.',
    tags: ['acadian music', '1755 band', 'french canadian', 'moncton', 'new brunswick', 'cultural revival', 'maritime', 'bilingual'],
  },
  {
    id: 'evt-eric-trip-moncton-1993',
    year: 1993,
    location: { lat: 46.0878, lng: -64.7782, city: 'Moncton', country: 'Canada' },
    genre: ['Indie Rock', 'Lo-Fi', 'Noise Pop'],
    title: 'Eric\'s Trip becomes first Canadian band on Sub Pop Records',
    description: 'Moncton\'s Eric\'s Trip, featuring Rick White and Julie Doiron, becomes the first Canadian band signed to Sub Pop Records, bringing national and international attention to New Brunswick\'s underground music scene. Their lo-fi, emotionally raw sound and prolific home-recording ethos inspired a generation of Maritime indie musicians.',
    tags: ['erics trip', 'sub pop', 'rick white', 'julie doiron', 'moncton indie', 'lo-fi', 'new brunswick', 'maritime indie'],
  },

  // 9. Canada - St. John's (Newfoundland and Labrador)
  {
    id: 'evt-greatbigseea-stjohns-1993',
    year: 1993,
    location: { lat: 47.5615, lng: -52.7126, city: 'St. John\'s', country: 'Canada' },
    genre: ['Celtic', 'Folk Rock', 'Traditional'],
    title: 'Great Big Sea electrifies Newfoundland folk tradition',
    description: 'Great Big Sea forms in St. John\'s and begins fusing traditional Newfoundland folk songs with rock energy, becoming one of Canada\'s most popular live acts. Their raucous pub-style performances of sea shanties and original songs bring Newfoundland\'s centuries-old musical heritage to audiences across the country and beyond.',
    tags: ['great big sea', 'newfoundland folk', 'sea shanties', 'st johns', 'celtic rock', 'traditional music', 'east coast'],
  },
  {
    id: 'evt-georgestreet-stjohns-1985',
    year: 1985,
    location: { lat: 47.5615, lng: -52.7126, city: 'St. John\'s', country: 'Canada' },
    genre: ['Folk', 'Traditional', 'Rock'],
    title: 'George Street becomes North America\'s pub music capital',
    description: 'By the mid-1980s, George Street in downtown St. John\'s has established itself as one of North America\'s densest concentrations of live music venues, with more bars per square foot than any other street on the continent. Traditional Newfoundland jigs, reels, and ballads fill the pubs nightly, sustaining a living folk tradition rooted in centuries of Irish, English, and Scottish immigration.',
    tags: ['george street', 'pub music', 'st johns', 'newfoundland', 'traditional music', 'live music', 'irish influence', 'maritime'],
  },

  // 10. Canada - Charlottetown (Prince Edward Island)
  {
    id: 'evt-ceilidh-charlottetown-1977',
    year: 1977,
    location: { lat: 46.2382, lng: -63.1311, city: 'Charlottetown', country: 'Canada' },
    genre: ['Celtic', 'Fiddle', 'Traditional'],
    title: 'PEI fiddle and cèilidh tradition gains national recognition',
    description: 'Prince Edward Island\'s cèilidh (kitchen party) tradition of fiddle music, step dancing, and communal gatherings gains wider recognition through festivals and radio broadcasts from Charlottetown. The island\'s Scottish and Irish settler heritage sustains one of Canada\'s most vibrant fiddle traditions, with players like Don Messer having long brought PEI music into Canadian homes.',
    tags: ['ceilidh', 'fiddle', 'don messer', 'pei', 'kitchen party', 'step dancing', 'scottish tradition', 'charlottetown'],
  },
  {
    id: 'evt-rootsfest-charlottetown-2010',
    year: 2010,
    location: { lat: 46.2382, lng: -63.1311, city: 'Charlottetown', country: 'Canada' },
    genre: ['Folk', 'Roots', 'Singer-Songwriter'],
    title: 'PEI singer-songwriters and roots music scene flourishes',
    description: 'Charlottetown\'s intimate music community produces a wave of acclaimed singer-songwriters and roots musicians, with the island\'s natural beauty and tight-knit creative community attracting artists from across Canada. Annual festivals, house concerts, and the Confederation Centre of the Arts sustain a year-round music culture that punches far above the island\'s small population.',
    tags: ['pei music', 'singer-songwriter', 'roots music', 'charlottetown', 'confederation centre', 'folk', 'island culture'],
  },

  // --- CENTRAL AMERICA & CARIBBEAN ---

  // 2. Haiti - Port-au-Prince
  {
    id: 'evt-kompa-portauprince-1957',
    year: 1957,
    location: { lat: 18.5944, lng: -72.3074, city: 'Port-au-Prince', country: 'Haiti' },
    genre: ['Kompa', 'Merengue'],
    title: 'Nemours Jean-Baptiste invents kompa direk',
    description: 'Saxophonist and bandleader Nemours Jean-Baptiste debuts kompa direk (compas direct) at the Palladium nightclub in Port-au-Prince. By slowing down merengue and adding Haitian guitar, horn riffs, and a steady tanbou drum pulse, he creates the genre that will dominate Haitian music for decades and spread across the French-speaking Caribbean.',
    tags: ['nemours jean-baptiste', 'kompa', 'compas', 'palladium', 'tanbou', 'haitian music', 'super ensemble'],
  },

  // 3. Dominican Republic - Santo Domingo
  {
    id: 'evt-bachata-santodomingo-1962',
    year: 1962,
    location: { lat: 18.4861, lng: -69.9312, city: 'Santo Domingo', country: 'Dominican Republic' },
    genre: ['Bachata', 'Bolero'],
    title: 'Jos\u00e9 Manuel Calder\u00f3n records the first bachata',
    description: 'Jos\u00e9 Manuel Calder\u00f3n records "Borracho de Amor" and "Condena", widely considered the first bachata recordings. Born in the working-class barrios of Santo Domingo, bachata fuses bolero\'s romanticism with guitar-driven Dominican rhythm. Initially dismissed by elites as "m\u00fasica de amargue" (music of bitterness), it eventually conquers the world through Juan Luis Guerra and Romeo Santos.',
    tags: ['jose manuel calderon', 'bachata', 'borracho de amor', 'musica de amargue', 'bolero', 'dominican music', 'barrio'],
  },

  // 4. Trinidad and Tobago - Port of Spain
  {
    id: 'evt-steelpan-portofspain-1951',
    year: 1951,
    location: { lat: 10.6596, lng: -61.5086, city: 'Port of Spain', country: 'Trinidad and Tobago' },
    genre: ['Steelpan', 'Calypso'],
    title: 'TASPO takes the steelpan to the Festival of Britain',
    description: 'The Trinidad All Steel Percussion Orchestra (TASPO) performs at the Festival of Britain in London, introducing the world to the steelpan \u2014 the only acoustic instrument invented in the 20th century. Forged from oil drums in the yards of Laventille and Port of Spain, the pan transforms from a banned street instrument into Trinidad\'s national treasure.',
    tags: ['taspo', 'steelpan', 'festival of britain', 'laventille', 'oil drum', 'carnival', 'pan', 'trinidad'],
  },

  // 5. Barbados - Bridgetown
  {
    id: 'evt-spouge-bridgetown-1969',
    year: 1969,
    location: { lat: 13.0969, lng: -59.6145, city: 'Bridgetown', country: 'Barbados' },
    genre: ['Spouge', 'Calypso'],
    title: 'Jackie Opel and the invention of spouge music',
    description: 'Following the pioneering work of Jackie Opel, who blended Barbadian calypso with Jamaican ska, local musicians create spouge \u2014 Barbados\' unique contribution to Caribbean music. Dray Scott and Blue Rhythm Combo popularize the genre, which fuses calypso with a distinctive snare drum pattern and tuk band rhythms, giving Barbados its own musical identity apart from Trinidad and Jamaica.',
    tags: ['jackie opel', 'spouge', 'dray scott', 'blue rhythm combo', 'tuk band', 'barbados music', 'calypso'],
  },

  // 6. Bahamas - Nassau
  {
    id: 'evt-junkanoo-nassau-1958',
    year: 1958,
    location: { lat: 25.0343, lng: -77.3963, city: 'Nassau', country: 'Bahamas' },
    genre: ['Junkanoo', 'Goombay'],
    title: 'Junkanoo parade becomes the Bahamas\' cultural centerpiece',
    description: 'Nassau\'s Boxing Day Junkanoo parade reaches new heights of spectacle as organized groups compete with elaborate costumes and thunderous percussion. The goatskin drums, cowbells, horns, and whistles of Junkanoo \u2014 rooted in West African masquerade traditions brought by enslaved people \u2014 create a wall of rhythm that defines Bahamian identity. Exuma and Ronnie Butler bring Bahamian sounds to wider audiences.',
    tags: ['junkanoo', 'boxing day', 'goombay', 'cowbell', 'exuma', 'ronnie butler', 'bay street', 'masquerade'],
  },

  // 7. Grenada - St. George's
  {
    id: 'evt-jab-stgeorges-2000',
    year: 2000,
    location: { lat: 12.0564, lng: -61.7485, city: 'St. George\'s', country: 'Grenada' },
    genre: ['Soca', 'Calypso'],
    title: 'Grenada\'s soca scene erupts with Ajamu and Mr. Killa',
    description: 'Grenada\'s Spicemas Carnival soca scene reaches new creative heights as artists like Ajamu bring the island\'s Jab Jab tradition \u2014 revelers covered in oil and paint, carrying chains \u2014 into modern soca production. The raw, percussive energy of Grenadian soca, later perfected by Mr. Killa\'s "Run Wid It" and "Rolly Polly", carves a distinctive niche in the pan-Caribbean soca landscape.',
    tags: ['spicemas', 'jab jab', 'ajamu', 'mr killa', 'grenada soca', 'oil mas', 'carnival', 'shortknee'],
  },

  // 8. Saint Lucia - Castries
  {
    id: 'evt-dennery-castries-2014',
    year: 2014,
    location: { lat: 14.0101, lng: -60.9875, city: 'Castries', country: 'Saint Lucia' },
    genre: ['Soca', 'Dennery Segment'],
    title: 'Dennery Segment goes viral across the Caribbean',
    description: 'The Dennery Segment \u2014 a hyper-fast, bouyon-influenced style of soca born in the fishing village of Dennery on Saint Lucia\'s east coast \u2014 explodes across the Caribbean. Artists like Teddyson John with "Vent" create a frantic, bass-driven sound built on Dominica\'s bouyon rhythms, faster tempos, and call-and-response crowd interaction that transforms Caribbean Carnival music.',
    tags: ['dennery segment', 'teddyson john', 'vent', 'bouyon', 'saint lucia carnival', 'lucian soca', 'dennery'],
  },

  // 9. Saint Vincent and the Grenadines - Kingstown
  {
    id: 'evt-vincy-soca-kingstown-2009',
    year: 2009,
    location: { lat: 13.1587, lng: -61.2248, city: 'Kingstown', country: 'Saint Vincent and the Grenadines' },
    genre: ['Soca', 'Ragga Soca'],
    title: 'Skinny Fabulous puts Vincy soca on the international map',
    description: 'Skinny Fabulous (Gamal Doyle) wins the International Soca Monarch competition, establishing Saint Vincent as a serious force in Caribbean soca music. Vincy Mas Carnival \u2014 known for its raw energy and ragga soca style \u2014 produces a steady stream of artists who challenge Trinidad\'s dominance, blending dancehall attitude with soca rhythms.',
    tags: ['skinny fabulous', 'vincy mas', 'ragga soca', 'soca monarch', 'carnival', 'vincentian music', 'gamal doyle'],
  },

  // 10. Dominica - Roseau
  {
    id: 'evt-bouyon-roseau-1988',
    year: 1988,
    location: { lat: 15.3010, lng: -61.3881, city: 'Roseau', country: 'Dominica' },
    genre: ['Bouyon', 'Cadence-lypso'],
    title: 'Windward Caribbean Kulture (WCK) invents bouyon music',
    description: 'The band WCK (Windward Caribbean Kulture) creates bouyon \u2014 a thunderous fusion of Dominican cadence-lypso, zouk, and soca with heavy bass and drum machine rhythms. Born in the Nature Isle where Exile One and Grammacks had pioneered cadence-lypso in the 1970s, bouyon becomes the Eastern Caribbean\'s most influential dance music export, spawning the Dennery Segment in Saint Lucia.',
    tags: ['wck', 'bouyon', 'cadence-lypso', 'exile one', 'grammacks', 'dominica music', 'nature isle', 'creole'],
  },

  // 11. Antigua and Barbuda - St. John's
  {
    id: 'evt-benna-stjohns-1960',
    year: 1960,
    location: { lat: 17.1175, lng: -61.8456, city: 'St. John\'s', country: 'Antigua and Barbuda' },
    genre: ['Calypso', 'Antigua Benna'],
    title: 'Short Shirt and King Swallow define Antiguan calypso',
    description: 'Antiguan calypsonians Short Shirt (McLean Emmanuel) and King Swallow (Rupert Philo) rise to prominence, rooting their music in benna \u2014 Antigua\'s indigenous calypso tradition with roots in call-and-response work songs of the sugar plantations. Their witty social commentary and infectious rhythms make Antigua\'s Carnival one of the Caribbean\'s premier events.',
    tags: ['short shirt', 'king swallow', 'benna', 'antigua carnival', 'calypso', 'sugar plantation', 'work song'],
  },

  // 12. Saint Kitts and Nevis - Basseterre
  {
    id: 'evt-sugar-mas-basseterre-1971',
    year: 1971,
    location: { lat: 17.2948, lng: -62.7261, city: 'Basseterre', country: 'Saint Kitts and Nevis' },
    genre: ['Calypso', 'String Band'],
    title: 'Sugar Mas festival revives Kittitian string band music',
    description: 'The Sugar Mas (Christmas) festival in Basseterre becomes a major cultural event, spotlighting Saint Kitts\' distinctive string band tradition. Groups perform with guitars, cuatros, mandolins, and shac-shacs, blending quadrille dance music with calypso lyrics. The festival preserves the islands\' unique musical heritage while launching soca artists who compete across the Eastern Caribbean.',
    tags: ['sugar mas', 'string band', 'cuatro', 'shac-shac', 'quadrille', 'kittitian music', 'christmas festival'],
  },

  // 13. Belize - Belize City
  {
    id: 'evt-punta-belizecity-1981',
    year: 1981,
    location: { lat: 17.5046, lng: -88.1962, city: 'Belize City', country: 'Belize' },
    genre: ['Punta', 'Punta Rock'],
    title: 'Pen Cayetano electrifies Garifuna punta into punta rock',
    description: 'Pen Cayetano, a Garifuna artist from Dangriga, electrifies the traditional punta dance rhythm with electric guitars, creating punta rock around the time of Belize\'s independence. The Garifuna people \u2014 descendants of West Africans and Carib Amerindians \u2014 see their sacred circular dance music transformed into Belize\'s most popular genre, later carried internationally by Andy Palacio and Aurelio Martinez.',
    tags: ['pen cayetano', 'punta rock', 'garifuna', 'dangriga', 'andy palacio', 'aurelio martinez', 'belize independence'],
  },

  // 14. Guatemala - Guatemala City
  {
    id: 'evt-marimba-guatemalacity-1955',
    year: 1955,
    location: { lat: 14.6349, lng: -90.5069, city: 'Guatemala City', country: 'Guatemala' },
    genre: ['Marimba', 'Folk'],
    title: 'Guatemala declares the marimba a national instrument',
    description: 'Guatemala officially recognizes the marimba \u2014 a large wooden xylophone of African origin adapted by Maya and Ladino communities \u2014 as its national instrument. Marimba de concierto orchestras perform everything from traditional son guatemalteco to classical arrangements. The instrument\'s warm, resonant tones become inseparable from Guatemalan national identity, played at weddings, fiestas, and state ceremonies.',
    tags: ['marimba', 'national instrument', 'son guatemalteco', 'maya', 'ladino', 'marimba de concierto', 'quetzaltenango'],
  },

  // 15. Honduras - Tegucigalpa
  {
    id: 'evt-punta-tegucigalpa-1995',
    year: 1995,
    location: { lat: 14.0723, lng: -87.1921, city: 'Tegucigalpa', country: 'Honduras' },
    genre: ['Punta', 'Reggaeton'],
    title: 'Garifuna punta music reaches mainstream Honduras',
    description: 'Honduran Garifuna artists from the Caribbean coast bring punta rock to mainstream audiences in Tegucigalpa and across Central America. Kazzabe and Silver Star Musical lead a movement that bridges the Garifuna communities of La Ceiba and Tela with the Spanish-speaking highlands. Punta\'s hip-shaking rhythms merge with reggaeton influences, creating a distinctly Honduran sound.',
    tags: ['kazzabe', 'silver star musical', 'garifuna', 'punta', 'la ceiba', 'honduras music', 'caribbean coast'],
  },

  // 16. El Salvador - San Salvador
  {
    id: 'evt-cumbia-sansalvador-1990',
    year: 1990,
    location: { lat: 13.6929, lng: -89.2182, city: 'San Salvador', country: 'El Salvador' },
    genre: ['Cumbia', 'Rock en Espa\u00f1ol'],
    title: 'Salvadoran cumbia and rock thrive amid civil war\'s end',
    description: 'As El Salvador\'s civil war draws to a close, a cultural revival emerges in San Salvador. Cumbia bands like Marito Rivera y su Grupo Bravo dominate dance halls, while the Salvadoran diaspora in Los Angeles creates a feedback loop of musical exchange. Meanwhile, an underground rock and punk scene develops, with bands channeling post-war disillusionment into raw, urgent music.',
    tags: ['marito rivera', 'salvadoran cumbia', 'civil war', 'diaspora', 'los angeles', 'rock salvadoreno', 'post-war'],
  },

  // 17. Nicaragua - Managua
  {
    id: 'evt-sonnica-managua-1975',
    year: 1975,
    location: { lat: 12.1150, lng: -86.2362, city: 'Managua', country: 'Nicaragua' },
    genre: ['Son Nica', 'Nueva Canci\u00f3n'],
    title: 'Carlos Mej\u00eda Godoy\'s "Son Tus Perjumenes Mujer" defines son nica',
    description: 'Carlos Mej\u00eda Godoy establishes son nica as Nicaragua\'s national music, blending the country\'s folk traditions with political songwriting during the Sandinista revolution. His brother Luis Enrique Mej\u00eda Godoy joins him in creating songs that become anthems of social change. On the Caribbean coast, the Afro-Creole Palo de Mayo tradition thrives independently with its own Maypole festivals.',
    tags: ['carlos mejia godoy', 'son nica', 'sandinista', 'nueva cancion', 'palo de mayo', 'nicaragua folk', 'revolution'],
  },

  // 18. Costa Rica - San Jos\u00e9
  {
    id: 'evt-calypso-sanjose-1970',
    year: 1970,
    location: { lat: 9.9281, lng: -84.0907, city: 'San Jos\u00e9', country: 'Costa Rica' },
    genre: ['Calypso', 'Folk'],
    title: 'Walter Ferguson and Lim\u00f3n calypso gain national recognition',
    description: 'Walter "Gavitt" Ferguson, a self-taught calypsonian from Cahuita on Costa Rica\'s Caribbean coast, gains wider attention for his English-language calypso songs documenting Afro-Caribbean life in Lim\u00f3n province. His music \u2014 performed on acoustic guitar with wry storytelling \u2014 represents a unique Central American branch of the calypso tradition, connecting Costa Rica to its Caribbean identity.',
    tags: ['walter ferguson', 'calypso', 'limon', 'cahuita', 'afro-caribbean', 'costa rica music', 'caribbean coast'],
  },

  // 19. Panama - Panama City
  {
    id: 'evt-reggae-espanol-panamacity-1985',
    year: 1985,
    location: { lat: 8.9824, lng: -79.5199, city: 'Panama City', country: 'Panama' },
    genre: ['Reggae en Espa\u00f1ol', 'Dancehall'],
    title: 'El General pioneers reggae en espa\u00f1ol in Panama',
    description: 'Edgardo "El General" Franco and other Panamanian artists begin translating Jamaican dancehall into Spanish over sound system culture in Panama City\'s West Indian immigrant neighborhoods. El General\'s "Tu Pum Pum" becomes an international hit. This Spanish-language dancehall \u2014 called reggae en espa\u00f1ol \u2014 is the direct precursor to reggaeton, which would later crystallize in Puerto Rico.',
    tags: ['el general', 'tu pum pum', 'reggae en espanol', 'dancehall', 'panama music', 'west indian', 'dembow', 'reggaeton origins'],
  },

  // --- SOUTH AMERICA ---

  // 20. Venezuela - Caracas
  {
    id: 'evt-salsa-caracas-1974',
    year: 1974,
    location: { lat: 10.4806, lng: -66.9036, city: 'Caracas', country: 'Venezuela' },
    genre: ['Salsa', 'Latin'],
    title: 'Oscar D\'Le\u00f3n and La Dimensi\u00f3n Latina ignite Venezuelan salsa',
    description: 'Oscar D\'Le\u00f3n joins La Dimensi\u00f3n Latina and transforms Caracas into a rival salsa capital to New York and San Juan. His charismatic stage presence and virtuosic bass playing earn him the title "El Le\u00f3n de la Salsa". Venezuela\'s oil boom fuels a golden age of nightlife, and Caracas\' salsa clubs become legendary across Latin America.',
    tags: ['oscar dleon', 'dimension latina', 'salsa', 'caracas nightlife', 'oil boom', 'leon de la salsa', 'venezuelan music'],
  },

  // 21. Ecuador - Quito
  {
    id: 'evt-pasillo-quito-1930',
    year: 1930,
    location: { lat: -0.1807, lng: -78.4678, city: 'Quito', country: 'Ecuador' },
    genre: ['Pasillo', 'Bolero'],
    title: 'Julio Jaramillo and the golden age of Ecuadorian pasillo',
    description: 'The pasillo \u2014 a slow, melancholic waltz brought from Colombia and transformed into Ecuador\'s most beloved genre \u2014 enters its golden age. Julio Jaramillo, "El Ruise\u00f1or de Am\u00e9rica" (The Nightingale of the Americas), becomes the genre\'s defining voice, recording hundreds of songs that express the bittersweet longing of highland Ecuador. His voice remains sacred across Latin America.',
    tags: ['julio jaramillo', 'pasillo', 'ruisenor de america', 'ecuadorian waltz', 'highland music', 'melancholy', 'quito'],
  },

  // 22. Peru - Lima
  {
    id: 'evt-chicha-lima-1970',
    year: 1970,
    location: { lat: -12.0464, lng: -77.0428, city: 'Lima', country: 'Peru' },
    genre: ['Chicha', 'Cumbia Peruana'],
    title: 'Los Shapis and chicha music electrify Lima\'s barriadas',
    description: 'Chicha \u2014 a psychedelic fusion of Andean huayno, Colombian cumbia, and surf guitar \u2014 emerges from Lima\'s migrant neighborhoods as rural Andeans flood into the capital. Groups like Los Destellos, led by guitarist Enrique Delgado, and later Los Shapis create a visually flamboyant, synthesizer-drenched sound that becomes the music of Peru\'s urban working class.',
    tags: ['los shapis', 'chicha', 'los destellos', 'enrique delgado', 'huayno', 'cumbia peruana', 'barriada', 'andean migration'],
  },

  // 23. Bolivia - La Paz
  {
    id: 'evt-andean-lapaz-1965',
    year: 1965,
    location: { lat: -16.4897, lng: -68.1193, city: 'La Paz', country: 'Bolivia' },
    genre: ['Andean Folk', 'Nueva Canci\u00f3n'],
    title: 'Los Jairas spark the Bolivian folk music renaissance',
    description: 'Los Jairas, featuring charango virtuoso Ernesto Cavour and Swiss-Bolivian flautist Gilbert Favre, perform at the Pe\u00f1a Naira in La Paz and ignite a Bolivian folk renaissance. They bring the zampo\u00f1a, charango, and quena to concert stages, inspiring a pan-Andean music movement that spreads to Chile, Argentina, and Europe, making these instruments globally recognizable.',
    tags: ['los jairas', 'ernesto cavour', 'charango', 'quena', 'zampona', 'pena naira', 'andean folk', 'bolivian music'],
  },

  // 24. Chile - Santiago
  {
    id: 'evt-nueva-cancion-santiago-1969',
    year: 1969,
    location: { lat: -33.4489, lng: -70.6693, city: 'Santiago', country: 'Chile' },
    genre: ['Nueva Canci\u00f3n', 'Folk'],
    title: 'V\u00edctor Jara and the nueva canci\u00f3n movement transform Latin American music',
    description: 'V\u00edctor Jara, Violeta Parra, Inti-Illimani, and Quilapay\u00fan create nueva canci\u00f3n chilena \u2014 a movement fusing Andean folk instruments with politically committed lyrics that becomes the musical voice of Salvador Allende\'s Popular Unity movement. After the 1973 coup, Jara is murdered in the Estadio Chile, and his songs become global anthems of resistance and human rights.',
    tags: ['victor jara', 'violeta parra', 'inti-illimani', 'quilapayun', 'nueva cancion', 'allende', 'protest music', 'estadio chile'],
  },

  // 25. Paraguay - Asunci\u00f3n
  {
    id: 'evt-guarania-asuncion-1944',
    year: 1944,
    location: { lat: -25.2637, lng: -57.5759, city: 'Asunci\u00f3n', country: 'Paraguay' },
    genre: ['Guarania', 'Harp Music'],
    title: 'Agust\u00edn Barrios and F\u00e9lix P\u00e9rez Cardozo define Paraguayan music',
    description: 'Agust\u00edn Barrios Mangor\u00e9, considered the greatest classical guitarist of his era, leaves a legacy of compositions that blend European romanticism with Paraguayan folk melody. Meanwhile, F\u00e9lix P\u00e9rez Cardozo\'s Paraguayan harp performances \u2014 including the iconic "P\u00e1jaro Campana" (Bell Bird) \u2014 establish the guarania as Paraguay\'s national genre, a slow, haunting music of exile and longing.',
    tags: ['agustin barrios', 'felix perez cardozo', 'guarania', 'paraguayan harp', 'pajaro campana', 'classical guitar', 'mangore'],
  },

  // 26. Uruguay - Montevideo
  {
    id: 'evt-candombe-montevideo-1978',
    year: 1978,
    location: { lat: -34.9011, lng: -56.1645, city: 'Montevideo', country: 'Uruguay' },
    genre: ['Candombe', 'Rock'],
    title: 'Las Llamadas candombe parade becomes a cultural monument',
    description: 'The annual Las Llamadas (The Calls) candombe drumming parade through Montevideo\'s Barrio Sur and Palermo neighborhoods is recognized as Uruguay\'s most important cultural tradition. Comparsas \u2014 groups of dozens of drummers playing three sizes of tambor drums \u2014 fill the streets with Afro-Uruguayan polyrhythms. Jaime Roos and later Rub\u00e9n Rada fuse candombe with rock, creating a uniquely Uruguayan popular music.',
    tags: ['las llamadas', 'candombe', 'barrio sur', 'comparsa', 'tambor', 'jaime roos', 'ruben rada', 'afro-uruguayan'],
  },

  // 27. Guyana - Georgetown
  {
    id: 'evt-chutney-georgetown-1996',
    year: 1996,
    location: { lat: 6.8013, lng: -58.1551, city: 'Georgetown', country: 'Guyana' },
    genre: ['Chutney', 'Soca'],
    title: 'Chutney soca fusion takes Guyana to Caribbean stages',
    description: 'Guyanese-Trinidadian artists popularize chutney soca \u2014 a fusion of Indian folk music, Hindi film songs, and Caribbean soca rhythms created by the Indo-Caribbean diaspora. Artists like Terry Gajraj and Rikki Jai blend dholak drums and harmonium with soca bass lines. The genre, born from the indentured labor experience, becomes a vital expression of Indo-Caribbean identity across Guyana and Trinidad.',
    tags: ['chutney soca', 'terry gajraj', 'rikki jai', 'indo-caribbean', 'dholak', 'harmonium', 'guyanese music', 'diaspora'],
  },

  // 28. Suriname - Paramaribo
  {
    id: 'evt-kaseko-paramaribo-1970',
    year: 1970,
    location: { lat: 5.8520, lng: -55.2038, city: 'Paramaribo', country: 'Suriname' },
    genre: ['Kaseko', 'Kawina'],
    title: 'Lieve Hugo and kaseko define Surinamese popular music',
    description: 'Lieve Hugo, the "King of Kaseko", helps establish kaseko as Suriname\'s national popular music \u2014 a high-energy fusion of Creole kawina rhythms, jazz, funk, and Javanese gamelan influences unique to Paramaribo\'s multiethnic society. Suriname\'s population of Creoles, Maroons, Javanese, Hindustanis, and Amerindians creates one of the most musically diverse small nations on earth.',
    tags: ['lieve hugo', 'kaseko', 'kawina', 'suriname music', 'javanese', 'maroon', 'creole', 'paramaribo'],
  },

  // --- US States: ensuring every state has at least 2 events ---

  // LOUISIANA (2nd event)
  {
    id: 'evt-meters-neworleans-1969',
    year: 1969,
    location: { lat: 29.9511, lng: -90.0715, city: 'New Orleans', country: 'US' },
    genre: ['Funk', 'R&B'],
    title: 'The Meters pioneer New Orleans funk',
    description: 'The Meters — Art Neville, Leo Nocentelli, George Porter Jr., and Zigaboo Modeliste — release their debut single "Sophisticated Cissy" and self-titled album, pioneering a stripped-down, syncopated funk sound rooted in New Orleans second line rhythms. Their innovative approach to rhythm and groove becomes the blueprint for New Orleans funk and influences generations of musicians from the Neville Brothers to Galactic.',
    tags: ['the meters', 'art neville', 'second line', 'new orleans funk', 'zigaboo', 'george porter', 'syncopation', 'groove'],
  },

  // WASHINGTON (2nd event)
  {
    id: 'evt-subpop-seattle-1988',
    year: 1988,
    location: { lat: 47.6062, lng: -122.3321, city: 'Seattle', country: 'US' },
    genre: ['Grunge', 'Alternative Rock'],
    title: 'Sub Pop Records launches the grunge movement',
    description: 'Bruce Pavitt and Jonathan Poneman found Sub Pop Records, releasing the landmark "Sub Pop 200" compilation and early singles by Mudhoney, Soundgarden, and Nirvana that define the Seattle grunge sound. The label\'s cultivation of a regional identity and the iconic Sub Pop Singles Club attract international attention from the British music press, creating the infrastructure for grunge\'s global breakthrough.',
    tags: ['sub pop', 'bruce pavitt', 'mudhoney', 'grunge', 'seattle sound', 'indie label', 'pacific northwest', 'alternative'],
  },

  // MINNESOTA (2nd event)
  {
    id: 'evt-rhymesayers-minneapolis-2002',
    year: 2002,
    location: { lat: 44.9778, lng: -93.265, city: 'Minneapolis', country: 'US' },
    genre: ['Hip Hop', 'Indie Hip Hop'],
    title: 'Atmosphere and Rhymesayers establish indie hip hop capital',
    description: 'Atmosphere, the duo of rapper Slug and producer Ant, release "God Loves Ugly" through their Rhymesayers Entertainment label, cementing Minneapolis as the epicenter of independent hip hop. The album debuts on the Billboard 200 without major label backing, while Rhymesayers grows into a collective including Brother Ali, Eyedea & Abilities, and Blueprint, fostering a distinctly Midwestern hip hop identity rooted in confessional lyricism.',
    tags: ['atmosphere', 'rhymesayers', 'slug', 'indie hip hop', 'underground rap', 'midwest', 'brother ali', 'eyedea'],
  },

  // FLORIDA (2nd event — Tampa)
  {
    id: 'evt-deathmetal-tampa-1990',
    year: 1990,
    location: { lat: 27.9506, lng: -82.4572, city: 'Tampa', country: 'US' },
    genre: ['Death Metal', 'Extreme Metal'],
    title: 'Tampa Bay death metal dominates extreme music',
    description: 'Tampa Bay becomes the undisputed global capital of death metal, with Morbid Angel\'s "Altars of Madness," Death\'s "Spiritual Healing," and Obituary\'s "Cause of Death" all recorded at Morrisound Recording with producer Scott Burns. The convergence of these bands alongside Deicide, Cannibal Corpse, and Atheist creates an unprecedented concentration of extreme metal talent, making Morrisound synonymous with the genre\'s signature production sound.',
    tags: ['death metal', 'morbid angel', 'obituary', 'morrisound', 'scott burns', 'death', 'florida metal', 'extreme metal'],
  },

  // PENNSYLVANIA (2nd event — Pittsburgh)
  {
    id: 'evt-hiphop-pittsburgh-2010',
    year: 2010,
    location: { lat: 40.4406, lng: -79.9959, city: 'Pittsburgh', country: 'US' },
    genre: ['Hip Hop', 'Pop Rap'],
    title: 'Mac Miller and Wiz Khalifa launch Pittsburgh hip hop',
    description: 'Wiz Khalifa\'s mixtape "Kush & Orange Juice" becomes one of the most downloaded mixtapes in history while eighteen-year-old Mac Miller\'s "K.I.D.S." explodes online, together putting Pittsburgh hip hop on the national map. Wiz Khalifa\'s "Black and Yellow," an anthem for the city\'s sports teams, reaches number one on the Billboard Hot 100, while Mac Miller becomes the first independently distributed debut to top the Billboard 200.',
    tags: ['mac miller', 'wiz khalifa', 'pittsburgh rap', 'black and yellow', 'mixtape', 'id labs', 'indie rap', 'rust belt'],
  },

  // OHIO (2nd event)
  {
    id: 'evt-halloffame-cleveland-1986',
    year: 1986,
    location: { lat: 41.4993, lng: -81.6944, city: 'Cleveland', country: 'US' },
    genre: ['Rock and Roll'],
    title: 'Rock and Roll Hall of Fame established in Cleveland',
    description: 'Cleveland is selected as the permanent home of the Rock and Roll Hall of Fame, honoring the city where DJ Alan Freed coined the term "rock and roll" in the early 1950s. The inaugural induction ceremony honors charter members including Chuck Berry, James Brown, Ray Charles, and Elvis Presley. The I.M. Pei-designed museum on the shores of Lake Erie opens in 1995, permanently enshrining Cleveland\'s role in rock history.',
    tags: ['rock and roll', 'hall of fame', 'alan freed', 'museum', 'im pei', 'lake erie', 'music history', 'heritage'],
  },

  // MASSACHUSETTS (2nd event)
  {
    id: 'evt-boston-boston-1976',
    year: 1976,
    location: { lat: 42.3601, lng: -71.0589, city: 'Boston', country: 'US' },
    genre: ['Classic Rock', 'New Wave'],
    title: 'Boston and The Cars emerge from the scene',
    description: 'Tom Scholz\'s band Boston releases their self-titled debut album, largely recorded in Scholz\'s basement studio in nearby Watertown — it becomes the best-selling debut album in history at the time with over 17 million copies sold, driven by anthems like "More Than a Feeling." Meanwhile, the Kenmore Square club scene nurtures The Cars, whose blend of new wave hooks and rock guitar yields their own massively successful 1978 debut.',
    tags: ['boston band', 'tom scholz', 'the cars', 'more than a feeling', 'debut album', 'kenmore square', 'arena rock', 'new wave'],
  },

  // OREGON (2nd event)
  {
    id: 'evt-killrockstars-portland-1991',
    year: 1991,
    location: { lat: 45.5152, lng: -122.6784, city: 'Portland', country: 'US' },
    genre: ['Indie Rock', 'Punk'],
    title: 'Kill Rock Stars and Elliott Smith emerge from Portland',
    description: 'Kill Rock Stars is founded by Slim Moon, becoming a vital platform for Pacific Northwest punk, riot grrrl, and indie rock, releasing early recordings by Bikini Kill, Sleater-Kinney, and Elliott Smith. Smith, playing in the punk band Heatmiser, begins developing the intimate, whisper-quiet songwriting style that will earn him an Academy Award nomination. Portland\'s DIY venues and zine culture create a fiercely anti-corporate music ecosystem.',
    tags: ['kill rock stars', 'elliott smith', 'riot grrrl', 'heatmiser', 'sleater-kinney', 'diy', 'punk', 'pacific northwest'],
  },

  // MARYLAND (2nd event)
  {
    id: 'evt-whamcity-baltimore-2007',
    year: 2007,
    location: { lat: 39.2904, lng: -76.6122, city: 'Baltimore', country: 'US' },
    genre: ['Noise', 'Experimental', 'Electronic'],
    title: 'Dan Deacon and the Wham City art-noise collective',
    description: 'Dan Deacon\'s release of "Spiderman of the Rings" and the Wham City arts collective transform Baltimore into one of America\'s most exciting experimental music cities. Wham City, a warehouse space housing musicians, filmmakers, and artists including Future Islands, Ed Schrader\'s Music Beat, and video artist Jimmy Joe Roche, hosts chaotic all-ages shows breaking down the barrier between performer and audience.',
    tags: ['dan deacon', 'wham city', 'future islands', 'noise', 'experimental', 'warehouse', 'art collective', 'diy'],
  },

  // MISSISSIPPI (2 events — Jackson)
  {
    id: 'evt-gospel-jackson-1965',
    year: 1965,
    location: { lat: 32.2988, lng: -90.1848, city: 'Jackson', country: 'US' },
    genre: ['Gospel', 'Sacred Music'],
    title: 'Mississippi gospel choir tradition thrives in Jackson',
    description: 'Jackson becomes a spiritual and musical nexus for Mississippi\'s gospel choir tradition, with Jackson State College\'s choir program training generations of singers who carry the state\'s sacred music heritage into the civil rights movement and beyond. The city\'s Black churches, including congregations in the historic Farish Street district, serve as sanctuaries where quartet singing and mass choir arrangements evolve alongside the freedom songs of the movement.',
    tags: ['gospel', 'choir', 'jackson state', 'civil rights', 'sacred music', 'farish street', 'mississippi', 'freedom songs'],
  },
  {
    id: 'evt-blues-jackson-1930',
    year: 1930,
    location: { lat: 32.2988, lng: -90.1848, city: 'Jackson', country: 'US' },
    genre: ['Blues', 'Country Blues'],
    title: 'Jackson becomes a recording hub for Mississippi blues',
    description: 'Record labels set up temporary recording studios in Jackson to capture the wealth of blues talent across Mississippi, recording artists like Tommy Johnson, Ishman Bracey, and the Mississippi Sheiks. Jackson\'s Farish Street district becomes the commercial and cultural heart of Black Mississippi, where juke joints and theaters host traveling blues musicians from the Delta. These recordings preserve the raw, acoustic blues tradition that will influence American music for the next century.',
    tags: ['blues', 'tommy johnson', 'mississippi sheiks', 'farish street', 'field recordings', 'juke joints', 'delta blues', 'jackson'],
  },

  // DISTRICT OF COLUMBIA (2nd event)
  {
    id: 'evt-minorthreat-washingtondc-1981',
    year: 1981,
    location: { lat: 38.9072, lng: -77.0369, city: 'Washington D.C.', country: 'US' },
    genre: ['Hardcore Punk', 'Punk'],
    title: 'Minor Threat launches D.C. hardcore punk',
    description: 'Ian MacKaye and Minor Threat release their debut EP on MacKaye\'s Dischord Records, establishing both the D.C. hardcore punk sound and the straight edge movement that influences punk subculture worldwide. Dischord, operated on a strict no-profit policy, becomes the model for ethical independent music and goes on to release over 150 records by D.C.-area bands including Fugazi, Rites of Spring, and Government Issue.',
    tags: ['minor threat', 'dischord', 'ian mackaye', 'straight edge', 'dc hardcore', 'punk', 'fugazi', 'diy'],
  },

  // ALABAMA (2 events)
  {
    id: 'evt-sunra-birmingham-1914',
    year: 1914,
    location: { lat: 33.5186, lng: -86.8104, city: 'Birmingham', country: 'US' },
    genre: ['Jazz', 'Avant-Garde Jazz', 'Free Jazz'],
    title: 'Sun Ra born in Birmingham, future cosmic jazz pioneer',
    description: 'Herman Poole Blount, later known as Sun Ra, is born in Birmingham, Alabama. He will become one of the most visionary and prolific composers in jazz history, pioneering Afrofuturism and cosmic philosophy through his Arkestra. His early years absorbing Birmingham\'s rich gospel and blues culture lay the foundation for decades of boundary-dissolving work.',
    tags: ['sun ra', 'cosmic jazz', 'afrofuturism', 'avant-garde', 'arkestra', 'birmingham', 'free jazz', 'pioneer'],
  },
  {
    id: 'evt-freedomsongs-birmingham-1963',
    year: 1963,
    location: { lat: 33.5186, lng: -86.8104, city: 'Birmingham', country: 'US' },
    genre: ['Gospel', 'Folk', 'Protest Music'],
    title: 'Freedom songs galvanize the Birmingham civil rights movement',
    description: 'The 16th Street Baptist Church in Birmingham becomes a central gathering point for civil rights activists, where freedom songs like "We Shall Overcome" and "Ain\'t Gonna Let Nobody Turn Me Around" galvanize the movement. These spirituals and hymns, adapted into anthems of resistance, soundtrack the Birmingham Campaign led by Dr. Martin Luther King Jr. The tragic bombing of the church that September only deepens the resolve carried in those songs.',
    tags: ['civil rights', 'freedom songs', 'gospel', 'protest', '16th street baptist', 'birmingham', 'we shall overcome', 'mlk'],
  },

  // ALASKA (2 events)
  {
    id: 'evt-folkfestival-anchorage-1980',
    year: 1980,
    location: { lat: 61.2181, lng: -149.9003, city: 'Anchorage', country: 'US' },
    genre: ['Folk', 'Acoustic', 'Traditional'],
    title: 'Alaska Folk Festival tradition takes root',
    description: 'The Alaska Folk Festival establishes a lasting tradition of communal acoustic music-making that reflects the state\'s frontier spirit and diverse settler cultures. The festival brings together fiddlers, singer-songwriters, and traditional musicians from remote communities across the vast state, becoming a vital cultural gathering that preserves and evolves folk traditions in America\'s last frontier.',
    tags: ['folk festival', 'frontier folk', 'acoustic', 'alaska', 'traditional music', 'community', 'anchorage', 'fiddlers'],
  },
  {
    id: 'evt-pamyua-anchorage-2010',
    year: 2010,
    location: { lat: 61.2181, lng: -149.9003, city: 'Anchorage', country: 'US' },
    genre: ['World Music', 'Indigenous', 'Tribal Funk'],
    title: 'Pamyua brings Yup\'ik music to wider audiences',
    description: 'The Anchorage-based group Pamyua becomes one of the most prominent voices in contemporary Indigenous music, blending traditional Yup\'ik and Inuit vocal styles with funk, R&B, and pop. Their energetic performances and albums bring throat singing, drum songs, and Native Alaskan storytelling traditions to national and international audiences, demonstrating that Indigenous music thrives as a living, evolving art form.',
    tags: ['pamyua', 'yupik', 'indigenous music', 'throat singing', 'tribal funk', 'native alaskan', 'anchorage', 'inuit'],
  },

  // ARIZONA (2 events)
  {
    id: 'evt-ginblossoms-phoenix-1993',
    year: 1993,
    location: { lat: 33.4484, lng: -112.074, city: 'Phoenix', country: 'US' },
    genre: ['Alternative Rock', 'Jangle Pop', 'Power Pop'],
    title: 'Gin Blossoms and the Phoenix alt-rock scene',
    description: 'The Gin Blossoms release "New Miserable Experience," a multi-platinum staple of 90s alternative radio that puts the Phoenix music scene on the national map. Songs like "Hey Jealousy" and "Found Out About You" define a jangly, melodic strain of alt-rock rooted in the Tempe bar scene, proving that vital alternative rock could emerge far from the coastal hubs of Seattle and New York.',
    tags: ['gin blossoms', 'hey jealousy', 'tempe', 'jangle pop', 'alternative rock', '90s', 'phoenix', 'power pop'],
  },
  {
    id: 'evt-jimmyeatworld-phoenix-2001',
    year: 2001,
    location: { lat: 33.4484, lng: -112.074, city: 'Phoenix', country: 'US' },
    genre: ['Emo', 'Alternative Rock', 'Pop Punk'],
    title: 'Jimmy Eat World\'s "Bleed American" puts Phoenix on the emo map',
    description: 'Mesa-based Jimmy Eat World release "Bleed American," featuring the iconic single "The Middle," which becomes an era-defining anthem of early 2000s emo and alternative rock. The album achieves platinum status and helps bring the emotional, melodic punk sound from the Phoenix suburbs into the mainstream, making the Mesa/Phoenix area a recognized hub for heartfelt guitar-driven rock.',
    tags: ['jimmy eat world', 'the middle', 'bleed american', 'emo', 'mesa', 'phoenix', 'pop punk', 'alternative'],
  },

  // ARKANSAS (2 events)
  {
    id: 'evt-rosettatharpe-littlerock-1950',
    year: 1950,
    location: { lat: 34.7465, lng: -92.2896, city: 'Little Rock', country: 'US' },
    genre: ['Gospel', 'Rock and Roll', 'R&B'],
    title: 'Sister Rosetta Tharpe\'s Arkansas roots shape rock and roll',
    description: 'Born in Cotton Plant, Arkansas, Sister Rosetta Tharpe establishes herself as one of the most electrifying performers in American music, wielding her distorted electric guitar in ways that directly presage rock and roll. Her fusion of sanctified gospel vocals with aggressive, rhythmic guitar playing influences Chuck Berry, Little Richard, and Elvis Presley. Tharpe\'s Arkansas roots and revolutionary approach earn her recognition as the godmother of rock and roll.',
    tags: ['sister rosetta tharpe', 'gospel', 'rock and roll origins', 'electric guitar', 'cotton plant', 'arkansas', 'godmother of rock', 'pioneer'],
  },
  {
    id: 'evt-rockabilly-littlerock-1955',
    year: 1955,
    location: { lat: 34.7465, lng: -92.2896, city: 'Little Rock', country: 'US' },
    genre: ['Rockabilly', 'Country', 'Rock and Roll'],
    title: 'Arkansas rockabilly erupts in the Sun Records orbit',
    description: 'Arkansas becomes a fertile breeding ground for rockabilly, with musicians from across the state drawn to the sound emanating from Sam Phillips\' Sun Records just across the river in Memphis. Artists like Sonny Burgess from Newport and Ronnie Hawkins from Huntsville bring a raw, energetic fusion of country, blues, and rhythm that defines the rockabilly explosion. Little Rock\'s proximity to Memphis makes it a key waypoint in the circuit that launches rock and roll.',
    tags: ['rockabilly', 'sun records', 'sonny burgess', 'ronnie hawkins', 'arkansas', 'rock and roll', 'little rock', '1950s'],
  },

  // COLORADO (2 events)
  {
    id: 'evt-redrocks-denver-1971',
    year: 1971,
    location: { lat: 39.7392, lng: -104.9903, city: 'Denver', country: 'US' },
    genre: ['Rock', 'Folk Rock'],
    title: 'Red Rocks Amphitheatre becomes a legendary concert venue',
    description: 'Red Rocks Amphitheatre near Denver cements its status as one of the most spectacular and acoustically remarkable concert venues in the world, hosting landmark performances that draw artists and fans from across the globe. Its naturally formed sandstone acoustics and dramatic geological setting make every show an unforgettable experience. Jimi Hendrix\'s 1968 performance and the steady stream of major acts through the 1970s establish Red Rocks as a pilgrimage site for live music.',
    tags: ['red rocks', 'amphitheatre', 'live music', 'concert venue', 'denver', 'colorado', 'natural acoustics', 'legendary venue'],
  },
  {
    id: 'evt-thefray-denver-2005',
    year: 2005,
    location: { lat: 39.7392, lng: -104.9903, city: 'Denver', country: 'US' },
    genre: ['Indie Rock', 'Alternative Rock', 'Indie Pop'],
    title: 'The Fray and DeVotchKa emerge from Denver\'s indie scene',
    description: 'Denver\'s indie music scene gains national recognition as The Fray\'s debut album "How to Save a Life" becomes a massive crossover hit, while DeVotchKa\'s cinematic, genre-defying sound earns critical acclaim through the "Little Miss Sunshine" soundtrack. Together they represent the breadth of Denver\'s creative community, from piano-driven pop rock to gypsy-punk orchestral indie, demonstrating that Denver has cultivated a thriving independent music ecosystem.',
    tags: ['the fray', 'devotchka', 'how to save a life', 'little miss sunshine', 'indie rock', 'denver', 'colorado', 'indie scene'],
  },

  // CONNECTICUT (2 events)
  {
    id: 'evt-hardcore-hartford-1984',
    year: 1984,
    location: { lat: 41.7658, lng: -72.6734, city: 'Hartford', country: 'US' },
    genre: ['Hardcore Punk', 'Punk Rock'],
    title: 'New England hardcore punk scene thrives in Connecticut',
    description: 'Connecticut becomes an integral part of the New England hardcore punk explosion, with venues in Hartford and surrounding cities hosting blistering shows that connect the Boston and New York scenes. Bands thrive in a tight-knit DIY network of house shows, VFW halls, and all-ages clubs that define the regional hardcore ethos. The Connecticut corridor serves as both a geographic and sonic bridge, fostering a distinctly aggressive strain of American punk.',
    tags: ['hardcore punk', 'new england', 'diy', 'punk', 'connecticut', 'hartford', 'all ages', 'underground'],
  },
  {
    id: 'evt-hatebreed-hartford-2000',
    year: 2000,
    location: { lat: 41.7658, lng: -72.6734, city: 'Hartford', country: 'US' },
    genre: ['Metalcore', 'Hardcore', 'Heavy Metal'],
    title: 'Hatebreed launches metalcore from Connecticut',
    description: 'Hatebreed rises from the Bridgeport/New Haven hardcore scene to become one of the most influential metalcore bands in the world, with "Satisfaction Is the Death of Desire" and "Perseverance" defining the genre\'s brutal, motivational intensity. Their fusion of hardcore punk aggression with thrash metal riffing creates a template that countless bands follow. Connecticut\'s hardcore infrastructure, built over two decades of DIY shows, produces a genre-defining force.',
    tags: ['hatebreed', 'metalcore', 'hardcore', 'connecticut', 'bridgeport', 'perseverance', 'thrash', 'heavy music'],
  },

  // DELAWARE (2 events)
  {
    id: 'evt-bobmarley-wilmington-1965',
    year: 1965,
    location: { lat: 39.7391, lng: -75.5398, city: 'Wilmington', country: 'US' },
    genre: ['R&B', 'Ska', 'Soul'],
    title: 'Bob Marley lives in Wilmington, absorbs American R&B',
    description: 'A young Bob Marley lives in Wilmington, Delaware, working at a Chrysler plant and a DuPont hotel while immersing himself in the American rhythm and blues pouring from radio stations and local venues. During this formative period, he absorbs the sounds of Curtis Mayfield, the Impressions, and Motown — influences that profoundly shape his songwriting and vocal style. This often-overlooked Delaware chapter is crucial in forging the sound that becomes reggae.',
    tags: ['bob marley', 'wilmington', 'rhythm and blues', 'reggae origins', 'delaware', 'motown', 'ska', 'formative years'],
  },
  {
    id: 'evt-diypunk-wilmington-1993',
    year: 1993,
    location: { lat: 39.7391, lng: -75.5398, city: 'Wilmington', country: 'US' },
    genre: ['Punk Rock', 'Indie Rock'],
    title: 'Wilmington\'s punk and DIY scene bridges Philly and Baltimore',
    description: 'Wilmington develops a scrappy but vital punk and DIY scene that draws energy from its position between the larger Philadelphia and Baltimore music communities. House shows, basement venues, and independent record stores create an underground network where touring bands regularly stop and local acts hone their craft. This corridor scene embodies the 1990s DIY ethos, proving that even smaller cities can sustain vibrant, self-organized music cultures.',
    tags: ['punk', 'diy', 'wilmington', 'delaware', 'house shows', 'underground', 'indie', 'mid-atlantic'],
  },

  // HAWAII (2 events)
  {
    id: 'evt-steelguitar-honolulu-1927',
    year: 1927,
    location: { lat: 21.3069, lng: -157.8583, city: 'Honolulu', country: 'US' },
    genre: ['Hawaiian', 'Traditional', 'Slack-Key Guitar'],
    title: 'Hawaiian steel guitar and slack-key revolution',
    description: 'Hawaiian steel guitar and slack-key guitar traditions revolutionize global popular music, with Honolulu as the epicenter of a sound that captivates audiences worldwide. The Hawaiian steel guitar, played horizontally with a metal slide, influences mainland American country, blues, and popular music, becoming one of the most significant instrumental innovations of the 20th century. Slack-key guitar, or ki ho\'alu, preserves deeper Indigenous Hawaiian musical traditions passed down through families for generations.',
    tags: ['steel guitar', 'slack-key', 'hawaiian music', 'ki hoalu', 'honolulu', 'hawaii', 'traditional', 'slide guitar'],
  },
  {
    id: 'evt-iz-honolulu-1993',
    year: 1993,
    location: { lat: 21.3069, lng: -157.8583, city: 'Honolulu', country: 'US' },
    genre: ['Hawaiian', 'Folk', 'World Music'],
    title: 'Israel Kamakawiwo\'ole records "Over the Rainbow" medley',
    description: 'Israel Kamakawiwo\'ole records his iconic ukulele medley of "Over the Rainbow" and "What a Wonderful World" in a single take at a Honolulu studio — a recording that becomes one of the most beloved songs in the world. Known as IZ, the gentle giant\'s tender voice and simple ukulele arrangement transcend cultural boundaries and introduce millions to Hawaiian music. The track has since been streamed billions of times.',
    tags: ['israel kamakawiwoole', 'iz', 'over the rainbow', 'ukulele', 'honolulu', 'hawaiian music', 'wonderful world', 'iconic'],
  },

  // IDAHO (2 events)
  {
    id: 'evt-builttospill-boise-1992',
    year: 1992,
    location: { lat: 43.615, lng: -116.2023, city: 'Boise', country: 'US' },
    genre: ['Indie Rock', 'Alternative Rock'],
    title: 'Built to Spill forms in Boise',
    description: 'Doug Martsch forms Built to Spill in Boise, Idaho, launching one of the most critically revered indie rock bands of the decade. Their sprawling, guitar-driven sound and literary songwriting, showcased on albums like "There\'s Nothing Wrong with Love" and "Perfect from Now On," make them standard-bearers for 90s independent rock. By choosing to remain in Boise rather than relocate, they prove that great art can thrive far from the industry\'s centers.',
    tags: ['built to spill', 'doug martsch', 'indie rock', 'boise', 'idaho', '90s indie', 'guitar rock', 'lo-fi'],
  },
  {
    id: 'evt-treefort-boise-2015',
    year: 2015,
    location: { lat: 43.615, lng: -116.2023, city: 'Boise', country: 'US' },
    genre: ['Indie Rock', 'Indie Pop', 'Experimental'],
    title: 'Treefort Music Fest puts Boise on the indie map',
    description: 'The Treefort Music Fest grows into one of America\'s most exciting independent music festivals, drawing hundreds of artists and thousands of attendees to downtown Boise each March. Founded in 2012, the festival celebrates the city\'s burgeoning creative community while attracting national and international acts across genres, transforming Boise\'s reputation from quiet northwestern city to a genuine destination for indie music.',
    tags: ['treefort', 'music festival', 'boise', 'indie', 'idaho', 'independent music', 'festival', 'emerging scene'],
  },

  // INDIANA (2 events)
  {
    id: 'evt-wesmontgomery-indianapolis-1955',
    year: 1955,
    location: { lat: 39.7684, lng: -86.1581, city: 'Indianapolis', country: 'US' },
    genre: ['Jazz', 'Bebop'],
    title: 'Wes Montgomery revolutionizes jazz guitar on Indiana Avenue',
    description: 'Wes Montgomery becomes the talk of Indianapolis\'s vibrant Indiana Avenue jazz corridor, developing his revolutionary thumb-picking technique and octave-doubling style that transforms jazz guitar forever. The self-taught guitarist hones his craft in clubs along Indiana Avenue, the heart of the city\'s African American cultural district, often playing sets after finishing shifts at a local factory. His innovative approach influences virtually every jazz guitarist who follows.',
    tags: ['wes montgomery', 'jazz guitar', 'indiana avenue', 'indianapolis', 'bebop', 'thumb picking', 'octaves', 'self-taught'],
  },
  {
    id: 'evt-mellencamp-indianapolis-1982',
    year: 1982,
    location: { lat: 39.7684, lng: -86.1581, city: 'Indianapolis', country: 'US' },
    genre: ['Heartland Rock', 'Rock', 'Americana'],
    title: 'John Mellencamp\'s "American Fool" defines heartland rock',
    description: 'Seymour, Indiana\'s John Mellencamp releases "American Fool," featuring the anthems "Jack & Diane" and "Hurts So Good," which propels the album to number one and defines the heartland rock genre. His plainspoken lyrics about small-town life, blue-collar struggles, and Midwestern identity resonate deeply with a national audience and establish Indiana as the spiritual home of heartland rock.',
    tags: ['john mellencamp', 'heartland rock', 'american fool', 'jack and diane', 'indiana', 'midwest rock', 'americana', 'blue collar'],
  },

  // IOWA (2 events)
  {
    id: 'evt-slipknot-desmoines-1999',
    year: 1999,
    location: { lat: 41.5868, lng: -93.625, city: 'Des Moines', country: 'US' },
    genre: ['Nu-Metal', 'Heavy Metal'],
    title: 'Slipknot emerges from Des Moines',
    description: 'Slipknot releases their self-titled debut album, bringing unprecedented national attention to Des Moines as a breeding ground for extreme music. The nine-member masked band had spent years developing their chaotic live show in local venues before signing to Roadrunner Records. Their explosive rise proves that groundbreaking heavy music can emerge from anywhere, putting Iowa firmly on the metal map.',
    tags: ['slipknot', 'nu-metal', 'des moines', 'heavy metal', 'masks', 'roadrunner records', 'iowa', 'extreme music'],
  },
  {
    id: 'evt-8035fest-desmoines-2008',
    year: 2008,
    location: { lat: 41.5868, lng: -93.625, city: 'Des Moines', country: 'US' },
    genre: ['Indie Rock', 'Alternative'],
    title: '80/35 Music Festival launches in Des Moines',
    description: 'The 80/35 Music Festival debuts in downtown Des Moines, named after the intersection of Interstates 80 and 35 that cross through the city. The festival brings nationally recognized indie and alternative acts to Western Gateway Park, establishing Des Moines as a legitimate destination for touring musicians and quickly becoming one of the Midwest\'s most respected mid-size music festivals.',
    tags: ['80/35', 'music festival', 'des moines', 'indie rock', 'western gateway park', 'midwest', 'iowa', 'festival'],
  },

  // KANSAS (2 events)
  {
    id: 'evt-jazztouring-wichita-1936',
    year: 1936,
    location: { lat: 37.6872, lng: -97.3301, city: 'Wichita', country: 'US' },
    genre: ['Jazz', 'Swing'],
    title: 'Kansas City jazz touring influence reaches Wichita',
    description: 'The explosive Kansas City jazz scene radiates outward across the Great Plains, with touring bands bringing the hard-swinging, blues-drenched sound to ballrooms and dance halls in Wichita. Musicians from the Bennie Moten and Count Basie orbits perform regularly in Wichita venues, nurturing a local appreciation for improvisation and big band music across Kansas beyond its Kansas City epicenter.',
    tags: ['jazz', 'swing', 'kansas city influence', 'touring', 'big band', 'wichita', 'great plains', 'count basie'],
  },
  {
    id: 'evt-embarrassment-wichita-1983',
    year: 1983,
    location: { lat: 37.6872, lng: -97.3301, city: 'Wichita', country: 'US' },
    genre: ['Post-Punk', 'New Wave'],
    title: 'The Embarrassment pioneers Wichita post-punk',
    description: 'The Embarrassment, rooted in the Wichita area, becomes one of the most critically acclaimed post-punk bands of the early 1980s despite operating far from coastal music industry centers. Their jittery, angular guitar work and sardonic lyrics earn praise from critics and influence the college rock movement that follows, demonstrating that vital, forward-thinking music can thrive in the geographic heart of America.',
    tags: ['the embarrassment', 'post-punk', 'new wave', 'wichita', 'college rock', 'diy', 'kansas', 'angular guitar'],
  },

  // KENTUCKY (2 events)
  {
    id: 'evt-slint-louisville-1991',
    year: 1991,
    location: { lat: 38.2527, lng: -85.7585, city: 'Louisville', country: 'US' },
    genre: ['Post-Rock', 'Math Rock'],
    title: 'Slint releases "Spiderland" and invents post-rock',
    description: 'Slint\'s album "Spiderland," recorded at River North Studios in Louisville, becomes one of the most influential albums of the decade, widely credited with inventing post-rock. Its whispered vocals, dynamic shifts between quiet tension and explosive catharsis, and unconventional song structures provide a blueprint that bands follow for decades. Though the band dissolves shortly after its release, the album\'s legend grows steadily.',
    tags: ['slint', 'spiderland', 'post-rock', 'math rock', 'louisville', 'experimental', 'influential album', 'kentucky'],
  },
  {
    id: 'evt-mmj-louisville-2003',
    year: 2003,
    location: { lat: 38.2527, lng: -85.7585, city: 'Louisville', country: 'US' },
    genre: ['Indie Rock', 'Southern Rock', 'Alternative'],
    title: 'My Morning Jacket\'s "It Still Moves" elevates Louisville indie',
    description: 'My Morning Jacket releases "It Still Moves," a sprawling album of reverb-drenched Southern psychedelia that earns the Louisville band widespread critical acclaim and a devoted national following. Jim James\'s soaring vocals and the band\'s ambitious arrangements draw comparisons to classic rock while remaining firmly rooted in indie sensibility, solidifying Louisville\'s reputation as a city capable of producing music that transcends genre boundaries.',
    tags: ['my morning jacket', 'it still moves', 'jim james', 'louisville', 'indie rock', 'southern rock', 'psychedelia', 'kentucky'],
  },

  // MAINE (2 events)
  {
    id: 'evt-folktradition-portland-2000',
    year: 2000,
    location: { lat: 43.6591, lng: -70.2568, city: 'Portland', country: 'US' },
    genre: ['Folk', 'Singer-Songwriter'],
    title: 'Maine folk and singer-songwriter tradition flourishes in Portland',
    description: 'Portland, Maine cultivates a deeply rooted folk and singer-songwriter scene nurtured by intimate venues, coffeehouses, and a strong connection to New England storytelling traditions. Artists draw on the state\'s rugged coastal landscape and seasonal rhythms to craft introspective, literary music that resonates with audiences seeking authenticity. The city\'s small but passionate community creates a sustainable ecosystem for acoustic and folk music.',
    tags: ['folk', 'singer-songwriter', 'portland maine', 'acoustic', 'coffeehouse', 'new england', 'storytelling', 'maine'],
  },
  {
    id: 'evt-portlandmusic-portland-2012',
    year: 2012,
    location: { lat: 43.6591, lng: -70.2568, city: 'Portland', country: 'US' },
    genre: ['Indie Rock', 'Indie Pop'],
    title: 'Portland, Maine indie scene reaches critical mass',
    description: 'Portland, Maine\'s indie music scene reaches a critical mass, with organizations working to sustain and grow the local music economy. The city\'s affordable rents compared to other East Coast cities attract a wave of young musicians, and venues like SPACE Gallery and Port City Music Hall become vital hubs for emerging artists. Portland earns recognition as one of the most vibrant small-city music scenes in the northeastern United States.',
    tags: ['indie rock', 'portland maine', 'space gallery', 'indie scene', 'small venue', 'northeast', 'emerging artists', 'maine'],
  },

  // MONTANA (2 events)
  {
    id: 'evt-folkamericana-missoula-1999',
    year: 1999,
    location: { lat: 46.8721, lng: -113.994, city: 'Missoula', country: 'US' },
    genre: ['Folk', 'Americana', 'Singer-Songwriter'],
    title: 'Missoula\'s folk and Americana scene blossoms',
    description: 'Missoula establishes itself as an unlikely but vital outpost for folk and Americana music, its university-town culture and stunning mountain setting attracting songwriters drawn to wide-open spaces and literary community. Venues like the Top Hat and the Union Club host a steady stream of regional and touring singer-songwriters, giving Missoula a narrative depth uncommon in towns its size.',
    tags: ['folk', 'americana', 'singer-songwriter', 'missoula', 'montana', 'university town', 'mountain west', 'top hat'],
  },
  {
    id: 'evt-wilma-missoula-2014',
    year: 2014,
    location: { lat: 46.8721, lng: -113.994, city: 'Missoula', country: 'US' },
    genre: ['Indie Rock', 'Folk', 'Americana'],
    title: 'The Wilma Theater anchors Missoula as a touring destination',
    description: 'The historic Wilma Theater in downtown Missoula is revitalized as a premier live music venue, becoming a critical stop on the Pacific Northwest touring circuit connecting Portland, Boise, and cities across Montana. Its 1,400-seat capacity and excellent acoustics make it an ideal midpoint for national acts crossing the northern Rockies, helping establish Missoula as a genuine cultural waypoint in the American West.',
    tags: ['wilma theater', 'live venue', 'missoula', 'touring circuit', 'pacific northwest', 'historic venue', 'montana', 'concert hall'],
  },

  // NEBRASKA (2 events)
  {
    id: 'evt-saddlecreek-omaha-1996',
    year: 1996,
    location: { lat: 41.2565, lng: -95.9345, city: 'Omaha', country: 'US' },
    genre: ['Indie Rock', 'Emo', 'Singer-Songwriter'],
    title: 'Saddle Creek Records founded in Omaha',
    description: 'Conor Oberst and friends found what becomes Saddle Creek Records, creating an independent label that transforms Omaha into one of America\'s most important indie rock cities. The label grows to house artists like Bright Eyes, Cursive, The Faint, and Rilo Kiley, fostering a tight-knit community of musicians who frequently collaborate across projects. Saddle Creek proves that a fiercely independent, artist-driven label can thrive far from the traditional music industry centers.',
    tags: ['saddle creek', 'conor oberst', 'indie label', 'omaha', 'diy', 'indie rock', 'nebraska', 'cursive'],
  },
  {
    id: 'evt-brighteyes-omaha-2005',
    year: 2005,
    location: { lat: 41.2565, lng: -95.9345, city: 'Omaha', country: 'US' },
    genre: ['Indie Rock', 'Folk Rock', 'Singer-Songwriter'],
    title: 'Bright Eyes releases "I\'m Wide Awake, It\'s Morning"',
    description: 'Bright Eyes releases "I\'m Wide Awake, It\'s Morning," a folk-inflected masterpiece that debuts at number ten on the Billboard 200 and becomes a defining album of mid-2000s indie rock. Conor Oberst\'s raw, confessional songwriting and the album\'s lush country-folk arrangements bring Omaha\'s Saddle Creek scene to its commercial and artistic peak, resonating powerfully in the post-9/11 cultural landscape.',
    tags: ['bright eyes', 'conor oberst', 'wide awake', 'saddle creek', 'folk rock', 'omaha', 'indie rock', 'nebraska'],
  },

  // NEVADA (2 events)
  {
    id: 'evt-ratpack-lasvegas-1960',
    year: 1960,
    location: { lat: 36.1699, lng: -115.1398, city: 'Las Vegas', country: 'US' },
    genre: ['Vocal Jazz', 'Swing', 'Lounge'],
    title: 'The Rat Pack defines Las Vegas entertainment',
    description: 'Frank Sinatra, Dean Martin, Sammy Davis Jr., and the rest of the Rat Pack transform Las Vegas from a desert gambling town into the entertainment capital of the world through their legendary residencies at the Sands Hotel. Their freewheeling, cocktail-fueled performances blend music, comedy, and charisma into a format that defines the Las Vegas showroom experience for generations, establishing the residency template that artists from Elvis to modern pop stars follow.',
    tags: ['rat pack', 'frank sinatra', 'dean martin', 'sammy davis jr', 'sands hotel', 'las vegas', 'lounge', 'residency'],
  },
  {
    id: 'evt-killers-lasvegas-2003',
    year: 2003,
    location: { lat: 36.1699, lng: -115.1398, city: 'Las Vegas', country: 'US' },
    genre: ['Indie Rock', 'New Wave', 'Alternative'],
    title: 'The Killers emerge from Las Vegas',
    description: 'The Killers generate significant industry buzz through electrifying live shows on the Las Vegas club circuit, leading to a deal with Island Records. Their 2004 debut album "Hot Fuss" produces anthems like "Mr. Brightside" and "Somebody Told Me" that become generation-defining hits, shattering the perception that Las Vegas is solely a city of legacy entertainment and proving it can produce vital new rock music.',
    tags: ['the killers', 'mr brightside', 'hot fuss', 'las vegas', 'indie rock', 'new wave', 'island records', 'nevada'],
  },

  // NEW HAMPSHIRE (2 events)
  {
    id: 'evt-hardcore-manchester-1990',
    year: 1990,
    location: { lat: 42.9956, lng: -71.4548, city: 'Manchester', country: 'US' },
    genre: ['Hardcore Punk', 'Punk'],
    title: 'New Hampshire hardcore punk and DIY house shows',
    description: 'Manchester and surrounding New Hampshire towns develop a dedicated hardcore punk scene built around DIY house shows, VFW halls, and all-ages basement venues. Bands circulate through a network of small New England cities, sharing bills and trading demo tapes in an era before the internet connects isolated scenes. The New Hampshire hardcore community embodies the self-sufficient ethos of punk, sustaining itself through sheer dedication.',
    tags: ['hardcore punk', 'diy', 'house shows', 'manchester nh', 'all ages', 'new england', 'basement shows', 'new hampshire'],
  },
  {
    id: 'evt-indiescene-manchester-2010',
    year: 2010,
    location: { lat: 42.9956, lng: -71.4548, city: 'Manchester', country: 'US' },
    genre: ['Indie Rock', 'Indie Pop'],
    title: 'Manchester indie scene and small venue culture',
    description: 'Manchester cultivates a resilient indie music scene anchored by small venues and a community of musicians who choose the city\'s affordability and proximity to Boston over larger markets. The Shaskeen Pub and local venues host a rotating cast of local and regional indie acts, creating a grassroots ecosystem that nurtures emerging talent as New Hampshire\'s largest city draws musicians from across the state.',
    tags: ['indie rock', 'small venues', 'manchester nh', 'grassroots', 'new hampshire', 'indie scene', 'new england', 'diy'],
  },

  // NEW JERSEY (2 events)
  {
    id: 'evt-queenlatifah-newark-1989',
    year: 1989,
    location: { lat: 40.7357, lng: -74.1724, city: 'Newark', country: 'US' },
    genre: ['Hip Hop', 'Rap'],
    title: 'Queen Latifah releases "All Hail the Queen" from Newark',
    description: 'Newark native Dana Owens, known as Queen Latifah, releases her landmark debut album "All Hail the Queen," featuring the feminist anthem "Ladies First." The album helps establish Newark as a vital hub in East Coast hip hop and proves that women can command respect and commercial success in the male-dominated genre. Queen Latifah\'s Afrocentric style and empowering lyrics make her one of the most important voices in hip hop history.',
    tags: ['queen latifah', 'newark', 'ladies first', 'female rapper', 'east coast rap', 'hip hop', 'new jersey', 'afrocentric'],
  },
  {
    id: 'evt-jazzheritage-newark-1967',
    year: 1967,
    location: { lat: 40.7357, lng: -74.1724, city: 'Newark', country: 'US' },
    genre: ['Jazz', 'Bebop'],
    title: 'Newark\'s jazz heritage: Sarah Vaughan and James Moody',
    description: 'Newark cements its reputation as a jazz powerhouse, having produced legendary vocalists and instrumentalists including Sarah Vaughan and saxophonist James Moody. The city\'s vibrant club scene along Halsey Street and surrounding neighborhoods nurtures generations of jazz talent who shape the genre worldwide. Despite the turmoil of 1967, the city\'s jazz community remains a resilient cultural force.',
    tags: ['sarah vaughan', 'james moody', 'newark jazz', 'bebop', 'jazz clubs', 'halsey street', 'new jersey', 'jazz heritage'],
  },

  // NEW MEXICO (2 events)
  {
    id: 'evt-powwow-albuquerque-1970',
    year: 1970,
    location: { lat: 35.0844, lng: -106.6504, city: 'Albuquerque', country: 'US' },
    genre: ['Native American', 'Traditional', 'Powwow'],
    title: 'Native American powwow music traditions thrive in Albuquerque',
    description: 'Albuquerque becomes a central gathering place for Native American powwow music, drawing drum groups and dancers from Pueblo, Navajo, and Apache nations across New Mexico. The Gathering of Nations, rooted in traditions stretching back generations, grows into one of the largest powwow events in North America. Intertribal drumming and singing styles preserved in the region keep ancient musical traditions alive while fostering cultural exchange.',
    tags: ['powwow', 'native american', 'gathering of nations', 'pueblo', 'navajo', 'intertribal', 'drum circles', 'indigenous'],
  },
  {
    id: 'evt-shins-albuquerque-2001',
    year: 2001,
    location: { lat: 35.0844, lng: -106.6504, city: 'Albuquerque', country: 'US' },
    genre: ['Indie Rock', 'Indie Pop'],
    title: 'The Shins form in Albuquerque before national breakthrough',
    description: 'James Mercer forms The Shins in Albuquerque, releasing their debut album "Oh, Inverted World" on Sub Pop Records while still based in New Mexico. The album\'s jangly, melodic indie pop earns a devoted following that explodes after the film "Garden State" features "New Slang" in 2004. The band\'s Albuquerque origins help put the city on the indie rock map before their eventual relocation to Portland.',
    tags: ['the shins', 'sub pop', 'oh inverted world', 'new slang', 'james mercer', 'albuquerque', 'indie pop', 'new mexico'],
  },

  // NORTH CAROLINA (2 events)
  {
    id: 'evt-piedmontblues-charlotte-1940',
    year: 1940,
    location: { lat: 35.2271, lng: -80.8431, city: 'Charlotte', country: 'US' },
    genre: ['Blues', 'Piedmont Blues'],
    title: 'Piedmont blues tradition thrives in the Carolinas',
    description: 'The Piedmont blues tradition, characterized by intricate fingerpicking guitar patterns and a ragtime-influenced rhythmic feel, flourishes across the Carolina Piedmont region including Charlotte. Artists like Blind Boy Fuller carry forward a distinctive East Coast blues style that stands apart from the rawer Delta tradition. Charlotte\'s position along the Piedmont plateau makes it a crossroads for traveling blues musicians moving between the rural South and northern cities.',
    tags: ['piedmont blues', 'fingerpicking', 'carolina blues', 'blind boy fuller', 'ragtime blues', 'acoustic blues', 'charlotte', 'north carolina'],
  },
  {
    id: 'evt-dababy-charlotte-2019',
    year: 2019,
    location: { lat: 35.2271, lng: -80.8431, city: 'Charlotte', country: 'US' },
    genre: ['Hip Hop', 'Rap', 'Trap'],
    title: 'DaBaby emerges from Charlotte\'s hip hop scene',
    description: 'Charlotte rapper DaBaby breaks through with his major label debut "Baby on Baby" and the smash hit "Suge," which reaches number seven on the Billboard Hot 100. His explosive energy, comedic music videos, and relentless work ethic make him one of the most prominent rappers in the country and bring unprecedented national attention to Charlotte\'s hip hop community, demonstrating that Southern scenes outside Atlanta can produce mainstream superstars.',
    tags: ['dababy', 'charlotte rap', 'suge', 'southern hip hop', 'baby on baby', 'trap', 'north carolina', 'billboard'],
  },

  // NORTH DAKOTA (2 events)
  {
    id: 'evt-scandinavianfolk-fargo-1990',
    year: 1990,
    location: { lat: 46.8772, lng: -96.7898, city: 'Fargo', country: 'US' },
    genre: ['Folk', 'Traditional', 'Scandinavian Folk'],
    title: 'Scandinavian-influenced folk music heritage in Fargo',
    description: 'Fargo\'s deep Scandinavian immigrant roots sustain a vibrant folk music tradition featuring hardingfele fiddle tunes, Nordic choral singing, and Scandinavian-American dance music that persists well into the modern era. Cultural organizations keep Norwegian, Swedish, and Finnish musical traditions alive through festivals, workshops, and community gatherings. This Nordic folk heritage gives Fargo a distinctive musical identity unlike anywhere else in the United States.',
    tags: ['scandinavian folk', 'nordic music', 'fiddle', 'norwegian heritage', 'folk tradition', 'fargo', 'north dakota', 'immigrant music'],
  },
  {
    id: 'evt-indierock-fargo-2008',
    year: 2008,
    location: { lat: 46.8772, lng: -96.7898, city: 'Fargo', country: 'US' },
    genre: ['Indie Rock', 'Alternative'],
    title: 'Fargo\'s indie rock scene and community venues',
    description: 'Fargo cultivates a surprisingly robust indie rock scene anchored by DIY venues, college radio, and a tight-knit community of musicians in the Fargo-Moorhead area. Local venues provide stages for area bands while attracting touring indie acts passing through the northern plains, demonstrating that passionate music communities can thrive even in smaller, geographically isolated cities.',
    tags: ['fargo indie', 'diy venues', 'community music', 'college radio', 'northern plains', 'indie rock', 'north dakota', 'fargo-moorhead'],
  },

  // OKLAHOMA (2 events)
  {
    id: 'evt-tulsasound-tulsa-1972',
    year: 1972,
    location: { lat: 36.154, lng: -95.9928, city: 'Tulsa', country: 'US' },
    genre: ['Rock', 'Country Rock', 'Blues Rock'],
    title: 'Leon Russell and JJ Cale define the Tulsa Sound',
    description: 'Leon Russell and JJ Cale establish the Tulsa Sound, a laid-back fusion of rock, blues, country, and swamp boogie that becomes one of the most distinctive regional styles in American music. Russell\'s Shelter Records and his home studio attract musicians from across the country, while Cale\'s understated guitar style on songs like "After Midnight" and "Cocaine" influences Eric Clapton and countless others.',
    tags: ['leon russell', 'jj cale', 'tulsa sound', 'shelter records', 'country rock', 'blues rock', 'oklahoma', 'swamp boogie'],
  },
  {
    id: 'evt-hanson-tulsa-2007',
    year: 2007,
    location: { lat: 36.154, lng: -95.9928, city: 'Tulsa', country: 'US' },
    genre: ['Pop Rock', 'Indie', 'Alternative'],
    title: 'Hanson\'s independent label sparks Tulsa music revival',
    description: 'After leaving their major label, Tulsa brothers Isaac, Taylor, and Zac Hanson found 3CG Records and launch the annual Hop Jam beer and music festival, which becomes a catalyst for revitalizing the city\'s arts district and live music culture. Their commitment to staying in Tulsa helps inspire a new generation of Oklahoma musicians to build careers without relocating to larger markets.',
    tags: ['hanson', '3cg records', 'independent label', 'tulsa revival', 'hop jam', 'pop rock', 'oklahoma', 'arts district'],
  },

  // RHODE ISLAND (2 events)
  {
    id: 'evt-lightningbolt-providence-1995',
    year: 1995,
    location: { lat: 41.824, lng: -71.4128, city: 'Providence', country: 'US' },
    genre: ['Noise Rock', 'Experimental', 'Punk'],
    title: 'Lightning Bolt and the Fort Thunder noise scene',
    description: 'The bass-and-drums duo Lightning Bolt emerges from the Fort Thunder warehouse arts collective in Providence, helping to define one of the most influential underground noise scenes of the 1990s. Fort Thunder, housed in a former industrial building in Olneyville, combines visual art, comics, and ear-splitting experimental music into a legendary DIY community. The venue and its associated acts, including Black Dice and Forcefield, make Providence a pilgrimage site for noise enthusiasts worldwide.',
    tags: ['lightning bolt', 'fort thunder', 'noise rock', 'olneyville', 'experimental', 'warehouse', 'underground', 'rhode island'],
  },
  {
    id: 'evt-artrock-providence-2002',
    year: 2002,
    location: { lat: 41.824, lng: -71.4128, city: 'Providence', country: 'US' },
    genre: ['Art Rock', 'Experimental', 'Indie Rock'],
    title: 'RISD art-rock and the Providence underground',
    description: 'Providence\'s Rhode Island School of Design fosters a uniquely visual and conceptual approach to rock music, with bands blurring the lines between performance art, noise, and indie rock. The city\'s affordable rents and creative community sustain a network of house venues, galleries, and all-ages spaces like AS220, making Providence synonymous with a fiercely independent, art-school-informed approach to underground music.',
    tags: ['risd', 'art rock', 'as220', 'providence', 'experimental', 'all ages', 'art school', 'rhode island'],
  },

  // SOUTH CAROLINA (2 events)
  {
    id: 'evt-charlestondance-charleston-1923',
    year: 1923,
    location: { lat: 32.7765, lng: -79.9311, city: 'Charleston', country: 'US' },
    genre: ['Jazz', 'Ragtime', 'Dance Music'],
    title: 'The Charleston dance craze sweeps America',
    description: 'The Charleston, a high-energy dance rooted in African American communities in Charleston, South Carolina, becomes a nationwide sensation after being featured in the 1923 Broadway show "Runnin\' Wild" with music by James P. Johnson. The dance draws from Gullah Geechee traditions and the vibrant Black social life of Charleston\'s Jenkins Orphanage Band, whose young musicians had been performing the steps for years. The Charleston becomes the defining dance of the Jazz Age.',
    tags: ['charleston dance', 'jazz age', 'james p johnson', 'jenkins orphanage', 'gullah geechee', 'roaring twenties', 'dance craze', 'south carolina'],
  },
  {
    id: 'evt-shovelsrope-charleston-2010',
    year: 2010,
    location: { lat: 32.7765, lng: -79.9311, city: 'Charleston', country: 'US' },
    genre: ['Indie Folk', 'Americana', 'Folk Rock'],
    title: 'Shovels & Rope and Charleston\'s indie folk scene',
    description: 'Husband-and-wife duo Michael Trent and Cary Ann Hearst form Shovels & Rope in Charleston, building a raw and energetic folk-rock sound that earns them a devoted national following. Their 2012 album "O\' Be Joyful" becomes a breakout success, showcasing the gritty Lowcountry authenticity that sets Charleston\'s music scene apart. The duo\'s success helps establish Charleston as an emerging center for independent Americana and roots music.',
    tags: ['shovels and rope', 'indie folk', 'americana', 'lowcountry', 'o be joyful', 'folk rock', 'charleston', 'south carolina'],
  },

  // SOUTH DAKOTA (2 events)
  {
    id: 'evt-lakotadrums-siouxfalls-1990',
    year: 1990,
    location: { lat: 43.5446, lng: -96.7311, city: 'Sioux Falls', country: 'US' },
    genre: ['Native American', 'Traditional', 'Powwow'],
    title: 'Lakota drum circles and powwow traditions in Sioux Falls',
    description: 'The Sioux Falls area serves as an important gathering point for Lakota and Dakota powwow traditions, with drum groups carrying forward centuries of sacred and social music rooted in the Great Plains. Annual powwows bring together drum circles, honor songs, and grass dancers from reservations across South Dakota, preserving the central role of the drum as the heartbeat of Lakota culture while passing musical knowledge to younger generations.',
    tags: ['lakota music', 'powwow', 'drum circles', 'great plains', 'indigenous tradition', 'honor songs', 'dakota', 'south dakota'],
  },
  {
    id: 'evt-indierock-siouxfalls-2010',
    year: 2010,
    location: { lat: 43.5446, lng: -96.7311, city: 'Sioux Falls', country: 'US' },
    genre: ['Indie Rock', 'Alternative', 'Punk'],
    title: 'Sioux Falls indie rock community flourishes',
    description: 'Sioux Falls develops a dedicated indie rock community centered around venues, Total Drag Records, and a network of basement shows that sustain local and touring bands. The city\'s low cost of living and supportive music community attract creative musicians who build a thriving scene far from major metropolitan areas, demonstrating that grassroots music communities can flourish in small Great Plains cities.',
    tags: ['sioux falls', 'indie rock', 'total drag records', 'diy', 'great plains', 'basement shows', 'south dakota', 'community'],
  },

  // UTAH (2 events)
  {
    id: 'evt-theused-saltlakecity-2001',
    year: 2001,
    location: { lat: 40.7608, lng: -111.891, city: 'Salt Lake City', country: 'US' },
    genre: ['Post-Hardcore', 'Emo', 'Screamo'],
    title: 'The Used and Salt Lake City\'s post-hardcore scene',
    description: 'The Used forms in Orem, Utah, and becomes a fixture of the Salt Lake City post-hardcore scene before their 2002 self-titled debut album goes platinum and makes them one of the biggest bands in the early 2000s screamo explosion. Salt Lake City\'s all-ages venue culture creates an unusually passionate and youthful concert-going community, making the city a proving ground for aggressive, emotionally charged rock music.',
    tags: ['the used', 'post-hardcore', 'screamo', 'slc', 'all ages', 'emo', 'utah', 'debut album'],
  },
  {
    id: 'evt-neontrees-saltlakecity-2010',
    year: 2010,
    location: { lat: 40.7608, lng: -111.891, city: 'Salt Lake City', country: 'US' },
    genre: ['Alternative Rock', 'New Wave', 'Pop Rock'],
    title: 'Neon Trees and the Utah alternative rock wave',
    description: 'Provo-based Neon Trees break through with the infectious single "Animal," which reaches number 13 on the Billboard Hot 100 and brings Utah\'s alternative rock scene to mainstream attention. The band, along with acts like Imagine Dragons who emerge from the same regional scene shortly after, proves that Utah can produce chart-topping rock music, redefining perceptions of the state\'s music culture.',
    tags: ['neon trees', 'animal', 'utah', 'alternative rock', 'new wave', 'pop rock', 'provo', 'imagine dragons'],
  },

  // VERMONT (2 events)
  {
    id: 'evt-phish-burlington-1983',
    year: 1983,
    location: { lat: 44.4759, lng: -73.2121, city: 'Burlington', country: 'US' },
    genre: ['Jam Band', 'Progressive Rock', 'Psychedelic Rock'],
    title: 'Phish forms at the University of Vermont',
    description: 'Trey Anastasio and his bandmates form Phish at the University of Vermont in Burlington, beginning a journey that makes them one of the most successful touring acts in American music history. Their early shows at Burlington venues like Nectar\'s restaurant build a rabid local following through marathon improvisational sets blending rock, jazz, funk, and bluegrass. Phish\'s grassroots growth from Burlington\'s club scene to selling out stadiums becomes a model for the jam band movement.',
    tags: ['phish', 'uvm', 'jam band', 'nectars', 'trey anastasio', 'improvisation', 'burlington', 'vermont'],
  },
  {
    id: 'evt-folkfestival-burlington-2005',
    year: 2005,
    location: { lat: 44.4759, lng: -73.2121, city: 'Burlington', country: 'US' },
    genre: ['Folk', 'Jam Band', 'Americana'],
    title: 'Burlington\'s folk and jam band festival scene',
    description: 'Burlington\'s vibrant festival culture reaches new heights, with events like the Burlington Discover Jazz Festival and waterfront concerts drawing national acts alongside local talent to Vermont\'s largest city. Church Street, the Lake Champlain waterfront, and venues like Higher Ground create a year-round ecosystem for folk, jam band, and roots music, making Burlington one of the most music-friendly small cities in New England.',
    tags: ['burlington festivals', 'discover jazz', 'higher ground', 'folk music', 'jam bands', 'lake champlain', 'vermont', 'church street'],
  },

  // VIRGINIA (2 events)
  {
    id: 'evt-gwar-richmond-1985',
    year: 1985,
    location: { lat: 37.5407, lng: -77.436, city: 'Richmond', country: 'US' },
    genre: ['Heavy Metal', 'Punk', 'Shock Rock'],
    title: 'GWAR forms in Richmond\'s underground',
    description: 'The theatrical shock-metal band GWAR forms in Richmond, emerging from the city\'s art school and punk scenes with an outrageous stage show featuring elaborate monster costumes, fake blood, and satirical sci-fi mythology. Founded by Virginia Commonwealth University students and local musicians, GWAR becomes a beloved institution of extreme music and underground culture, touring relentlessly for over three decades with their Slave Pit workshop in Richmond as creative headquarters.',
    tags: ['gwar', 'shock rock', 'richmond', 'vcu', 'slave pit', 'heavy metal', 'theatrical', 'virginia'],
  },
  {
    id: 'evt-lambofgod-richmond-2004',
    year: 2004,
    location: { lat: 37.5407, lng: -77.436, city: 'Richmond', country: 'US' },
    genre: ['Heavy Metal', 'Groove Metal', 'Thrash Metal'],
    title: 'Lamb of God defines New American Metal from Richmond',
    description: 'Richmond\'s Lamb of God releases "Ashes of the Wake," debuting at number 27 on the Billboard 200 and establishing them as one of the most important American metal bands of the 21st century. Their technically precise yet punishingly heavy groove metal sound, forged in Richmond\'s intense local scene, offers a distinctly American counterpoint to Scandinavian metal dominance. Along with GWAR and Municipal Waste, they cement Richmond as a premier heavy music city.',
    tags: ['lamb of god', 'ashes of the wake', 'groove metal', 'richmond', 'thrash', 'billboard', 'virginia', 'new american metal'],
  },

  // WEST VIRGINIA (2 events)
  {
    id: 'evt-oldtimefiddle-charleston-1930',
    year: 1930,
    location: { lat: 38.3498, lng: -81.6326, city: 'Charleston', country: 'US' },
    genre: ['Old-Time', 'Folk', 'Appalachian'],
    title: 'Appalachian old-time fiddle and banjo tradition',
    description: 'The hills surrounding Charleston, West Virginia, preserve some of the oldest continuous musical traditions in North America, with old-time fiddle and clawhammer banjo styles passed down through families for generations. Radio stations in Charleston begin broadcasting these mountain sounds to wider audiences, and fiddlers from the Kanawha Valley compete in contests that help codify Appalachian musical repertoire.',
    tags: ['old-time', 'fiddle', 'clawhammer banjo', 'appalachian', 'kanawha valley', 'mountain music', 'west virginia', 'folk tradition'],
  },
  {
    id: 'evt-hazeldickens-charleston-1968',
    year: 1968,
    location: { lat: 38.3498, lng: -81.6326, city: 'Charleston', country: 'US' },
    genre: ['Folk', 'Bluegrass', 'Protest'],
    title: 'Hazel Dickens and Appalachian protest music',
    description: 'West Virginia native Hazel Dickens becomes one of the most powerful voices in Appalachian protest music, singing about coal mining injustice, workers\' rights, and the exploitation of mountain communities with unflinching honesty. Born in Mercer County and deeply connected to the coalfields, Dickens brings the raw emotional power of mountain singing to the folk revival and labor movements. Her songs "Black Lung" and "They\'ll Never Keep Us Down" become anthems of resistance.',
    tags: ['hazel dickens', 'protest music', 'coal mining', 'appalachian folk', 'labor movement', 'black lung', 'west virginia', 'workers rights'],
  },

  // WISCONSIN (2 events)
  {
    id: 'evt-summerfest-milwaukee-1968',
    year: 1968,
    location: { lat: 43.0389, lng: -87.9065, city: 'Milwaukee', country: 'US' },
    genre: ['Rock', 'Pop', 'Festival'],
    title: 'Summerfest launches as world\'s largest music festival',
    description: 'Milwaukee launches Summerfest, an ambitious lakefront music festival that grows into the largest annually recurring music festival in the world, drawing nearly a million attendees each year. Held along the shores of Lake Michigan at Henry Maier Festival Park, Summerfest offers multiple stages showcasing everything from rock and country to jazz and blues over an eleven-day run, becoming the cultural heartbeat of Milwaukee.',
    tags: ['summerfest', 'music festival', 'lake michigan', 'henry maier', 'worlds largest festival', 'milwaukee', 'wisconsin', 'multi-genre'],
  },
  {
    id: 'evt-violentfemmes-milwaukee-1983',
    year: 1983,
    location: { lat: 43.0389, lng: -87.9065, city: 'Milwaukee', country: 'US' },
    genre: ['Alternative Rock', 'Folk Punk', 'Post-Punk'],
    title: 'Violent Femmes release debut album in Milwaukee',
    description: 'Milwaukee\'s Violent Femmes release their self-titled debut album, a raw and acoustic collection that becomes one of the most influential alternative rock records of the decade. Famously discovered busking outside a Milwaukee venue before a Pretenders concert, the trio channels adolescent angst through folk-punk arrangements that make songs like "Blister in the Sun" and "Add It Up" college radio staples. The album eventually goes platinum.',
    tags: ['violent femmes', 'blister in the sun', 'folk punk', 'debut album', 'college radio', 'milwaukee', 'acoustic punk', 'wisconsin'],
  },

  // WYOMING (2 events)
  {
    id: 'evt-frontierdays-cheyenne-1940',
    year: 1940,
    location: { lat: 41.14, lng: -104.8202, city: 'Cheyenne', country: 'US' },
    genre: ['Country', 'Western', 'Cowboy Music'],
    title: 'Cheyenne Frontier Days and Western cowboy music',
    description: 'Cheyenne Frontier Days, the world\'s largest outdoor rodeo, serves as one of the most important platforms for Western cowboy music, with performances by singing cowboys and Western swing bands drawing enormous crowds each July. The event has been running for over four decades and is inseparable from the cowboy music tradition, featuring performers who sing about the open range and life on the high plains.',
    tags: ['cheyenne frontier days', 'cowboy music', 'western swing', 'rodeo', 'singing cowboys', 'wyoming', 'high plains', 'western heritage'],
  },
  {
    id: 'evt-chrisledoux-cheyenne-1997',
    year: 1997,
    location: { lat: 41.14, lng: -104.8202, city: 'Cheyenne', country: 'US' },
    genre: ['Country', 'Western', 'Rodeo Country'],
    title: 'Chris LeDoux\'s rodeo country legacy from Wyoming',
    description: 'Wyoming\'s Chris LeDoux, a former bareback bronc riding world champion turned country music artist, represents the authentic intersection of rodeo culture and country music like no other performer. Based in Kaycee, Wyoming, LeDoux sells millions of albums and is famously name-checked by Garth Brooks in "Much Too Young (To Feel This Damn Old)," leading to national recognition. His legacy as a genuine cowboy who lived the life he sang about makes him an enduring icon of Wyoming\'s musical identity.',
    tags: ['chris ledoux', 'rodeo country', 'bareback bronc', 'garth brooks', 'wyoming cowboy', 'kaycee', 'western music', 'authentic country'],
  },

  // ── African Diaspora & Its Effects on Music ──────────────────────────

  {
    id: 'evt-diaspora-nola-congo-1819',
    year: 1819,
    location: { lat: 29.9511, lng: -90.0715, city: 'New Orleans', country: 'US' },
    genre: ['African Drumming', 'Ring Shout'],
    title: 'Congo Square: enslaved Africans preserve drumming traditions',
    description: 'Every Sunday in New Orleans\' Place des Nègres — later known as Congo Square — enslaved Africans gather to play drums, sing in Yoruba, Fon, and Kongo languages, and perform ring dances. Unique among slaveholding cities, New Orleans permits these gatherings, creating a living bridge between West African musical traditions and the Americas. The polyrhythmic drumming, call-and-response singing, and communal dancing practiced here become the seedbed for jazz, blues, funk, and second-line brass band music.',
    tags: ['congo square', 'african drumming', 'ring shout', 'enslaved', 'yoruba', 'fon', 'kongo', 'polyrhythm', 'diaspora', 'second line'],
  },
  {
    id: 'evt-diaspora-haiti-vodou-1804',
    year: 1804,
    location: { lat: 18.5944, lng: -72.3074, city: 'Port-au-Prince', country: 'Haiti' },
    genre: ['Vodou Drumming', 'Rara'],
    title: 'Haitian revolution preserves Vodou drumming traditions',
    description: 'Following the only successful slave revolution in history, Haiti\'s free Black population openly practices Vodou — the spiritual tradition carried from Dahomey (modern Benin) and Kongo. The sacred rada, petwo, and kongo drumming styles, once performed in secret, become the rhythmic backbone of Haitian music. The tanbou (drum) ensembles and call-and-response chanting of Vodou ceremonies will later influence compas, rara street parades, and through Haitian migration, Cuban and New Orleans musical traditions.',
    tags: ['vodou', 'haitian revolution', 'rada drums', 'petwo', 'kongo', 'tanbou', 'rara', 'dahomey', 'diaspora', 'compas'],
  },
  {
    id: 'evt-diaspora-salvador-candomble-1830',
    year: 1830,
    location: { lat: -12.9714, lng: -38.5124, city: 'Salvador', country: 'Brazil' },
    genre: ['Candomblé', 'Samba de Roda'],
    title: 'Candomblé terreiros preserve Yoruba music in Bahia',
    description: 'In Salvador da Bahia — where more enslaved Africans were brought than anywhere else in the Americas — Yoruba, Fon, and Bantu religious traditions survive through Candomblé terreiros (temples). The atabaque drums, agogô bells, and chanted orikis (praise songs) to orixás like Xangô and Oxum preserve West African sacred music virtually intact. These rhythms flow into samba de roda, capoeira songs, and eventually all of Brazilian popular music, making Salvador the most African city in the Americas.',
    tags: ['candomble', 'yoruba', 'terreiro', 'atabaque', 'orixa', 'samba de roda', 'bahia', 'afro-brazilian', 'diaspora', 'capoeira'],
  },
  {
    id: 'evt-diaspora-havana-rumba-1886',
    year: 1886,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Rumba', 'Afro-Cuban'],
    title: 'Afro-Cuban rumba emerges in the solares of Havana',
    description: 'Following the abolition of slavery in Cuba, Afro-Cuban communities in Havana\'s crowded solares (tenement courtyards) and Matanzas create rumba — a percussion-driven music and dance born directly from Congolese and Yoruba traditions. The three styles of rumba — yambú, guaguancó, and columbia — use cajón boxes and later congas, claves, and the sacred batá drums of Santería. Rumba becomes the rhythmic engine that powers son cubano, mambo, salsa, and eventually loops back to Africa as Congolese rumba.',
    tags: ['rumba', 'afro-cuban', 'solares', 'conga', 'clave', 'bata drums', 'santeria', 'guaguanco', 'columbia', 'diaspora', 'matanzas'],
  },
  {
    id: 'evt-diaspora-nola-mardi-gras-indians-1885',
    year: 1885,
    location: { lat: 29.9511, lng: -90.0715, city: 'New Orleans', country: 'US' },
    genre: ['Mardi Gras Indian', 'Call and Response'],
    title: 'Mardi Gras Indians begin masking in New Orleans',
    description: 'African American communities in New Orleans begin the tradition of "masking Indian" — creating elaborate beaded and feathered suits and parading through Black neighborhoods on Mardi Gras day. Honoring both African ancestors and Native Americans who sheltered escaped slaves, the Mardi Gras Indians develop a fierce call-and-response chanting tradition ("Indian Red," "Shallow Water") accompanied by tambourines and hand percussion. This living tradition preserves West African masquerade and griot storytelling within the heart of American music\'s birthplace.',
    tags: ['mardi gras indians', 'masking', 'call and response', 'big chief', 'indian red', 'black masking', 'new orleans', 'diaspora', 'west african masquerade'],
  },
  {
    id: 'evt-diaspora-portofspain-calypso-1914',
    year: 1914,
    location: { lat: 10.6596, lng: -61.5086, city: 'Port of Spain', country: 'Trinidad and Tobago' },
    genre: ['Calypso', 'Kaiso'],
    title: 'Calypso emerges from African kaiso traditions in Trinidad',
    description: 'Calypso crystallizes in Port of Spain from the kaiso tradition — a form of musical storytelling brought by enslaved West Africans, particularly from the Yoruba and Igbo peoples. The chantwells (lead singers) of Carnival bands carry forward the griot\'s role as community narrator, using wit, metaphor, and call-and-response to comment on politics and social life. Early calypsonians like the Duke of Iron and Lord Executor sing in French Creole patois, their melodies built on West African tonal patterns adapted to Caribbean rhythms.',
    tags: ['calypso', 'kaiso', 'chantwell', 'griot', 'carnival', 'trinidad', 'diaspora', 'west african', 'duke of iron', 'creole'],
  },
  {
    id: 'evt-diaspora-chicago-gospel-1932',
    year: 1932,
    location: { lat: 41.8781, lng: -87.6298, city: 'Chicago', country: 'US' },
    genre: ['Gospel'],
    title: 'Thomas Dorsey creates modern gospel music in Chicago',
    description: 'Thomas A. Dorsey — a former barrelhouse blues pianist known as "Georgia Tom" — revolutionizes sacred music at Pilgrim Baptist Church on Chicago\'s South Side by fusing the emotional intensity of the blues with the spirituals and hymns of the Black church. His composition "Take My Hand, Precious Lord" becomes the most performed gospel song in history. Dorsey\'s innovation channels the same African musical DNA — blue notes, improvisation, call-and-response — that powered the blues, proving that the music of the African diaspora flows through both the juke joint and the sanctuary.',
    tags: ['thomas dorsey', 'gospel', 'pilgrim baptist church', 'precious lord', 'blues', 'spirituals', 'diaspora', 'south side', 'sacred music'],
  },
  {
    id: 'evt-diaspora-nyc-afrocuban-jazz-1947',
    year: 1947,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Afro-Cuban Jazz', 'Bebop'],
    title: 'Dizzy Gillespie and Chano Pozo unite jazz and Yoruba drumming',
    description: 'At a Carnegie Hall concert, Dizzy Gillespie introduces Cuban percussionist Chano Pozo to the jazz world. Pozo — an initiate of the Abakuá secret society in Havana who played sacred batá drums in Santería ceremonies — brings authentic Yoruba and Congolese rhythms into the heart of bebop. Their collaboration on "Manteca" and "Cubana Be, Cubana Bop" creates Afro-Cuban jazz, explicitly reconnecting two streams of the African diaspora that had been separated by centuries and oceans.',
    tags: ['dizzy gillespie', 'chano pozo', 'afro-cuban jazz', 'manteca', 'carnegie hall', 'bata drums', 'abakua', 'yoruba', 'bebop', 'diaspora'],
  },
  {
    id: 'evt-diaspora-kingston-kumina-1950',
    year: 1950,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Kumina', 'Revival', 'Mento'],
    title: 'Kumina and Revival traditions shape Jamaica\'s musical foundation',
    description: 'In eastern Jamaica, the Kumina tradition — brought by Kongolese indentured laborers in the 19th century — preserves Central African drumming, possession rituals, and ancestral communication through the kbandu and playing cast drums. Alongside Revivalism (blending African spirituality with Christianity), these traditions infuse Jamaican popular music with its distinctive rhythmic foundation. The bass-heavy polyrhythms, chanting, and spiritual intensity of Kumina flow directly into ska, rocksteady, and reggae, while Rastafari nyabinghi drumming draws from the same African well.',
    tags: ['kumina', 'revival', 'kongolese', 'kbandu', 'nyabinghi', 'rastafari', 'ska', 'reggae', 'jamaica', 'diaspora', 'ancestral drumming'],
  },
  {
    id: 'evt-diaspora-accra-armstrong-1956',
    year: 1956,
    location: { lat: 5.6037, lng: -0.187, city: 'Accra', country: 'Ghana' },
    genre: ['Jazz', 'Highlife'],
    title: 'Louis Armstrong plays to 100,000 in Accra — the circle closes',
    description: 'Louis Armstrong performs before an estimated 100,000 people in Accra during Ghana\'s march toward independence, creating one of the most symbolically powerful moments in music history. The man whose music descended from the rhythms of Congo Square plays to an African audience who recognize their own musical DNA in his trumpet and vocal style. E.T. Mensah and the Tempos, Ghana\'s premier highlife band, join the concert — their highlife music itself a fusion of West African rhythms with the jazz and swing that the diaspora sent back across the Atlantic. The transatlantic musical circle, broken by the slave trade, is symbolically rejoined.',
    tags: ['louis armstrong', 'accra', 'ghana', 'highlife', 'et mensah', 'independence', 'transatlantic', 'diaspora', 'return to africa', 'congo square'],
  },
  {
    id: 'evt-diaspora-lima-afro-peruvian-1957',
    year: 1957,
    location: { lat: -12.0464, lng: -77.0428, city: 'Lima', country: 'Peru' },
    genre: ['Afro-Peruvian', 'Landó', 'Festejo'],
    title: 'Nicomedes Santa Cruz revives Afro-Peruvian music',
    description: 'Poet, folklorist, and musician Nicomedes Santa Cruz leads a revival of Afro-Peruvian music that had been suppressed and marginalized for centuries. He resurrects the landó, festejo, and zamacueca — dance-music forms created by enslaved Africans on Peru\'s coastal haciendas — using the cajón (box drum, likely descended from shipping crates used by enslaved people denied real drums), quijada (donkey jawbone), and call-and-response vocals. His sister Victoria Santa Cruz choreographs powerful theatrical works reclaiming Black Peruvian identity. Susana Baca later carries this tradition to global audiences.',
    tags: ['nicomedes santa cruz', 'afro-peruvian', 'lando', 'festejo', 'cajon', 'zamacueca', 'victoria santa cruz', 'susana baca', 'diaspora', 'peru'],
  },
  {
    id: 'evt-diaspora-dakar-blues-roots-1960',
    year: 1960,
    location: { lat: 14.7167, lng: -17.4677, city: 'Dakar', country: 'Senegal' },
    genre: ['Griot', 'Blues', 'Mbalax'],
    title: 'Griots and the blues: tracing the music back to West Africa',
    description: 'As West African nations gain independence, scholars and musicians begin tracing the African roots of American blues. The Wolof and Mandinka griots of Senegal and Gambia — hereditary musician-storytellers who play the kora, xalam, and balafon — perform music strikingly similar to Delta blues: pentatonic scales, bent notes, melismatic vocals, and narrative storytelling over repetitive string patterns. The xalam (a one-stringed lute) is recognized as a direct ancestor of the banjo, carried to America by enslaved Senegambians. This "reverse discovery" reshapes understanding of the African diaspora\'s musical legacy.',
    tags: ['griot', 'blues roots', 'kora', 'xalam', 'banjo', 'mandinka', 'wolof', 'pentatonic', 'delta blues', 'diaspora', 'senegambia'],
  },
  {
    id: 'evt-diaspora-memphis-stax-soul-1967',
    year: 1967,
    location: { lat: 35.1495, lng: -90.049, city: 'Memphis', country: 'US' },
    genre: ['Soul', 'R&B'],
    title: 'Otis Redding at Monterey — the diaspora\'s emotional voice',
    description: 'Otis Redding\'s legendary set at the Monterey Pop Festival brings Southern soul to the counterculture, performing with a raw spiritual intensity rooted directly in the African American church. The musical chain is unbroken: West African vocal traditions → slave spirituals → gospel → soul. Redding\'s melismatic singing, the Stax horns echoing brass band traditions from Congo Square, Booker T. & the M.G.\'s\' groove drawing from the same rhythmic well — Memphis soul is the African diaspora\'s emotional autobiography, three centuries compressed into three minutes of music.',
    tags: ['otis redding', 'monterey', 'stax', 'southern soul', 'gospel roots', 'diaspora', 'booker t', 'melisma', 'spirituals', 'memphis'],
  },
  {
    id: 'evt-diaspora-london-lovers-rock-1977',
    year: 1977,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Lovers Rock', 'Reggae'],
    title: 'Lovers rock: the Caribbean diaspora creates a new genre in London',
    description: 'In the bedrooms, community centers, and small studios of South London and Notting Hill, the children of Caribbean immigrants create lovers rock — a softer, romantic strain of reggae that is the first Black British music genre. Louisa Mark\'s "Caught You in a Lie," produced by Dennis Bovell, becomes a foundational track. Lovers rock emerges from the specific experience of the Windrush generation diaspora: young Black Britons channeling their parents\' Jamaican and Trinidadian musical traditions through the lens of growing up in 1970s Britain. The genre later influences UK garage, jungle, and grime.',
    tags: ['lovers rock', 'louisa mark', 'dennis bovell', 'windrush', 'caribbean diaspora', 'south london', 'notting hill', 'uk reggae', 'black british'],
  },
  {
    id: 'evt-diaspora-salvador-bloco-afro-1979',
    year: 1979,
    location: { lat: -12.9714, lng: -38.5124, city: 'Salvador', country: 'Brazil' },
    genre: ['Afoxé', 'Samba-Reggae', 'Axé'],
    title: 'Ilê Aiyê and the Bloco Afro movement reclaim African identity',
    description: 'Founded in 1974, Ilê Aiyê — Brazil\'s first all-Black Carnival bloco — transforms Salvador\'s Carnival and sparks the Bloco Afro movement. By the late 1970s, Olodum follows with samba-reggae, fusing Salvador\'s Candomblé rhythms with Jamaican reggae (itself descended from African traditions via a different diaspora route). The Bloco Afro movement explicitly celebrates African heritage: the massive surdo drum ensembles reference the atabaque rhythms of Candomblé, lyrics honor African history, and the movement becomes a powerful force for Black Brazilian pride. Olodum later collaborates with Paul Simon on "Rhythm of the Saints."',
    tags: ['ile aiye', 'olodum', 'bloco afro', 'samba-reggae', 'axe', 'candomble', 'carnival', 'afro-brazilian', 'diaspora', 'paul simon'],
  },
  {
    id: 'evt-diaspora-nyc-hip-hop-africa-1982',
    year: 1982,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Hip Hop', 'Funk'],
    title: 'Afrika Bambaataa channels the diaspora through "Planet Rock"',
    description: 'Afrika Bambaataa — who took his name from a 19th-century Zulu chief — releases "Planet Rock," fusing Kraftwerk\'s electronic beats with the Bronx block party tradition. Bambaataa\'s Zulu Nation explicitly connects hip hop to African identity and diaspora consciousness. The foundational elements of hip hop all trace back through the diaspora: the MC descends from the West African griot, breakdancing from capoeira and ring shouts, DJing and toasting from Jamaican sound system culture (itself rooted in African oral tradition), and the boom-bap drum patterns from the same polyrhythmic DNA that powers Yoruba drumming.',
    tags: ['afrika bambaataa', 'planet rock', 'zulu nation', 'hip hop', 'griot', 'capoeira', 'sound system', 'bronx', 'diaspora', 'afrofuturism'],
  },
  {
    id: 'evt-diaspora-portofspain-soca-1973',
    year: 1973,
    location: { lat: 10.6596, lng: -61.5086, city: 'Port of Spain', country: 'Trinidad and Tobago' },
    genre: ['Soca', 'Calypso'],
    title: 'Lord Shorty creates soca, fusing calypso with Indian rhythms',
    description: 'Lord Shorty (Garfield Blackman) creates soca — the "Soul of Calypso" — by fusing calypso with East Indian rhythms, particularly the dholak drum and tassa patterns of Trinidad\'s Indo-Caribbean community. The innovation layers the African-rooted calypso tradition with South Asian musical elements, reflecting Trinidad\'s complex diaspora history: enslaved Africans and indentured Indian laborers, brought to the same sugar plantations, creating a uniquely multicultural musical fusion. Soca becomes the dominant Carnival music across the Caribbean.',
    tags: ['lord shorty', 'soca', 'calypso', 'indian rhythms', 'dholak', 'carnival', 'trinidad', 'diaspora', 'indo-caribbean', 'soul of calypso'],
  },
  {
    id: 'evt-diaspora-freetown-maroon-1800',
    year: 1800,
    location: { lat: 8.4657, lng: -13.2317, city: 'Freetown', country: 'Sierra Leone' },
    genre: ['Maroon Music', 'Gumbe'],
    title: 'Freed slaves return to Sierra Leone, carrying diaspora music',
    description: 'Freetown, founded as a colony for freed enslaved Africans and Black Loyalists from Nova Scotia, becomes a unique musical crossroads where the African diaspora flows in reverse. The Krio people — descendants of freed slaves from the Americas, Britain, and liberated slave ships — bring back musical traditions that had evolved in the Caribbean and Americas: hymn singing, sea shanties, goombay drumming, and marching band music. These fuse with indigenous Temne and Mende traditions to create Krio gumbe music, making Freetown a living laboratory of the diaspora\'s musical round trip.',
    tags: ['freetown', 'krio', 'maroon', 'gumbe', 'freed slaves', 'nova scotia', 'goombay', 'diaspora', 'return to africa', 'sierra leone'],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 10-Phase Plan: Genre Emergence, Fusion & Influence Chains
  // ══════════════════════════════════════════════════════════════════════

  // ── Phase 1: Sacred Roots & Ancient Foundations (Pre-1900) ──────────
  {
    id: 'evt-griot-timbuktu-1500',
    year: 1500,
    location: { lat: 16.7735, lng: -3.0074, city: 'Timbuktu', country: 'Mali' },
    genre: ['Griot', 'West African'],
    title: 'West African griot tradition codified in the Songhai Empire',
    description: 'Under the Songhai Empire, the griot tradition — hereditary musician-historians preserving genealogies, epics, and moral teachings through the kora, balafon, and ngoni — becomes formally codified in the courts of Timbuktu and Gao. Drawing on centuries of Mande oral tradition, these griots establish the musical and narrative frameworks that will travel across the Atlantic with the slave trade, seeding the blues, banjo traditions, and storytelling impulses of American music.',
    tags: ['griot', 'songhai', 'timbuktu', 'kora', 'balafon', 'ngoni', 'mande', 'oral tradition', 'west africa'],
  },
  {
    id: 'evt-flamenco-seville-1600',
    year: 1600,
    location: { lat: 37.3891, lng: -5.9845, city: 'Seville', country: 'Spain' },
    genre: ['Flamenco', 'Andalusian'],
    title: "Flamenco's forge: Romani-Moorish-Jewish-Andalusian fusion begins",
    description: 'In the Triana quarter of Seville, Romani communities absorb and transmute Moorish maqam scales, Sephardic Jewish liturgical chants, and Andalusian folk song into the raw emotional vocabulary of early flamenco. Drawing on centuries of cross-cultural coexistence under convivencia, this volatile fusion of persecuted peoples produces cante jondo (deep song), whose anguished melismas and complex compas rhythms will later influence Latin American music and be formally championed by Lorca and Falla at the 1922 Concurso de Cante Jondo.',
    tags: ['flamenco', 'romani', 'moorish', 'sephardic', 'triana', 'cante jondo', 'andalusia', 'convivencia', 'compas'],
  },
  {
    id: 'evt-classical-vienna-1700',
    year: 1700,
    location: { lat: 48.2082, lng: 16.3738, city: 'Vienna', country: 'Austria' },
    genre: ['Classical', 'Baroque'],
    title: 'European classical tradition crystallizes from Bach to Mozart',
    description: 'The Habsburg courts of Vienna become the crucible of Western classical music as the Baroque era gives way to the Classical period. Drawing on Italian opera, German church music, and French court dance, composers from Bach through Haydn and Mozart codify the tonal system, sonata form, and orchestral architecture that will dominate Western music for two centuries. These harmonic frameworks later permeate every global genre from tango to jazz to Bollywood film scores.',
    tags: ['classical', 'baroque', 'vienna', 'habsburg', 'bach', 'mozart', 'haydn', 'sonata form', 'tonal system', 'orchestral'],
  },
  {
    id: 'evt-contradanza-havana-1800',
    year: 1800,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Contradanza', 'Afro-Cuban'],
    title: 'Contradanza arrives: European dance meets African rhythm in Cuba',
    description: 'The French contradanse, carried to Cuba by Haitian refugees fleeing the revolution, encounters African drumming traditions preserved by enslaved populations in Havana. Drawing on European formal dance structures and West African polyrhythmic sensibilities, this collision produces the Cuban contradanza — the first creolized dance music of the Caribbean, whose syncopated "habanera" bass line will flow downstream into danzón, son cubano, tango, ragtime, and jazz.',
    tags: ['contradanza', 'habanera', 'afro-cuban', 'french contradanse', 'haiti', 'danzon', 'creole', 'syncopation', 'cuba'],
  },
  {
    id: 'evt-appalachia-bristol-1830',
    year: 1830,
    location: { lat: 36.5951, lng: -82.1887, city: 'Bristol', country: 'US' },
    genre: ['Appalachian', 'Old-Time'],
    title: 'Scots-Irish fiddle meets African banjo in Appalachia',
    description: 'In the mountains of Appalachia, Scots-Irish immigrants carrying fiddle tunes and ballad traditions encounter enslaved and free African Americans playing the banjo — a direct descendant of the West African xalam and akonting brought by Senegambian griots. Drawing on Celtic modal melodies and African rhythmic drive, this biracial musical exchange forges old-time string band music, which flows directly into country, bluegrass, and the Bristol Sessions of 1927.',
    tags: ['appalachian', 'fiddle', 'banjo', 'scots-irish', 'african', 'xalam', 'old-time', 'string band', 'mountain music'],
  },
  {
    id: 'evt-spiritual-nashville-1867',
    year: 1867,
    location: { lat: 36.1627, lng: -86.7816, city: 'Nashville', country: 'US' },
    genre: ['Spiritual', 'Choral'],
    title: 'Fisk Jubilee Singers carry slave spirituals to the world',
    description: 'The Fisk Jubilee Singers, students at the newly founded Fisk University, tour nationally and internationally performing slave spirituals — sacred songs rooted in West African call-and-response, field hollers, and the ring shout. Drawing on the musical traditions enslaved Africans carried across the Atlantic, these arranged spirituals introduce Black sacred music to global audiences and lay the groundwork for gospel, soul, and the entire tradition of African American choral singing.',
    tags: ['fisk jubilee singers', 'spirituals', 'fisk university', 'call and response', 'sacred music', 'choral', 'emancipation', 'ring shout'],
  },
  {
    id: 'evt-maqam-cairo-1870',
    year: 1870,
    location: { lat: 30.0444, lng: 31.2357, city: 'Cairo', country: 'Egypt' },
    genre: ['Arabic Classical', 'Maqam'],
    title: 'Cairo codifies the maqam system and the art of tarab',
    description: "Under Khedive Ismail's modernizing court, Cairo becomes the center of Arabic classical music as scholars and musicians formalize the maqam modal system — the intricate scales and melodic rules that govern Arabic, Turkish, and Persian music. Drawing on centuries of Ottoman, Andalusian, and Persian modal traditions, Cairo's music halls cultivate tarab (musical ecstasy), creating the aesthetic foundation that Umm Kulthum and the great twentieth-century Arab singers will later carry to the masses through radio.",
    tags: ['maqam', 'tarab', 'arabic classical', 'khedive ismail', 'cairo', 'ottoman', 'modal system', 'oud', 'qanun'],
  },
  {
    id: 'evt-jazz-origins-nola-1890',
    year: 1890,
    location: { lat: 29.9511, lng: -90.0715, city: 'New Orleans', country: 'US' },
    genre: ['Brass Band', 'Blues', 'Ragtime'],
    title: 'Brass bands, blues, and ragtime converge in New Orleans',
    description: "In the streets and dance halls of New Orleans, African American brass bands, Creole string orchestras, blues singers, and ragtime pianists collide in a musical melting pot unlike anywhere else on Earth. Drawing on the city's unique inheritance — Congo Square drum circles, French quadrilles, Caribbean habanera rhythms, Baptist hymns, and West African call-and-response — this convergence lays the fuse for jazz, which will ignite in the next two decades and reshape all of popular music.",
    tags: ['brass band', 'storyville', 'congo square', 'ragtime', 'blues', 'creole', 'new orleans', 'second line', 'habanera'],
  },
  {
    id: 'evt-lundu-rio-1895',
    year: 1895,
    location: { lat: -22.9068, lng: -43.1729, city: 'Rio de Janeiro', country: 'Brazil' },
    genre: ['Lundu', 'Maxixe'],
    title: 'Lundu and maxixe: Afro-Brazilian rhythms enter the salon',
    description: "The lundu — a sensual song-and-dance form rooted in Angolan and Congolese traditions brought by enslaved Africans — fuses with European polka and habanera rhythms in Rio de Janeiro's dance halls to create the maxixe, Brazil's first urban popular dance. Drawing on Candomblé-inflected rhythms and the umbigada (navel-touching dance), this Afro-Brazilian fusion scandalizes polite society while laying the rhythmic and social groundwork for samba, choro, and all of Brazilian popular music that follows.",
    tags: ['lundu', 'maxixe', 'afro-brazilian', 'angolan', 'umbigada', 'choro', 'polka', 'rio de janeiro', 'brazilian dance'],
  },

  // ── Phase 2: The Blues-Jazz-Gospel Triangle (1900–1940) ─────────────
  {
    id: 'evt-blues-clarksdale-1903',
    year: 1903,
    location: { lat: 34.2001, lng: -90.5709, city: 'Clarksdale', country: 'US' },
    genre: ['Blues'],
    title: 'W.C. Handy hears the blues at a Tutwiler train station',
    description: 'At a train station in Tutwiler, Mississippi, bandleader W.C. Handy encounters a ragged man sliding a knife along guitar strings and singing about "goin where the Southern cross the Dog" — a sound unlike anything in Handy\'s conservatory training. Drawing on West African griot traditions, field hollers, and work songs carried through centuries of enslavement, this Delta blues becomes the seedbed for Handy\'s published compositions, Robert Johnson\'s recordings, and eventually all of rock, R&B, and jazz.',
    tags: ['wc handy', 'tutwiler', 'delta blues', 'slide guitar', 'mississippi', 'field holler', 'clarksdale', 'crossroads'],
  },
  {
    id: 'evt-jazz-recording-nola-1917',
    year: 1917,
    location: { lat: 29.9511, lng: -90.0715, city: 'New Orleans', country: 'US' },
    genre: ['Jazz', 'Dixieland'],
    title: 'Original Dixieland Jass Band makes the first jazz recording',
    description: "The Original Dixieland Jass Band, a white ensemble playing music born in New Orleans' Black communities, records \"Livery Stable Blues\" for Victor Records — the first commercially released jazz record. Drawing on the brass band traditions, blues, and ragtime that converged in Storyville, this recording carries jazz from the streets of New Orleans into parlors and dance halls nationwide, launching the Jazz Age and paving the way for King Oliver's and Louis Armstrong's transformative recordings.",
    tags: ['original dixieland jass band', 'livery stable blues', 'victor records', 'first jazz recording', 'dixieland', 'jazz age', 'storyville'],
  },
  {
    id: 'evt-blues-recording-nyc-1920',
    year: 1920,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Blues', 'Vaudeville'],
    title: 'Mamie Smith records "Crazy Blues" — the race records era begins',
    description: 'Mamie Smith records "Crazy Blues" for Okeh Records, selling 75,000 copies in its first month and proving that Black audiences represent a massive untapped market. Drawing on the vaudeville blues tradition and the raw emotional power of Southern folk blues, this watershed recording launches the "race records" industry, opening doors for Bessie Smith, Ma Rainey, and the entire recorded blues tradition that feeds directly into R&B, rock and roll, and soul.',
    tags: ['mamie smith', 'crazy blues', 'okeh records', 'race records', 'vaudeville blues', 'recording industry', 'harlem'],
  },
  {
    id: 'evt-country-bristol-1927',
    year: 1927,
    location: { lat: 36.5951, lng: -82.1887, city: 'Bristol', country: 'US' },
    genre: ['Country', 'Appalachian'],
    title: 'The Bristol Sessions: "Big Bang of Country Music"',
    description: "Ralph Peer of Victor Records sets up a portable studio in Bristol, Tennessee, recording Jimmie Rodgers and the Carter Family in sessions that launch commercial country music. Drawing on the Scots-Irish fiddle-and-banjo traditions forged in these same Appalachian mountains a century earlier, and absorbing the blue notes and vocal slides of African American blues, these recordings codify country music as a genre and establish Nashville's future as Music City.",
    tags: ['bristol sessions', 'ralph peer', 'jimmie rodgers', 'carter family', 'victor records', 'country music', 'appalachian', 'big bang'],
  },
  {
    id: 'evt-jugband-memphis-1928',
    year: 1928,
    location: { lat: 35.1495, lng: -90.049, city: 'Memphis', country: 'US' },
    genre: ['Jug Band', 'Blues'],
    title: 'Memphis Jug Bands blend blues, jazz, and vaudeville on Beale Street',
    description: "The Memphis Jug Band and Cannon's Jug Stompers record prolifically, creating a raucous, improvisational music built from jugs, harmonicas, kazoos, washboards, and guitars on Beale Street. Drawing on Delta blues, ragtime, and vaudeville traditions, these jug bands forge an accessible, street-level sound that bridges rural blues and urban jazz, directly prefiguring the skiffle craze that will inspire the Beatles and the DIY ethic of rock and roll.",
    tags: ['memphis jug band', 'cannons jug stompers', 'beale street', 'jug band', 'washboard', 'harmonica', 'skiffle', 'vaudeville'],
  },
  {
    id: 'evt-son-havana-1930',
    year: 1930,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Son Cubano', 'Afro-Cuban'],
    title: "Son cubano's golden age electrifies Havana",
    description: "The Sexteto Habanero, Septeto Nacional, and Trío Matamoros bring son cubano from the rural Oriente province to Havana's cabarets and radio stations, launching its golden age. Drawing on the Spanish tres guitar, African-derived clave rhythm, and the contradanza's habanera pulse, son cubano becomes Cuba's national music and the direct ancestor of mambo, cha-cha-chá, salsa, and timba — arguably the most influential Latin rhythm of the twentieth century.",
    tags: ['son cubano', 'sexteto habanero', 'septeto nacional', 'trio matamoros', 'clave', 'tres', 'havana', 'golden age'],
  },
  {
    id: 'evt-swing-nyc-1935',
    year: 1935,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Jazz', 'Swing'],
    title: "Benny Goodman launches the Swing Era at the Palomar Ballroom",
    description: "Benny Goodman's orchestra ignites the Swing Era with a legendary broadcast from the Palomar Ballroom, bringing jazz from speakeasy to mainstream. Drawing on the innovations of Fletcher Henderson's big band arrangements and the Kansas City riff style, Goodman's racially integrated band democratizes jazz as America's popular music, paving the way for the massive wartime dance band culture and the bebop rebellion that follows.",
    tags: ['benny goodman', 'swing era', 'palomar ballroom', 'fletcher henderson', 'big band', 'swing', 'dance band', 'integration'],
  },

  // ── Phase 3: Great Migrations & Post-War Explosion (1940–1960) ─────
  {
    id: 'evt-jazz-la-1942',
    year: 1942,
    location: { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', country: 'US' },
    genre: ['Jazz', 'Blues'],
    title: "Central Avenue: LA's jazz corridor blazes during wartime",
    description: "Central Avenue in South Los Angeles becomes the West Coast's answer to Harlem, as wartime migration brings Black workers and musicians flooding into the city's defense industry neighborhoods. Drawing on the Kansas City and New Orleans jazz traditions carried west by the Great Migration, the Dunbar Hotel, Club Alabam, and the Last Word host nightly sets by Charles Mingus, Dexter Gordon, and Art Pepper, forging a cooler, more laid-back West Coast jazz that will crystallize in the postwar era.",
    tags: ['central avenue', 'dunbar hotel', 'club alabam', 'charles mingus', 'dexter gordon', 'west coast jazz', 'great migration', 'wartime', 'south la'],
  },
  {
    id: 'evt-windrush-london-1948',
    year: 1948,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Calypso', 'Mento', 'Caribbean'],
    title: 'HMT Windrush arrives: Caribbean music plants roots in Britain',
    description: "The HMT Empire Windrush docks at Tilbury carrying 492 Caribbean migrants, among them calypsonians like Lord Kitchener, who famously sings \"London Is the Place for Me\" as he disembarks. Drawing on Trinidad's calypso, Jamaica's mento, and the broader Caribbean musical inheritance from West African griot traditions, these arrivals plant the seeds of Black British music — a lineage that flows through sound system culture, ska, lovers rock, jungle, grime, and UK drill over the following decades.",
    tags: ['windrush', 'lord kitchener', 'caribbean', 'calypso', 'mento', 'tilbury', 'black british music', 'immigration', 'empire windrush'],
  },
  {
    id: 'evt-rumba-kinshasa-1950',
    year: 1950,
    location: { lat: -4.4419, lng: 15.2663, city: 'Kinshasa', country: 'Democratic Republic of the Congo' },
    genre: ['Congolese Rumba', 'Afro-Cuban'],
    title: 'Congolese rumba is born as Cuban son returns to Africa',
    description: "In Léopoldville's bars and record shops, Congolese musicians encounter Cuban son recordings imported by Greek and Lebanese merchants — and recognize their own ancestral rhythms, carried to the Caribbean by enslaved Central Africans, now returning in creolized form. Artists like Wendo Kolosoy create Congolese rumba, reinterpreting son's clave patterns with Lingala vocals and finger-picked guitars. This becomes the most influential popular music in sub-Saharan Africa, spawning soukous, Franco's OK Jazz, and generations of pan-African dance music.",
    tags: ['congolese rumba', 'wendo kolosoy', 'leopoldville', 'cuban son', 'lingala', 'soukous', 'transatlantic', 'guitar', 'african pop'],
  },
  {
    id: 'evt-highlife-lagos-1952',
    year: 1952,
    location: { lat: 6.5244, lng: 3.3792, city: 'Lagos', country: 'Nigeria' },
    genre: ['Highlife', 'Afro-Pop'],
    title: "Highlife's golden age: E.T. Mensah and Bobby Benson electrify West Africa",
    description: "E.T. Mensah tours Lagos with the Tempos, while Bobby Benson's hotel band scene fuses Yoruba rhythms with jazz, calypso, and Cuban son in a joyful, horn-driven sound called highlife. Drawing on West African palm wine guitar traditions, brass band music inherited from colonial military bands, and the Cuban records flooding West African ports, Nigerian and Ghanaian highlife becomes the soundtrack of decolonization and lays the rhythmic foundation for juju, Afrobeat, and eventually the global Afrobeats explosion.",
    tags: ['highlife', 'et mensah', 'bobby benson', 'lagos', 'palm wine', 'brass band', 'yoruba', 'west african', 'decolonization'],
  },
  {
    id: 'evt-soundsystem-kingston-1956',
    year: 1956,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Sound System', 'R&B', 'Ska'],
    title: 'Jamaican sound systems birth DJ culture and proto-ska',
    description: "Clement \"Coxsone\" Dodd, Duke Reid, and Prince Buster build massive mobile sound systems in Kingston's yards and dance halls, playing imported American R&B records to packed crowds. Drawing on the DJ \"toasting\" tradition rooted in West African griot oratory carried through Kumina and Revival traditions, these sound system operators begin recording local artists, creating ska and launching Jamaica's extraordinary musical lineage: rocksteady, reggae, dub, dancehall, and the DJ culture that directly inspires hip hop in the Bronx.",
    tags: ['sound system', 'coxsone dodd', 'duke reid', 'prince buster', 'ska', 'toasting', 'kingston', 'dj culture', 'yard dance'],
  },
  {
    id: 'evt-highlife-accra-1958',
    year: 1958,
    location: { lat: 5.6037, lng: -0.187, city: 'Accra', country: 'Ghana' },
    genre: ['Highlife', 'Jazz'],
    title: 'Highlife meets jazz at Ghana independence celebrations',
    description: "In the euphoria of Ghanaian independence, highlife bands led by E.T. Mensah and the Tempos welcome American jazz musicians to Accra, creating electric cross-pollination between two streams of the African diaspora. Drawing on West African rhythmic traditions, calypso, and the swing jazz that diasporic Africans created in America, highlife reaches its peak as the soundtrack of Pan-African optimism, directly influencing Fela Kuti's Afrobeat experiments across the border in Lagos.",
    tags: ['highlife', 'et mensah', 'tempos', 'ghana independence', 'kwame nkrumah', 'pan-african', 'jazz fusion', 'accra'],
  },
  {
    id: 'evt-revolution-havana-1959',
    year: 1959,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Son Cubano', 'Mambo', 'Cha-cha-chá'],
    title: 'Cuban revolution freezes son and mambo, scatters musicians worldwide',
    description: "Fidel Castro's revolution and the subsequent U.S. embargo freeze Cuba's vibrant musical scene in amber, closing the legendary Tropicana-era nightclubs and scattering Cuban musicians across the Americas. Drawing on three decades of son cubano's golden age, mambo's explosive energy, and cha-cha-chá's elegance, these exiled musicians carry Cuban rhythms to New York, Miami, and Mexico City, where they seed salsa, Latin jazz, and boogaloo — while the musicians who remain develop nueva trova and timba behind the embargo's curtain.",
    tags: ['cuban revolution', 'castro', 'embargo', 'tropicana', 'exile', 'salsa', 'nueva trova', 'son cubano', 'mambo', 'diaspora'],
  },

  // ── Phase 4: The Rock & Soul Revolution (1960–1972) ────────────────
  {
    id: 'evt-british-blues-london-1962',
    year: 1962,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['British Blues', 'Rock'],
    title: 'Rolling Stones & the British Blues Boom',
    description: "Drawing on the electric Chicago blues of Muddy Waters and Howlin' Wolf, the Rolling Stones and the Yardbirds ignited a British Blues Boom that repackaged African-American music for a global audience. This transatlantic feedback loop laid the groundwork for hard rock, heavy metal, and the broader British Invasion that reshaped American pop culture.",
    tags: ['rolling stones', 'yardbirds', 'british blues', 'chicago blues', 'british invasion', 'transatlantic'],
  },
  {
    id: 'evt-merseybeat-liverpool-1963',
    year: 1963,
    location: { lat: 53.4084, lng: -2.9916, city: 'Liverpool', country: 'UK' },
    genre: ['Merseybeat', 'Pop Rock'],
    title: 'Beatles & the Merseybeat Explosion',
    description: "Fusing American rock & roll, Motown harmonies, and skiffle's DIY spirit, the Beatles turned Liverpool's Cavern Club scene into a worldwide phenomenon. Merseybeat's melodic sophistication and studio experimentation opened the door for psychedelia, progressive rock, and the concept of the self-contained songwriting band.",
    tags: ['beatles', 'merseybeat', 'cavern club', 'british invasion', 'pop rock', 'songwriting', 'liverpool'],
  },
  {
    id: 'evt-motown-detroit-1963',
    year: 1963,
    location: { lat: 42.3314, lng: -83.0458, city: 'Detroit', country: 'US' },
    genre: ['Motown', 'Soul', 'R&B'],
    title: 'Motown — The Sound of Young America',
    description: "Berry Gordy's Hitsville U.S.A. fused gospel vocal traditions, doo-wop harmony, and jazz-trained session musicians into a polished assembly-line pop-soul formula that crossed racial boundaries on AM radio. Motown's production blueprint and crossover ambition became the template for Philadelphia soul, Minneapolis funk, and virtually every pop-R&B act that followed.",
    tags: ['motown', 'berry gordy', 'hitsville', 'soul', 'crossover pop', 'detroit', 'supremes', 'temptations'],
  },
  {
    id: 'evt-southern-soul-memphis-1965',
    year: 1965,
    location: { lat: 35.1495, lng: -90.049, city: 'Memphis', country: 'US' },
    genre: ['Southern Soul', 'R&B'],
    title: 'Stax/Volt & the Memphis Soul Sound',
    description: "Built on the raw gospel-blues grit of the Mississippi Delta and an integrated house band (Booker T. & the MGs), Stax Records forged a grittier, horn-driven counterpoint to Motown's polished pop. Its deep-groove aesthetic fed directly into funk, Hi Records' Al Green era, and the muscular soul that shaped hip-hop sampling decades later.",
    tags: ['stax', 'southern soul', 'booker t', 'memphis', 'otis redding', 'integrated', 'horn driven'],
  },
  {
    id: 'evt-raga-rock-mumbai-1965',
    year: 1965,
    location: { lat: 19.076, lng: 72.8777, city: 'Mumbai', country: 'India' },
    genre: ['Raga Rock', 'Indian Classical', 'Psychedelic Rock'],
    title: 'Ravi Shankar & George Harrison — Raga Meets Rock',
    description: "Ravi Shankar's mastery of Hindustani classical raga tradition captivated George Harrison, sparking a cross-pollination that introduced drone, modal improvisation, and Indian instrumentation to Western rock. This East-meets-West dialogue seeded psychedelia's expanded consciousness, influenced minimalist composers like Terry Riley, and paved the way for later world-music fusions.",
    tags: ['ravi shankar', 'george harrison', 'raga rock', 'sitar', 'hindustani', 'cross-cultural', 'psychedelic'],
  },
  {
    id: 'evt-rocksteady-kingston-1966',
    year: 1966,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Rocksteady'],
    title: 'Rocksteady Slows the Ska Tempo',
    description: "As ska's frantic upbeat tempo gave way to a slower, bass-heavy groove influenced by American soul imports, rocksteady emerged in Kingston's studios with tighter vocal harmonies and spacious rhythmic pockets. This deceleration became the direct rhythmic precursor to reggae, dub production, and the entire riddim-driven culture of Jamaican dancehall.",
    tags: ['rocksteady', 'alton ellis', 'studio one', 'jamaican', 'bass', 'ska evolution', 'kingston'],
  },
  {
    id: 'evt-psychedelia-sf-1967',
    year: 1967,
    location: { lat: 37.7749, lng: -122.4194, city: 'San Francisco', country: 'US' },
    genre: ['Psychedelic Rock', 'Acid Rock'],
    title: 'Summer of Love — San Francisco Psychedelia',
    description: "Drawing on folk-rock, blues improvisation, raga drone, and electronic studio experimentation, the Grateful Dead, Jefferson Airplane, and their Haight-Ashbury peers forged psychedelic rock as both a sonic and countercultural movement. Its expansive jams and sonic adventurism fed directly into progressive rock, krautrock, jam bands, and the experimental ethos of electronic music.",
    tags: ['psychedelic', 'summer of love', 'grateful dead', 'haight ashbury', 'counterculture', 'acid rock', 'san francisco'],
  },
  {
    id: 'evt-heavy-metal-birmingham-1970',
    year: 1970,
    location: { lat: 52.4862, lng: -1.8904, city: 'Birmingham', country: 'UK' },
    genre: ['Heavy Metal', 'Hard Rock'],
    title: 'Black Sabbath Invents Heavy Metal',
    description: "Channeling the British blues boom's distortion and the industrial grimness of working-class Birmingham, Black Sabbath down-tuned their guitars and introduced occult imagery to create a new genre defined by heaviness and dread. Heavy metal's DNA would mutate across decades into thrash, doom, death metal, grunge, and stoner rock, becoming one of rock's most enduring global subcultures.",
    tags: ['black sabbath', 'heavy metal', 'hard rock', 'birmingham', 'working class', 'distortion', 'doom'],
  },
  {
    id: 'evt-salsa-nyc-1971',
    year: 1971,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Salsa', 'Latin'],
    title: 'Salsa Crystallizes in the Bronx',
    description: "Forged from Cuban son, Puerto Rican plena and bomba, and New York Latin jazz, salsa coalesced in the Bronx barrios through Fania Records and bandleaders like Willie Colón and Héctor Lavoe. This diasporic synthesis became the dominant pan-Latin dance music, influencing Latin pop, reggaetón's rhythmic DNA, and global Latin music markets for decades.",
    tags: ['salsa', 'fania records', 'willie colon', 'hector lavoe', 'bronx', 'latin', 'nuyorican'],
  },
  {
    id: 'evt-chicha-lima-1971',
    year: 1971,
    location: { lat: -12.0464, lng: -77.0428, city: 'Lima', country: 'Peru' },
    genre: ['Chicha', 'Cumbia Peruana', 'Psychedelic'],
    title: 'Chicha — Andean Cumbia Meets Psychedelic Surf Guitar',
    description: "Andean highland migrants in Lima fused Colombian cumbia rhythms, huayno melodies from the Andes, and the reverb-drenched psychedelic surf guitar filtering in from American and British rock. Chicha became the soundtrack of Peru's urban migration and laid the foundation for the broader cumbia digital and tropical bass movements that swept Latin America in the 2000s.",
    tags: ['chicha', 'cumbia peruana', 'huayno', 'andean', 'psychedelic', 'surf guitar', 'lima', 'migration'],
  },

  // ── Phase 5: Funk, Reggae & the Groove Continuum (1970–1982) ───────
  {
    id: 'evt-funk-augusta-1970',
    year: 1970,
    location: { lat: 33.4735, lng: -82.0105, city: 'Augusta', country: 'US' },
    genre: ['Funk'],
    title: 'James Brown Creates Funk',
    description: "Building on the rhythmic intensity of gospel, soul, and R&B, James Brown and his band stripped music down to \"The One\" — a downbeat-driven, polyrhythmic groove that prioritized rhythm over melody and harmony. Funk's percussive DNA became the foundational sample source for hip-hop, the rhythmic engine of disco, and a direct ancestor of electronic dance music worldwide.",
    tags: ['james brown', 'funk', 'the one', 'polyrhythm', 'groove', 'augusta', 'godfather of soul'],
  },
  {
    id: 'evt-reggae-kingston-1971',
    year: 1971,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Reggae', 'Roots Reggae'],
    title: 'Bob Marley & the Wailers — Reggae Goes Global',
    description: "Evolving from rocksteady's relaxed pulse and infused with Rastafarian spiritual consciousness, Bob Marley and the Wailers transformed reggae from a Jamaican street music into a global vehicle for anti-colonial resistance and Pan-African identity. Reggae's offbeat skank and bass-heavy production influenced punk, post-punk, dub poetry, and became the sonic bedrock for dancehall, lovers rock, and jungle.",
    tags: ['bob marley', 'wailers', 'reggae', 'rastafari', 'roots', 'kingston', 'resistance music', 'pan-african'],
  },
  {
    id: 'evt-hiphop-nyc-1973',
    year: 1973,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Hip Hop'],
    title: "DJ Kool Herc's Back-to-School Jam — Hip Hop Is Born",
    description: "Drawing on Jamaican sound-system culture, funk breakbeats, and the spoken-word traditions of the African-American griot and the Last Poets, DJ Kool Herc isolated and looped drum breaks at a Bronx block party, igniting hip hop. This foundational innovation spawned MCing, turntablism, breakdancing, and graffiti art — a culture that would become the dominant global popular music of the 21st century.",
    tags: ['dj kool herc', 'hip hop', 'bronx', 'block party', 'breakbeat', 'sound system', 'birth of hip hop'],
  },
  {
    id: 'evt-philly-soul-philadelphia-1974',
    year: 1974,
    location: { lat: 39.9526, lng: -75.1652, city: 'Philadelphia', country: 'US' },
    genre: ['Philadelphia Soul', 'Disco', 'R&B'],
    title: 'Gamble & Huff — Philly Soul Invents the Disco Template',
    description: "Kenny Gamble and Leon Huff married Motown's pop ambition with lush orchestral arrangements, four-on-the-floor kick drums, and sweeping string sections at Philadelphia International Records. The Philly soul sound became the direct architectural blueprint for disco, and its sophisticated production DNA carried forward into house music, UK garage, and contemporary R&B.",
    tags: ['gamble and huff', 'philly soul', 'philadelphia international', 'disco', 'orchestral', 'ojays', 'mfsb'],
  },
  {
    id: 'evt-dancehall-kingston-1975',
    year: 1975,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Dancehall', 'DJ Style'],
    title: 'Dancehall Emerges — DJ Toasting Overtakes Singers',
    description: "As dub production stripped reggae riddims to their skeletal bass and drum bones, DJs like U-Roy and Big Youth began \"toasting\" — rhythmic vocal chanting over instrumentals — shifting the spotlight from singers to selectors and MCs. Dancehall's emphasis on vocal rhythm and riddim reuse directly influenced hip-hop MCing, ragga, reggaetón's dembow rhythm, and UK grime.",
    tags: ['dancehall', 'u-roy', 'big youth', 'toasting', 'sound system', 'kingston', 'dj style', 'riddim'],
  },
  {
    id: 'evt-punk-london-1976',
    year: 1976,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Punk Rock'],
    title: 'Punk — Sex Pistols Strip Rock to Three Chords',
    description: "Reacting against progressive rock's bloat and drawing on the raw energy of garage rock, New York proto-punk (Ramones, Television), and reggae's outsider stance, the Sex Pistols and the Clash detonated punk as both a musical and socio-political movement. Punk's DIY ethos and confrontational energy spawned post-punk, new wave, hardcore, indie rock, and riot grrrl — reshaping how music was made, distributed, and consumed.",
    tags: ['sex pistols', 'clash', 'punk', 'diy', 'ramones', 'anti-establishment', 'london', 'three chords'],
  },
  {
    id: 'evt-disco-nyc-1977',
    year: 1977,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Disco'],
    title: 'Studio 54 & the Disco Revolution',
    description: "Fueled by Philly soul's orchestral grooves, funk's rhythmic drive, and the liberation politics of gay, Black, and Latino nightlife communities, disco exploded into the mainstream through clubs like Studio 54 and the Paradise Garage. When the backlash came, disco didn't die — it mutated into house music in Chicago, techno in Detroit, and Hi-NRG in Europe, seeding the entire electronic dance music revolution.",
    tags: ['disco', 'studio 54', 'paradise garage', 'nightlife', 'lgbtq', 'dance music', 'four on the floor'],
  },
  {
    id: 'evt-2tone-coventry-1979',
    year: 1979,
    location: { lat: 52.4068, lng: -1.5197, city: 'Coventry', country: 'UK' },
    genre: ['2 Tone', 'Ska Revival', 'Punk'],
    title: '2 Tone Ska Revival',
    description: "Merging the upstroke rhythms of Jamaican ska and rocksteady with punk's raw energy and anti-racist politics, bands like the Specials and Madness launched the 2 Tone movement from working-class Coventry. This multiracial fusion influenced third-wave ska in the 1990s, fed into the broader post-punk landscape, and demonstrated how Caribbean diasporic music could be continually reinvented in British contexts.",
    tags: ['2 tone', 'specials', 'madness', 'ska revival', 'coventry', 'anti-racism', 'multicultural'],
  },
  {
    id: 'evt-electronic-dusseldorf-1979',
    year: 1979,
    location: { lat: 51.2277, lng: 6.7735, city: 'Düsseldorf', country: 'Germany' },
    genre: ['Electronic', 'Synth-Pop', 'Krautrock'],
    title: 'Kraftwerk & the Electronic Future',
    description: "Building on the experimental motorik rhythms of krautrock and musique concrète's tape manipulations, Kraftwerk synthesized man and machine into minimalist electronic pop that reimagined music as digital, repetitive, and futuristic. Their influence proved seismic: Detroit techno, synth-pop, electro, hip-hop production, and virtually every strand of electronic dance music traces a direct lineage back to their Kling Klang studio.",
    tags: ['kraftwerk', 'electronic', 'synth', 'krautrock', 'kling klang', 'dusseldorf', 'machine music', 'futurism'],
  },
  {
    id: 'evt-desert-blues-bamako-1980',
    year: 1980,
    location: { lat: 12.6392, lng: -8.0029, city: 'Bamako', country: 'Mali' },
    genre: ['Desert Blues', 'West African'],
    title: 'Ali Farka Touré — The African Bluesman',
    description: "Rooted in the centuries-old string traditions of the Songhai and Mandé peoples along the Niger River, Ali Farka Touré's hypnotic guitar style revealed the deep African ancestry of the American blues, closing a transatlantic circle that began with the slave trade. His work opened Western ears to Malian music and paved the way for Tinariwen, the Festival in the Desert, and the global \"desert blues\" movement.",
    tags: ['ali farka toure', 'desert blues', 'songhai', 'mande', 'niger river', 'bamako', 'transatlantic', 'guitar'],
  },
  {
    id: 'evt-township-jive-johannesburg-1981',
    year: 1981,
    location: { lat: -26.2041, lng: 28.0473, city: 'Johannesburg', country: 'South Africa' },
    genre: ['Mbaqanga', 'Township Jive', 'Disco'],
    title: 'Mbaqanga Meets Disco — Township Jive',
    description: "Blending the rhythmic drive of mbaqanga (Zulu jive), the vocal harmonies of isicathamiya, and the pulsing energy of imported disco and synth-pop, Johannesburg's township musicians forged a vibrant dance music under apartheid's shadow. This township jive sound propelled Paul Simon's Graceland collaboration into global consciousness and became a precursor to kwaito and South Africa's contemporary amapiano explosion.",
    tags: ['mbaqanga', 'township jive', 'isicathamiya', 'johannesburg', 'apartheid', 'graceland', 'kwaito', 'south african'],
  },

  // ── Phase 6: Electronic Music's Transatlantic Journey (1982–1998) ──
  {
    id: 'evt-house-chicago-1984',
    year: 1984,
    location: { lat: 41.8781, lng: -87.6298, city: 'Chicago', country: 'US' },
    genre: ['House'],
    title: 'Frankie Knuckles & the Birth of House Music',
    description: "Drawing on disco, Philly soul, and European synth-pop, Frankie Knuckles forged house music at the Warehouse, layering drum machines over soulful vocals to keep the dancefloor alive after disco's commercial death. Chicago house would become the blueprint for acid house in London, rave culture across Europe, and eventually the global EDM explosion of the 2010s.",
    tags: ['house', 'frankie knuckles', 'warehouse', 'chicago', 'disco', 'drum machine', 'dance music'],
  },
  {
    id: 'evt-techno-detroit-1985',
    year: 1985,
    location: { lat: 42.3314, lng: -83.0458, city: 'Detroit', country: 'US' },
    genre: ['Techno'],
    title: 'The Belleville Three: Detroit Techno Is Born',
    description: "Fusing Kraftwerk's electronic futurism, Parliament-Funkadelic's Afrofuturism, and the post-industrial mood of a declining Motor City, Juan Atkins, Derrick May, and Kevin Saunderson invented techno. Their machine-driven sound would cross the Atlantic to ignite Berlin's reunification-era club scene and seed the entire European techno movement from Tresor to Berghain.",
    tags: ['techno', 'belleville three', 'juan atkins', 'derrick may', 'kevin saunderson', 'detroit', 'kraftwerk', 'afrofuturism'],
  },
  {
    id: 'evt-acid-house-london-1986',
    year: 1986,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Acid House', 'Rave'],
    title: 'Acid House Arrives: The UK Rave Explosion',
    description: "Chicago's acid house tracks — built on the squelching Roland TB-303 — landed in London and detonated a rave culture that swept across Britain, merging with UK sound-system traditions and Ecstasy culture. The movement reshaped British youth culture and laid direct groundwork for jungle, drum and bass, UK garage, and eventually grime.",
    tags: ['acid house', 'rave', 'tb-303', 'london', 'chicago influence', 'uk dance', 'ecstasy', 'second summer of love'],
  },
  {
    id: 'evt-balearic-ibiza-1988',
    year: 1988,
    location: { lat: 38.9067, lng: 1.4206, city: 'Ibiza', country: 'Spain' },
    genre: ['Balearic Beat', 'House'],
    title: "Balearic Beat: Ibiza Becomes Dance Music's Mecca",
    description: "DJs like Alfredo Fiorito blended Chicago house, Euro-disco, indie rock, and world music into an eclectic, sun-drenched style at clubs like Amnesia, creating the Balearic sound. British DJs brought the experience back to London, directly igniting the Second Summer of Love and establishing Ibiza as the global epicenter of club culture for decades to come.",
    tags: ['balearic beat', 'ibiza', 'amnesia', 'alfredo', 'club culture', 'eclectic', 'summer of love'],
  },
  {
    id: 'evt-madchester-manchester-1988',
    year: 1988,
    location: { lat: 53.4808, lng: -2.2426, city: 'Manchester', country: 'UK' },
    genre: ['Madchester', 'Indie Dance'],
    title: 'Madchester: Indie Rock Meets Acid House',
    description: "Drawing on the collision between Manchester's post-punk guitar tradition — Joy Division, The Smiths — and the acid house flooding in from Chicago and Ibiza, bands like The Stone Roses and Happy Mondays fused rock with dance beats at the Haçienda. Madchester bridged the gap between indie and electronic music, paving the way for Britpop, the Chemical Brothers' big beat, and the broader acceptance of dance culture in mainstream rock.",
    tags: ['madchester', 'hacienda', 'stone roses', 'happy mondays', 'indie dance', 'manchester', 'factory records'],
  },
  {
    id: 'evt-techno-berlin-1991',
    year: 1991,
    location: { lat: 52.52, lng: 13.405, city: 'Berlin', country: 'Germany' },
    genre: ['Techno'],
    title: 'Tresor Opens: Detroit Techno Finds a Home in Reunified Berlin',
    description: "In a vault beneath a former department store near the demolished Wall, Tresor opened as a direct conduit for Detroit techno into the euphoric chaos of reunified Berlin, with Jeff Mills and Underground Resistance becoming resident icons. Berlin's minimal, uncompromising club culture — extending through Love Parade, Berghain, and countless labels — would make the city the global capital of techno.",
    tags: ['tresor', 'techno', 'berlin', 'jeff mills', 'underground resistance', 'reunification', 'berghain', 'love parade'],
  },
  {
    id: 'evt-jungle-london-1993',
    year: 1993,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Jungle', 'Drum and Bass'],
    title: 'Jungle Emerges: Breakbeats, Dancehall & Bass Collide',
    description: "Born from London's multiethnic underground, jungle chopped up amen breaks at furious tempos and laced them with Jamaican dancehall vocals, dub basslines, and the energy of acid house raves. It matured into drum and bass through artists like Goldie and LTJ Bukem, and its rhythmic DNA would surface decades later in grime, dubstep, and the global bass music movement.",
    tags: ['jungle', 'drum and bass', 'breakbeat', 'amen break', 'dancehall', 'goldie', 'london', 'bass music'],
  },
  {
    id: 'evt-trip-hop-bristol-1994',
    year: 1994,
    location: { lat: 51.4545, lng: -2.5879, city: 'Bristol', country: 'UK' },
    genre: ['Trip Hop'],
    title: 'Bristol Trip-Hop: Massive Attack, Portishead & Tricky',
    description: "Rooted in Bristol's sound-system culture, dub reggae, and hip-hop sampling, Massive Attack's \"Blue Lines\" and Portishead's \"Dummy\" created trip-hop — a slow, cinematic, melancholic fusion of beats, bass, and atmosphere. The genre's moody production aesthetics rippled outward into downtempo, abstract hip hop, and the textural experimentation of artists from Radiohead to Burial.",
    tags: ['trip hop', 'massive attack', 'portishead', 'tricky', 'bristol', 'downtempo', 'dub', 'cinematic'],
  },
  {
    id: 'evt-psytrance-telaviv-1995',
    year: 1995,
    location: { lat: 32.0853, lng: 34.7818, city: 'Tel Aviv', country: 'Israel' },
    genre: ['Psytrance', 'Goa Trance'],
    title: "Goa Trance to Psytrance: Israel's Electronic Pilgrimage",
    description: "Israeli travelers returning from Goa's beach parties brought back a hypnotic, psychedelic form of trance built on Kraftwerk's sequencing, acid house's repetition, and Eastern modal scales, transplanting it into the deserts and clubs of Tel Aviv. Psytrance spread into a worldwide festival circuit — from Boom in Portugal to events in Japan and Brazil — and influenced the progressive and full-on trance subgenres that followed.",
    tags: ['psytrance', 'goa trance', 'tel aviv', 'israel', 'festival', 'psychedelic', 'electronic'],
  },
  {
    id: 'evt-french-touch-paris-1996',
    year: 1996,
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    genre: ['French Touch', 'House'],
    title: 'French Touch: Daft Punk Filters Disco Through House',
    description: "Drawing on Chicago house, P-funk, and vintage disco filtered through a distinctly Parisian lens, Daft Punk, Cassius, and Étienne de Crécy created French touch — a warm, funky, sample-heavy variant of house music. Daft Punk's crossover success opened the door for Justice, Ed Banger Records, and ultimately the mainstream EDM wave of the late 2000s, proving electronic music could be both artful and globally populist.",
    tags: ['french touch', 'daft punk', 'cassius', 'paris', 'filter house', 'disco', 'ed banger'],
  },
  {
    id: 'evt-dancehall-digital-kingston-1998',
    year: 1998,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Dancehall', 'Ragga'],
    title: 'Digital Dancehall: The Sleng Teng Revolution Matures',
    description: "Building on the Sleng Teng riddim's 1985 digital rupture — when a Casio keyboard replaced live musicians — Kingston's dancehall scene fully embraced digital production by the late 1990s, with producers like Dave Kelly and Steely & Clevie crafting riddims that dominated Caribbean sound systems. Digital dancehall's rhythmic patterns and vocal styles fed directly into reggaeton, moombahton, and London's jungle and grime scenes.",
    tags: ['dancehall', 'ragga', 'sleng teng', 'digital', 'riddim', 'dave kelly', 'kingston', 'casio'],
  },

  // ── Phase 7: Hip Hop's Roots & Global Branches (1979–2010) ────────
  {
    id: 'evt-hiphop-nyc-1979',
    year: 1979,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Hip Hop'],
    title: '"Rapper\'s Delight": Hip Hop Captured on Wax',
    description: "Built on the Bronx block-party innovations of DJ Kool Herc, Afrika Bambaataa, and Grandmaster Flash — who isolated funk and disco breaks for MCs to rhyme over — the Sugarhill Gang's \"Rapper's Delight\" became the first commercially successful hip-hop record, bringing the culture to a national audience. This proof-of-concept on vinyl opened the floodgates for hip hop as a recorded art form, leading directly to the conscious rap of \"The Message\" and the golden age boom-bap era.",
    tags: ['rappers delight', 'sugarhill gang', 'hip hop', 'bronx', 'old school', 'first rap record'],
  },
  {
    id: 'evt-conscious-rap-nyc-1982',
    year: 1982,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Hip Hop', 'Conscious Rap'],
    title: 'Grandmaster Flash & "The Message": Rap as Social Commentary',
    description: "Extending the party-rap template of \"Rapper's Delight\" into the realm of urgent social realism, Grandmaster Flash and the Furious Five's \"The Message\" captured the desperation of inner-city life over a spare, haunting beat, proving hip hop could be a vehicle for storytelling and protest. Its influence echoed through Public Enemy's political fire, N.W.A.'s gangsta realism, and every conscious rapper from Nas to Kendrick Lamar.",
    tags: ['grandmaster flash', 'the message', 'conscious rap', 'social commentary', 'furious five', 'hip hop'],
  },
  {
    id: 'evt-rap-rock-nyc-1986',
    year: 1986,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Hip Hop', 'Rap Rock'],
    title: 'Run-DMC & Aerosmith: Rap-Rock Crossover Shatters Barriers',
    description: "Drawing on hip hop's existing love affair with hard rock riffs and the Beastie Boys' genre-blurring experiments, Run-DMC's collaboration with Aerosmith on \"Walk This Way\" demolished the wall between rap and rock audiences, becoming the first hip-hop crossover smash on MTV. This fusion opened the commercial mainstream to hip hop and directly prefigured the rap-rock and nu-metal movements of the 1990s.",
    tags: ['run-dmc', 'aerosmith', 'walk this way', 'rap rock', 'crossover', 'mtv', 'hip hop'],
  },
  {
    id: 'evt-hiphop-dakar-1991',
    year: 1991,
    location: { lat: 14.7167, lng: -17.4677, city: 'Dakar', country: 'Senegal' },
    genre: ['Hip Hop', 'African Hip Hop'],
    title: 'Positive Black Soul: West African Hip Hop Takes Root',
    description: "Inspired by the Bronx's golden-age hip hop and channeling it through Wolof language, mbalax rhythms, and the griot storytelling tradition, Positive Black Soul became Senegal's first hip-hop group to gain international recognition. Their success catalyzed an entire Francophone African hip-hop movement and influenced the politically charged rap scenes that would emerge across West Africa, from Burkina Faso to Ghana's hiplife.",
    tags: ['positive black soul', 'senegalese hip hop', 'dakar', 'wolof', 'griot', 'african hip hop', 'francophone'],
  },
  {
    id: 'evt-hiphop-tokyo-1993',
    year: 1993,
    location: { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan' },
    genre: ['Hip Hop', 'Japanese Hip Hop'],
    title: 'Japanese Hip Hop: Scha Dara Parr & DJ Krush',
    description: "Absorbing New York's golden-age boom-bap through Harajuku's B-boy culture and adapting it to Japanese language and sensibilities, artists like Scha Dara Parr brought playful lyricism while DJ Krush pioneered abstract, cinematic turntablism rooted in jazz and ambient textures. Japanese hip hop established Asia's first major rap scene and set the stage for K-hip hop in Seoul and the lo-fi hip hop aesthetic that captivated global streaming.",
    tags: ['scha dara parr', 'dj krush', 'japanese hip hop', 'tokyo', 'turntablism', 'harajuku', 'boom bap'],
  },
  {
    id: 'evt-hiphop-saopaulo-1995',
    year: 1995,
    location: { lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brazil' },
    genre: ['Hip Hop', 'Brazilian Hip Hop'],
    title: "Racionais MC's: Brazilian Hip Hop from the Favelas",
    description: "Channeling the social fury of N.W.A. and Public Enemy through the lived reality of São Paulo's periferia, Racionais MC's delivered unflinching narratives of poverty, racism, and police violence over sparse, bass-heavy beats inflected with samba and MPB samples. Their landmark album \"Sobrevivendo no Inferno\" became a cultural touchstone that elevated Brazilian hip hop into a mass social movement and paved the way for funk carioca and baile funk.",
    tags: ['racionais mcs', 'brazilian hip hop', 'sao paulo', 'periferia', 'favela', 'sobrevivendo no inferno'],
  },
  {
    id: 'evt-k-hiphop-seoul-1996',
    year: 1996,
    location: { lat: 37.5665, lng: 126.978, city: 'Seoul', country: 'South Korea' },
    genre: ['Hip Hop', 'K-Hip Hop'],
    title: 'Seo Taiji & Boys Spark K-Hip Hop',
    description: "Fusing American new jack swing and hip hop with Korean pop melodies, Seo Taiji & Boys shattered Korean music conventions in the early 1990s, igniting a youth culture revolution that redefined the entertainment industry. Their genre-blending approach directly birthed the K-pop idol system and the Korean hip-hop underground that would later produce global stars like Epik High, Jay Park, and the rap lines of BTS.",
    tags: ['seo taiji', 'k-hip hop', 'seoul', 'new jack swing', 'k-pop', 'korean hip hop', 'youth revolution'],
  },
  {
    id: 'evt-cuban-hiphop-havana-2001',
    year: 2001,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Hip Hop', 'Cuban Hip Hop'],
    title: "Cuban Hip Hop: Orishas & La Habana's Rap Underground",
    description: "Absorbing American hip hop through contraband tapes and Radio Martí while layering it over Afro-Cuban rumba, son, and Santería chants, Havana's rap scene — led by Orishas, Obsesión, and the annual Cuban Hip Hop Festival — became a rare space for social critique within revolutionary Cuba. Cuban hip hop influenced the broader Latin American conscious rap movement and fed into the reggaeton pipeline as Cuban artists migrated to Miami.",
    tags: ['orishas', 'cuban hip hop', 'havana', 'afro-cuban', 'rap', 'reggaeton', 'obsesion'],
  },
  {
    id: 'evt-hiplife-accra-2004',
    year: 2004,
    location: { lat: 5.6037, lng: -0.187, city: 'Accra', country: 'Ghana' },
    genre: ['Hiplife', 'Hip Hop'],
    title: 'Hiplife: Highlife Meets Hip Hop in Accra',
    description: "Pioneered by Reggie Rockstone and refined by artists like Obrafour and VIP, hiplife married the melodic, horn-driven sweetness of Ghanaian highlife with hip-hop beats, Twi-language rapping, and dancehall energy, creating a distinctly West African pop-rap hybrid. Hiplife dominated Ghanaian airwaves and set the foundation for Afrobeats' global commercial breakthrough.",
    tags: ['hiplife', 'reggie rockstone', 'accra', 'ghana', 'highlife', 'twi', 'afrobeats origin'],
  },
  {
    id: 'evt-latin-trap-medellin-2005',
    year: 2005,
    location: { lat: 6.2476, lng: -75.5658, city: 'Medellín', country: 'Colombia' },
    genre: ['Latin Trap', 'Reggaeton'],
    title: 'Latin Trap Begins Forming in Medellín',
    description: "Drawing on Atlanta's trap production — its 808 bass drops, hi-hat rolls, and dark atmospherics — and merging it with reggaeton's dembow riddim and the street narratives of Colombian urban life, Medellín's underground producers began forging Latin trap as a distinct genre. This early experimentation would explode a decade later through artists like J Balvin, Maluma, and Bad Bunny, turning Latin trap into one of the most commercially dominant global sounds.",
    tags: ['latin trap', 'medellin', 'reggaeton', 'trap', 'dembow', '808', 'j balvin', 'colombian'],
  },

  // ── Phase 8: Latin Fusion Highway (1950–2020) ─────────────────────
  {
    id: 'evt-merengue-santodomingo-1958',
    year: 1958,
    location: { lat: 18.4861, lng: -69.9312, city: 'Santo Domingo', country: 'Dominican Republic' },
    genre: ['Merengue'],
    title: 'Merengue modernizes under Trujillo-era big bands',
    description: "Drawing on Cuban son, Haitian kompa, and rural perico ripiao accordion traditions, Dominican bandleaders like Johnny Ventura electrify merengue with brass sections and faster tempos in Santo Domingo's ballrooms. This modernized merengue laid the groundwork for the genre's 1980s explosion in New York and its influence on reggaeton's rhythmic DNA.",
    tags: ['merengue', 'johnny ventura', 'perico ripiao', 'trujillo', 'dominican', 'santo domingo', 'big band'],
  },
  {
    id: 'evt-cumbia-barranquilla-1962',
    year: 1962,
    location: { lat: 10.9685, lng: -74.7813, city: 'Barranquilla', country: 'Colombia' },
    genre: ['Cumbia'],
    title: "Colombian cumbia enters its golden age in Barranquilla",
    description: "Drawing on Afro-Colombian gaita flute traditions and Caribbean brass band culture, orchestras like Los Corraleros de Majagual and Lucho Bermúdez bring cumbia to its commercial peak during Barranquilla's Carnival. This golden-age cumbia laid the groundwork for cumbia's migration across Latin America, spawning chicha in Peru, cumbia villera in Argentina, and sonidero culture in Mexico.",
    tags: ['cumbia', 'barranquilla', 'los corraleros', 'lucho bermudez', 'carnival', 'gaita', 'colombian', 'golden age'],
  },
  {
    id: 'evt-boogaloo-nyc-1966',
    year: 1966,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Latin Boogaloo', 'R&B', 'Mambo'],
    title: 'Latin boogaloo fuses R&B and mambo in Spanish Harlem',
    description: "Drawing on their parents' mambo and the R&B pouring from Black American radio, Puerto Rican teenagers like Joe Cuba, Pete Rodriguez, and Ricardo Ray create Latin boogaloo — the first bilingual Latin-soul crossover. This short-lived but explosive genre laid the groundwork for salsa's formation and anticipated the Latin-urban fusions of reggaeton decades later.",
    tags: ['latin boogaloo', 'joe cuba', 'pete rodriguez', 'spanish harlem', 'mambo', 'r&b', 'bilingual', 'nuyorican'],
  },
  {
    id: 'evt-fania-nyc-1971',
    year: 1971,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Salsa'],
    title: 'Fania All-Stars ignite the global salsa movement at the Cheetah',
    description: "Drawing on Cuban son montuno, Puerto Rican plena, and New York jazz, the Fania All-Stars — Celia Cruz, Héctor Lavoe, Willie Colón, and Rubén Blades — perform their legendary concert at the Cheetah nightclub, launching salsa as a pan-Latin identity movement. This moment laid the groundwork for salsa's conquest of Caracas, Cali, and the world, and seeded the Latin pop infrastructure that reggaeton would later inherit.",
    tags: ['fania all-stars', 'celia cruz', 'hector lavoe', 'willie colon', 'ruben blades', 'cheetah', 'salsa', 'pan-latin'],
  },
  {
    id: 'evt-sonidero-mexicocity-1975',
    year: 1975,
    location: { lat: 19.4326, lng: -99.1332, city: 'Mexico City', country: 'Mexico' },
    genre: ['Cumbia Sonidera', 'Cumbia'],
    title: "Sonidero sound systems bring cumbia to Mexico City's barrios",
    description: "Drawing on Colombian cumbia imports and Jamaican sound system culture, sonideros — mobile DJs with massive speaker stacks — transform Mexico City's working-class neighborhoods into open-air dance halls. The sonidero tradition laid the groundwork for cumbia rebajada (slowed cumbia), Mexican regional music's dominance on streaming platforms, and the global Latin bass movement.",
    tags: ['sonidero', 'cumbia sonidera', 'mexico city', 'sound system', 'tepito', 'cumbia rebajada', 'barrio'],
  },
  {
    id: 'evt-bachata-santodomingo-1980',
    year: 1980,
    location: { lat: 18.4861, lng: -69.9312, city: 'Santo Domingo', country: 'Dominican Republic' },
    genre: ['Bachata'],
    title: "Bachata emerges from Santo Domingo's barrios as the people's music",
    description: "Drawing on bolero romanticism and the guitar-driven recordings of José Manuel Calderón in the 1960s, a new generation of bachateros like Luis Segura and Blas Durán electrify the genre in Santo Domingo's working-class colmadones. Initially stigmatized by elites, bachata laid the groundwork for Juan Luis Guerra's crossover success, Romeo Santos' urban bachata, and the genre's fusion with reggaeton in the 2010s.",
    tags: ['bachata', 'luis segura', 'blas duran', 'colmadon', 'musica de amargue', 'santo domingo', 'dominican'],
  },
  {
    id: 'evt-cumbia-villera-buenosaires-1990',
    year: 1990,
    location: { lat: -34.6037, lng: -58.3816, city: 'Buenos Aires', country: 'Argentina' },
    genre: ['Cumbia Villera', 'Cumbia'],
    title: "Cumbia villera erupts from Buenos Aires' shantytowns",
    description: "Drawing on Colombian cumbia's decades-long migration through Peru and Bolivia and the raw energy of Argentine punk, groups like Damas Gratis and Pibes Chorros create cumbia villera — the sound of Buenos Aires' villas miseria, with lyrics about poverty, crime, and street life. Cumbia villera laid the groundwork for digital cumbia producers and the global bass scene connecting Buenos Aires to Mexico City and London.",
    tags: ['cumbia villera', 'damas gratis', 'pibes chorros', 'villa miseria', 'buenos aires', 'argentine cumbia', 'digital cumbia'],
  },
  {
    id: 'evt-reggaeton-underground-sanjuan-1993',
    year: 1993,
    location: { lat: 18.4655, lng: -66.1057, city: 'San Juan', country: 'Puerto Rico' },
    genre: ['Reggaeton', 'Dembow'],
    title: "DJ Playero's underground tapes birth reggaeton in San Juan",
    description: "Drawing on Panamanian reggae en español, Jamaican dancehall's dembow riddim, and hip hop production, DJ Playero and DJ Nelson circulate mixtapes from housing projects in San Juan featuring Daddy Yankee, Tego Calderón, and Vico C. These underground cassettes laid the groundwork for reggaeton's commercial explosion with \"Gasolina\" in 2004 and its eventual domination of global streaming.",
    tags: ['dj playero', 'underground reggaeton', 'dembow', 'daddy yankee', 'tego calderon', 'san juan', 'playero tapes'],
  },
  {
    id: 'evt-bad-bunny-sanjuan-2020',
    year: 2020,
    location: { lat: 18.4655, lng: -66.1057, city: 'San Juan', country: 'Puerto Rico' },
    genre: ['Reggaeton', 'Latin Trap', 'Latin Pop'],
    title: 'Bad Bunny makes Latin music #1 on US Spotify',
    description: "Drawing on reggaeton's underground roots, Latin trap, and global pop production, Bad Bunny's \"YHLQMDLG\" becomes the most-streamed album on Spotify in the US — a first for an entirely Spanish-language record. This moment laid the groundwork for Latin music's permanent place in mainstream global pop, influencing artists from Drake to Rosalía and proving that the language barrier in music was finally broken.",
    tags: ['bad bunny', 'yhlqmdlg', 'latin trap', 'spotify', 'reggaeton', 'san juan', 'spanish language pop'],
  },

  // ── Phase 9: Asia, Middle East & Global South (1960–2020) ──────────
  {
    id: 'evt-bollywood-mumbai-1960',
    year: 1960,
    location: { lat: 19.076, lng: 72.8777, city: 'Mumbai', country: 'India' },
    genre: ['Bollywood', 'Filmi', 'Disco'],
    title: 'R.D. Burman fuses disco, rock, and jazz into Bollywood scores',
    description: "Drawing on his father S.D. Burman's classical Indian film scoring, Western rock, and jazz, Rahul Dev Burman revolutionizes Bollywood music with funky bass lines, electronic effects, and yodeling vocal techniques. His innovative soundtracks laid the groundwork for Bollywood's global reach, the Indian remix culture of the 1990s, and the sample-hunting that connects Bollywood to hip hop and electronic music worldwide.",
    tags: ['rd burman', 'bollywood', 'filmi', 'asha bhosle', 'playback singing', 'mumbai', 'hindi film music', 'funk'],
  },
  {
    id: 'evt-group-sounds-tokyo-1966',
    year: 1966,
    location: { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan' },
    genre: ['Group Sounds', 'Japanese Rock'],
    title: 'Group Sounds: Japanese bands absorb the Beatles and garage rock',
    description: "Drawing on the British Invasion and American garage rock filtering through US military bases, bands like The Spiders, The Tigers, and The Tempters ignite the Group Sounds boom in Tokyo's Ginza district. This explosion of Japanese beat music laid the groundwork for Yellow Magic Orchestra's electronic innovations, the visual kei movement, and J-pop's unique synthesis of Western and Japanese aesthetics.",
    tags: ['group sounds', 'the spiders', 'the tigers', 'ginza', 'japanese rock', 'british invasion', 'tokyo'],
  },
  {
    id: 'evt-juju-lagos-1978',
    year: 1978,
    location: { lat: 6.5244, lng: 3.3792, city: 'Lagos', country: 'Nigeria' },
    genre: ['Jùjú', 'Yoruba Music'],
    title: 'King Sunny Adé modernizes jùjú with pedal steel and synths',
    description: "Drawing on the talking drum traditions of Yoruba jùjú music pioneered by I.K. Dairo and the influence of American country pedal steel guitar, King Sunny Adé layers shimmering guitar textures and synthesizers into marathon dance performances. His albums on Island Records laid the groundwork for Nigeria's reputation as Africa's music powerhouse and directly influenced the Afrobeats producers who would follow.",
    tags: ['king sunny ade', 'juju', 'pedal steel', 'yoruba', 'talking drum', 'island records', 'lagos', 'nigerian'],
  },
  {
    id: 'evt-rai-algiers-1990',
    year: 1990,
    location: { lat: 36.7538, lng: 3.0588, city: 'Algiers', country: 'Algeria' },
    genre: ['Raï', 'World Music'],
    title: 'Khaled\'s "Didi" takes raï from Algiers to the global charts',
    description: "Drawing on Oran's rebellious raï tradition — which fused Bedouin folk poetry with funk, disco, and synthesizers in the 1970s — Khaled records \"Didi\" in France, becoming raï's first global pop hit. This breakthrough laid the groundwork for North African music's influence on French hip hop, Maghreb-electronic fusion, and the broader normalization of Arabic-language pop in Western markets.",
    tags: ['khaled', 'didi', 'rai', 'oran', 'algiers', 'north african pop', 'world music', 'maghreb'],
  },
  {
    id: 'evt-kpop-seoul-1996',
    year: 1996,
    location: { lat: 37.5665, lng: 126.978, city: 'Seoul', country: 'South Korea' },
    genre: ['K-Pop'],
    title: 'H.O.T. debuts, launching the K-pop idol factory model',
    description: "Drawing on American new jack swing, Japanese idol culture, and Lee Soo-man's SM Entertainment training system, the boy band H.O.T. debuts with a fully manufactured pop formula — years of trainee preparation, synchronized choreography, and multimedia marketing. This factory model laid the groundwork for the K-pop industrial complex that would produce TVXQ, Girls' Generation, BTS, and BLACKPINK, reshaping global pop culture.",
    tags: ['hot', 'sm entertainment', 'lee soo-man', 'idol system', 'kpop', 'seoul', 'trainee system'],
  },
  {
    id: 'evt-arabic-indie-beirut-2005',
    year: 2005,
    location: { lat: 33.8938, lng: 35.5018, city: 'Beirut', country: 'Lebanon' },
    genre: ['Arabic Indie Rock', 'Alternative'],
    title: "Mashrou' Leila pioneers Arabic indie rock in Beirut",
    description: "Drawing on Western indie rock, Arabic maqam scales, and Beirut's cosmopolitan post-civil-war cultural revival, Mashrou' Leila forms at the American University of Beirut, singing openly about politics, sexuality, and identity in Arabic. Their success laid the groundwork for a pan-Arab indie movement from Amman to Cairo, and proved that Arabic-language alternative music could fill arenas across the Middle East and Europe.",
    tags: ['mashrou leila', 'arabic indie', 'beirut', 'lebanese music', 'arab alternative', 'maqam', 'aub'],
  },
  {
    id: 'evt-gangnam-style-seoul-2012',
    year: 2012,
    location: { lat: 37.5665, lng: 126.978, city: 'Seoul', country: 'South Korea' },
    genre: ['K-Pop', 'Electronic'],
    title: 'PSY\'s "Gangnam Style" becomes the first YouTube video to hit 1 billion views',
    description: "Drawing on K-pop's polished production machine and satirizing Seoul's nouveau riche Gangnam district culture, PSY creates a viral phenomenon that proves Asian pop can dominate Western media without conforming to Western aesthetics. This viral moment laid the groundwork for BTS and BLACKPINK's later global domination, and established YouTube and social media as the primary launchpad for non-English-language pop worldwide.",
    tags: ['psy', 'gangnam style', 'youtube', 'viral', 'kpop', 'seoul', 'billion views'],
  },
  {
    id: 'evt-afrofusion-accra-2019',
    year: 2019,
    location: { lat: 5.6037, lng: -0.187, city: 'Accra', country: 'Ghana' },
    genre: ['Afrobeats', 'Amapiano', 'Highlife'],
    title: 'Ghana-Nigeria-South Africa triangle forges Afrobeats-Amapiano fusion',
    description: "Drawing on Ghana's highlife and azonto dance culture, Nigerian Afrobeats production, and South Africa's amapiano log drums, Accra becomes the nexus of a pan-African sonic triangle. Artists like Burna Boy, Wizkid, and Ghana's Sarkodie collaborate across borders while amapiano rhythms seep into West African productions. This triangular fusion laid the groundwork for African popular music's dominance on global streaming platforms.",
    tags: ['afrobeats', 'amapiano', 'accra', 'ghana', 'sarkodie', 'azonto', 'pan-african', 'nigeria-sa triangle'],
  },
  {
    id: 'evt-indian-hiphop-mumbai-2020',
    year: 2020,
    location: { lat: 19.076, lng: 72.8777, city: 'Mumbai', country: 'India' },
    genre: ['Indian Hip Hop', 'Gully Rap'],
    title: 'Indian hip hop explodes from Gully Boy to Emiway Bantai',
    description: "Drawing on Mumbai's street rap scene pioneered by DIVINE and Naezy — dramatized in the 2019 film Gully Boy — and the global reach of YouTube, Indian hip hop artists like Emiway Bantai, Raftaar, and MC Stan build massive audiences rapping in Hindi, Marathi, and Punjabi. This movement laid the groundwork for South Asian hip hop's emergence as a global force, connecting the subcontinent's billion-plus youth to hip hop's universal language of street poetry.",
    tags: ['gully boy', 'divine', 'naezy', 'emiway bantai', 'indian hip hop', 'mumbai', 'gully rap', 'desi hip hop'],
  },

  // ── Phase 10: The Full Circle — Return Flows & Genre Collapse ──────
  {
    id: 'evt-soukous-kinshasa-1992',
    year: 1992,
    location: { lat: -4.4419, lng: 15.2663, city: 'Kinshasa', country: 'Democratic Republic of the Congo' },
    genre: ['Soukous', 'Congolese Rumba'],
    title: 'Soukous reimports Caribbean energy as Congolese rumba comes full circle',
    description: "Drawing on Congolese rumba — itself a reimagining of Cuban son that traveled from Havana to Léopoldville on 78 RPM records — guitarists like Diblo Dibala and Kanda Bongo Man accelerate the sébène guitar break into soukous, a frenzied dance music that conquers African nightclubs from Paris to Nairobi. This circular reimportation of Caribbean energy laid the groundwork for ndombolo, coupé-décalé, and the pan-African dance music explosion of the 2000s.",
    tags: ['soukous', 'diblo dibala', 'kanda bongo man', 'sebene', 'congolese rumba', 'kinshasa', 'full circle'],
  },
  {
    id: 'evt-buena-vista-havana-1996',
    year: 1996,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Son Cubano', 'Bolero', 'World Music'],
    title: "Buena Vista Social Club resurrects Havana's golden-age son",
    description: "Drawing on the nearly forgotten son, bolero, and danzón traditions of pre-revolutionary Cuba, Ry Cooder records elderly musicians Ibrahim Ferrer, Compay Segundo, and Rubén González at Havana's EGREM studios. The resulting album and Wim Wenders documentary laid the groundwork for the world music boom's peak commercial moment, reigniting global interest in Cuban music and proving that music thought lost could find new audiences across generations.",
    tags: ['buena vista social club', 'ry cooder', 'ibrahim ferrer', 'compay segundo', 'havana', 'son cubano', 'egrem'],
  },
  {
    id: 'evt-asian-underground-london-1998',
    year: 1998,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Asian Underground', 'Drum and Bass', 'Tabla'],
    title: 'Talvin Singh fuses tabla with drum and bass at his Anokha club night',
    description: "Drawing on Indian classical tabla training and London's jungle and drum and bass scene, Talvin Singh wins the Mercury Prize for \"OK,\" a groundbreaking fusion album. His Anokha club night at the Blue Note becomes a laboratory where South Asian and electronic music collide. This Asian Underground movement laid the groundwork for cross-cultural electronic fusions from M.I.A. to Jai Paul.",
    tags: ['talvin singh', 'anokha', 'tabla', 'drum and bass', 'mercury prize', 'asian underground', 'london'],
  },
  {
    id: 'evt-kuduro-luanda-2000',
    year: 2000,
    location: { lat: -8.839, lng: 13.2894, city: 'Luanda', country: 'Angola' },
    genre: ['Kuduro', 'Electronic'],
    title: "Kuduro explodes as Angola's electronic carnival music",
    description: "Drawing on Angolan semba and kizomba rhythms, house music filtering through Lisbon's diaspora, and the frenetic energy of Luanda's musseque slums, producers create kuduro — a raw, high-BPM electronic dance music with acrobatic dance moves. Kuduro laid the groundwork for the global bass movement, influenced Lisbon's batida scene, and connected Lusophone Africa to European club culture.",
    tags: ['kuduro', 'luanda', 'angola', 'semba', 'kizomba', 'musseque', 'electronic', 'global bass'],
  },
  {
    id: 'evt-gnawa-marrakech-2005',
    year: 2005,
    location: { lat: 31.6295, lng: -7.9811, city: 'Marrakech', country: 'Morocco' },
    genre: ['Gnawa', 'Electronic', 'World Music'],
    title: 'Gnawa-electronic fusion meets global festival culture in Marrakech',
    description: "Drawing on Morocco's centuries-old Gnawa trance music — spiritual healing ceremonies featuring the guembri bass lute and metal castanets brought by sub-Saharan Africans — the Essaouira Gnawa Festival and Marrakech's growing scene attract electronic producers seeking to fuse ancient rhythms with modern beats. This collision laid the groundwork for North African electronic music's rise, influencing producers from Acid Arab to DJ Snake.",
    tags: ['gnawa', 'guembri', 'essaouira', 'marrakech', 'trance ceremony', 'world music festival', 'moroccan electronic'],
  },
  {
    id: 'evt-dancehall-kingston-2010',
    year: 2010,
    location: { lat: 18.0179, lng: -76.8099, city: 'Kingston', country: 'Jamaica' },
    genre: ['Dancehall', 'EDM'],
    title: 'Major Lazer bridges Jamaican dancehall with global EDM',
    description: "Drawing on Kingston's dancehall sound system culture, soca, and American EDM production, Diplo's Major Lazer project creates a bridge between Caribbean bass music and festival electronica. Their collaborations with Vybz Kartel and later \"Lean On\" laid the groundwork for dancehall's absorption into mainstream pop, influencing Drake, Rihanna, and Justin Bieber while bringing Jamaican riddims to Coachella-scale audiences.",
    tags: ['major lazer', 'diplo', 'dancehall', 'kingston', 'edm', 'vybz kartel', 'lean on', 'global bass'],
  },
  {
    id: 'evt-bts-seoul-2013',
    year: 2013,
    location: { lat: 37.5665, lng: 126.978, city: 'Seoul', country: 'South Korea' },
    genre: ['K-Pop', 'Hip Hop', 'EDM', 'R&B'],
    title: 'BTS debuts, absorbing hip hop, EDM, Latin, and R&B into K-pop',
    description: "Drawing on K-pop's trainee system perfected by H.O.T. and TVXQ, American hip hop and R&B production, and a social media strategy built on direct fan engagement, Big Hit Entertainment debuts BTS. Their willingness to absorb global influences — from trap to Latin pop to EDM — laid the groundwork for K-pop's complete conquest of Western charts, the ARMY fandom model that redefined artist-fan relationships, and the permanent globalization of Asian pop culture.",
    tags: ['bts', 'bangtan', 'big hit', 'army', 'kpop', 'seoul', 'idol debut', 'global pop'],
  },
  {
    id: 'evt-one-dance-lagos-2016',
    year: 2016,
    location: { lat: 6.5244, lng: 3.3792, city: 'Lagos', country: 'Nigeria' },
    genre: ['Afrobeats', 'Pop'],
    title: 'Drake\'s "One Dance" brings Afrobeats into mainstream Western pop',
    description: "Drawing on Lagos producer Wizkid's Afrobeats sensibility, UK funky house, and dancehall rhythms, Drake's \"One Dance\" featuring Wizkid and Kyla reaches #1 in fifteen countries and becomes Spotify's most-streamed song. This crossover moment laid the groundwork for Afrobeats' permanent presence on Western pop charts, opening doors for Burna Boy, Davido, and Tems to achieve global success on their own terms.",
    tags: ['drake', 'one dance', 'wizkid', 'afrobeats', 'lagos', 'spotify', 'crossover', 'nigerian pop'],
  },
  {
    id: 'evt-afroswing-london-2017',
    year: 2017,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Afroswing', 'Afrobeats', 'Hip Hop'],
    title: 'Afroswing emerges as London fuses UK rap with Afrobeats',
    description: "Drawing on grime's MC culture, Afrobeats melodies filtering through London's West African diaspora, and dancehall bass, artists like J Hus, Not3s, and Yxng Bane create Afroswing — a warm, melodic fusion that dominates UK charts. This London-born hybrid laid the groundwork for the global blurring of genre boundaries between African and Western pop.",
    tags: ['afroswing', 'j hus', 'not3s', 'yxng bane', 'london', 'uk afrobeats', 'diaspora', 'grime fusion'],
  },
  {
    id: 'evt-rosalia-sanjuan-2018',
    year: 2018,
    location: { lat: 18.4655, lng: -66.1057, city: 'San Juan', country: 'Puerto Rico' },
    genre: ['Flamenco', 'Reggaeton', 'Electronic'],
    title: 'Rosalía fuses flamenco with reggaeton and electronic production',
    description: "Drawing on deep Andalusian flamenco traditions, reggaeton's dembow rhythms, and avant-garde electronic production by El Guincho, Barcelona's Rosalía releases \"El Mal Querer\" — connecting to Latin urban scenes from San Juan to Buenos Aires. This genre-dissolving album laid the groundwork for a new era where European, Latin American, and electronic traditions merge freely, inspiring artists who refuse genre boundaries.",
    tags: ['rosalia', 'el mal querer', 'flamenco', 'reggaeton', 'el guincho', 'barcelona', 'genre fusion'],
  },
  {
    id: 'evt-amapiano-johannesburg-2019',
    year: 2019,
    location: { lat: -26.2041, lng: 28.0473, city: 'Johannesburg', country: 'South Africa' },
    genre: ['Amapiano'],
    title: "Amapiano explodes globally via TikTok from Johannesburg's townships",
    description: "Drawing on deep house, kwaito bass, and jazz piano motifs born in Johannesburg's Soweto and Alexandra townships, amapiano producers like Kabza De Small, DJ Maphorisa, and Vigro Deep ride TikTok's algorithm to global virality. The genre's distinctive log drum and piano stabs laid the groundwork for amapiano's absorption into mainstream global pop, influencing Afrobeats producers in Lagos and UK garage artists in London.",
    tags: ['amapiano', 'kabza de small', 'dj maphorisa', 'vigro deep', 'tiktok', 'johannesburg', 'log drum', 'soweto'],
  },
  {
    id: 'evt-burna-boy-lagos-2020',
    year: 2020,
    location: { lat: 6.5244, lng: 3.3792, city: 'Lagos', country: 'Nigeria' },
    genre: ['Afrobeats', 'Afro-Fusion'],
    title: 'Burna Boy wins Grammy, placing African pop on equal global footing',
    description: "Drawing on Fela Kuti's Afrobeat legacy, dancehall rhythms, and the Afrobeats production infrastructure built by Don Jazzy and Wizkid, Burna Boy wins the Grammy for Best Global Music Album with \"Twice As Tall.\" This coronation laid the groundwork for African music's permanent seat at the global table — no longer \"world music\" but simply pop — as Tems, Rema, and Ayra Starr followed, completing a circle from Fela's Lagos to the Grammy stage.",
    tags: ['burna boy', 'grammy', 'twice as tall', 'afrobeats', 'lagos', 'afro-fusion', 'fela legacy'],
  },

  // ── West Asia ──

  {
    id: 'evt-ottoman-istanbul-1700',
    year: 1700,
    location: { lat: 41.0082, lng: 28.9784, city: 'Istanbul', country: 'Turkey' },
    genre: ['Ottoman Classical', 'Makam'],
    title: 'Ottoman court music reaches its classical zenith',
    description: 'The Ottoman makam system — a sophisticated modal framework of melodic paths, rhythmic cycles (usul), and improvised taksim — reaches its highest refinement in Istanbul\'s imperial court. Composers like Itri and Dede Efendi create works that define the classical tradition of the entire Eastern Mediterranean.',
    tags: ['ottoman', 'makam', 'taksim', 'usul', 'itri', 'dede efendi', 'court music', 'istanbul'],
  },
  {
    id: 'evt-anatolian-rock-istanbul-1972',
    year: 1972,
    location: { lat: 41.0082, lng: 28.9784, city: 'Istanbul', country: 'Turkey' },
    genre: ['Anatolian Rock', 'Psychedelic Rock', 'Turkish Folk'],
    title: 'Barış Manço and Erkin Koray ignite Anatolian rock',
    description: 'Turkish musicians fuse Anatolian folk melodies, bağlama saz, and makam scales with fuzz guitars, wah-wah pedals, and psychedelic rock energy. Barış Manço, Erkin Koray, and Cem Karaca create a uniquely Turkish psychedelic sound that influences Middle Eastern rock for decades.',
    tags: ['barış manço', 'erkin koray', 'cem karaca', 'anatolian rock', 'bağlama', 'psychedelic', 'turkish rock', 'anadolu pop'],
  },
  {
    id: 'evt-fairuz-beirut-1957',
    year: 1957,
    location: { lat: 33.8938, lng: 35.5018, city: 'Beirut', country: 'Lebanon' },
    genre: ['Arabic Pop', 'Lebanese Folk', 'Musical Theatre'],
    title: 'Fairuz and the Rahbani Brothers reinvent Arabic music',
    description: 'Fairuz, with composers Assi and Mansour Rahbani, debuts at the Baalbeck International Festival. Their fusion of Lebanese mountain folk melodies with Western orchestration, jazz harmonies, and theatrical storytelling creates a new Arabic musical language that transcends borders. Fairuz becomes the voice of the Arab world.',
    tags: ['fairuz', 'rahbani brothers', 'baalbeck', 'lebanese folk', 'arabic music', 'musical theatre', 'beirut', 'arab world'],
  },
  {
    id: 'evt-persian-pop-tehran-1970',
    year: 1970,
    location: { lat: 35.6892, lng: 51.389, city: 'Tehran', country: 'Iran' },
    genre: ['Persian Pop', 'Iranian Classical', 'Funk'],
    title: 'Googoosh and the golden age of Iranian pop',
    description: 'Tehran\'s pre-revolution pop scene explodes with Googoosh, the biggest pop star in the Persian-speaking world. Iranian artists blend dastgah classical modes with funk, disco, and rock. The 1979 revolution silences the scene overnight, scattering Iranian musicians into global diaspora.',
    tags: ['googoosh', 'iranian pop', 'dastgah', 'tehran', 'pre-revolution', 'persian pop', 'iranian diaspora', 'viguen'],
  },
  {
    id: 'evt-maqam-baghdad-1932',
    year: 1932,
    location: { lat: 33.3152, lng: 44.3661, city: 'Baghdad', country: 'Iraq' },
    genre: ['Iraqi Maqam', 'Arabic Classical'],
    title: 'Baghdad hosts the Congress of Arab Music',
    description: 'The first Congress of Arab Music convenes in Cairo, but Baghdad\'s delegates showcase the Iraqi maqam tradition — an ancient system of modal singing passed down orally through master-apprentice chains in coffeehouses. Singers like Muhammad al-Qubbanchi elevate Iraqi maqam to its highest art form, blending Bedouin, Kurdish, and Persian influences.',
    tags: ['iraqi maqam', 'muhammad al-qubbanchi', 'congress of arab music', 'coffeehouse', 'modal singing', 'baghdad', 'chalghi ensemble'],
  },
  {
    id: 'evt-mizrahi-telaviv-1980',
    year: 1980,
    location: { lat: 32.0853, lng: 34.7818, city: 'Tel Aviv', country: 'Israel' },
    genre: ['Mizrahi', 'Mediterranean Pop'],
    title: 'Zohar Argov and the Mizrahi music revolution',
    description: 'Zohar Argov\'s "HaPerach BeGani" wins the Israeli Song Festival, crowning Mizrahi music — the sound of Middle Eastern and North African Jewish communities — as Israel\'s true popular music. Blending Arabic maqam scales, Greek bouzouki, Turkish rhythms, and Hebrew lyrics, Mizrahi challenges European-origin cultural dominance.',
    tags: ['zohar argov', 'mizrahi', 'haperach begani', 'mediterranean pop', 'maqam', 'bouzouki', 'israeli music', 'oriental'],
  },
  {
    id: 'evt-polyphony-tbilisi-2001',
    year: 2001,
    location: { lat: 41.7151, lng: 44.8271, city: 'Tbilisi', country: 'Georgia' },
    genre: ['Georgian Polyphony', 'Sacred Music'],
    title: 'UNESCO inscribes Georgian polyphonic singing as masterpiece',
    description: 'Georgia\'s ancient tradition of three-part vocal polyphony — dating back over a millennium — receives UNESCO Intangible Cultural Heritage status. Georgian polyphony\'s unique dissonant harmonies, drone basses, and yodeling techniques predate Western European polyphony by centuries. The Voyager Golden Record carries a Georgian song into interstellar space.',
    tags: ['georgian polyphony', 'unesco', 'three-part harmony', 'chakrulo', 'voyager golden record', 'sacred music', 'tbilisi', 'caucasus'],
  },
  {
    id: 'evt-mugham-baku-2003',
    year: 2003,
    location: { lat: 40.4093, lng: 49.8671, city: 'Baku', country: 'Azerbaijan' },
    genre: ['Mugham', 'Azerbaijani Classical'],
    title: 'UNESCO recognizes Azerbaijani mugham tradition',
    description: 'Azerbaijan\'s mugham — a sophisticated system of modal improvisation combining poetry, melody, and emotional ascent — receives UNESCO recognition. Master mugham singers (khanende) accompanied by tar and kamancha create transcendent performances in Baku\'s historic venues. The tradition bridges Persian, Turkish, and Caucasian musical worlds.',
    tags: ['mugham', 'unesco', 'khanende', 'tar', 'kamancha', 'azerbaijani classical', 'baku', 'modal improvisation'],
  },
  {
    id: 'evt-duduk-yerevan-1950',
    year: 1950,
    location: { lat: 40.1872, lng: 44.5152, city: 'Yerevan', country: 'Armenia' },
    genre: ['Armenian Classical', 'Duduk'],
    title: 'Djivan Gasparyan masters the Armenian duduk',
    description: 'Djivan Gasparyan begins his career as the world\'s foremost duduk master. The duduk — a double-reed woodwind carved from apricot wood — produces one of the most hauntingly melancholic sounds in world music. Its mournful timbre later permeates Hollywood film scores and ambient electronic music.',
    tags: ['djivan gasparyan', 'duduk', 'apricot wood', 'armenian music', 'yerevan', 'film scores', 'double reed', 'melancholy'],
  },
  {
    id: 'evt-oud-damascus-1920',
    year: 1920,
    location: { lat: 33.5138, lng: 36.2765, city: 'Damascus', country: 'Syria' },
    genre: ['Arabic Classical', 'Oud Music'],
    title: 'Damascus preserves the Arab oud and tarab tradition',
    description: 'Damascus, one of the oldest continuously inhabited cities, nurtures the tarab tradition — music designed to induce ecstatic emotional transport. Master oud players and singers in the city\'s intimate salons practice a refined art of melodic improvisation (taqasim) within the Arabic maqam system that connects to pre-Islamic musical heritage.',
    tags: ['oud', 'tarab', 'taqasim', 'maqam', 'damascus', 'syrian music', 'salon', 'arabic classical'],
  },
  {
    id: 'evt-khaleeji-dubai-2005',
    year: 2005,
    location: { lat: 25.2048, lng: 55.2708, city: 'Dubai', country: 'UAE' },
    genre: ['Khaleeji Pop', 'Gulf Pop'],
    title: 'Gulf pop and khaleeji music go commercial',
    description: 'Dubai\'s rapid globalization transforms khaleeji — the distinctive rhythmic pop music of the Persian Gulf states, built on the sawt and fijiri maritime traditions. Artists like Ahlam and Hussein Al Jasmi modernize Gulf rhythms with slick production, while Rotana Records turns Arab pop into a pan-regional industry.',
    tags: ['khaleeji', 'dubai', 'ahlam', 'hussein al jasmi', 'rotana', 'gulf pop', 'sawt', 'fijiri'],
  },

  // ── Central Asia ──

  {
    id: 'evt-dombra-almaty-1990',
    year: 1990,
    location: { lat: 43.222, lng: 76.8512, city: 'Almaty', country: 'Kazakhstan' },
    genre: ['Kazakh Folk', 'Post-Soviet Rock'],
    title: 'Post-Soviet Kazakhstan revives dombra and birthing rock',
    description: 'After decades of Soviet cultural homogenization, Kazakh musicians reclaim the dombra (two-stringed lute) as a national symbol while simultaneously absorbing Western rock and pop. Bands like Roksonaki and solo artists blend Kazakh throat singing (köömei), epic poetry (zhyrau), and steppe melodies with electric guitars.',
    tags: ['dombra', 'kazakh music', 'post-soviet', 'almaty', 'köömei', 'zhyrau', 'steppe', 'roksonaki'],
  },

  // ── South Asia ──

  {
    id: 'evt-qawwali-lahore-1987',
    year: 1987,
    location: { lat: 31.5497, lng: 74.3436, city: 'Lahore', country: 'Pakistan' },
    genre: ['Qawwali', 'Sufi Music', 'World Music'],
    title: 'Nusrat Fateh Ali Khan brings qawwali to WOMAD',
    description: 'Nusrat Fateh Ali Khan performs at Peter Gabriel\'s WOMAD festival, introducing Western audiences to qawwali — the ecstatic Sufi devotional music tradition rooted in 700 years of shrine singing in Lahore and across the Punjab. His extraordinary vocal range and improvisational power make him the most celebrated voice of South Asian music worldwide.',
    tags: ['nusrat fateh ali khan', 'qawwali', 'womad', 'peter gabriel', 'sufi', 'lahore', 'punjab', 'devotional', 'shrine singing'],
  },
  {
    id: 'evt-baul-dhaka-2005',
    year: 2005,
    location: { lat: 23.8103, lng: 90.4125, city: 'Dhaka', country: 'Bangladesh' },
    genre: ['Baul', 'Bengali Folk'],
    title: 'UNESCO inscribes Baul songs of Bangladesh',
    description: 'The Baul tradition of Bengal — wandering mystic minstrels singing ecstatic songs about the divine residing within the human body — receives UNESCO Intangible Cultural Heritage status. Baul music, rooted in Sufi and Vaishnava philosophy, influenced Rabindranath Tagore and through him, the poetry of the Bengali renaissance.',
    tags: ['baul', 'unesco', 'bengal', 'wandering minstrels', 'sufi', 'vaishnava', 'rabindranath tagore', 'dhaka', 'mystic'],
  },

  // ── East Asia ──

  {
    id: 'evt-ymo-tokyo-1978',
    year: 1978,
    location: { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan' },
    genre: ['Synth Pop', 'Electronic', 'Technopop'],
    title: 'Yellow Magic Orchestra invents technopop',
    description: 'Haruomi Hosono, Ryuichi Sakamoto, and Yukihiro Takahashi form Yellow Magic Orchestra, fusing synthesizers, drum machines, and computer technology with Eastern melodies and ironic pop sensibility. YMO pioneers sampling, synth-pop production, and electronic dance music — influencing Kraftwerk back, as well as hip hop, house, and the entire electronic music world.',
    tags: ['ymo', 'yellow magic orchestra', 'ryuichi sakamoto', 'haruomi hosono', 'synth pop', 'technopop', 'drum machine', 'tokyo'],
  },
  {
    id: 'evt-peking-opera-beijing-1790',
    year: 1790,
    location: { lat: 39.9042, lng: 116.4074, city: 'Beijing', country: 'China' },
    genre: ['Peking Opera', 'Chinese Classical'],
    title: 'Anhui opera troupes arrive in Beijing, birthing Peking Opera',
    description: 'Four Anhui opera troupes arrive in Beijing to celebrate Emperor Qianlong\'s 80th birthday. Their performances catalyze the fusion of regional singing styles — xipi and erhuang — into what becomes Peking Opera (jingju), the most celebrated form of Chinese theatrical music, combining singing, acting, acrobatics, and martial arts.',
    tags: ['peking opera', 'jingju', 'xipi', 'erhuang', 'qianlong', 'anhui troupes', 'beijing', 'chinese opera'],
  },
  {
    id: 'evt-cantopop-beijing-1980',
    year: 1980,
    location: { lat: 39.9042, lng: 116.4074, city: 'Beijing', country: 'China' },
    genre: ['C-Pop', 'Mandopop'],
    title: 'Teresa Teng\'s smuggled tapes captivate mainland China',
    description: 'Despite being officially banned, Taiwanese singer Teresa Teng\'s love ballads circulate on smuggled cassette tapes across mainland China, becoming the most-listened-to music in the country. Her soft, intimate singing style — a radical contrast to revolutionary anthems — opens Chinese ears to pop music and plants the seeds of the Mandopop industry.',
    tags: ['teresa teng', 'mandopop', 'cassette tapes', 'banned music', 'love ballads', 'taiwan', 'beijing', 'c-pop'],
  },
  {
    id: 'evt-pansori-seoul-1800',
    year: 1800,
    location: { lat: 37.5665, lng: 126.978, city: 'Seoul', country: 'South Korea' },
    genre: ['Pansori', 'Korean Classical'],
    title: 'Pansori epic singing reaches its golden age',
    description: 'Pansori — Korea\'s dramatic musical storytelling tradition where a single singer (sorikkun) and drummer (gosu) perform epic tales lasting hours — reaches its golden age. Combining virtuosic vocal technique, emotional intensity, and narrative drama, pansori becomes Korea\'s most celebrated performing art, later recognized by UNESCO in 2003.',
    tags: ['pansori', 'sorikkun', 'gosu', 'korean classical', 'epic singing', 'seoul', 'unesco', 'chunhyangga'],
  },

  // ── Oceania ──

  {
    id: 'evt-aboriginal-melbourne-1991',
    year: 1991,
    location: { lat: -37.8136, lng: 144.9631, city: 'Melbourne', country: 'Australia' },
    genre: ['Aboriginal Rock', 'World Music'],
    title: 'Yothu Yindi\'s "Treaty" puts Aboriginal music on the world stage',
    description: 'Yolngu band Yothu Yindi from Arnhem Land release the Filthy Lucre remix of "Treaty," blending didgeridoo, bilma clapsticks, and traditional Yolngu song cycles with rock and electronic dance beats. The single becomes Australia\'s most politically significant pop song, demanding recognition of Indigenous land rights while introducing Aboriginal musical traditions to global audiences.',
    tags: ['yothu yindi', 'treaty', 'didgeridoo', 'yolngu', 'aboriginal', 'mandawuy yunupingu', 'arnhem land', 'indigenous'],
  },
  {
    id: 'evt-polynesian-auckland-1990',
    year: 1990,
    location: { lat: -36.8485, lng: 174.7633, city: 'Auckland', country: 'New Zealand' },
    genre: ['Pacific Reggae', 'Polynesian Pop'],
    title: 'Auckland becomes the Polynesian music capital',
    description: 'Auckland — home to the world\'s largest Polynesian population — develops a unique Pacific sound fusing reggae, R&B, and hip hop with Samoan, Tongan, Cook Island, and Māori musical traditions. Artists like the Herbs, Che Fu, and later OMC ("How Bizarre") create Pacific urban music that becomes New Zealand\'s signature cultural export.',
    tags: ['auckland', 'polynesian', 'pacific reggae', 'herbs', 'che fu', 'omc', 'how bizarre', 'maori', 'samoan'],
  },
  {
    id: 'evt-stringband-portmoresby-1970',
    year: 1970,
    location: { lat: -9.4438, lng: 147.1803, city: 'Port Moresby', country: 'Papua New Guinea' },
    genre: ['String Band', 'Pacific Folk'],
    title: 'PNG string band music becomes the national sound',
    description: 'In the years before and after independence (1975), Papua New Guinea develops its own string band tradition — ukuleles, guitars, and bamboo bass playing island melodies, love songs, and social commentary in Tok Pisin and hundreds of local languages. String bands become the soundtrack of Pacific Island community life across Melanesia.',
    tags: ['string band', 'ukulele', 'tok pisin', 'png', 'melanesia', 'independence', 'bamboo bass', 'port moresby'],
  },
  {
    id: 'evt-pacific-suva-1985',
    year: 1985,
    location: { lat: -18.1416, lng: 178.4419, city: 'Suva', country: 'Fiji' },
    genre: ['Pacific Island Music', 'Fijian Folk'],
    title: 'South Pacific Festival of Arts unites Oceanian music traditions',
    description: 'The South Pacific Festival of Arts brings together musicians from across the Pacific Islands, showcasing the extraordinary diversity of Oceanian music — from Fijian meke dance chants and Tongan lakalaka to Samoan pese and Kiribati te buki. The festival strengthens pan-Pacific cultural identity and inspires contemporary Pacific fusion artists.',
    tags: ['south pacific festival', 'meke', 'lakalaka', 'pese', 'fijian', 'pacific islands', 'suva', 'oceanian music'],
  },
  {
    id: 'evt-maori-haka-auckland-1900',
    year: 1900,
    location: { lat: -36.8485, lng: 174.7633, city: 'Auckland', country: 'New Zealand' },
    genre: ['Māori Music', 'Haka'],
    title: 'Māori haka and waiata traditions enter the modern era',
    description: 'As Māori communities urbanize around Auckland, traditional performing arts — the fierce haka war dance, the melodic waiata songs, and the taonga pūoro (traditional instruments including the pūtātara conch and koauau flute) — adapt to modern contexts. These traditions become central to New Zealand\'s national identity, eventually performed on world stages.',
    tags: ['haka', 'waiata', 'maori', 'taonga puoro', 'putatara', 'koauau', 'new zealand', 'auckland', 'all blacks'],
  },

  // ── Afro-Cuban Music ──

  {
    id: 'evt-danzon-havana-1879',
    year: 1879,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Danzón', 'Afro-Cuban'],
    title: "Miguel Faílde debuts the danzón — Cuba's national dance",
    description: "Miguel Faílde premieres \"Las Alturas de Simpson\" in Matanzas, debuting the danzón — a creolized evolution of the contradanza that adds African syncopation and the infectious cinquillo rhythm. Danzón becomes Cuba's national dance and the direct ancestor of mambo and cha-cha-chá, its formal structure giving way to increasingly Africanized improvisations.",
    tags: ['danzon', 'miguel failde', 'alturas de simpson', 'matanzas', 'cinquillo', 'contradanza', 'national dance'],
  },
  {
    id: 'evt-son-montuno-havana-1940',
    year: 1940,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Son Montuno', 'Son Cubano', 'Afro-Cuban'],
    title: 'Arsenio Rodríguez invents son montuno and the conjunto format',
    description: "Arsenio Rodríguez, the blind tres guitarist from Matanzas, revolutionizes son cubano by adding congas, piano, and a larger conjunto format. His son montuno style — with its extended call-and-response improvisations (montuno section) over driving conga patterns — becomes the direct blueprint for mambo and New York salsa.",
    tags: ['arsenio rodriguez', 'son montuno', 'conjunto', 'tres', 'conga', 'matanzas', 'blind marvel', 'salsa blueprint'],
  },
  {
    id: 'evt-chacha-havana-1953',
    year: 1953,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Cha-cha-chá', 'Danzón'],
    title: 'Enrique Jorrín creates cha-cha-chá at the Silver Star club',
    description: "Enrique Jorrín, violinist with Orquesta América, creates cha-cha-chá at Havana's Silver Star club by simplifying mambo's complex rhythms and adding a distinctive triple-step dance pattern. Named for the sound of dancers' shoes shuffling on the floor, it becomes the biggest global Latin dance craze of the 1950s — easier to dance than mambo, impossible to resist.",
    tags: ['enrique jorrin', 'cha-cha-cha', 'silver star', 'orquesta america', 'danzon', 'dance craze', 'triple step', 'chacha'],
  },
  {
    id: 'evt-palladium-nyc-1954',
    year: 1954,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Mambo', 'Cha-cha-chá', 'Latin Jazz'],
    title: "The Palladium Ballroom becomes NYC's Temple of Mambo",
    description: "The Palladium Ballroom on Broadway becomes the \"Temple of Mambo\" where Tito Puente, Tito Rodríguez, and Machito battle nightly with their orchestras. White, Black, and Latino dancers mix on the same floor — one of NYC's first integrated nightclubs. The Palladium era makes mambo and cha-cha-chá mainstream American dance music.",
    tags: ['palladium', 'tito puente', 'tito rodriguez', 'machito', 'temple of mambo', 'broadway', 'integrated', 'latin dance'],
  },
  {
    id: 'evt-pachanga-nyc-1961',
    year: 1961,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Pachanga', 'Charanga'],
    title: "La Pachanga craze sweeps NYC's Latin dance halls",
    description: "Eduardo Davidson's \"La Pachanga\" and Joe Quijano's charanga bands ignite the pachanga craze in NYC's Latin dance halls. A frenzied, carnival-like dance blending the charanga format's flutes and violins with driving Afro-Cuban rhythms. Brief but explosive, pachanga bridges the Palladium mambo era and the coming salsa revolution.",
    tags: ['pachanga', 'eduardo davidson', 'joe quijano', 'charanga', 'flute', 'violin', 'latin dance hall', 'craze'],
  },
  {
    id: 'evt-merengue-nyc-1985',
    year: 1985,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Merengue', 'Latin Pop'],
    title: 'Merengue conquers New York from Washington Heights',
    description: "Dominican immigrants bring merengue to Washington Heights and it explodes across NYC's Latin clubs. Wilfrido Vargas modernizes the sound with synthesizers while Juan Luis Guerra's \"Ojalá Que Llueva Café\" makes merengue an international sensation. For a time, merengue's relentless two-beat pulse overtakes salsa as NYC's dominant Latin dance music.",
    tags: ['merengue', 'wilfrido vargas', 'juan luis guerra', 'washington heights', 'dominican', 'ojala que llueva cafe', 'nyc latin'],
  },
  {
    id: 'evt-salsa-romantica-nyc-1987',
    year: 1987,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Salsa Romántica', 'Salsa'],
    title: 'Salsa romántica replaces the Fania-era sound',
    description: "Eddie Santiago, Frankie Ruiz, and Lalo Rodríguez lead the salsa romántica wave — smoother, ballad-driven salsa that replaces the hard-hitting Fania-era sound. Critics call it watered-down, but it dominates Latin radio for a decade, opening salsa to audiences who found classic salsa too raw and intense.",
    tags: ['salsa romantica', 'eddie santiago', 'frankie ruiz', 'lalo rodriguez', 'ballad', 'smooth salsa', 'latin radio', 'crossover'],
  },
  {
    id: 'evt-timba-havana-1990',
    year: 1990,
    location: { lat: 23.1136, lng: -82.3666, city: 'Havana', country: 'Cuba' },
    genre: ['Timba', 'Son Cubano', 'Afro-Cuban'],
    title: "Los Van Van and NG La Banda create timba — Cuba's explosive modern dance music",
    description: "Los Van Van (led by Juan Formell) and NG La Banda (led by José Luis Cortés) create timba — fusing son montuno, rumba, funk, hip hop, and aggressive Afro-Cuban percussion into Cuba's most complex and physically demanding dance music. While global salsa goes smooth with romántica, Cuba goes hard. Timba's sudden gear-shifting cambios push dancers to their limits.",
    tags: ['los van van', 'ng la banda', 'timba', 'juan formell', 'jose luis cortes', 'cambio', 'havana', 'cuban dance music'],
  },

  // ═══════════════════════════════════════════════════════════════
  // ██  WESTERN CLASSICAL MUSIC  ██
  // ═══════════════════════════════════════════════════════════════

  // ── Medieval (590–1320) ──

  {
    id: 'evt-gregorian-rome-590',
    year: 590,
    location: { lat: 41.9028, lng: 12.4964, city: 'Rome', country: 'Italy' },
    genre: ['Sacred', 'Classical'],
    title: 'Pope Gregory I codifies the Roman liturgical chant tradition',
    description: "Pope Gregory I organizes and standardizes the monophonic chant of the Roman liturgy, creating the foundation of what becomes known as Gregorian chant. These unaccompanied sacred melodies, transmitted orally across monasteries from Monte Cassino to Canterbury, become the bedrock of all Western music — the first notated tradition, and the source from which harmony, counterpoint, and polyphony will eventually emerge.",
    tags: ['gregorian chant', 'pope gregory', 'plainchant', 'monophonic', 'liturgy', 'sacred music', 'medieval'],
  },
  {
    id: 'evt-notredame-paris-1163',
    year: 1163,
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    genre: ['Sacred', 'Classical'],
    title: 'Notre-Dame school invents polyphony: Leonin and Perotin',
    description: "At the Cathedral of Notre-Dame de Paris, the composers Leonin and Perotin develop organum — the revolutionary practice of layering multiple independent vocal lines over Gregorian chant. Their Magnus Liber Organi is the earliest major collection of polyphonic music. This Parisian invention of structured multi-voice composition is arguably the single most consequential innovation in Western music history.",
    tags: ['notre-dame school', 'leonin', 'perotin', 'organum', 'polyphony', 'magnus liber', 'medieval paris'],
  },
  {
    id: 'evt-troubadour-seville-1200',
    year: 1200,
    location: { lat: 37.3891, lng: -5.9845, city: 'Seville', country: 'Spain' },
    genre: ['Classical', 'Secular'],
    title: 'Alfonso X and the Cantigas de Santa Maria: Iberian medieval song',
    description: "The court of Alfonso X of Castile produces the Cantigas de Santa Maria, over 400 songs blending Christian, Moorish, and Jewish musical traditions of medieval Iberia. These richly illuminated manuscripts preserve one of the largest collections of monophonic song from the Middle Ages, documenting the convivencia where three cultures exchanged musical ideas across faith boundaries.",
    tags: ['cantigas', 'alfonso x', 'troubadour', 'convivencia', 'moorish', 'medieval iberia', 'monophonic song'],
  },
  {
    id: 'evt-arsnova-paris-1320',
    year: 1320,
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    genre: ['Classical', 'Sacred'],
    title: "Philippe de Vitry's Ars Nova revolutionizes rhythm and notation",
    description: "Philippe de Vitry publishes his treatise Ars Nova, introducing revolutionary rhythmic techniques including duple meter and isorhythm. His student Guillaume de Machaut composes the Messe de Nostre Dame, the first complete polyphonic setting of the Mass by a single composer. The Ars Nova shatters the rigid rhythmic constraints of earlier music, unleashing the expressive freedom that will flower into the Renaissance.",
    tags: ['ars nova', 'philippe de vitry', 'machaut', 'isorhythm', 'notation', 'messe de nostre dame', 'medieval'],
  },

  // ── Renaissance (1430–1588) ──

  {
    id: 'evt-burgundian-brussels-1430',
    year: 1430,
    location: { lat: 50.8503, lng: 4.3517, city: 'Brussels', country: 'Belgium' },
    genre: ['Classical', 'Sacred'],
    title: 'Guillaume Dufay and the Burgundian school transform polyphony',
    description: "Guillaume Dufay, working at the brilliant court of the Dukes of Burgundy, fuses the rhythmic complexity of the French Ars Nova with the smooth melodic writing of English and Italian traditions. His isorhythmic motets for the consecration of Florence Cathedral's dome in 1436 represent a pinnacle of 15th-century composition. The Franco-Flemish sound he pioneers will dominate European music for the next century.",
    tags: ['dufay', 'burgundian school', 'franco-flemish', 'polyphony', 'isorhythmic motet', 'sacred music', 'renaissance'],
  },
  {
    id: 'evt-josquin-rome-1486',
    year: 1486,
    location: { lat: 41.9028, lng: 12.4964, city: 'Rome', country: 'Italy' },
    genre: ['Classical', 'Sacred'],
    title: 'Josquin des Prez joins the Papal Choir and perfects imitative polyphony',
    description: "Josquin des Prez, the most revered composer of the Renaissance, joins the Papal Choir in Rome. His masses and motets achieve an unprecedented fusion of technical mastery and emotional expression. Martin Luther calls him 'the master of the notes,' and his technique of pervasive imitation — where each voice enters with the same melody — becomes the foundation of Renaissance polyphonic style across Europe.",
    tags: ['josquin', 'papal choir', 'renaissance polyphony', 'imitation', 'mass', 'motet', 'franco-flemish'],
  },
  {
    id: 'evt-venetian-venice-1550',
    year: 1550,
    location: { lat: 45.4408, lng: 12.3155, city: 'Venice', country: 'Italy' },
    genre: ['Classical', 'Sacred'],
    title: "The Gabrielis pioneer polychoral music at St. Mark's Basilica",
    description: "At the Basilica of San Marco in Venice, Andrea Gabrieli and later his nephew Giovanni exploit the cathedral's opposing choir lofts to create the cori spezzati technique — splitting choirs and brass ensembles across physical space. This stereophonic innovation, unique to Venice's architecture, invents spatial music and orchestral color, pointing directly toward the Baroque concerto and the modern orchestra.",
    tags: ['gabrieli', 'san marco', 'cori spezzati', 'polychoral', 'venetian school', 'brass', 'spatial music'],
  },
  {
    id: 'evt-palestrina-rome-1565',
    year: 1565,
    location: { lat: 41.9028, lng: 12.4964, city: 'Rome', country: 'Italy' },
    genre: ['Classical', 'Sacred'],
    title: 'Palestrina saves polyphony from the Council of Trent',
    description: "Giovanni Pierluigi da Palestrina composes the Missa Papae Marcelli, demonstrating that polyphonic music can deliver text clearly enough to satisfy the Counter-Reformation demands of the Council of Trent. Legend holds that his mass single-handedly saves polyphony from being banned from Catholic worship. His luminous, serene style becomes the template for sacred composition for centuries.",
    tags: ['palestrina', 'counter-reformation', 'council of trent', 'missa papae marcelli', 'sacred polyphony', 'roman school'],
  },
  {
    id: 'evt-madrigal-london-1588',
    year: 1588,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Classical', 'Secular'],
    title: 'Musica Transalpina brings the Italian madrigal to Elizabethan England',
    description: "Nicholas Yonge publishes Musica Transalpina, an anthology of Italian madrigals with English texts, igniting a craze for secular part-singing in Elizabethan London. English composers Thomas Morley, John Dowland, and William Byrd develop a distinctly English madrigal tradition. Byrd's sacred music, composed covertly for persecuted Catholics, ranks among the Renaissance's greatest achievements.",
    tags: ['madrigal', 'elizabethan', 'musica transalpina', 'byrd', 'dowland', 'morley', 'english renaissance'],
  },

  // ── Baroque (1597–1741) ──

  {
    id: 'evt-opera-florence-1597',
    year: 1597,
    location: { lat: 43.7696, lng: 11.2558, city: 'Florence', country: 'Italy' },
    genre: ['Opera', 'Classical'],
    title: 'The Florentine Camerata invents opera',
    description: "Jacopo Peri's Dafne, composed for the Florentine Camerata, becomes the first work in a new art form: opera. This circle of intellectuals, poets, and musicians at the court of Count Bardi seeks to revive ancient Greek drama through sung text. Their invention of monody — a single expressive vocal line over simple accompaniment — overthrows Renaissance polyphony and launches the Baroque era.",
    tags: ['camerata', 'opera', 'peri', 'dafne', 'monody', 'baroque', 'florence'],
  },
  {
    id: 'evt-monteverdi-venice-1613',
    year: 1613,
    location: { lat: 45.4408, lng: 12.3155, city: 'Venice', country: 'Italy' },
    genre: ['Opera', 'Classical'],
    title: "Monteverdi becomes maestro at St. Mark's and transforms opera",
    description: "Claudio Monteverdi is appointed maestro di cappella at St. Mark's Basilica in Venice, where he composes both sacred masterworks and revolutionary operas. His L'Orfeo (1607) and later Venetian operas establish the dramatic power of opera as high art. When Venice opens the first public opera house, Teatro San Cassiano, in 1637, opera transforms from courtly entertainment into a popular art form.",
    tags: ['monteverdi', 'lorfeo', 'san marco', 'venetian opera', 'teatro san cassiano', 'public opera', 'baroque'],
  },
  {
    id: 'evt-vivaldi-venice-1711',
    year: 1711,
    location: { lat: 45.4408, lng: 12.3155, city: 'Venice', country: 'Italy' },
    genre: ['Classical', 'Baroque'],
    title: "Vivaldi publishes L'Estro Armonico and invents the modern concerto",
    description: "Antonio Vivaldi, the 'Red Priest' of Venice's Ospedale della Pieta, publishes L'Estro Armonico, twelve concertos that fundamentally reshape instrumental music across Europe. His concerto form — with its ritornello structure, virtuosic solo passages, and programmatic drama (later perfected in The Four Seasons) — is copied by Bach, Handel, and every subsequent composer. Vivaldi writes over 500 concertos that define the Baroque sound.",
    tags: ['vivaldi', 'concerto', 'four seasons', 'ospedale della pieta', 'lestro armonico', 'baroque venice', 'ritornello'],
  },
  {
    id: 'evt-bach-leipzig-1723',
    year: 1723,
    location: { lat: 51.3397, lng: 12.3731, city: 'Leipzig', country: 'Germany' },
    genre: ['Classical', 'Baroque', 'Sacred'],
    title: 'J.S. Bach becomes Thomaskantor in Leipzig',
    description: "Johann Sebastian Bach assumes the position of Thomaskantor at the Thomaskirche in Leipzig, beginning the most productive period of his life. Over 27 years, he composes the St. Matthew Passion, the Mass in B Minor, The Well-Tempered Clavier, the Goldberg Variations, and over 200 cantatas. Bach synthesizes every musical tradition of his era into works of unsurpassed contrapuntal complexity and spiritual depth.",
    tags: ['bach', 'thomaskirche', 'well-tempered clavier', 'st matthew passion', 'counterpoint', 'fugue', 'baroque'],
  },
  {
    id: 'evt-handel-london-1741',
    year: 1741,
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    genre: ['Classical', 'Sacred', 'Opera'],
    title: "Handel composes Messiah and reigns over London's musical life",
    description: "George Frideric Handel, a German composer who has made London his home, composes Messiah in just 24 days. Premiered in Dublin in 1742, it becomes the most performed choral work in history. Handel's oratorios and operas dominate London's concert life, and his spectacular Music for the Royal Fireworks draws 12,000 to a rehearsal. He is buried in Westminster Abbey, a national hero.",
    tags: ['handel', 'messiah', 'oratorio', 'hallelujah', 'london', 'baroque', 'music for the royal fireworks'],
  },

  // ── Classical Period (1761–1808) ──

  {
    id: 'evt-haydn-vienna-1761',
    year: 1761,
    location: { lat: 48.2082, lng: 16.3738, city: 'Vienna', country: 'Austria' },
    genre: ['Classical'],
    title: 'Haydn enters Esterhazy service and invents the symphony',
    description: "Joseph Haydn becomes Vice-Kapellmeister to Prince Esterhazy at Eisenstadt near Vienna, beginning a 30-year tenure that produces 104 symphonies, 68 string quartets, and the blueprint for Classical form. Working in creative isolation, Haydn develops sonata form, the four-movement symphony, and the modern string quartet. He earns the title 'Father of the Symphony' and mentors the young Mozart.",
    tags: ['haydn', 'esterhazy', 'symphony', 'string quartet', 'sonata form', 'classical period', 'vienna'],
  },
  {
    id: 'evt-mozart-salzburg-1773',
    year: 1773,
    location: { lat: 47.8095, lng: 13.0550, city: 'Salzburg', country: 'Austria' },
    genre: ['Classical', 'Opera'],
    title: 'Mozart composes his first masterpieces in Salzburg',
    description: "Wolfgang Amadeus Mozart, already a veteran of European concert tours as a child prodigy, composes a string of increasingly brilliant works in Salzburg — including his early piano concertos and symphonies. Chafing under the Archbishop's restrictions, he will break free for Vienna in 1781, where Don Giovanni, The Magic Flute, and his final symphonies will define classical perfection.",
    tags: ['mozart', 'salzburg', 'prodigy', 'piano concerto', 'classical period', 'archbishop', 'don giovanni'],
  },
  {
    id: 'evt-mozart-vienna-1786',
    year: 1786,
    location: { lat: 48.2082, lng: 16.3738, city: 'Vienna', country: 'Austria' },
    genre: ['Classical', 'Opera'],
    title: 'Mozart premieres The Marriage of Figaro in Vienna',
    description: "Mozart premieres Le Nozze di Figaro at the Burgtheater in Vienna, a revolutionary opera that gives servants more emotional depth than their masters. In his final five years, Mozart composes Don Giovanni, Cosi fan tutte, The Magic Flute, his last three symphonies, the Requiem, and some of the greatest piano concertos ever written — an output of superhuman quality that defines the apex of the Classical style.",
    tags: ['mozart', 'marriage of figaro', 'burgtheater', 'vienna', 'opera', 'classical', 'requiem'],
  },
  {
    id: 'evt-beethoven-bonn-1792',
    year: 1792,
    location: { lat: 50.7374, lng: 7.0982, city: 'Bonn', country: 'Germany' },
    genre: ['Classical'],
    title: 'Young Beethoven leaves Bonn for Vienna to study with Haydn',
    description: "Ludwig van Beethoven, born in Bonn to a family of court musicians, departs for Vienna with Count Waldstein's famous charge: 'You will receive Mozart's spirit through Haydn's hands.' Though the Haydn lessons prove contentious, Beethoven rapidly establishes himself as Vienna's greatest pianist. His early sonatas and the first two symphonies still inhabit Mozart's Classical world, but his restless temperament is already pushing at every boundary.",
    tags: ['beethoven', 'bonn', 'haydn', 'waldstein', 'piano', 'classical', 'court musician'],
  },
  {
    id: 'evt-beethoven-vienna-1808',
    year: 1808,
    location: { lat: 48.2082, lng: 16.3738, city: 'Vienna', country: 'Austria' },
    genre: ['Classical', 'Romantic'],
    title: 'Beethoven premieres the Fifth and Sixth Symphonies in a single concert',
    description: "In a legendary four-hour concert at the Theater an der Wien, the deaf Beethoven premieres both his Fifth Symphony (with its fate-knocking motif) and Sixth 'Pastoral' Symphony, plus the Fourth Piano Concerto and the Choral Fantasy. The Fifth Symphony's journey from darkness to triumph becomes the archetype of Romantic heroism. Beethoven's late works — the Ninth Symphony, late quartets, and Missa Solemnis — shatter Classical conventions entirely.",
    tags: ['beethoven', 'fifth symphony', 'pastoral', 'theater an der wien', 'heroic', 'fate motif', 'romantic'],
  },

  // ── Early Romantic (1814–1848) ──

  {
    id: 'evt-schubert-vienna-1814',
    year: 1814,
    location: { lat: 48.2082, lng: 16.3738, city: 'Vienna', country: 'Austria' },
    genre: ['Classical', 'Romantic'],
    title: "Schubert composes 'Gretchen am Spinnrade' and invents the art song",
    description: "At just seventeen, Franz Schubert composes 'Gretchen am Spinnrade' — setting Goethe's poetry to music with a spinning-wheel piano figure that captures both physical motion and emotional turmoil. In his tragically short life, Schubert writes over 600 Lieder, nine symphonies, and sublime chamber music. His Schubertiade evenings, where friends gather to hear his songs, create the intimate salon culture of Romantic Vienna.",
    tags: ['schubert', 'lied', 'art song', 'goethe', 'gretchen', 'schubertiade', 'vienna romantic'],
  },
  {
    id: 'evt-berlioz-paris-1830',
    year: 1830,
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    genre: ['Classical', 'Romantic'],
    title: 'Berlioz premieres Symphonie Fantastique and invents the orchestral tone poem',
    description: "Hector Berlioz premieres his Symphonie Fantastique at the Paris Conservatoire, a hallucinatory five-movement symphony depicting an artist's opium-fueled obsession. Its revolutionary orchestration — using harps, English horn, bells, and four timpani — expands the orchestra beyond anything Beethoven imagined. Berlioz's idee fixe technique of thematic transformation becomes the prototype for Liszt's symphonic poems and Wagner's leitmotifs.",
    tags: ['berlioz', 'symphonie fantastique', 'orchestration', 'idee fixe', 'program music', 'paris conservatoire', 'romantic'],
  },
  {
    id: 'evt-chopin-paris-1832',
    year: 1832,
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    genre: ['Classical', 'Romantic'],
    title: "Chopin's Paris debut makes him the poet of the piano",
    description: "Frederic Chopin, a Polish exile, gives his Paris debut at the Salle Pleyel, stunning the audience with a pianism of unprecedented delicacy and harmonic sophistication. Settling in Paris permanently, Chopin transforms the piano through his nocturnes, ballades, etudes, and preludes. His fusion of Polish folk rhythms with Romantic lyricism makes him the most influential pianist-composer in history and a symbol of Polish cultural identity in exile.",
    tags: ['chopin', 'paris', 'piano', 'nocturne', 'ballade', 'polish exile', 'salle pleyel'],
  },
  {
    id: 'evt-mendelssohn-leipzig-1843',
    year: 1843,
    location: { lat: 51.3397, lng: 12.3731, city: 'Leipzig', country: 'Germany' },
    genre: ['Classical', 'Romantic'],
    title: 'Mendelssohn founds the Leipzig Conservatory and revives Bach',
    description: "Felix Mendelssohn, conductor of the Gewandhaus Orchestra, founds the Leipzig Conservatory — the first major music school in Germany and a model for conservatories worldwide. Mendelssohn has already revived Bach's St. Matthew Passion from obscurity in 1829, single-handedly launching the Bach revival. His Violin Concerto, Italian Symphony, and A Midsummer Night's Dream overture exemplify Romantic elegance and clarity.",
    tags: ['mendelssohn', 'leipzig conservatory', 'gewandhaus', 'bach revival', 'violin concerto', 'romantic', 'music education'],
  },
  {
    id: 'evt-liszt-weimar-1848',
    year: 1848,
    location: { lat: 50.9795, lng: 11.3235, city: 'Weimar', country: 'Germany' },
    genre: ['Classical', 'Romantic'],
    title: 'Liszt settles in Weimar and invents the symphonic poem',
    description: "Franz Liszt, the greatest pianist of the 19th century and inventor of the solo recital, settles in Weimar as court Kapellmeister. He composes his revolutionary symphonic poems — single-movement orchestral works driven by literary programs — championing the 'Music of the Future.' Liszt's Weimar circle, including Wagner, becomes the progressive wing of Romantic music. His pianistic innovations in virtuosity and harmonic language forecast the 20th century.",
    tags: ['liszt', 'weimar', 'symphonic poem', 'virtuoso', 'music of the future', 'piano', 'new german school'],
  },

  // ── Late Romantic (1871–1899) ──

  {
    id: 'evt-verdi-milan-1871',
    year: 1871,
    location: { lat: 45.4642, lng: 9.1900, city: 'Milan', country: 'Italy' },
    genre: ['Opera', 'Classical'],
    title: "Verdi premieres Aida and reigns as Italy's operatic voice",
    description: "Giuseppe Verdi premieres Aida at the Khedivial Opera House in Cairo, commissioned for the opening of the Suez Canal. But it is at La Scala in Milan where Verdi's legacy is forged: Rigoletto, La Traviata, Il Trovatore, Otello, and Falstaff define Italian opera's golden age. Verdi's choruses become anthems of Italian unification, and 'Va pensiero' from Nabucco remains an unofficial Italian national hymn.",
    tags: ['verdi', 'aida', 'la scala', 'italian opera', 'risorgimento', 'va pensiero', 'nabucco'],
  },
  {
    id: 'evt-wagner-bayreuth-1876',
    year: 1876,
    location: { lat: 49.9427, lng: 11.5761, city: 'Bayreuth', country: 'Germany' },
    genre: ['Opera', 'Classical'],
    title: 'Wagner opens the Bayreuth Festspielhaus with the Ring Cycle',
    description: "Richard Wagner opens his purpose-built Festspielhaus in Bayreuth with the first complete performance of Der Ring des Nibelungen — four operas spanning 15 hours, composed over 26 years. Wagner's Gesamtkunstwerk ('total work of art') fuses music, drama, poetry, and stagecraft. His leitmotif technique and chromatic harmony push tonality to its limits, making the Ring the most ambitious artwork in Western history and the gateway to musical modernism.",
    tags: ['wagner', 'bayreuth', 'ring cycle', 'gesamtkunstwerk', 'leitmotif', 'festspielhaus', 'music drama'],
  },
  {
    id: 'evt-brahms-vienna-1876',
    year: 1876,
    location: { lat: 48.2082, lng: 16.3738, city: 'Vienna', country: 'Austria' },
    genre: ['Classical', 'Romantic'],
    title: 'Brahms completes his First Symphony after 21 years',
    description: "Johannes Brahms finally premieres his Symphony No. 1, a work 21 years in the making, so weighty that conductor Hans von Bulow calls it 'Beethoven's Tenth.' Leading the conservative wing against Wagner's progressive camp, Brahms proves that absolute music — pure, non-programmatic — remains inexhaustible. His four symphonies, German Requiem, and chamber works represent the last great flowering of Viennese Classical tradition before modernism.",
    tags: ['brahms', 'symphony', 'absolute music', 'german requiem', 'viennese tradition', 'conservative', 'romantic'],
  },
  {
    id: 'evt-tchaikovsky-stpetersburg-1877',
    year: 1877,
    location: { lat: 59.9343, lng: 30.3351, city: 'St. Petersburg', country: 'Russia' },
    genre: ['Classical', 'Romantic', 'Ballet'],
    title: 'Tchaikovsky composes Swan Lake and forges the Russian orchestral tradition',
    description: "Pyotr Ilyich Tchaikovsky, working between Moscow and St. Petersburg, composes Swan Lake, the Violin Concerto, and begins the orchestral trilogy — the Fourth, Fifth, and Sixth Symphonies — that represents the emotional zenith of Romantic music. His ballets Swan Lake, The Nutcracker, and Sleeping Beauty, premiered at the Mariinsky Theatre, become the foundation of classical ballet. Tchaikovsky's melodic gift and orchestral brilliance make him Russia's most beloved composer.",
    tags: ['tchaikovsky', 'swan lake', 'nutcracker', 'mariinsky', 'russian romantic', 'ballet', 'symphony'],
  },
  {
    id: 'evt-sibelius-helsinki-1899',
    year: 1899,
    location: { lat: 60.1699, lng: 24.9384, city: 'Helsinki', country: 'Finland' },
    genre: ['Classical', 'Romantic'],
    title: "Sibelius composes Finlandia and becomes Finland's musical voice",
    description: "Jean Sibelius composes Finlandia as an act of defiance against Russian imperial censorship, and the tone poem becomes an anthem of Finnish independence. His seven symphonies, composed over three decades, develop a unique sound world of icy Nordic austerity that moves progressively away from late Romantic rhetoric toward an austere modernism. The Violin Concerto remains one of the most performed in the repertoire.",
    tags: ['sibelius', 'finlandia', 'finnish independence', 'nordic', 'symphony', 'violin concerto', 'national romanticism'],
  },

  // ── Modernism (1894–1937) ──

  {
    id: 'evt-debussy-paris-1894',
    year: 1894,
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    genre: ['Classical', 'Impressionism'],
    title: "Debussy premieres Prelude a l'apres-midi d'un faune and dissolves Romantic harmony",
    description: "Claude Debussy premieres Prelude a l'apres-midi d'un faune at the Societe Nationale de Musique in Paris, and tonality begins to dissolve. Rejecting Wagner's heavy chromaticism, Debussy creates a shimmering, weightless sound world using whole-tone scales, parallel chords, and gamelan-inspired textures. Pierre Boulez later says that modern music was 'awakened' by this single work. French musical Impressionism radiates outward from Paris to influence Ravel, Satie, and global modernism.",
    tags: ['debussy', 'faune', 'impressionism', 'whole-tone', 'gamelan', 'modernism', 'paris'],
  },
  {
    id: 'evt-stravinsky-paris-1913',
    year: 1913,
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    genre: ['Classical', 'Ballet', 'Avant-Garde'],
    title: "Stravinsky's Rite of Spring causes a riot at the Theatre des Champs-Elysees",
    description: "Igor Stravinsky's Le Sacre du Printemps, choreographed by Nijinsky for Diaghilev's Ballets Russes, provokes a near-riot at its Paris premiere. Its pounding, irregular rhythms, savage dissonances, and ritualistic primitivism shatter every convention of Romantic music. The Rite becomes the most influential composition of the 20th century, its rhythmic innovations echoing through jazz, rock, minimalism, and film scoring for over a century.",
    tags: ['stravinsky', 'rite of spring', 'ballets russes', 'diaghilev', 'nijinsky', 'riot', 'primitivism', 'modernism'],
  },
  {
    id: 'evt-schoenberg-vienna-1921',
    year: 1921,
    location: { lat: 48.2082, lng: 16.3738, city: 'Vienna', country: 'Austria' },
    genre: ['Classical', 'Avant-Garde'],
    title: 'Schoenberg invents the twelve-tone method in Vienna',
    description: "Arnold Schoenberg, having pushed Romantic chromaticism to its breaking point in Verklarte Nacht and Pierrot Lunaire, announces his 'method of composing with twelve tones related only to one another.' This systematic approach to atonality — serialism — provides a new organizing principle for music after the collapse of tonality. His students Berg and Webern form the Second Viennese School, whose influence dominates academic composition for decades.",
    tags: ['schoenberg', 'twelve-tone', 'serialism', 'atonality', 'second viennese school', 'berg', 'webern'],
  },
  {
    id: 'evt-shostakovich-moscow-1937',
    year: 1937,
    location: { lat: 55.7558, lng: 37.6173, city: 'Moscow', country: 'Russia' },
    genre: ['Classical', 'Symphonic'],
    title: 'Shostakovich premieres the Fifth Symphony under Stalinist terror',
    description: "Dmitri Shostakovich, publicly denounced by Pravda for his opera Lady Macbeth as 'muddle instead of music,' premieres his Fifth Symphony in Leningrad. Subtitled 'A Soviet artist's creative reply to just criticism,' the symphony's triumphant finale conceals — or does it? — a soul-crushing irony. Shostakovich's 15 symphonies and 15 string quartets, composed under constant threat of the Gulag, constitute the most powerful body of music written under totalitarian oppression.",
    tags: ['shostakovich', 'fifth symphony', 'stalin', 'pravda', 'soviet music', 'lady macbeth', 'dissidence'],
  },

  // ── Contemporary (1952–1977) ──

  {
    id: 'evt-cage-nyc-1952',
    year: 1952,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Classical', 'Avant-Garde'],
    title: "John Cage premieres 4'33\" and redefines the boundaries of music",
    description: "John Cage premieres 4'33\" at Woodstock, New York — four minutes and thirty-three seconds of silence, during which the audience's own sounds become the composition. Influenced by Zen Buddhism and Marcel Duchamp, Cage's radical philosophy of chance operations, prepared piano, and indeterminacy liberates composition from the composer's ego. His ideas influence Fluxus, sound art, ambient music, and every subsequent questioning of what music can be.",
    tags: ['john cage', 'four thirty three', 'silence', 'chance', 'prepared piano', 'fluxus', 'indeterminacy'],
  },
  {
    id: 'evt-stockhausen-dusseldorf-1956',
    year: 1956,
    location: { lat: 51.2277, lng: 6.7735, city: 'Dusseldorf', country: 'Germany' },
    genre: ['Classical', 'Electronic', 'Avant-Garde'],
    title: 'Stockhausen pioneers electronic music at the WDR studio in Cologne',
    description: "Karlheinz Stockhausen, working at the WDR electronic music studio in nearby Cologne, composes Gesang der Junglinge, fusing electronically generated sounds with a boy's singing voice. This landmark work establishes electronic music as a serious compositional medium. Stockhausen's spatial music, aleatory techniques, and monumental Licht opera cycle (29 hours across seven operas) influence artists from The Beatles to Kraftwerk to Bjork.",
    tags: ['stockhausen', 'electronic music', 'wdr cologne', 'gesang der junglinge', 'spatial music', 'licht', 'avant-garde'],
  },
  {
    id: 'evt-minimalism-nyc-1964',
    year: 1964,
    location: { lat: 40.7128, lng: -74.006, city: 'New York City', country: 'US' },
    genre: ['Classical', 'Minimalism'],
    title: "Terry Riley's In C launches the minimalist revolution",
    description: "Terry Riley premieres In C in San Francisco, and Steve Reich and Philip Glass develop the aesthetic in New York, creating minimalism — the most influential classical movement since serialism. By stripping music to repeating patterns that shift gradually, minimalism reconnects contemporary classical music with popular audiences. Reich's Music for 18 Musicians, Glass's Einstein on the Beach, and John Adams's operas become crossover sensations that influence electronic music, film scoring, and post-rock.",
    tags: ['minimalism', 'terry riley', 'steve reich', 'philip glass', 'in c', 'repetition', 'john adams'],
  },
  {
    id: 'evt-part-tallinn-1977',
    year: 1977,
    location: { lat: 59.4370, lng: 24.7536, city: 'Tallinn', country: 'Estonia' },
    genre: ['Classical', 'Sacred'],
    title: 'Arvo Part invents tintinnabuli and the holy minimalism movement',
    description: "Estonian composer Arvo Part, after years of silence following a crisis of faith and confrontation with Soviet censors, unveils his tintinnabuli style — a radically stripped-down technique combining a melodic voice with a triadic 'tintinnabulating' voice. Works like Tabula Rasa, Fratres, and Spiegel im Spiegel achieve a luminous, bell-like stillness. Part becomes the most performed living composer in the world, and his 'holy minimalism' (alongside Gorecki and Tavener) proves that simplicity and spiritual depth can reach mass audiences.",
    tags: ['arvo part', 'tintinnabuli', 'tabula rasa', 'estonian', 'holy minimalism', 'sacred', 'fratres'],
  },

  // ═══════════════════════════════════════════════════════════════
  // ██  ASIAN & MIDDLE EASTERN TRADITIONAL MUSIC  ██
  // ═══════════════════════════════════════════════════════════════

  // ── Southeast Asian Traditional Music ──

  {
    id: 'evt-gagaku-kyoto-794',
    year: 794,
    location: { lat: 35.0116, lng: 135.7681, city: 'Kyoto', country: 'Japan' },
    genre: ['Gagaku', 'Japanese Classical', 'Court Music'],
    title: 'Gagaku becomes the music of the Heian imperial court in Kyoto',
    description: "When the capital moves to Kyoto, gagaku — the world's oldest continuously performed orchestral tradition — reaches its definitive form. Imported from Tang China, Korea, and Southeast Asia in the 7th-8th centuries, then refined into a uniquely Japanese aesthetic of austere beauty. Sho (mouth organ), hichiriki (double-reed), ryuteki (transverse flute), biwa (lute), and taiko drums. Still performed today by the Imperial Household Agency.",
    tags: ['gagaku', 'heian', 'imperial', 'sho', 'hichiriki', 'ryuteki', 'biwa', 'tang dynasty', 'court music'],
  },
  {
    id: 'evt-pinpeat-phnompenh-802',
    year: 802,
    location: { lat: 11.5564, lng: 104.9282, city: 'Phnom Penh', country: 'Cambodia' },
    genre: ['Pinpeat', 'Khmer Classical'],
    title: 'Pinpeat ensemble accompanies the founding of the Khmer Empire',
    description: "Jayavarman II founds the Angkorian kingdom, and the pinpeat — a sacred percussion and wind ensemble of roneat (xylophones), skor (drums), sralai (oboe), and kong (gongs) — becomes the voice of Khmer royal ceremony. Carved into the walls of Angkor Wat and Bayon, the pinpeat survives the fall of Angkor, the colonial era, and even the Khmer Rouge's systematic murder of musicians to remain Cambodia's defining classical tradition.",
    tags: ['pinpeat', 'angkor', 'khmer', 'jayavarman', 'roneat', 'sralai', 'cambodian classical', 'apsara'],
  },
  {
    id: 'evt-arabic-classical-baghdad-800',
    year: 800,
    location: { lat: 33.3152, lng: 44.3661, city: 'Baghdad', country: 'Iraq' },
    genre: ['Arabic Classical', 'Maqam'],
    title: 'The Abbasid golden age codifies Arabic classical music in Baghdad',
    description: "Al-Kindi writes the first Arabic treatise on music theory. Al-Farabi's Kitab al-Musiqa al-Kabir becomes the greatest medieval work on music. Ziryab, the Abbasid court musician, flees to Cordoba where he revolutionizes Iberian music — adding a fifth string to the oud, establishing the nuba suite form, and creating the bridge through which Arabic musical theory reaches the European troubadours. The maqam system, oud, qanun, ney, and frame drum become foundational across the Islamic world.",
    tags: ['abbasid', 'al-kindi', 'al-farabi', 'ziryab', 'maqam', 'oud', 'qanun', 'ney', 'baghdad', 'golden age'],
  },
  {
    id: 'evt-gamelan-jakarta-900',
    year: 900,
    location: { lat: -6.2088, lng: 106.8456, city: 'Jakarta', country: 'Indonesia' },
    genre: ['Gamelan', 'Javanese Classical'],
    title: "Javanese gamelan emerges as Southeast Asia's great bronze orchestra",
    description: "The Hindu-Buddhist kingdoms of Java develop the gamelan — interlocking bronze metallophones, gongs, drums, and rebab tuned to slendro and pelog scales. Inseparable from wayang shadow puppetry, court dance, and ceremonial life, gamelan becomes the most sophisticated ensemble music in Southeast Asia. When Debussy hears Javanese gamelan at the 1889 Paris Exposition, it transforms Western music; when Steve Reich studies it, minimalism is born.",
    tags: ['gamelan', 'java', 'slendro', 'pelog', 'wayang', 'bronze', 'mataram', 'shadow puppetry'],
  },
  {
    id: 'evt-piphat-bangkok-1350',
    year: 1350,
    location: { lat: 13.7563, lng: 100.5018, city: 'Bangkok', country: 'Thailand' },
    genre: ['Piphat', 'Thai Classical'],
    title: 'Piphat ensemble becomes the voice of the Ayutthaya court',
    description: "The founding of Ayutthaya, which absorbs Angkorian musical traditions, establishes the piphat — a powerful hard-mallet ensemble of ranat ek (xylophone), pi nai (quadruple-reed oboe), and ching (finger cymbals). Piphat accompanies Muay Thai, khon masked dance, and royal ceremonies. Its intricate heterophonic texture — where every instrument simultaneously elaborates a single melody — defines the Thai classical sound.",
    tags: ['piphat', 'ayutthaya', 'ranat', 'pi nai', 'thai classical', 'khon', 'muay thai', 'heterophony'],
  },

  // ── East Asian Traditional Music ──

  {
    id: 'evt-jeongak-seoul-1392',
    year: 1392,
    location: { lat: 37.5665, lng: 126.9780, city: 'Seoul', country: 'South Korea' },
    genre: ['Jeongak', 'Korean Classical', 'Court Music'],
    title: "Joseon dynasty establishes Jeongak as Korea's classical music",
    description: "The founding of the Joseon dynasty inaugurates Korea's golden age of court music. King Sejong the Great personally reforms court music and creates a unique notation system (jeongganbo, 1447). Jeongak encompasses aak (Confucian ritual music), dangak (Chinese-derived), and hyangak (native Korean). Gayageum, geomungo, haegeum, and daegeum produce a sound world of unhurried, meditative grandeur.",
    tags: ['jeongak', 'joseon', 'sejong', 'aak', 'gayageum', 'geomungo', 'jeongganbo', 'korean court', 'ritual'],
  },

  // ── Indian Classical & Malay Klasik ──

  {
    id: 'evt-klasik-kualalumpur-1400',
    year: 1400,
    location: { lat: 3.1390, lng: 101.6869, city: 'Kuala Lumpur', country: 'Malaysia' },
    genre: ['Malay Classical', 'Court Music'],
    title: 'Malacca Sultanate establishes the Malay klasik court tradition',
    description: "The Malacca Sultanate, at the crossroads of Indian, Chinese, and Islamic trade routes, develops a distinctive court music tradition. The nobat — a sacred royal orchestra of drums, trumpet, and gong — accompanies coronations to this day. Gamelan Melayu, mak yong dance-theater, and dikir barat chanting blend Hindu-Buddhist, Islamic, and indigenous Austronesian elements into a uniquely Malay classical aesthetic.",
    tags: ['malay klasik', 'malacca sultanate', 'nobat', 'gamelan melayu', 'mak yong', 'court music', 'sultanate'],
  },
  {
    id: 'evt-yayue-beijing-1420',
    year: 1420,
    location: { lat: 39.9042, lng: 116.4074, city: 'Beijing', country: 'China' },
    genre: ['Yayue', 'Chinese Classical', 'Confucian'],
    title: 'Ming dynasty reconstructs Yayue for Confucian rites in the Forbidden City',
    description: "Emperor Yongle completes the Forbidden City and reconstructs yayue — Confucian ritual music dating back over 3,000 years — for imperial ceremonies at the Temple of Heaven. Bianzhong (bronze bells), bianqing (stone chimes), guqin (seven-string zither), xiao (end-blown flute). The concept of music as cosmic moral order radiates outward, shaping Korean aak, Japanese gagaku, and Vietnamese nha nhac.",
    tags: ['yayue', 'confucian', 'ming dynasty', 'forbidden city', 'bianzhong', 'guqin', 'temple of heaven', 'ritual'],
  },
  {
    id: 'evt-andalusi-fez-1492',
    year: 1492,
    location: { lat: 34.0181, lng: -5.0078, city: 'Fez', country: 'Morocco' },
    genre: ['Andalusi Classical', 'Maqam'],
    title: 'Andalusian classical music finds refuge in Fez after the fall of Granada',
    description: "Muslim and Jewish musicians expelled from Iberia carry the nuba suite tradition to North Africa. Fez becomes the foremost center of Andalusi music — multi-movement suites of instrumental preludes, vocal sections, and accelerating rhythmic finales that preserve a medieval synthesis of Arabic, Berber, and Iberian elements. Each North African city — Fez, Tlemcen, Tunis, Tripoli — develops its own school, but all trace back to Ziryab's Cordoba.",
    tags: ['andalusi', 'nuba', 'fez', 'granada', 'moorish', 'ziryab legacy', 'north africa', 'expulsion', 'al-andalus'],
  },
  {
    id: 'evt-persian-classical-isfahan-1501',
    year: 1501,
    location: { lat: 32.6546, lng: 51.6680, city: 'Isfahan', country: 'Iran' },
    genre: ['Persian Classical', 'Dastgah'],
    title: 'Safavid Isfahan becomes the capital of Persian classical music',
    description: "Shah Ismail I founds the Safavid dynasty and nurtures the dastgah system — seven modal frameworks organizing Persian classical music into vast suites of composed and improvised sections. Tar, setar, santur, kamancheh, ney, and tombak create a sound of extraordinary melodic subtlety. Persian musical theory profoundly shapes Hindustani music via the Mughal court and Central Asian traditions along the Silk Road. \"Isfahan is half the world.\"",
    tags: ['safavid', 'dastgah', 'isfahan', 'shah ismail', 'tar', 'setar', 'santur', 'kamancheh', 'persian modal'],
  },
  {
    id: 'evt-hindustani-varanasi-1560',
    year: 1560,
    location: { lat: 25.3176, lng: 82.9739, city: 'Varanasi', country: 'India' },
    genre: ['Hindustani Classical', 'Indian Classical'],
    title: "Tansen at Akbar's court codifies Hindustani classical music",
    description: "Mian Tansen, the legendary musician-saint of Emperor Akbar's court, synthesizes Persian modal principles with the ancient Indian raga system to forge Hindustani classical music. The dhrupad tradition evolves into khayal, thumri, and instrumental forms on sitar, sarod, tabla, and sarangi. With its elaborate raga (melodic framework) and tala (rhythmic cycle) system, Hindustani music becomes the world's most developed modal tradition.",
    tags: ['hindustani', 'tansen', 'akbar', 'mughal', 'raga', 'tala', 'dhrupad', 'khayal', 'sitar', 'tabla'],
  },

  // ── Middle Eastern & Central Asian Classical ──

  {
    id: 'evt-shashmaqam-bukhara-1600',
    year: 1600,
    location: { lat: 39.7747, lng: 64.4286, city: 'Bukhara', country: 'Uzbekistan' },
    genre: ['Shashmaqam', 'Central Asian Classical'],
    title: "Shashmaqam crystallizes as Bukhara's great classical music system",
    description: "The \"six maqams\" — a monumental suite system blending Persian, Turkic, and local Sogdian traditions — reaches its definitive form at the courts of the Bukhara Khanate. Each maqam contains instrumental mushkilot and vocal nasr sections of increasing rhythmic complexity. Tanbur, dutar, sato, and doira create the Central Asian classical sound. Shared heritage of Tajikistan and Uzbekistan, inscribed jointly by UNESCO in 2003.",
    tags: ['shashmaqam', 'bukhara', 'khanate', 'silk road', 'tanbur', 'dutar', 'six maqams', 'tajik', 'uzbek'],
  },
  {
    id: 'evt-nanguan-taipei-1600',
    year: 1600,
    location: { lat: 25.0330, lng: 121.5654, city: 'Taipei', country: 'Taiwan' },
    genre: ['Nanguan', 'Chinese Classical', 'Chamber Music'],
    title: 'Nanguan preserves ancient Chinese court sounds in Fujian and Taiwan',
    description: "Nanguan (nanyin, \"southern sound\") — one of China's oldest surviving music traditions, descended from Tang and Song dynasty court music — migrates to Taiwan and Southeast Asia with Hokkien traders and settlers. Pipa held horizontally (preserving Tang-era technique), dongxiao (end-blown flute), sanxian, and erxian produce a hauntingly slow, meditative sound. Inscribed by UNESCO as Intangible Heritage in 2009.",
    tags: ['nanguan', 'nanyin', 'hokkien', 'fujian', 'tang dynasty', 'pipa', 'dongxiao', 'southern sound', 'chamber'],
  },
  {
    id: 'evt-mahori-bangkok-1600',
    year: 1600,
    location: { lat: 13.7563, lng: 100.5018, city: 'Bangkok', country: 'Thailand' },
    genre: ['Mahori', 'Thai Classical'],
    title: 'Mahori chamber ensemble refines Thai court music into intimate art',
    description: "In the late Ayutthaya golden age, the mahori ensemble develops as the court's chamber music — softer and more intimate than piphat, blending strings (so sam sai, three-stringed fiddle), winds, and delicate percussion. Originally performed by women of the royal court, mahori represents the lyrical, introspective side of Thai classical music, bridging the formal piphat tradition with folk sensibilities.",
    tags: ['mahori', 'ayutthaya', 'so sam sai', 'thai chamber', 'court women', 'thai classical', 'strings'],
  },

  // ── Carnatic, Odissi & Vietnamese Court Music ──

  {
    id: 'evt-carnatic-chennai-1800',
    year: 1800,
    location: { lat: 13.0827, lng: 80.2707, city: 'Chennai', country: 'India' },
    genre: ['Carnatic', 'Indian Classical'],
    title: "The Trinity of Carnatic music perfects South India's classical tradition",
    description: "Tyagaraja, Muthuswami Dikshitar, and Syama Sastri — the Holy Trinity — compose thousands of kritis that define the Carnatic form. Rooted in ancient temple traditions, Carnatic music develops elaborate raga improvisation (alapana, niraval, kalpanaswaram) accompanied by veena, mridangam, violin, and ghatam. Chennai's December Music Season becomes the world's largest classical music festival.",
    tags: ['carnatic', 'tyagaraja', 'dikshitar', 'trinity', 'kriti', 'veena', 'mridangam', 'december season', 'chennai'],
  },
  {
    id: 'evt-nhanhac-hue-1802',
    year: 1802,
    location: { lat: 16.4637, lng: 107.5909, city: 'Hue', country: 'Vietnam' },
    genre: ['Nha nhac', 'Vietnamese Classical', 'Court Music'],
    title: 'Nguyen dynasty court music Nha nhac flourishes in Hue',
    description: "Emperor Gia Long establishes the Nguyen dynasty in Hue and formalizes nha nhac — elegant court music for royal ceremonies, Confucian rites, and royal entertainment. Influenced by Chinese ceremonial traditions but with a distinctly Vietnamese character — dan tranh (zither), dan nguyet (moon lute), and trong (drums) create an ethereal sound. Declared UNESCO Masterpiece of Intangible Heritage in 2003.",
    tags: ['nha nhac', 'nguyen dynasty', 'hue', 'imperial', 'dan tranh', 'dan nguyet', 'vietnamese court', 'confucian'],
  },
  {
    id: 'evt-odissi-mumbai-1952',
    year: 1952,
    location: { lat: 19.0760, lng: 72.8777, city: 'Mumbai', country: 'India' },
    genre: ['Odissi', 'Indian Classical', 'Dance Music'],
    title: "Odissi music and dance revived as one of India's oldest classical traditions",
    description: "Kelucharan Mohapatra, Sanjukta Panigrahi, and other masters reconstruct Odissi from temple sculptures at Konark and Bhubaneswar, palm-leaf manuscripts, and living gotipua traditions of Odisha. Rooted in the 2nd-century BCE Natyashastra, Odissi's distinctive music — with its champu rhythmic patterns and ragas tied to Jagannath temple worship — emerges as a classical tradition of haunting spiritual beauty.",
    tags: ['odissi', 'kelucharan mohapatra', 'konark', 'natyashastra', 'odisha', 'gotipua', 'jagannath', 'classical revival'],
  },
]

// Deduplicated list of all genres across cities + events for search matching
export const ALL_GENRES: string[] = (() => {
  const cityGenres = CITIES.flatMap((c) => c.genres)
  const eventGenres = MUSIC_HISTORY.flatMap((e) => e.genre)
  return [...new Set([...cityGenres, ...eventGenres])].sort()
})()
