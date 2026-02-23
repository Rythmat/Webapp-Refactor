import type { HistoricalModule } from '@/components/atlas/types'

export const HISTORICAL_MODULES: HistoricalModule[] = [
  // ── 1. Blues to Rock ──────────────────────────────────────────────────
  {
    id: 'blues-to-rock',
    title: 'Blues to Rock',
    description:
      'From Mississippi Delta blues through electric Chicago to British Invasion rock',
    emoji: '🎸',
    eventIds: [
      'evt-blues-clarksdale-1903',
      'evt-handy-memphis-1912',
      'evt-blues-recording-nyc-1920',
      'evt-rnb-chicago-1955',
      'evt-chuck-berry-stlouis-1955',
      'evt-british-blues-london-1962',
      'evt-merseybeat-liverpool-1963',
      'evt-psychedelia-sf-1967',
      'evt-heavy-metal-birmingham-1970',
    ],
  },

  // ── 2. Cuban Son Full Circle ──────────────────────────────────────────
  {
    id: 'cuban-son-circle',
    title: 'Cuban Son Full Circle',
    description:
      'Contradanza to son to revolution — and the Buena Vista revival',
    emoji: '🎺',
    eventIds: [
      'evt-contradanza-havana-1800',
      'evt-son-havana-1930',
      'evt-mambo-havana-1948',
      'evt-revolution-havana-1959',
      'evt-boogaloo-nyc-1966',
      'evt-salsa-nyc-1971',
      'evt-buena-vista-havana-1996',
    ],
  },

  // ── 3. Hip Hop Global Diaspora ────────────────────────────────────────
  {
    id: 'hiphop-diaspora',
    title: 'Hip Hop Global Diaspora',
    description: 'From Bronx block parties to a worldwide movement',
    emoji: '🎤',
    eventIds: [
      'evt-funk-augusta-1970',
      'evt-hiphop-nyc-1973',
      'evt-hiphop-nyc-1979',
      'evt-hiphop-nyc-1984',
      'evt-westcoast-la-1988',
      'evt-hiphop-paris-1990',
      'evt-hiphop-dakar-1991',
      'evt-hiphop-tokyo-1993',
      'evt-hiphop-saopaulo-1995',
      'evt-hiphop-atlanta-2003',
      'evt-trap-atlanta-2012',
      'evt-drill-london-2019',
    ],
  },

  // ── 4. Electronic Evolution ───────────────────────────────────────────
  {
    id: 'electronic-evolution',
    title: 'Electronic Evolution',
    description: "From Kraftwerk's synths to global dance floors",
    emoji: '🎹',
    eventIds: [
      'evt-krautrock-dusseldorf-1974',
      'evt-electronic-dusseldorf-1979',
      'evt-house-chicago-1984',
      'evt-techno-detroit-1985',
      'evt-acid-house-london-1986',
      'evt-balearic-ibiza-1988',
      'evt-techno-berlin-1991',
      'evt-french-touch-paris-1996',
      'evt-edm-amsterdam-2005',
    ],
  },

  // ── 5. Jamaican Riddim Tree ───────────────────────────────────────────
  {
    id: 'jamaican-riddim',
    title: 'Jamaican Riddim Tree',
    description: 'Sound systems to reggae to dancehall to reggaeton',
    emoji: '🇯🇲',
    eventIds: [
      'evt-diaspora-kingston-kumina-1950',
      'evt-soundsystem-kingston-1956',
      'evt-rocksteady-kingston-1966',
      'evt-reggae-kingston-1971',
      'evt-roots-reggae-kingston-1973',
      'evt-dancehall-kingston-1975',
      'evt-dancehall-kingston-1985',
      'evt-reggaeton-underground-sanjuan-1993',
      'evt-reggaeton-san-juan-2004',
      'evt-bad-bunny-sanjuan-2020',
    ],
  },

  // ── 6. Griot to Afrobeats ────────────────────────────────────────────
  {
    id: 'griot-to-afrobeats',
    title: 'Griot to Afrobeats',
    description:
      'West African musical traditions evolving into global pop',
    emoji: '🥁',
    eventIds: [
      'evt-griot-timbuktu-1500',
      'evt-highlife-lagos-1952',
      'evt-highlife-accra-1958',
      'evt-afrobeat-lagos-1971',
      'evt-juju-lagos-1978',
      'evt-afrobeats-lagos-2010',
      'evt-one-dance-lagos-2016',
      'evt-burna-boy-lagos-2020',
    ],
  },

  // ── 7. The Jazz Chain ─────────────────────────────────────────────────
  {
    id: 'jazz-chain',
    title: 'The Jazz Chain',
    description:
      'New Orleans origins through swing and bebop to Ethio-jazz',
    emoji: '🎷',
    eventIds: [
      'evt-jazz-origins-nola-1890',
      'evt-jazz-recording-nola-1917',
      'evt-jazz-nola-1923',
      'evt-jazz-age-paris-1925',
      'evt-swing-nyc-1935',
      'evt-kc-jazz-kansascity-1936',
      'evt-bebop-nyc-1945',
      'evt-ethiojazz-addis-1970',
      'evt-jazz-copenhagen-1979',
    ],
  },

  // ── 8. Soul to Funk to Disco ──────────────────────────────────────────
  {
    id: 'soul-funk-disco',
    title: 'Soul to Funk to Disco',
    description: 'Spirituals through Motown to the disco ball',
    emoji: '🕺',
    eventIds: [
      'evt-spiritual-nashville-1867',
      'evt-diaspora-chicago-gospel-1932',
      'evt-soul-memphis-1962',
      'evt-motown-detroit-1963',
      'evt-southern-soul-memphis-1965',
      'evt-funk-augusta-1970',
      'evt-philly-soul-philadelphia-1974',
      'evt-disco-nyc-1977',
    ],
  },

  // ── 9. Brazilian Thread ───────────────────────────────────────────────
  {
    id: 'brazilian-thread',
    title: 'Brazilian Thread',
    description:
      'Candomble rhythms through samba to baile funk',
    emoji: '🇧🇷',
    eventIds: [
      'evt-diaspora-salvador-candomble-1830',
      'evt-lundu-rio-1895',
      'evt-samba-rio-1928',
      'evt-bossanova-rio-1962',
      'evt-tropicalia-sao-paulo-1968',
      'evt-baile-funk-saopaulo-2004',
    ],
  },

  // ── 10. Punk Shockwave ────────────────────────────────────────────────
  {
    id: 'punk-shockwave',
    title: 'Punk Shockwave',
    description:
      'Reggae-fueled London punk radiating worldwide',
    emoji: '🤘',
    eventIds: [
      'evt-reggae-kingston-1977',
      'evt-punk-london-1976',
      'evt-doa-vancouver-1978',
      'evt-punk-zagreb-1978',
      'evt-2tone-coventry-1979',
      'evt-laibach-ljubljana-1980',
      'evt-minorthreat-washingtondc-1981',
      'evt-newwave-london-1981',
    ],
  },

  // ── 11. Maqam to Mahraganat ───────────────────────────────────────────
  {
    id: 'maqam-mahraganat',
    title: 'Maqam to Mahraganat',
    description:
      "Cairo's classical maqam tradition to street electronic",
    emoji: '🏛️',
    eventIds: [
      'evt-maqam-cairo-1870',
      'evt-chaabi-algiers-1920',
      'evt-umm-kulthum-cairo-1944',
      'evt-fairuz-beirut-1957',
      'evt-rai-oran-1985',
      'evt-mahraganat-cairo-2012',
    ],
  },

  // ── 12. Congolese Rumba Circle ────────────────────────────────────────
  {
    id: 'congolese-rumba',
    title: 'Congolese Rumba Circle',
    description:
      'Cuban son crosses the Atlantic and returns as soukous',
    emoji: '💃',
    eventIds: [
      'evt-son-havana-1930',
      'evt-rumba-kinshasa-1950',
      'evt-rumba-kinshasa-1956',
      'evt-brazza-rumba-1960',
      'evt-soukous-kinshasa-1992',
      'evt-coupe-decale-abidjan-2002',
    ],
  },

  // ── 13. UK Underground ────────────────────────────────────────────────
  {
    id: 'uk-underground',
    title: 'UK Underground',
    description:
      'Windrush generation sounds to drill',
    emoji: '🇬🇧',
    eventIds: [
      'evt-windrush-london-1948',
      'evt-diaspora-london-lovers-rock-1977',
      'evt-jungle-london-1993',
      'evt-asian-underground-london-1998',
      'evt-grime-london-2003',
      'evt-drill-london-2019',
      'evt-uk-drill-london-2022',
    ],
  },

  // ── 14. K-Pop Rise ────────────────────────────────────────────────────
  {
    id: 'kpop-rise',
    title: 'K-Pop Rise',
    description: 'From Seo Taiji to BTS world domination',
    emoji: '🎵',
    eventIds: [
      'evt-kpop-seoul-1996',
      'evt-k-hiphop-seoul-1996',
      'evt-gangnam-style-seoul-2012',
      'evt-bts-seoul-2013',
      'evt-kpop-global-2020',
    ],
  },
]
