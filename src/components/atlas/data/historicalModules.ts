import type { HistoricalModule } from '@/components/atlas/types';

/**
 * Genre tours merged into another (owner, 2026-11-09): an old link, slide or
 * prompt naming one opens the tour it joined (guides.getModuleById).
 */
export const PATHWAY_ALIASES: Readonly<Record<string, string>> = {
  'griot-to-hiphop': 'hiphop-diaspora',
  'roots-of-reggae': 'jamaican-riddim',
  'blues-family-tree': 'blues-to-rock',
  'afro-cuban-currents': 'cuban-son-circle',
  'sacred-to-soul': 'soul-funk-disco',
};

export const HISTORICAL_MODULES: HistoricalModule[] = [
  {
    id: 'blues-to-rock',
    title: 'Blues to Rock',
    description:
      'From Delta blues and electric Chicago to rock and roll, the British blues boom and heavy metal.',
    emoji: '🎸',
    learnGenres: ['blues', 'rock'],
    eventIds: [
      'evt-blues-clarksdale-1903',
      'evt-handy-memphis-1912',
      'evt-blues-recording-nyc-1920',
      'evt-blues-mississippi-1936',
      'evt-blues-memphis-1951',
      'evt-elvis-memphis-1954',
      'evt-rnb-chicago-1955',
      'evt-chuck-berry-stlouis-1955',
      'evt-british-blues-london-1962',
      'evt-heavy-metal-birmingham-1970',
    ],
    steps: [
      {
        lead: 'At a train station in Tutwiler, Mississippi, bandleader W.C. Handy hears a man sliding a knife along his guitar strings and singing. This Delta blues grew from field hollers and work songs. Handy can’t forget it, and soon he writes it down.',
      },
      {
        lead: 'In Memphis, W.C. Handy publishes “Memphis Blues,” one of the first blues pieces printed as sheet music. Turning a raw folk sound into written songs earns him the name “Father of the Blues.” Next, the blues gets recorded.',
      },
      {
        lead: 'In New York, Mamie Smith records “Crazy Blues,” and it sells 75,000 copies in its first month. Labels realize Black audiences want blues records, and the “race records” era begins. Back in the Delta, a young guitarist will soon make history.',
      },
      {
        lead: 'Robert Johnson records 29 songs over two sessions, including “Cross Road Blues” and “Hellhound on My Trail.” Stories grow about a deal with the devil at the crossroads. His Delta blues will shape every rock guitarist to come — but first, the blues plugs in.',
      },
      {
        lead: 'At Sam Phillips’ studio in Memphis, Ike Turner’s band records “Rocket 88,” often called one of the first rock and roll records. A damaged amplifier gives the guitar its distorted tone. Three years later, Phillips records a new singer in the same room.',
      },
      {
        lead: 'Elvis Presley records “That’s All Right” at Sun Studio, blending blues, country and gospel into a new sound. Sam Phillips has found the singer he was looking for, and rock and roll explodes. Meanwhile, up in Chicago, the blues is getting louder.',
        songs: [
          {
            id: 'cant_help_falling_in_love',
            title: 'Can’t Help Falling In Love',
            artist: 'Elvis Presley',
          },
        ],
      },
      {
        lead: 'At Chess Records in Chicago, Muddy Waters, Howlin’ Wolf and Little Walter play the Delta blues on electric guitars and amplified harmonicas. This Chicago blues sound will travel across the Atlantic. The same label is about to record a guitarist from St. Louis.',
      },
      {
        lead: 'Chuck Berry walks into Chess Records with a song called “Ida Red,” and it becomes “Maybellene,” fusing country rhythms with blues guitar. His playing and duck walk become the model for rock guitarists. In England, young bands are listening closely.',
        songs: [
          {
            id: 'johnny_b_goode',
            title: 'Johnny B. Goode',
            artist: 'Chuck Berry',
          },
        ],
      },
      {
        lead: 'In London, the Rolling Stones and the Yardbirds play the electric Chicago blues of Muddy Waters and Howlin’ Wolf. This British blues boom carries African American music to a global audience. It also lays the groundwork for something heavier.',
        songs: [
          {
            id: 'honky_tonk_women',
            title: 'Honky Tonk Women',
            artist: 'The Rolling Stones',
          },
        ],
      },
      {
        lead: 'In working-class Birmingham, Black Sabbath take the British blues boom’s distortion, tune their guitars down and add dark, occult imagery. The result is heavy metal. From a Mississippi train station to an English industrial city, the blues has become the backbone of rock.',
      },
    ],
  },
  {
    id: 'cuban-son-circle',
    title: 'Cuban Son to Salsa',
    description:
      'Cuban rhythm from contradanza and rumba to son, mambo, New York salsa and timba.',
    emoji: '🎺',
    learnGenres: ['latin'],
    eventIds: [
      'evt-contradanza-havana-1800',
      'evt-diaspora-havana-rumba-1886',
      'evt-son-havana-1930',
      'evt-diaspora-nyc-afrocuban-jazz-1947',
      'evt-mambo-havana-1950',
      'evt-revolution-havana-1959',
      'evt-boogaloo-nyc-1966',
      'evt-salsa-nyc-1971',
      'evt-timba-havana-1990',
      'evt-buena-vista-havana-1996',
    ],
    steps: [
      {
        lead: 'Refugees from the Haitian revolution bring the French contradanse to Cuba, where it meets African drumming kept alive in Havana. The Cuban contradanza carries a syncopated “habanera” bass line that will flow into son, tango, ragtime and jazz. Next, Havana’s courtyards add their own drums.',
      },
      {
        lead: 'After slavery ends in Cuba, Afro-Cuban communities in Havana’s tenement courtyards create rumba from Congolese and Yoruba traditions. Played on cajón boxes, then congas and claves, it becomes the rhythmic engine under son, mambo and salsa. Soon son arrives from the countryside.',
      },
      {
        lead: 'Groups like Sexteto Habanero and Trío Matamoros bring son cubano from rural Oriente province to Havana’s cabarets and radio. It mixes the Spanish tres guitar, the clave rhythm and the habanera pulse, and becomes Cuba’s national music. In New York, it is about to meet jazz.',
      },
      {
        lead: 'At a Carnegie Hall concert, Dizzy Gillespie introduces Cuban percussionist Chano Pozo, who played sacred batá drums in Havana. Pozo brings Yoruba and Congolese rhythms into bebop, and songs like “Manteca” create Afro-Cuban jazz. Back in Havana, big bands are mixing the same ingredients.',
      },
      {
        lead: 'Pérez Prado, Beny Moré and the house bands of the Tropicana nightclub make Havana the mambo capital of the world. Cuban big bands blend Afro-Cuban percussion with jazz arrangements, and the dance sweeps across the Americas. Then politics changes everything.',
      },
      {
        lead: 'Fidel Castro’s revolution and the U.S. embargo close Havana’s famous nightclubs and scatter Cuban musicians across the Americas. Exiles carry son and mambo to New York, Miami and Mexico City. In New York, that music meets a new generation.',
      },
      {
        lead: 'In Spanish Harlem, Puerto Rican teenagers like Joe Cuba and Pete Rodriguez mix their parents’ mambo with R&B from Black American radio. Latin boogaloo is the first bilingual Latin-soul crossover. It doesn’t last long, but it helps lay the groundwork for salsa.',
      },
      {
        lead: 'In the Bronx, Fania Records and bandleaders like Willie Colón and Héctor Lavoe forge salsa from Cuban son, Puerto Rican plena and bomba, and New York Latin jazz. Salsa becomes the leading pan-Latin dance music. Meanwhile, Cuba keeps building its own sound.',
      },
      {
        lead: 'In Havana, Los Van Van and NG La Banda create timba, fusing son montuno, rumba, funk and hip hop with hard-hitting Afro-Cuban percussion. While salsa elsewhere goes smooth, Cuba goes hard, with sudden gear changes for dancers. A few years later, an older generation gets its moment.',
      },
      {
        lead: 'Ry Cooder and producer Nick Gold gather veteran Cuban musicians — Ibrahim Ferrer, Compay Segundo, Rubén González and Omara Portuondo — at EGREM Studios in Havana. The Buena Vista Social Club album sells 8 million copies. The son of Havana’s golden age finds listeners around the world.',
      },
    ],
  },
  {
    id: 'hiphop-diaspora',
    title: 'Hip Hop: The Bronx to the World',
    description:
      'Griot storytelling and funk breaks become Bronx hip hop, then spread to LA, Dakar, Atlanta and London.',
    emoji: '🎤',
    learnGenres: ['hip-hop'],
    eventIds: [
      'evt-griot-timbuktu-1500',
      'evt-funk-augusta-1970',
      'evt-hiphop-nyc-1973',
      'evt-hiphop-nyc-1979',
      'evt-westcoast-la-1988',
      'evt-hiphop-dakar-1991',
      'evt-hiphop-atlanta-2003',
      'evt-trap-atlanta-2012',
      'evt-drill-london-2019',
    ],
    steps: [
      {
        lead: 'In the Songhai Empire, griots — hereditary musician-historians — keep genealogies, epics and lessons alive with the kora, balafon and ngoni. Their storytelling crosses the Atlantic with the slave trade and seeds American music. Centuries later, that storytelling meets a new beat.',
      },
      {
        lead: 'James Brown and his band strip music down to “the One,” a downbeat-driven groove where rhythm matters more than melody. This is funk. Its percussive grooves will become the foundational sample source for hip hop.',
        songs: [
          {
            id: 'get_up_i_feel_like_being_a_sex_machine',
            title: 'Get Up (I Feel Like Being A) Sex Machine',
            artist: 'James Brown',
          },
        ],
      },
      {
        lead: 'At a Bronx block party, DJ Kool Herc isolates and loops the drum breaks of funk records. Drawing on Jamaican sound-system culture and the griot’s spoken word, he sparks hip hop: MCing, turntablism, breakdancing and graffiti. Six years later, rap reaches the charts.',
      },
      {
        lead: 'The Sugarhill Gang’s “Rapper’s Delight” becomes the first hip hop single to reach the Top 40. Rap, born at Bronx block parties, introduces itself to mainstream America. Within a decade, the West Coast answers.',
      },
      {
        lead: 'N.W.A — Ice Cube, Dr. Dre, Eazy-E, MC Ren and DJ Yella — release “Straight Outta Compton,” a raw picture of life in South Central LA. It shifts hip hop’s center of gravity from New York to the West Coast. Soon the sound crosses the ocean.',
        songs: [
          {
            id: 'still_dre',
            title: 'Still D.R.E.',
            artist: 'Dr. Dre featuring Snoop Dogg',
          },
        ],
      },
      {
        lead: 'In Dakar, Positive Black Soul take golden-age Bronx hip hop and rap it in Wolof over mbalax rhythms, in the griot storytelling tradition. They become Senegal’s first internationally known hip hop group and spark a Francophone African rap movement. Back in the U.S., the South rises.',
      },
      {
        lead: 'OutKast’s double album “Speakerboxxx/The Love Below” wins the Grammy for Album of the Year, making Atlanta hip hop’s new capital. Lil Jon’s crunk and T.I.’s early trap are close behind. The city’s next sound will take over the decade.',
        songs: [{ id: 'hey_ya', title: 'Hey Ya!', artist: 'Outkast' }],
      },
      {
        lead: 'Future, Young Thug, Migos and 21 Savage push Atlanta trap to the world on Metro Boomin’s hi-hat-heavy, bass-drenched beats. Trap spreads into pop, EDM and Latin music. In London, rappers are reshaping another American style.',
      },
      {
        lead: 'UK drill grows out of South London estates, turning its Chicago roots into a British sound with sliding 808s and rapid-fire flows. Headie One, Central Cee and Dave break chart records, and the sound travels back to New York. From the griot’s kora to London’s estates, the story keeps being retold.',
      },
    ],
  },
  {
    id: 'electronic-evolution',
    title: 'Electronic Music: Disco to Techno',
    description:
      'From disco DJs and Kraftwerk to house, techno and rave, then festivals and amapiano.',
    emoji: '🎹',
    learnGenres: ['electronic'],
    eventIds: [
      'evt-disco-nyc-1977',
      'evt-electronic-dusseldorf-1979',
      'evt-house-chicago-1984',
      'evt-techno-detroit-1985',
      'evt-balearic-ibiza-1988',
      'evt-acid-house-london-1986',
      'evt-techno-berlin-1991',
      'evt-french-touch-paris-1996',
      'evt-edm-amsterdam-2005',
      'evt-amapiano-johannesburg-2019',
    ],
    steps: [
      {
        lead: 'Studio 54 opens in a former CBS studio on West 54th Street in Manhattan and becomes the center of disco culture. Its DJs pioneer mixing records into continuous dance sets. In Germany, a band is building music out of machines.',
      },
      {
        lead: 'In their Kling Klang studio in Düsseldorf, Kraftwerk join man and machine in minimal, repetitive electronic pop. Detroit techno, synth-pop, electro and hip hop production all trace a line back to them. In America, club DJs are about to build on both sounds.',
      },
      {
        lead: 'At the Warehouse on Chicago’s South Side, Frankie Knuckles blends disco, electronic beats and soul vocals on a Roland drum machine. House music is born, the foundation of modern dance music. In Detroit, three friends are working on a sound of their own.',
      },
      {
        lead: 'Juan Atkins, Derrick May and Kevin Saunderson — friends from Belleville, Michigan — fuse Kraftwerk’s electronic futurism with Parliament-Funkadelic’s groove. Detroit techno will transform global dance culture. Next, Chicago’s sounds land in Europe.',
      },
      {
        lead: 'At Ibiza clubs like Amnesia, DJs such as Alfredo Fiorito mix Chicago house, Euro-disco, indie rock and world music into the sunny Balearic sound. British DJs carry the experience home. In London, it sets off the Second Summer of Love.',
      },
      {
        lead: 'Chicago’s acid house tracks, built on the squelching Roland TB-303, land in London and set off a rave culture that sweeps Britain. Merging with UK sound-system traditions, it paves the way for jungle, drum and bass and grime. Next, techno finds a home in a newly reunified Berlin.',
      },
      {
        lead: 'Tresor opens in the vault of the former Wertheim department store near Potsdamer Platz. In the euphoria after German reunification, it becomes ground zero for Berlin techno and links Detroit’s pioneers with a new European audience. In Paris, producers take house somewhere warmer.',
      },
      {
        lead: 'Daft Punk, Cassius and Étienne de Crécy filter Chicago house, P-funk and vintage disco through a Parisian lens. French touch is warm, funky and full of samples. Daft Punk’s success opens the door to the mainstream EDM wave.',
        songs: [{ id: 'get_lucky', title: 'Get Lucky', artist: 'Daft Punk' }],
      },
      {
        lead: 'The Amsterdam Dance Event grows into the world’s largest electronic music conference and festival, with 2,500+ artists across 200 venues. Dutch DJs like Tiësto, Armin van Buuren, Martin Garrix and Afrojack lead global EDM. Meanwhile, new dance sounds keep rising in new places.',
      },
      {
        lead: 'In Johannesburg’s townships, amapiano producers like Kabza De Small, DJ Maphorisa and Vigro Deep mix deep house, kwaito bass and jazz piano. TikTok carries its log drums and piano stabs around the world. The dance floor that disco DJs started now has a South African heartbeat.',
      },
    ],
  },
  {
    id: 'jamaican-riddim',
    title: 'Jamaican Riddim: Mento to Dancehall',
    description:
      'Mento and sound systems become ska, rocksteady, reggae, dub and dancehall, then the beat of reggaeton.',
    emoji: '🇯🇲',
    learnGenres: ['reggae'],
    eventIds: [
      'evt-mento-kingston-1947',
      'evt-diaspora-kingston-kumina-1950',
      'evt-soundsystem-kingston-1956',
      'evt-ska-kingston-1962',
      'evt-rocksteady-kingston-1966',
      'evt-reggae-kingston-1971',
      'evt-dub-kingston-1972-tubby',
      'evt-dancehall-kingston-1975',
      'evt-dancehall-kingston-1985',
      'evt-reggaeton-san-juan-2004',
    ],
    steps: [
      {
        lead: 'By the late 1940s, mento — Jamaica’s rural folk music of banjo, acoustic guitar, hand drums and the deep rhumba box — fills country dances and Kingston stage shows. A cousin of calypso, its cheeky stories and syncopated lilt prepare the ground for ska. Deeper roots lie in the island’s drums.',
      },
      {
        lead: 'In eastern Jamaica, Kumina — brought by Kongolese laborers in the 19th century — keeps Central African drumming and chanting alive, while Revivalism blends African spirituality with Christianity. Their bass-heavy polyrhythms flow into ska, rocksteady and reggae. In Kingston, the speakers are getting bigger.',
      },
      {
        lead: 'Coxsone Dodd, Duke Reid and Prince Buster build huge mobile sound systems in Kingston’s yards and dance halls, playing American R&B to packed crowds. Their DJs’ “toasting” will later inspire hip hop in the Bronx. When they start recording local artists, ska begins.',
      },
      {
        lead: 'As Jamaica wins independence, Kingston’s sound-system operators and studio bands fuse mento with American R&B into ska: walking basslines, the chopped offbeat “skank” guitar and jazzy horns. Studio One and the future Skatalites make it the sound of a new nation. Then the tempo drops.',
      },
      {
        lead: 'Ska’s frantic tempo slows into rocksteady, a bass-heavy groove shaped by American soul records, with tighter vocal harmonies and more space. It is the direct step before reggae. A Kingston band is ready to carry that step to the world.',
      },
      {
        lead: 'Growing out of rocksteady and inspired by Rastafarian faith, Bob Marley and the Wailers take reggae from Kingston’s streets to the world as a voice of resistance and Pan-African identity. Its offbeat skank and heavy bass reach punk and lovers rock. Nearby, the mixing desk becomes an instrument.',
        songs: [
          {
            id: 'i_shot_the_sheriff',
            title: 'I Shot The Sheriff',
            artist: 'Bob Marley',
          },
          { id: 'stir_it_up', title: 'Stir It Up', artist: 'Bob Marley' },
        ],
      },
      {
        lead: 'King Tubby turns his small Waterhouse home studio into the lab where dub is born. On a custom 4-track mixing board, he strips reggae songs down to bass and drums and adds delay, reverb and phasing. With the singers pulled out of the mix, DJs step up to the mic.',
      },
      {
        lead: 'Over dub’s bare bass and drums, DJs like U-Roy and Big Youth start “toasting,” chanting rhythmically over instrumentals. The spotlight shifts from singers to selectors and MCs, and riddims get reused again and again. Ten years later, a cheap keyboard changes everything.',
      },
      {
        lead: 'King Jammy’s “Sleng Teng” riddim, the first fully digital reggae beat, made on a Casio keyboard, transforms Jamaican music. Dancehall replaces roots reggae as the main sound, with DJs like Yellowman and Shabba Ranks on computerized rhythms. Soon dancehall’s beat travels to Panama and Puerto Rico.',
      },
      {
        lead: 'Daddy Yankee’s “Gasolina” carries reggaeton from Puerto Rico’s underground to global radio. Its dembow rhythm comes from Jamaican dancehall, brought to Panama and refined in San Juan. A riddim born in Kingston becomes the main beat of Latin music for two decades.',
      },
    ],
  },
  {
    id: 'griot-to-afrobeats',
    title: 'Griot to Afrobeats',
    description:
      'West African music from griot epics through highlife, Afrobeat and jùjú to Lagos Afrobeats.',
    emoji: '🥁',
    learnGenres: ['african'],
    eventIds: [
      'evt-griot-timbuktu-1500',
      'evt-highlife-lagos-1952',
      'evt-highlife-accra-1958',
      'evt-afrobeat-lagos-1971',
      'evt-juju-lagos-1978',
      'evt-hiplife-accra-2004',
      'evt-afrobeats-lagos-2010',
      'evt-one-dance-lagos-2016',
      'evt-burna-boy-lagos-2020',
    ],
    steps: [
      {
        lead: 'In the courts of Timbuktu and Gao under the Songhai Empire, griots — hereditary musician-historians — preserve genealogies, epics and moral lessons with the kora, balafon and ngoni. Their musical and storytelling frameworks will travel far, even across the Atlantic. Jump ahead to the dance halls of Lagos.',
      },
      {
        lead: 'E.T. Mensah tours Lagos with the Tempos, and Bobby Benson’s hotel bands mix Yoruba rhythms with jazz, calypso and Cuban son. This joyful, horn-driven sound is highlife, built on palm wine guitar and brass band traditions. In Ghana, it’s about to hit its peak.',
      },
      {
        lead: 'As Ghana celebrates independence, E.T. Mensah and the Tempos welcome American jazz musicians to Accra. Highlife reaches its peak as the soundtrack of Pan-African optimism. Across the border in Lagos, Fela Kuti is listening.',
      },
      {
        lead: 'Fela Kuti opens the Afrika Shrine in Lagos, a nightclub and commune that becomes the home of Afrobeat. With his band Africa 70, he fuses Yoruba rhythms, jazz, funk and political fire in marathon shows that challenge the military government. Another Lagos star takes a different path.',
      },
      {
        lead: 'King Sunny Adé builds on the talking-drum jùjú of I.K. Dairo, adding pedal steel guitar and synthesizers to marathon dance shows. His albums on Island Records help make Nigeria’s name as Africa’s music powerhouse. In Ghana, a new generation mixes highlife with hip hop.',
      },
      {
        lead: 'In Accra, Reggie Rockstone, and later Obrafour and VIP, marry the horn-driven sweetness of highlife with hip hop beats, Twi-language rapping and dancehall energy. Hiplife rules Ghanaian radio. It sets the foundation for Afrobeats’ global breakthrough.',
      },
      {
        lead: 'A new generation in Lagos — Wizkid, Davido and Burna Boy — fuses West African rhythms with dancehall, hip hop and R&B. Social media and diaspora networks make Lagos the center of a global Afrobeats movement. Soon one song carries it to the top of Western charts.',
      },
      {
        lead: 'Drake’s “One Dance,” featuring Lagos star Wizkid and Kyla, reaches No. 1 in fifteen countries and becomes Spotify’s most-streamed song. Afrobeats gains a lasting place on Western pop charts. That opens doors for Burna Boy, Davido and Tems.',
      },
      {
        lead: 'Burna Boy wins the Grammy for Best Global Music Album with “Twice As Tall,” drawing on Fela Kuti’s Afrobeat, dancehall and the scene built by Don Jazzy and Wizkid. Tems, Rema and Ayra Starr follow. From griot epics to the Grammy stage, West African music now speaks as global pop.',
      },
    ],
  },
  {
    id: 'jazz-chain',
    title: 'Jazz: New Orleans to Fusion',
    description:
      'Jazz from Congo Square and New Orleans to Chicago, Harlem swing, bebop, modal jazz and fusion.',
    emoji: '🎷',
    learnGenres: ['jazz'],
    eventIds: [
      'evt-jazz-congo-square-nola-1819',
      'evt-jazz-origins-nola-1890',
      'evt-jazz-nola-1923',
      'evt-jazz-armstrong-hotfive-chicago-1925',
      'evt-jazz-ellington-cotton-club-1927',
      'evt-swing-nyc-1938',
      'evt-bebop-nyc-1945',
      'evt-jazz-miles-kind-of-blue-nyc-1959',
      'evt-jazz-miles-bitches-brew-1970',
    ],
    steps: [
      {
        lead: 'On Sundays, enslaved Africans gather in New Orleans’ Congo Square to drum, sing and dance in traditions from West and Central Africa and the Caribbean. These gatherings keep polyrhythm and call-and-response alive. By the 1890s, the whole city is mixing sounds.',
      },
      {
        lead: 'In New Orleans’ streets and dance halls, brass bands, Creole string orchestras, blues singers and ragtime pianists collide. Congo Square drums, French quadrilles, habanera rhythms and hymns all go into the mix. This convergence lights the fuse for jazz.',
      },
      {
        lead: 'King Oliver’s Creole Jazz Band, with a young Louis Armstrong on second cornet, records its first sides for Gennett Records. These records capture the sound of New Orleans jazz. Armstrong is about to step out on his own.',
      },
      {
        lead: 'In Chicago, Louis Armstrong starts recording with his Hot Five and Hot Seven, including “West End Blues” and “Potato Head Blues.” These sessions make the solo the center of jazz and turn scat singing into an art. In Harlem, a bandleader is thinking bigger.',
        songs: [
          {
            id: 'what_a_wonderful_world',
            title: 'What A Wonderful World',
            artist: 'Louis Armstrong',
          },
        ],
      },
      {
        lead: 'Duke Ellington and his orchestra begin a residency at Harlem’s Cotton Club, broadcast nationally on radio. Ellington turns the jazz orchestra from a dance band into a vehicle for composition, with growling brass and rich harmonies. Big bands are about to rule America.',
      },
      {
        lead: 'Benny Goodman and his orchestra play the first jazz concert at Carnegie Hall. The racially integrated band, with Teddy Wilson, Lionel Hampton and Count Basie’s sidemen, tears through swing standards. Younger players in Manhattan clubs want something faster.',
      },
      {
        lead: 'In Manhattan clubs like Minton’s Playhouse and the Three Deuces, Charlie Parker, Dizzy Gillespie, Thelonious Monk and Bud Powell transform jazz. Bebop replaces swing with dizzying tempos, complex harmonies and virtuosic improvisation. Fourteen years later, Miles Davis tries a different idea.',
      },
      {
        lead: 'Miles Davis gathers John Coltrane, Cannonball Adderley, Bill Evans and others and records “Kind of Blue” in two sessions. It replaces bebop’s dense chord changes with modal scales, giving soloists room to explore. A decade later, Davis plugs in.',
      },
      {
        lead: 'Miles Davis releases “Bitches Brew,” mixing jazz and rock with electric pianos, electric bass, several drummers and heavy studio editing. It launches Herbie Hancock, Chick Corea, Wayne Shorter and others into jazz fusion. From Congo Square’s drums to electric fusion, jazz keeps expanding.',
      },
    ],
  },
  {
    id: 'soul-funk-disco',
    title: 'Soul, Funk and Disco',
    description:
      'From spirituals and gospel to Stax and Motown soul, James Brown’s funk and the disco floor.',
    emoji: '🕺',
    learnGenres: ['rnb', 'funk'],
    eventIds: [
      'evt-spiritual-nashville-1867',
      'evt-diaspora-chicago-gospel-1932',
      'evt-ray-charles-atlanta-1954',
      'evt-soul-memphis-1962',
      'evt-motown-detroit-1963',
      'evt-funk-augusta-1970',
      'evt-philly-soul-philadelphia-1974',
      'evt-funk-la-1975-parliament-mothership',
      'evt-disco-nyc-1977',
      'evt-funk-nyc-1978-chic-le-freak',
    ],
    steps: [
      {
        lead: 'The Fisk Jubilee Singers, students at the new Fisk University, tour the U.S. and abroad singing slave spirituals rooted in West African call-and-response and the ring shout. They bring Black sacred music to global audiences. Their songs lay the groundwork for gospel and soul.',
      },
      {
        lead: 'At Pilgrim Baptist Church on Chicago’s South Side, former blues pianist Thomas A. Dorsey fuses the blues with spirituals and hymns to create modern gospel. His “Take My Hand, Precious Lord” becomes the most performed gospel song in history. Two decades later, gospel goes secular.',
      },
      {
        lead: 'At a radio station in Atlanta, Ray Charles records “I Got a Woman,” mixing gospel fervor with rhythm and blues. It scandalizes the church and thrills secular audiences: this is soul music. Sam Cooke, Aretha Franklin and Otis Redding will follow.',
        songs: [
          {
            id: 'i_got_a_woman',
            title: 'I Got A Woman',
            artist: 'Ray Charles',
          },
        ],
      },
      {
        lead: 'On East McLemore Avenue in Memphis, Stax Records becomes the home of Southern soul with Booker T. & the M.G.’s, Otis Redding and Sam & Dave. Its integrated house band plays raw, horn-driven soul. Up north, another label is polishing the sound.',
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
        lead: 'At Hitsville U.S.A. in Detroit, Berry Gordy’s Motown blends gospel vocals, doo-wop harmony and jazz-trained session players into polished pop-soul. Its hits cross racial lines on AM radio. Meanwhile, one singer is stripping soul down to its rhythm.',
        songs: [
          { id: 'my_girl', title: 'My Girl', artist: 'The Temptations' },
          {
            id: 'dancing_in_the_street',
            title: 'Dancing In The Street',
            artist: 'Martha and The Vandellas',
          },
        ],
      },
      {
        lead: 'James Brown and his band build music around “the One,” a downbeat-driven groove where rhythm comes before melody and harmony. Funk grows out of gospel, soul and R&B. Its beat will become the engine of disco.',
        songs: [
          {
            id: 'get_up_i_feel_like_being_a_sex_machine',
            title: 'Get Up (I Feel Like Being A) Sex Machine',
            artist: 'James Brown',
          },
        ],
      },
      {
        lead: 'At Philadelphia International Records, Kenny Gamble and Leon Huff pair Motown’s pop ambition with lush strings and a four-on-the-floor kick drum. Philly soul becomes the blueprint for disco. Meanwhile, funk heads for outer space.',
      },
      {
        lead: 'George Clinton and Parliament-Funkadelic release “Mothership Connection,” with the Star Child bringing funk to the unfunky. Bootsy Collins’ bass, Bernie Worrell’s synths and the Horny Horns make a dense, cosmic funk. In New York, disco is about to get its palace.',
        songs: [
          { id: 'flash_light', title: 'Flash Light', artist: 'Parliament' },
        ],
      },
      {
        lead: 'Studio 54 opens in a former CBS studio in Manhattan and becomes the center of disco culture. Its DJs pioneer mixing records into continuous dance sets. A guitarist and a bassist are about to give disco its sharpest groove.',
      },
      {
        lead: 'Nile Rodgers and Bernard Edwards release “Le Freak” with Chic, the best-selling single in Atlantic Records’ history. Rodgers’ sharp rhythm guitar and Edwards’ melodic bass bridge funk and disco. Rodgers later carries that groove into hits for David Bowie, Madonna and Daft Punk.',
        songs: [
          { id: 'le_freak', title: 'Le Freak', artist: 'Chic' },
          { id: 'good_times', title: 'Good Times', artist: 'Chic' },
        ],
      },
    ],
  },
  {
    id: 'brazilian-thread',
    title: 'Brazilian Music: Candomblé to Baile Funk',
    description:
      'Afro-Brazilian rhythm from Candomblé and samba to bossa nova, Tropicália, rap and baile funk.',
    emoji: '🇧🇷',
    learnGenres: ['latin'],
    eventIds: [
      'evt-diaspora-salvador-candomble-1830',
      'evt-lundu-rio-1895',
      'evt-samba-rio-1928',
      'evt-joao-gilberto-bossanova-1958',
      'evt-bossanova-rio-1962',
      'evt-jorge-ben-jor-rio-1963',
      'evt-tropicalia-sao-paulo-1968',
      'evt-diaspora-salvador-bloco-afro-1979',
      'evt-hiphop-saopaulo-1995',
      'evt-baile-funk-saopaulo-2004',
    ],
    steps: [
      {
        lead: 'In Salvador da Bahia, Yoruba, Fon and Bantu traditions survive in Candomblé temples. Atabaque drums, agogô bells and chanted praise songs keep West African sacred music alive. These rhythms flow into samba de roda, capoeira songs and Brazilian popular music.',
      },
      {
        lead: 'In Rio de Janeiro’s dance halls, the lundu — rooted in Angolan and Congolese traditions — mixes with polka and habanera rhythms to create the maxixe, Brazil’s first urban popular dance. It scandalizes polite society. It also lays the groundwork for samba.',
      },
      {
        lead: 'Deixa Falar, the first samba school, is founded in Rio’s Estácio neighborhood, tying samba to Carnival parades. The sound moves from the hills of the favelas to the heart of Brazilian identity. Thirty years later, a guitarist makes samba quiet and cool.',
      },
      {
        lead: 'João Gilberto records “Chega de Saudade,” by Antonio Carlos Jobim with lyrics by Vinícius de Moraes. His batida guitar style fuses samba rhythm with cool jazz harmony, and bossa nova is born. Within a few years, the world is listening.',
      },
      {
        lead: 'Jobim and Gilberto record “The Girl from Ipanema” with Stan Getz. It becomes the second most recorded song in history after “Yesterday,” bringing bossa nova to the world stage. The same year, another Rio songwriter adds funk and rock.',
      },
      {
        lead: 'Jorge Ben Jor records “Mas Que Nada,” blending samba with funk, rock and bossa nova into a style he calls samba rock. Sérgio Mendes later carries it to global pop audiences. Five years on, young artists push Brazilian music even further.',
      },
      {
        lead: 'Caetano Veloso, Gilberto Gil, Tom Zé and Os Mutantes launch Tropicália, fusing bossa nova with psychedelic rock, concrete poetry and avant-garde art. The military dictatorship jails Veloso and Gil, but the movement reshapes Brazilian music. In Salvador, drummers reclaim African roots.',
      },
      {
        lead: 'In Salvador, Ilê Aiyê — Brazil’s first all-Black Carnival bloco — sparks the Bloco Afro movement, and Olodum follows with samba-reggae. Huge surdo drum groups echo the Candomblé rhythms where this tour began. In São Paulo, a new generation picks up the mic.',
      },
      {
        lead: 'Racionais MC’s tell hard stories of poverty, racism and police violence in São Paulo’s periferia over sparse, bass-heavy beats with samba and MPB samples. Their album “Sobrevivendo no Inferno” turns Brazilian hip hop into a mass social movement. Next, the favela beat gets louder.',
      },
      {
        lead: 'DJ Marlboro brings baile funk from Rio’s favelas to São Paulo’s clubs, where it grows harder and bass-heavier. Built on Miami bass samples and Portuguese-language MCs, it inspires Diplo, M.I.A. and the global bass music movement. From Bahia’s sacred drums to favela dance floors, rhythm leads the way.',
      },
    ],
  },
  {
    id: 'punk-shockwave',
    title: 'Punk: New York, London and Beyond',
    description:
      'Punk starts in New York and London, then spreads to Vancouver, Zagreb, Coventry, D.C. and Olympia.',
    emoji: '🤘',
    learnGenres: ['rock'],
    eventIds: [
      'evt-patti-smith-nyc-1975',
      'evt-punk-london-1976',
      'evt-blondie-nyc-1978',
      'evt-doa-vancouver-1978',
      'evt-punk-zagreb-1978',
      'evt-clash-london-1979',
      'evt-2tone-coventry-1979',
      'evt-minorthreat-washingtondc-1981',
      'evt-bikini-kill-olympia-1990',
    ],
    steps: [
      {
        lead: 'Patti Smith releases “Horses,” produced by John Cale at Electric Lady Studios in New York. It fuses beat poetry, garage rock and avant-garde art into a blueprint for punk, with a woman leading the charge. A year later, London has its own explosion.',
      },
      {
        lead: 'The Sex Pistols headline the 100 Club Punk Special on Oxford Street, alongside The Clash, Siouxsie and the Banshees and Subway Sect. The two-night event turns punk rock into a movement in British music. Back in New York, the punk scene is going pop.',
      },
      {
        lead: 'Debbie Harry and Blondie release “Parallel Lines,” bridging the CBGB punk scene and mainstream pop with the worldwide hit “Heart of Glass.” Blondie shows punk and pop are not enemies. Elsewhere, punk is getting faster and harder.',
      },
      {
        lead: 'D.O.A. forms in Vancouver and becomes one of the founding bands of North American hardcore punk, even coining the term with their album “Hardcore ’81.” Their DIY touring and activism spread the punk ethos across Canada. Punk is crossing borders in Europe too.',
      },
      {
        lead: 'In Zagreb, bands like Prljavo Kazalište, Azra and Film launch a punk and new wave scene, part of the Yugoslav New Wave. Azra’s Johnny Štulić writes poetic protest songs against conformity and nationalism. In London, The Clash are breaking punk’s own rules.',
      },
      {
        lead: 'The Clash release “London Calling,” a double album that pushes punk into reggae, ska, rockabilly, jazz and R&B. Joe Strummer’s political lyrics and Mick Jones’s melodic guitar make it a landmark. In Coventry, ska returns with punk energy.',
        songs: [
          { id: 'train_in_vain', title: 'Train in Vain', artist: 'The Clash' },
        ],
      },
      {
        lead: 'In working-class Coventry, the Specials and Madness merge Jamaican ska and rocksteady with punk energy and anti-racist politics. 2 Tone is a multiracial movement that later inspires third-wave ska. In Washington, D.C., hardcore is about to get its own label.',
      },
      {
        lead: 'Ian MacKaye and Minor Threat release their debut EP on MacKaye’s Dischord Records, defining D.C. hardcore and the straight edge movement. Dischord runs on a no-profit policy and becomes a model for ethical independent labels. A decade later, punk gets a feminist voice.',
      },
      {
        lead: 'In Olympia, Washington, Kathleen Hanna, Tobi Vail and Bikini Kill launch riot grrrl, joining furious punk with feminist activism, zines and DIY politics. They make space for women in scenes long dominated by men. From Patti Smith’s “Horses” to Olympia’s zines, punk keeps passing from scene to scene.',
      },
    ],
  },
  {
    id: 'maqam-mahraganat',
    title: 'Arabic Maqam to Mahraganat',
    description:
      'The maqam modes from medieval Baghdad to Cairo’s tarab, Fairuz, raï and Cairo street electronic.',
    emoji: '🏛️',
    learnGenres: [],
    eventIds: [
      'evt-urmawi-baghdad-1250',
      'evt-maqam-cairo-1870',
      'evt-oud-damascus-1920',
      'evt-iraqi-maqam-baghdad-1932',
      'evt-umm-kulthum-cairo-1944',
      'evt-fairuz-beirut-1957',
      'evt-rai-oran-1985',
      'evt-mahraganat-cairo-2012',
    ],
    steps: [
      {
        lead: 'In 13th-century Baghdad, Safi al-Din al-Urmawi organizes the maqam modal system in his Book of Modes. He divides the octave into 17 unequal intervals and writes the first known music notation in the Islamic world. His framework shapes Arabic, Persian and Ottoman music for centuries.',
      },
      {
        lead: 'Under Khedive Ismail’s modernizing court, Cairo becomes the center of Arabic classical music as scholars and musicians formalize the maqam scales and melodic rules. The city’s music halls cultivate tarab, or musical ecstasy. In Damascus, salons keep the same art alive.',
      },
      {
        lead: 'In Damascus’ intimate salons, master oud players and singers practice taqasim, melodic improvisation inside the maqam system, to create tarab. It is a refined art with very old roots. In 1932, musicians from across the region meet in Cairo.',
      },
      {
        lead: 'At the landmark 1932 Congress of Arab Music in Cairo, Iraqi maqam master Muhammad Al-Qubbantchi stuns international musicologists with Baghdad’s vocal maqam tradition. His recordings help preserve it. In Cairo, one singer is about to unite the Arab world around the radio.',
      },
      {
        lead: 'Umm Kulthum’s Thursday-night radio concerts from Cairo become a ritual across the Arab world; from Casablanca to Baghdad, streets empty to listen. Her hours-long improvisations define tarab. In Lebanon, another voice rises.',
      },
      {
        lead: 'Fairuz performs at the Baalbeck International Festival in the ruins of a Roman temple. With the Rahbani brothers composing, she joins Lebanese mountain folk songs with orchestral grandeur and becomes the most beloved voice in the Arab world. In Algeria, young musicians plug in.',
      },
      {
        lead: 'In Oran, Cheb Khaled, Cheb Mami and Chaba Fadela turn raï from regional Algerian folk into modern pop with synthesizers, drum machines and rock instruments. It becomes the voice of frustrated North African youth. Decades later, Cairo’s streets answer with an electronic sound.',
      },
      {
        lead: 'After the 2011 revolution, DJs from Cairo’s working-class neighborhoods create mahraganat, a frenetic, auto-tuned mix of shaabi folk, electronic beats and hip hop. Islam Chipsy, DJ Figo and Sadat spread tracks by Bluetooth and tuk-tuk speakers. The city that formalized the maqam now dances to its newest sound.',
      },
    ],
  },
  {
    id: 'congolese-rumba',
    title: 'Congolese Rumba: Havana to Kinshasa',
    description:
      'Cuban rhythm returns to Africa as Congolese rumba, then speeds up into soukous and coupé-décalé.',
    emoji: '💃',
    learnGenres: ['african', 'latin'],
    eventIds: [
      'evt-diaspora-havana-rumba-1886',
      'evt-son-havana-1930',
      'evt-rumba-kinshasa-1950',
      'evt-rumba-kinshasa-1956',
      'evt-brazza-rumba-1960',
      'evt-soukous-kinshasa-1992',
      'evt-coupe-decale-abidjan-2002',
    ],
    steps: [
      {
        lead: 'After slavery ends in Cuba, Afro-Cuban communities in Havana’s tenement courtyards create rumba straight from Congolese and Yoruba traditions. Its drums power son cubano, mambo and salsa. In time, this rhythm will loop back to Africa.',
      },
      {
        lead: 'Sexteto Habanero, Septeto Nacional and Trío Matamoros carry son cubano from rural Oriente to Havana’s cabarets and radio. Built on the tres guitar and the clave rhythm, son becomes Cuba’s national music. Its records are about to cross the Atlantic.',
      },
      {
        lead: 'In Léopoldville’s bars and record shops, Congolese musicians hear imported Cuban son records and recognize rhythms their ancestors carried to the Caribbean. Artists like Wendo Kolosoy sing it in Lingala over finger-picked guitars, creating Congolese rumba. A bandleader soon takes it further.',
      },
      {
        lead: 'Franco Luambo Makiadi and his OK Jazz orchestra begin a residency in Léopoldville, now Kinshasa, with intricate guitar work and Lingala vocals. For the next four decades, Franco is Africa’s most prolific recording artist. Just across the river, a rival scene grows.',
      },
      {
        lead: 'Across the Congo River, Brazzaville builds its own rumba scene with bands like Les Bantous de la Capitale. The rivalry between the twin cities produces some of Africa’s most influential popular music for generations. Later, guitarists speed it up.',
      },
      {
        lead: 'Guitarists like Diblo Dibala and Kanda Bongo Man speed up rumba’s sébène guitar break into soukous, a frenzied dance music that fills clubs from Paris to Nairobi. It paves the way for ndombolo and coupé-décalé. In Abidjan, the next dance is born.',
      },
      {
        lead: 'Douk Saga and the Jet Set crew create coupé-décalé in Abidjan, mixing Congolese rhythms with electronic production and flashy style. Born during civil war, it becomes an escapist anthem for Ivorian youth and conquers Francophone Africa. A rhythm that crossed the Atlantic twice keeps moving.',
      },
    ],
  },
  {
    id: 'uk-underground',
    title: 'UK Underground: Windrush to Drill',
    description:
      'Caribbean sounds land in London and grow into lovers rock, jungle, grime, dubstep and UK drill.',
    emoji: '🇬🇧',
    learnGenres: ['electronic', 'hip-hop'],
    eventIds: [
      'evt-windrush-london-1948',
      'evt-diaspora-london-lovers-rock-1977',
      'evt-jungle-london-1993',
      'evt-asian-underground-london-1998',
      'evt-grime-london-2003',
      'evt-dubstep-burial-london-2007',
      'evt-afroswing-london-2017',
      'evt-uk-drill-london-2022',
    ],
    steps: [
      {
        lead: 'The Empire Windrush docks at Tilbury carrying 492 Caribbean migrants, including calypsonian Lord Kitchener, who sings “London Is the Place for Me.” They bring calypso and mento and plant the seeds of Black British music. Their children will create a sound of their own.',
      },
      {
        lead: 'In South London and Notting Hill, the children of Caribbean immigrants create lovers rock, a soft, romantic strain of reggae and the first Black British genre. Louisa Mark’s “Caught You in a Lie,” produced by Dennis Bovell, leads the way. Its influence runs on into jungle and grime.',
      },
      {
        lead: 'London’s multiethnic underground chops up amen breaks at furious tempos and adds dancehall vocals, dub basslines and acid house rave energy. Jungle matures into drum and bass through artists like Goldie and LTJ Bukem. Its breakbeats soon meet the tabla.',
      },
      {
        lead: 'Talvin Singh, trained in Indian classical tabla, fuses it with drum and bass at his Anokha club night and wins the Mercury Prize for “OK.” The Asian Underground makes London a lab where South Asian and electronic music collide. Five years later, another Mercury winner comes from East London.',
      },
      {
        lead: 'Dizzee Rascal’s debut “Boy in da Corner” wins the Mercury Prize, lifting grime from East London pirate radio into the mainstream. Grime fuses UK garage, jungle and MCing, and goes on to produce Skepta, Wiley and Stormzy. In South London, producers are going darker.',
      },
      {
        lead: 'Anonymous South London producer Burial releases “Untrue,” with pitch-shifted vocals, crackle and 2-step garage rhythms. It builds on the dubstep foundation laid by Skream and Benga in Croydon. Then London’s West African diaspora brings a warmer sound.',
      },
      {
        lead: 'J Hus, Not3s and Yxng Bane mix grime’s MC culture, Afrobeats melodies from London’s West African diaspora and dancehall bass into Afroswing. The warm, melodic sound dominates UK charts. Meanwhile, drill takes over South London.',
      },
      {
        lead: 'UK drill, born in Brixton and Kennington from Chicago drill with British slang and sliding 808s, becomes the default sound of young London as Central Cee, Dave and Stormzy top global streaming charts. It spawns scenes in Brooklyn, Paris and Sydney. From the Windrush to drill, London keeps remixing its roots.',
      },
    ],
  },
  {
    id: 'kpop-rise',
    title: 'K-Pop: Seoul to the World',
    description:
      'Korean pop from pansori and Seo Taiji to the idol system, “Gangnam Style” and BTS.',
    emoji: '🎵',
    learnGenres: ['pop'],
    eventIds: [
      'evt-pansori-seoul-1800',
      'evt-k-hiphop-seoul-1996',
      'evt-kpop-seoul-1996',
      'evt-gangnam-style-seoul-2012',
      'evt-bts-seoul-2013',
      'evt-kpop-global-2020',
    ],
    steps: [
      {
        lead: 'Pansori, Korea’s musical storytelling, reaches its golden age: one singer and one drummer perform epic tales that can last for hours. Its vocal skill and emotional drama make it Korea’s most celebrated performing art. Nearly two centuries later, Seoul’s young stars sing pop.',
      },
      {
        lead: 'Seo Taiji & Boys fuse American new jack swing and hip hop with Korean pop melodies, breaking the rules of Korean music. They spark a youth culture revolution. Their mix leads straight to the K-pop idol system and Korea’s hip hop underground.',
      },
      {
        lead: 'Seo Taiji and Boys retire, leaving a blueprint behind. H.O.T. debuts under SM Entertainment, and the modern idol system is born: rigorous training, synchronized choreography and catchy hooks. Years later, one video shows how far K-pop can travel.',
      },
      {
        lead: 'PSY’s “Gangnam Style,” poking fun at the nouveau riche of Seoul’s Gangnam district, becomes the first YouTube video to hit 1 billion views. It proves Asian pop can win worldwide without copying Western looks. A new group debuts the following year.',
      },
      {
        lead: 'Big Hit Entertainment debuts BTS, building on K-pop’s trainee system and American hip hop and R&B production. The group absorbs trap, Latin pop and EDM, and talks to fans directly on social media. Their ARMY fandom will carry them to the top.',
      },
      {
        lead: 'BTS becomes the first all-South Korean act to top the Billboard Hot 100 with “Dynamite,” while BLACKPINK breaks YouTube records. K-pop’s polished music, intense choreography and devoted fandoms set a new model for pop stardom. From pansori storytellers to global charts, Korean voices now carry everywhere.',
      },
    ],
  },
  {
    id: 'baghdad-to-al-andalus',
    title: 'Andalusi Music: Baghdad to al-Andalus',
    description:
      'Abbasid court music travels west with Ziryab, survives in Fez, Algiers and Tunis, and returns east.',
    emoji: '🪕',
    learnGenres: [],
    eventIds: [
      'evt-arabic-classical-baghdad-800',
      'evt-ziryab-cordoba-822',
      'evt-andalusi-fez-1492',
      'evt-flamenco-seville-1600',
      'evt-chaabi-algiers-1920',
      'evt-malouf-tunis-1934',
      'evt-muwashah-damascus-1950',
    ],
    steps: [
      {
        lead: 'In Abbasid Baghdad, al-Kindi writes the first Arabic treatise on music theory, and the maqam system, oud, qanun and ney become foundations across the Islamic world. The court musician Ziryab will carry this music west. His road leads to Spain.',
      },
      {
        lead: 'Trained in Baghdad’s court school, Ziryab moves to Umayyad Córdoba and founds what may be Europe’s first true school of music. He adds a fifth string to the oud, popularizes the instrument and starts the Andalusian classical tradition. That tradition will survive exile.',
      },
      {
        lead: 'After the fall of Granada, Muslim and Jewish musicians expelled from Iberia carry the nuba suite to North Africa. Fez becomes the leading center of Andalusi music: long suites of instrumental preludes, songs and fast rhythmic finales. Back in Spain, the old sounds mix in new ways.',
      },
      {
        lead: 'In Seville’s Triana quarter, Romani communities absorb Moorish maqam scales, Sephardic Jewish chants and Andalusian folk song. Out of this mix comes early flamenco and its cante jondo, or deep song. In North Africa, Andalusian melodies are finding new homes too.',
      },
      {
        lead: 'In the Casbah of Algiers, El Hadj M’Hamed El Anka turns Andalusian-rooted melodies into chaabi, “the people’s music,” sung in everyday Arabic with mandole. It becomes Algeria’s most beloved genre for a century. In Tunis, others work to protect the older form.',
      },
      {
        lead: 'The Rashidiya Institute is founded in Tunis to preserve and teach malouf, Tunisia’s Andalusian art music brought by Moorish refugees from Spain. It trains a generation of musicians and singers. Further east, a young singer keeps another Andalusian form alive.',
      },
      {
        lead: 'Sabah Fakhri, a young singer from Aleppo, performs the muwashah, an ornate Andalusian-Arab song form, in Damascus concert halls, sometimes for ten hours without repeating. His voice links medieval al-Andalus to the Levant. Music that left Baghdad for Spain has come back east.',
      },
    ],
  },
  {
    id: 'andean-voices',
    title: 'Andean Folk and Nueva Canción',
    description:
      'Quechua and Aymara highland music grows into nueva canción, chicha and a continent’s protest songs.',
    emoji: '🏔️',
    learnGenres: ['latin', 'folk'],
    eventIds: [
      'evt-andean-indigenous-cusco-1500',
      'evt-andean-lapaz-1965',
      'evt-violeta-parra-santiago-1966',
      'evt-nueva-cancion-santiago-1969',
      'evt-chicha-lima-1970',
      'evt-mercedes-sosa-tucuman-1971',
    ],
    steps: [
      {
        lead: 'Across the high Andes, Quechua and Aymara peoples play the siku panpipes and the notched quena flute and dance the huayno. Rooted in Inca practice around Cusco, these breathy pentatonic melodies survive the Spanish conquest. Centuries later, they reach city stages.',
      },
      {
        lead: 'At the Peña Naira in La Paz, Los Jairas — with charango player Ernesto Cavour and flautist Gilbert Favre — bring the zampoña, charango and quena to concert stages. They spark a Bolivian folk renaissance. The movement spreads to Chile, Argentina and Europe.',
      },
      {
        lead: 'Chilean folklorist and songwriter Violeta Parra writes “Gracias a la Vida” and “Volver a los 17,” songs that become anthems of Latin American resistance. Her work reviving indigenous and rural folk lays the foundation for nueva canción. Víctor Jara and Inti-Illimani carry it on.',
      },
      {
        lead: 'Víctor Jara, Inti-Illimani and Quilapayún build nueva canción chilena, pairing Andean folk instruments with politically committed lyrics for Salvador Allende’s Popular Unity movement. After the 1973 coup, Jara is murdered, and his songs become global anthems of human rights. In Lima, highland music turns electric.',
      },
      {
        lead: 'As rural Andeans move to Lima, chicha grows in its migrant neighborhoods, mixing Andean huayno, Colombian cumbia and surf guitar. Los Destellos, led by guitarist Enrique Delgado, and later Los Shapis make it the music of Peru’s urban working class. Meanwhile, Parra’s song finds a new voice.',
      },
      {
        lead: 'Mercedes Sosa, born in Tucumán, records Violeta Parra’s “Gracias a la Vida” and becomes nueva canción’s most powerful voice. Argentina’s military dictatorship bans her music and forces her into exile. From highland panpipes to protest anthems, the Andes give a continent its voice.',
      },
    ],
  },
];

/** A genre tour by its id, or by the id of a tour merged into it. */
export const findModule = (id: string): HistoricalModule | undefined => {
  const own = PATHWAY_ALIASES[id] ?? id;
  return HISTORICAL_MODULES.find((m) => m.id === own);
};
