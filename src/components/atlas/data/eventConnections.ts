import { MUSIC_HISTORY } from './musicHistory'
import { CITIES } from './cities'
import { CITY_COUNTRY_TO_ISO } from './flagColors'
import { getCountryColor } from './continentColors'
import type { HistoricalEvent } from '@/components/atlas/types'

// Directed pair: `from` influenced `to` (chronological flow)
interface EventConnection {
  from: string   // upstream event ID (the influencer)
  to: string     // downstream event ID (the influenced)
}

export interface ArcDatum {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  label: string        // connected event's title
  eventId: string      // connected event's ID (for click navigation)
  direction: 'upstream' | 'downstream'
  color: string        // hex color based on "from" event's region
}

const EVENT_CONNECTIONS: EventConnection[] = [
  // ── African Roots & Griot Tradition ──
  { from: 'evt-griot-timbuktu-1500', to: 'evt-appalachia-bristol-1830' },
  { from: 'evt-griot-timbuktu-1500', to: 'evt-jazz-origins-nola-1890' },
  { from: 'evt-griot-timbuktu-1500', to: 'evt-blues-clarksdale-1903' },
  { from: 'evt-griot-timbuktu-1500', to: 'evt-kora-banjul-1970' },
  { from: 'evt-griot-timbuktu-1500', to: 'evt-mbalax-dakar-1970' },
  { from: 'evt-griot-timbuktu-1500', to: 'evt-desert-blues-bamako-1980' },

  // ── Flamenco ──
  { from: 'evt-flamenco-seville-1600', to: 'evt-flamenco-seville-1922' },
  { from: 'evt-flamenco-seville-1922', to: 'evt-rosalia-sanjuan-2018' },

  // ── European Classical ──
  { from: 'evt-classical-vienna-1700', to: 'evt-classical-vienna-1900' },
  { from: 'evt-classical-vienna-1700', to: 'evt-bartok-budapest-1906' },
  { from: 'evt-classical-vienna-1700', to: 'evt-bollywood-mumbai-1935' },
  { from: 'evt-classical-vienna-1900', to: 'evt-dada-zurich-1916' },

  // ── Caribbean / Cuban ──
  { from: 'evt-contradanza-havana-1800', to: 'evt-son-havana-1930' },
  { from: 'evt-diaspora-haiti-vodou-1804', to: 'evt-son-havana-1930' },
  { from: 'evt-son-havana-1930', to: 'evt-mambo-havana-1948' },
  { from: 'evt-son-havana-1930', to: 'evt-rumba-kinshasa-1950' },
  { from: 'evt-son-havana-1930', to: 'evt-revolution-havana-1959' },
  { from: 'evt-mambo-havana-1948', to: 'evt-boogaloo-nyc-1966' },
  { from: 'evt-revolution-havana-1959', to: 'evt-fania-nyc-1971' },
  { from: 'evt-revolution-havana-1959', to: 'evt-salsa-nyc-1973' },
  { from: 'evt-revolution-havana-1959', to: 'evt-nueva-cancion-santiago-1969' },
  { from: 'evt-revolution-havana-1959', to: 'evt-buena-vista-havana-1996' },
  { from: 'evt-boogaloo-nyc-1966', to: 'evt-salsa-nyc-1971' },
  { from: 'evt-fania-nyc-1971', to: 'evt-salsa-caracas-1974' },
  { from: 'evt-salsa-nyc-1973', to: 'evt-salsa-caracas-1974' },

  // ── African Diaspora Seeds ──
  { from: 'evt-diaspora-nola-congo-1819', to: 'evt-jazz-origins-nola-1890' },
  { from: 'evt-diaspora-salvador-candomble-1830', to: 'evt-lundu-rio-1895' },
  { from: 'evt-diaspora-nola-mardi-gras-indians-1885', to: 'evt-jazz-origins-nola-1890' },
  { from: 'evt-diaspora-kingston-kumina-1950', to: 'evt-soundsystem-kingston-1956' },
  { from: 'evt-diaspora-accra-armstrong-1956', to: 'evt-highlife-accra-1958' },
  { from: 'evt-diaspora-chicago-gospel-1932', to: 'evt-soul-memphis-1962' },
  { from: 'evt-diaspora-chicago-gospel-1932', to: 'evt-rosettatharpe-littlerock-1950' },
  { from: 'evt-diaspora-london-lovers-rock-1977', to: 'evt-jungle-london-1993' },

  // ── Appalachian / Country ──
  { from: 'evt-appalachia-bristol-1830', to: 'evt-grand-ole-opry-nashville-1925' },
  { from: 'evt-appalachia-bristol-1830', to: 'evt-country-bristol-1927' },
  { from: 'evt-country-bristol-1927', to: 'evt-roots-nashville-1972' },

  // ── Spirituals / Gospel / Soul ──
  { from: 'evt-spiritual-nashville-1867', to: 'evt-diaspora-chicago-gospel-1932' },
  { from: 'evt-rosettatharpe-littlerock-1950', to: 'evt-elvis-memphis-1954' },
  { from: 'evt-soul-memphis-1962', to: 'evt-motown-detroit-1963' },
  { from: 'evt-soul-memphis-1962', to: 'evt-southern-soul-memphis-1965' },
  { from: 'evt-motown-detroit-1963', to: 'evt-philly-soul-philadelphia-1972' },
  { from: 'evt-motown-detroit-1963', to: 'evt-funk-minneapolis-1979' },
  { from: 'evt-southern-soul-memphis-1965', to: 'evt-funk-augusta-1970' },

  // ── Maqam / Arabic / North African ──
  { from: 'evt-maqam-cairo-1870', to: 'evt-chaabi-algiers-1920' },
  { from: 'evt-maqam-cairo-1870', to: 'evt-iraqi-maqam-baghdad-1932' },
  { from: 'evt-maqam-cairo-1870', to: 'evt-umm-kulthum-cairo-1944' },
  { from: 'evt-maqam-cairo-1870', to: 'evt-fairuz-beirut-1957' },
  { from: 'evt-chaabi-algiers-1920', to: 'evt-rai-oran-1985' },
  { from: 'evt-rai-oran-1985', to: 'evt-rai-algiers-1990' },
  { from: 'evt-umm-kulthum-cairo-1944', to: 'evt-mahraganat-cairo-2012' },

  // ── Blues Chain ──
  { from: 'evt-blues-clarksdale-1903', to: 'evt-handy-memphis-1912' },
  { from: 'evt-handy-memphis-1912', to: 'evt-blues-recording-nyc-1920' },
  { from: 'evt-handy-memphis-1912', to: 'evt-blues-mississippi-1936' },
  { from: 'evt-blues-recording-nyc-1920', to: 'evt-jugband-memphis-1928' },
  { from: 'evt-blues-mississippi-1936', to: 'evt-blues-memphis-1951' },
  { from: 'evt-blues-mississippi-1936', to: 'evt-rnb-chicago-1955' },
  { from: 'evt-blues-memphis-1951', to: 'evt-elvis-memphis-1954' },
  { from: 'evt-rnb-chicago-1955', to: 'evt-chuck-berry-stlouis-1955' },
  { from: 'evt-rnb-chicago-1955', to: 'evt-british-blues-london-1962' },
  { from: 'evt-chuck-berry-stlouis-1955', to: 'evt-merseybeat-liverpool-1963' },

  // ── Jazz Chain ──
  { from: 'evt-jazz-origins-nola-1890', to: 'evt-jazz-recording-nola-1917' },
  { from: 'evt-jazz-recording-nola-1917', to: 'evt-jazz-nola-1923' },
  { from: 'evt-jazz-nola-1923', to: 'evt-jazz-age-paris-1925' },
  { from: 'evt-jazz-nola-1923', to: 'evt-swing-nyc-1935' },
  { from: 'evt-jazz-nola-1923', to: 'evt-kc-jazz-kansascity-1936' },
  { from: 'evt-swing-nyc-1935', to: 'evt-swing-nyc-1938' },
  { from: 'evt-kc-jazz-kansascity-1936', to: 'evt-jazz-la-1942' },
  { from: 'evt-kc-jazz-kansascity-1936', to: 'evt-bebop-nyc-1945' },
  { from: 'evt-swing-nyc-1938', to: 'evt-bebop-nyc-1945' },
  { from: 'evt-bebop-nyc-1945', to: 'evt-jazz-copenhagen-1979' },
  { from: 'evt-jazz-nola-1923', to: 'evt-ethiojazz-addis-1970' },

  // ── Brazilian ──
  { from: 'evt-lundu-rio-1895', to: 'evt-samba-rio-1928' },
  { from: 'evt-samba-rio-1928', to: 'evt-bossanova-rio-1962' },
  { from: 'evt-bossanova-rio-1962', to: 'evt-tropicalia-sao-paulo-1968' },
  { from: 'evt-diaspora-salvador-bloco-afro-1979', to: 'evt-baile-funk-saopaulo-2004' },

  // ── Rock Chain ──
  { from: 'evt-british-blues-london-1962', to: 'evt-merseybeat-liverpool-1963' },
  { from: 'evt-british-blues-london-1962', to: 'evt-psychedelia-sf-1967' },
  { from: 'evt-british-blues-london-1962', to: 'evt-heavy-metal-birmingham-1970' },
  { from: 'evt-merseybeat-liverpool-1963', to: 'evt-psychedelia-sf-1967' },
  { from: 'evt-merseybeat-liverpool-1963', to: 'evt-group-sounds-tokyo-1966' },
  { from: 'evt-raga-rock-mumbai-1965', to: 'evt-psychedelia-sf-1967' },
  { from: 'evt-psychedelia-sf-1967', to: 'evt-krautrock-dusseldorf-1974' },
  { from: 'evt-psychedelia-sf-1967', to: 'evt-tropicalia-sao-paulo-1968' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-black-metal-oslo-1993' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-grunge-seattle-1991' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-deathmetal-tampa-1990' },

  // ── Punk / Post-Punk ──
  { from: 'evt-reggae-kingston-1971', to: 'evt-punk-london-1976' },
  { from: 'evt-punk-london-1976', to: 'evt-newwave-london-1981' },
  { from: 'evt-punk-london-1976', to: 'evt-2tone-coventry-1979' },
  { from: 'evt-punk-london-1976', to: 'evt-minorthreat-washingtondc-1981' },
  { from: 'evt-punk-london-1976', to: 'evt-doa-vancouver-1978' },
  { from: 'evt-punk-london-1976', to: 'evt-punk-zagreb-1978' },
  { from: 'evt-punk-london-1976', to: 'evt-laibach-ljubljana-1980' },
  { from: 'evt-grunge-seattle-1991', to: 'evt-britpop-london-1995' },

  // ── Raga / Bollywood ──
  { from: 'evt-bollywood-mumbai-1935', to: 'evt-raga-mumbai-1966' },
  { from: 'evt-bollywood-mumbai-1935', to: 'evt-bollywood-mumbai-1960' },
  { from: 'evt-bollywood-mumbai-1960', to: 'evt-indian-hiphop-mumbai-2020' },

  // ── Funk / Disco / Electronic Chain ──
  { from: 'evt-funk-augusta-1970', to: 'evt-disco-nyc-1977' },
  { from: 'evt-funk-augusta-1970', to: 'evt-hiphop-nyc-1973' },
  { from: 'evt-funk-augusta-1970', to: 'evt-gogo-dc-1979' },
  { from: 'evt-funk-augusta-1970', to: 'evt-afrobeat-lagos-1971' },
  { from: 'evt-philly-soul-philadelphia-1972', to: 'evt-disco-nyc-1977' },
  { from: 'evt-disco-nyc-1977', to: 'evt-house-chicago-1984' },
  { from: 'evt-disco-nyc-1977', to: 'evt-new-beat-brussels-1988' },
  { from: 'evt-disco-nyc-1977', to: 'evt-french-touch-paris-1996' },
  { from: 'evt-krautrock-dusseldorf-1974', to: 'evt-electronic-dusseldorf-1979' },
  { from: 'evt-electronic-dusseldorf-1979', to: 'evt-techno-detroit-1985' },
  { from: 'evt-electronic-dusseldorf-1979', to: 'evt-hiphop-nyc-1984' },
  { from: 'evt-electronic-dusseldorf-1979', to: 'evt-citypop-tokyo-1982' },
  { from: 'evt-house-chicago-1984', to: 'evt-acid-house-london-1986' },
  { from: 'evt-house-chicago-1984', to: 'evt-balearic-ibiza-1988' },
  { from: 'evt-house-chicago-1984', to: 'evt-french-touch-paris-1996' },
  { from: 'evt-techno-detroit-1985', to: 'evt-techno-berlin-1991' },
  { from: 'evt-acid-house-london-1986', to: 'evt-madchester-manchester-1988' },
  { from: 'evt-acid-house-london-1986', to: 'evt-jungle-london-1993' },
  { from: 'evt-balearic-ibiza-1988', to: 'evt-madchester-manchester-1988' },
  { from: 'evt-balearic-ibiza-1988', to: 'evt-edm-amsterdam-2005' },
  { from: 'evt-madchester-manchester-1988', to: 'evt-britpop-london-1995' },
  { from: 'evt-techno-berlin-1991', to: 'evt-bassiani-tbilisi-2014' },
  { from: 'evt-techno-berlin-1991', to: 'evt-minimal-techno-bucharest-2007' },
  { from: 'evt-french-touch-paris-1996', to: 'evt-edm-miami-2006' },

  // ── Reggae / Dancehall / Dub ──
  { from: 'evt-soundsystem-kingston-1956', to: 'evt-rocksteady-kingston-1966' },
  { from: 'evt-soundsystem-kingston-1956', to: 'evt-hiphop-nyc-1973' },
  { from: 'evt-rocksteady-kingston-1966', to: 'evt-reggae-kingston-1971' },
  { from: 'evt-reggae-kingston-1971', to: 'evt-roots-reggae-kingston-1973' },
  { from: 'evt-roots-reggae-kingston-1973', to: 'evt-dancehall-kingston-1975' },
  { from: 'evt-dancehall-kingston-1975', to: 'evt-dancehall-kingston-1985' },
  { from: 'evt-dancehall-kingston-1985', to: 'evt-dancehall-digital-kingston-1998' },
  { from: 'evt-dancehall-kingston-1985', to: 'evt-jungle-london-1993' },
  { from: 'evt-dancehall-kingston-1985', to: 'evt-reggaeton-underground-sanjuan-1993' },
  { from: 'evt-dancehall-digital-kingston-1998', to: 'evt-reggaeton-san-juan-2004' },
  { from: 'evt-dancehall-digital-kingston-1998', to: 'evt-dancehall-kingston-2010' },

  // ── Reggaeton / Latin Urban ──
  { from: 'evt-reggae-espanol-panamacity-1985', to: 'evt-reggaeton-underground-sanjuan-1993' },
  { from: 'evt-reggaeton-underground-sanjuan-1993', to: 'evt-reggaeton-san-juan-2004' },
  { from: 'evt-reggaeton-san-juan-2004', to: 'evt-latin-urban-medellin-2017' },
  { from: 'evt-reggaeton-san-juan-2004', to: 'evt-bad-bunny-sanjuan-2020' },

  // ── Hip Hop Chain ──
  { from: 'evt-hiphop-nyc-1973', to: 'evt-hiphop-nyc-1979' },
  { from: 'evt-hiphop-nyc-1979', to: 'evt-conscious-rap-nyc-1982' },
  { from: 'evt-hiphop-nyc-1979', to: 'evt-hiphop-nyc-1984' },
  { from: 'evt-conscious-rap-nyc-1982', to: 'evt-rap-rock-nyc-1986' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-westcoast-la-1988' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-hiphop-paris-1990' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-hiphop-dakar-1991' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-hiphop-tokyo-1993' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-hiphop-saopaulo-1995' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-k-hiphop-seoul-1996' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-cuban-hiphop-havana-2001' },
  { from: 'evt-westcoast-la-1988', to: 'evt-hiphop-atlanta-2003' },
  { from: 'evt-hiphop-atlanta-2003', to: 'evt-trap-atlanta-2012' },
  { from: 'evt-hiphop-atlanta-2003', to: 'evt-latin-trap-medellin-2005' },
  { from: 'evt-trap-atlanta-2012', to: 'evt-drill-london-2019' },
  { from: 'evt-trap-atlanta-2012', to: 'evt-uk-drill-london-2022' },
  { from: 'evt-hiphop-dakar-1991', to: 'evt-hiplife-accra-2004' },
  { from: 'evt-rap-rock-nyc-1986', to: 'evt-grunge-seattle-1991' },

  // ── West African Chain ──
  { from: 'evt-highlife-lagos-1952', to: 'evt-highlife-accra-1958' },
  { from: 'evt-highlife-lagos-1952', to: 'evt-highlife-accra-1960' },
  { from: 'evt-highlife-accra-1958', to: 'evt-afrobeat-lagos-1971' },
  { from: 'evt-highlife-accra-1960', to: 'evt-afrobeat-lagos-1971' },
  { from: 'evt-afrobeat-lagos-1971', to: 'evt-juju-lagos-1978' },
  { from: 'evt-afrobeat-lagos-1971', to: 'evt-afrobeats-lagos-2010' },
  { from: 'evt-afrobeats-lagos-2010', to: 'evt-one-dance-lagos-2016' },
  { from: 'evt-afrobeats-lagos-2010', to: 'evt-burna-boy-lagos-2020' },
  { from: 'evt-afrobeats-lagos-2010', to: 'evt-afrobeats-lagos-2023' },
  { from: 'evt-one-dance-lagos-2016', to: 'evt-afroswing-london-2017' },
  { from: 'evt-hiplife-accra-2004', to: 'evt-afrofusion-accra-2019' },

  // ── Congolese Rumba Full Circle ──
  { from: 'evt-rumba-kinshasa-1950', to: 'evt-rumba-kinshasa-1956' },
  { from: 'evt-rumba-kinshasa-1956', to: 'evt-brazza-rumba-1960' },
  { from: 'evt-rumba-kinshasa-1956', to: 'evt-soukous-kinshasa-1992' },
  { from: 'evt-soukous-kinshasa-1992', to: 'evt-coupe-decale-abidjan-2002' },

  // ── East / Southern African ──
  { from: 'evt-benga-nairobi-1967', to: 'evt-bongo-flava-dar-1990' },
  { from: 'evt-township-jive-johannesburg-1981', to: 'evt-amapiano-joburg-2019' },

  // ── Desert Blues / Saharan ──
  { from: 'evt-desert-blues-bamako-1980', to: 'evt-desert-blues-bamako-1994' },
  { from: 'evt-desert-blues-bamako-1994', to: 'evt-mdou-moctar-niamey-2019' },

  // ── Gnawa ──
  { from: 'evt-gnawa-marrakech-2000', to: 'evt-gnawa-marrakech-2005' },

  // ── Windrush / UK Caribbean ──
  { from: 'evt-windrush-london-1948', to: 'evt-diaspora-london-lovers-rock-1977' },
  { from: 'evt-windrush-london-1948', to: 'evt-2tone-coventry-1979' },

  // ── UK Underground → Grime → Drill ──
  { from: 'evt-jungle-london-1993', to: 'evt-asian-underground-london-1998' },
  { from: 'evt-jungle-london-1993', to: 'evt-grime-london-2003' },
  { from: 'evt-grime-london-2003', to: 'evt-drill-london-2019' },
  { from: 'evt-grime-london-2003', to: 'evt-uk-drill-london-2022' },

  // ── Cumbia Family ──
  { from: 'evt-cumbia-barranquilla-1962', to: 'evt-chicha-lima-1970' },
  { from: 'evt-cumbia-barranquilla-1962', to: 'evt-sonidero-mexicocity-1975' },
  { from: 'evt-cumbia-barranquilla-1962', to: 'evt-cumbia-monterrey-1990' },
  { from: 'evt-cumbia-barranquilla-1962', to: 'evt-cumbia-villera-buenosaires-1990' },

  // ── Dominican / Merengue / Bachata ──
  { from: 'evt-merengue-santodomingo-1958', to: 'evt-bachata-santodomingo-1980' },

  // ── K-Pop / Korean ──
  { from: 'evt-kpop-seoul-1996', to: 'evt-gangnam-style-seoul-2012' },
  { from: 'evt-k-hiphop-seoul-1996', to: 'evt-gangnam-style-seoul-2012' },
  { from: 'evt-gangnam-style-seoul-2012', to: 'evt-bts-seoul-2013' },
  { from: 'evt-bts-seoul-2013', to: 'evt-kpop-global-2020' },

  // ── Turkish / Anatolian ──
  { from: 'evt-anatolian-rock-istanbul-1972', to: 'evt-arabesque-istanbul-1985' },

  // ── Asian Underground / South Asian ──
  { from: 'evt-qawwali-lahore-1985', to: 'evt-asian-underground-london-1998' },

  // ── Trip Hop (Bristol sound system heritage) ──
  { from: 'evt-roots-reggae-kingston-1973', to: 'evt-trip-hop-bristol-1994' },

  // ── Cross-Continental / Return Flows ──
  { from: 'evt-buena-vista-havana-1996', to: 'evt-cuban-hiphop-havana-2001' },
  { from: 'evt-drake-toronto-2015', to: 'evt-one-dance-lagos-2016' },
  { from: 'evt-afroswing-london-2017', to: 'evt-afrobeats-lagos-2023' },

  // ── Caribbean / Central America / South America (new) ──
  { from: 'evt-contradanza-havana-1800', to: 'evt-tango-buenosaires-1913' },
  { from: 'evt-tango-buenosaires-1913', to: 'evt-tango-buenos-aires-1917' },
  { from: 'evt-tango-buenos-aires-1917', to: 'evt-guarania-asuncion-1944' },
  { from: 'evt-tango-buenos-aires-1917', to: 'evt-pasillo-quito-1930' },
  { from: 'evt-mambo-havana-1948', to: 'evt-mambo-havana-1950' },
  { from: 'evt-mambo-havana-1950', to: 'evt-merengue-santodomingo-1958' },
  { from: 'evt-diaspora-haiti-vodou-1804', to: 'evt-kompa-portauprince-1957' },
  { from: 'evt-merengue-santodomingo-1958', to: 'evt-kompa-portauprince-1957' },
  { from: 'evt-son-havana-1930', to: 'evt-bachata-santodomingo-1962' },
  { from: 'evt-merengue-santodomingo-1958', to: 'evt-bachata-santodomingo-1962' },
  { from: 'evt-bachata-santodomingo-1962', to: 'evt-bachata-santodomingo-1980' },
  { from: 'evt-diaspora-portofspain-calypso-1914', to: 'evt-steelpan-portofspain-1951' },
  { from: 'evt-diaspora-portofspain-calypso-1914', to: 'evt-junkanoo-nassau-1958' },
  { from: 'evt-diaspora-portofspain-calypso-1914', to: 'evt-benna-stjohns-1960' },
  { from: 'evt-diaspora-portofspain-calypso-1914', to: 'evt-calypso-sanjose-1970' },
  { from: 'evt-steelpan-portofspain-1951', to: 'evt-diaspora-portofspain-soca-1973' },
  { from: 'evt-steelpan-portofspain-1951', to: 'evt-spouge-bridgetown-1969' },
  { from: 'evt-diaspora-portofspain-soca-1973', to: 'evt-bouyon-roseau-1988' },
  { from: 'evt-diaspora-portofspain-soca-1973', to: 'evt-sugar-mas-basseterre-1971' },
  { from: 'evt-diaspora-portofspain-soca-1973', to: 'evt-vincy-soca-kingstown-2009' },
  { from: 'evt-diaspora-portofspain-soca-1973', to: 'evt-jab-stgeorges-2000' },
  { from: 'evt-diaspora-portofspain-soca-1973', to: 'evt-dennery-castries-2014' },
  { from: 'evt-bouyon-roseau-1988', to: 'evt-dennery-castries-2014' },
  { from: 'evt-vincy-soca-kingstown-2009', to: 'evt-dennery-castries-2014' },
  { from: 'evt-spouge-bridgetown-1969', to: 'evt-diaspora-portofspain-soca-1973' },
  { from: 'evt-benna-stjohns-1960', to: 'evt-sugar-mas-basseterre-1971' },
  { from: 'evt-jab-stgeorges-2000', to: 'evt-vincy-soca-kingstown-2009' },
  { from: 'evt-soundsystem-kingston-1956', to: 'evt-spouge-bridgetown-1969' },
  { from: 'evt-diaspora-havana-rumba-1886', to: 'evt-son-havana-1930' },
  { from: 'evt-son-havana-1930', to: 'evt-diaspora-nyc-afrocuban-jazz-1947' },
  { from: 'evt-diaspora-nyc-afrocuban-jazz-1947', to: 'evt-mambo-havana-1950' },
  { from: 'evt-diaspora-nyc-afrocuban-jazz-1947', to: 'evt-boogaloo-nyc-1966' },
  { from: 'evt-diaspora-lima-afro-peruvian-1957', to: 'evt-chicha-lima-1970' },
  { from: 'evt-chicha-lima-1970', to: 'evt-chicha-lima-1971' },
  { from: 'evt-cumbia-barranquilla-1962', to: 'evt-chicha-lima-1971' },
  { from: 'evt-andean-lapaz-1965', to: 'evt-chicha-lima-1971' },
  { from: 'evt-andean-lapaz-1965', to: 'evt-nueva-cancion-santiago-1969' },
  { from: 'evt-nueva-cancion-santiago-1969', to: 'evt-sonnica-managua-1975' },
  { from: 'evt-son-havana-1930', to: 'evt-mariachi-mexicocity-1950' },
  { from: 'evt-mariachi-mexicocity-1950', to: 'evt-sonidero-mexicocity-1975' },
  { from: 'evt-cumbia-barranquilla-1962', to: 'evt-cumbia-sansalvador-1990' },
  { from: 'evt-cumbia-sansalvador-1990', to: 'evt-punta-tegucigalpa-1995' },
  { from: 'evt-punta-belizecity-1981', to: 'evt-punta-tegucigalpa-1995' },
  { from: 'evt-marimba-guatemalacity-1955', to: 'evt-punta-belizecity-1981' },
  { from: 'evt-pasillo-quito-1930', to: 'evt-andean-lapaz-1965' },
  { from: 'evt-samba-rio-1928', to: 'evt-candombe-montevideo-1978' },
  { from: 'evt-tango-buenos-aires-1917', to: 'evt-candombe-montevideo-1978' },
  { from: 'evt-funk-augusta-1970', to: 'evt-kaseko-paramaribo-1970' },
  { from: 'evt-diaspora-portofspain-calypso-1914', to: 'evt-kaseko-paramaribo-1970' },
  { from: 'evt-kaseko-paramaribo-1970', to: 'evt-chutney-georgetown-1996' },
  { from: 'evt-diaspora-portofspain-soca-1973', to: 'evt-chutney-georgetown-1996' },
  { from: 'evt-dancehall-kingston-1985', to: 'evt-bouyon-roseau-1988' },
  { from: 'evt-kompa-portauprince-1957', to: 'evt-bachata-santodomingo-1962' },
  { from: 'evt-guarania-asuncion-1944', to: 'evt-andean-lapaz-1965' },
  { from: 'evt-bad-bunny-sanjuan-2020', to: 'evt-latin-streaming-mexicocity-2023' },
  { from: 'evt-latin-urban-medellin-2017', to: 'evt-latin-streaming-mexicocity-2023' },
  { from: 'evt-rosalia-sanjuan-2018', to: 'evt-latin-streaming-mexicocity-2023' },
  { from: 'evt-dancehall-digital-kingston-1998', to: 'evt-jab-stgeorges-2000' },
  { from: 'evt-marimba-guatemalacity-1955', to: 'evt-sonnica-managua-1975' },
  { from: 'evt-diaspora-salvador-candomble-1830', to: 'evt-diaspora-havana-rumba-1886' },
  { from: 'evt-diaspora-lima-afro-peruvian-1957', to: 'evt-andean-lapaz-1965' },
  { from: 'evt-junkanoo-nassau-1958', to: 'evt-spouge-bridgetown-1969' },
  { from: 'evt-reggaeton-san-juan-2004', to: 'evt-dennery-castries-2014' },
  { from: 'evt-latin-trap-medellin-2005', to: 'evt-latin-streaming-mexicocity-2023' },

  // ── Africa (new) ──
  { from: 'evt-maqam-cairo-1870', to: 'evt-malouf-tunis-1934' },
  { from: 'evt-malouf-tunis-1934', to: 'evt-maluf-tripoli-1960' },
  { from: 'evt-chaabi-algiers-1920', to: 'evt-malouf-tunis-1934' },
  { from: 'evt-maqam-cairo-1870', to: 'evt-haqiba-khartoum-1940' },
  { from: 'evt-haqiba-khartoum-1940', to: 'evt-juba-music-peace-2012' },
  { from: 'evt-griot-timbuktu-1500', to: 'evt-dimi-mint-abba-nouakchott-1977' },
  { from: 'evt-griot-timbuktu-1500', to: 'evt-bembeya-conakry-1966' },
  { from: 'evt-rumba-kinshasa-1950', to: 'evt-bembeya-conakry-1966' },
  { from: 'evt-highlife-lagos-1952', to: 'evt-bembeya-conakry-1966' },
  { from: 'evt-diaspora-freetown-maroon-1800', to: 'evt-palmwine-freetown-1952' },
  { from: 'evt-palmwine-freetown-1952', to: 'evt-highlife-lagos-1952' },
  { from: 'evt-palmwine-freetown-1952', to: 'evt-gumbe-bissau-1975' },
  { from: 'evt-highlife-accra-1960', to: 'evt-bella-bellow-lome-1969' },
  { from: 'evt-bella-bellow-lome-1969', to: 'evt-gangbe-cotonou-2001' },
  { from: 'evt-highlife-accra-1960', to: 'evt-voltaique-ouaga-1983' },
  { from: 'evt-afrobeat-lagos-1971', to: 'evt-voltaique-ouaga-1983' },
  { from: 'evt-hiphop-dakar-1991', to: 'evt-hipco-monrovia-2004' },
  { from: 'evt-highlife-lagos-1952', to: 'evt-hipco-monrovia-2004' },
  { from: 'evt-mbalax-dakar-1970', to: 'evt-morna-praia-1988' },
  { from: 'evt-highlife-lagos-1952', to: 'evt-makossa-douala-1972' },
  { from: 'evt-rumba-kinshasa-1956', to: 'evt-makossa-douala-1972' },
  { from: 'evt-rumba-kinshasa-1950', to: 'evt-bwiti-libreville-1950' },
  { from: 'evt-bwiti-libreville-1950', to: 'evt-balele-malabo-1968' },
  { from: 'evt-brazza-rumba-1960', to: 'evt-aka-polyphony-bangui-2003' },
  { from: 'evt-brazza-rumba-1960', to: 'evt-sai-ndjamena-1995' },
  { from: 'evt-haqiba-khartoum-1940', to: 'evt-sai-ndjamena-1995' },
  { from: 'evt-rumba-kinshasa-1950', to: 'evt-ussua-saotome-1975' },
  { from: 'evt-gumbe-bissau-1975', to: 'evt-ussua-saotome-1975' },
  { from: 'evt-rumba-kinshasa-1956', to: 'evt-kadongo-kamu-kampala-1965' },
  { from: 'evt-benga-nairobi-1967', to: 'evt-kadongo-kamu-kampala-1965' },
  { from: 'evt-drummers-bujumbura-1964', to: 'evt-inanga-kigali-2010' },
  { from: 'evt-kadongo-kamu-kampala-1965', to: 'evt-inanga-kigali-2010' },
  { from: 'evt-rumba-kinshasa-1950', to: 'evt-drummers-bujumbura-1964' },
  { from: 'evt-ethiojazz-addis-1970', to: 'evt-waaberi-mogadishu-1972' },
  { from: 'evt-umm-kulthum-cairo-1944', to: 'evt-waaberi-mogadishu-1972' },
  { from: 'evt-waaberi-mogadishu-1972', to: 'evt-djibouti-folk-1977' },
  { from: 'evt-ethiojazz-addis-1970', to: 'evt-guayla-asmara-1993' },
  { from: 'evt-haqiba-khartoum-1940', to: 'evt-guayla-asmara-1993' },
  { from: 'evt-bongo-flava-dar-1990', to: 'evt-salegy-antananarivo-1992' },
  { from: 'evt-sega-portlouis-1964', to: 'evt-salegy-antananarivo-1992' },
  { from: 'evt-umm-kulthum-cairo-1944', to: 'evt-twarab-moroni-1985' },
  { from: 'evt-benga-nairobi-1967', to: 'evt-twarab-moroni-1985' },
  { from: 'evt-twarab-moroni-1985', to: 'evt-moutya-victoria-2011' },
  { from: 'evt-sega-portlouis-1964', to: 'evt-moutya-victoria-2011' },
  { from: 'evt-marrabenta-maputo-1955', to: 'evt-sega-portlouis-1964' },
  { from: 'evt-rumba-kinshasa-1956', to: 'evt-marrabenta-maputo-1955' },
  { from: 'evt-marrabenta-maputo-1955', to: 'evt-chimurenga-harare-1977' },
  { from: 'evt-rumba-kinshasa-1956', to: 'evt-zamrock-lusaka-1974' },
  { from: 'evt-zamrock-lusaka-1974', to: 'evt-chimurenga-harare-1977' },
  { from: 'evt-marrabenta-maputo-1955', to: 'evt-malipenga-blantyre-1960' },
  { from: 'evt-township-jive-johannesburg-1981', to: 'evt-motswako-gaborone-2005' },
  { from: 'evt-township-jive-johannesburg-1981', to: 'evt-shambo-windhoek-2000' },
  { from: 'evt-zamrock-lusaka-1974', to: 'evt-shambo-windhoek-2000' },
  { from: 'evt-umhlanga-mbabane-1940', to: 'evt-township-jive-johannesburg-1981' },
  { from: 'evt-umhlanga-mbabane-1940', to: 'evt-famo-maseru-1970' },
  { from: 'evt-famo-maseru-1970', to: 'evt-township-jive-johannesburg-1981' },
  { from: 'evt-township-jive-johannesburg-1981', to: 'evt-cape-jazz-capetown-1974' },
  { from: 'evt-cape-jazz-capetown-1974', to: 'evt-amapiano-joburg-2019' },
  { from: 'evt-soukous-kinshasa-1992', to: 'evt-kuduro-luanda-2000' },
  { from: 'evt-kuduro-luanda-2000', to: 'evt-kuduro-luanda-2005' },
  { from: 'evt-kuduro-luanda-2005', to: 'evt-afrobeats-lagos-2010' },
  { from: 'evt-desert-blues-bamako-1980', to: 'evt-dimi-mint-abba-nouakchott-1977' },
  { from: 'evt-kora-banjul-1970', to: 'evt-morna-praia-1988' },
  { from: 'evt-makossa-douala-1972', to: 'evt-coupe-decale-abidjan-2002' },
  { from: 'evt-highlife-accra-1960', to: 'evt-gangbe-cotonou-2001' },
  { from: 'evt-diaspora-dakar-blues-roots-1960', to: 'evt-dimi-mint-abba-nouakchott-1977' },

  // ── Middle East / Central Asia / South Asia / SE Asia / East Asia / Oceania (new) ──
  { from: 'evt-fairuz-beirut-1957', to: 'evt-persian-pop-tehran-1970' },
  { from: 'evt-umm-kulthum-cairo-1944', to: 'evt-persian-pop-tehran-1970' },
  { from: 'evt-maqam-cairo-1870', to: 'evt-muwashah-damascus-1950' },
  { from: 'evt-muwashah-damascus-1950', to: 'evt-fairuz-beirut-1957' },
  { from: 'evt-arabic-indie-beirut-2005', to: 'evt-arabic-indie-amman-2015' },
  { from: 'evt-mahraganat-cairo-2012', to: 'evt-arabic-indie-amman-2015' },
  { from: 'evt-balearic-ibiza-1988', to: 'evt-psytrance-telaviv-1995' },
  { from: 'evt-acid-house-london-1986', to: 'evt-psytrance-telaviv-1995' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-palestinian-hiphop-ramallah-2007' },
  { from: 'evt-hiphop-paris-1990', to: 'evt-palestinian-hiphop-ramallah-2007' },
  { from: 'evt-edm-amsterdam-2005', to: 'evt-mdlbeast-riyadh-2019' },
  { from: 'evt-khaliji-pop-kuwait-1975', to: 'evt-mdlbeast-riyadh-2019' },
  { from: 'evt-maqam-cairo-1870', to: 'evt-sanani-song-sanaa-2003' },
  { from: 'evt-iraqi-maqam-baghdad-1932', to: 'evt-sawt-manama-1940' },
  { from: 'evt-sawt-manama-1940', to: 'evt-khaliji-pop-kuwait-1975' },
  { from: 'evt-sawt-manama-1940', to: 'evt-liwa-muscat-1980' },
  { from: 'evt-sawt-manama-1940', to: 'evt-fijiri-doha-2010' },
  { from: 'evt-khaliji-pop-kuwait-1975', to: 'evt-arabic-hiphop-dubai-2017' },
  { from: 'evt-palestinian-hiphop-ramallah-2007', to: 'evt-arabic-hiphop-dubai-2017' },
  { from: 'evt-arabic-hiphop-dubai-2017', to: 'evt-mdlbeast-riyadh-2019' },
  { from: 'evt-iraqi-maqam-baghdad-1932', to: 'evt-mugham-jazz-baku-1960' },
  { from: 'evt-mugham-jazz-baku-1960', to: 'evt-duduk-yerevan-2005' },
  { from: 'evt-fairuz-beirut-1957', to: 'evt-arabic-indie-beirut-2005' },
  { from: 'evt-rai-oran-1985', to: 'evt-arabic-indie-beirut-2005' },
  { from: 'evt-persian-pop-tehran-1970', to: 'evt-khaliji-pop-kuwait-1975' },
  { from: 'evt-liwa-muscat-1980', to: 'evt-fijiri-doha-2010' },
  { from: 'evt-iraqi-maqam-baghdad-1932', to: 'evt-shashmaqam-tashkent-2003' },
  { from: 'evt-shashmaqam-tashkent-2003', to: 'evt-falak-dushanbe-2003' },
  { from: 'evt-shashmaqam-tashkent-2003', to: 'evt-dombra-almaty-2014' },
  { from: 'evt-manas-epic-bishkek-1995', to: 'evt-dombra-almaty-2014' },
  { from: 'evt-shashmaqam-tashkent-2003', to: 'evt-bakhshi-ashgabat-2015' },
  { from: 'evt-falak-dushanbe-2003', to: 'evt-bakhshi-ashgabat-2015' },
  { from: 'evt-qawwali-lahore-1985', to: 'evt-baul-dhaka-2005' },
  { from: 'evt-bollywood-mumbai-1960', to: 'evt-baila-colombo-1960' },
  { from: 'evt-bollywood-mumbai-1960', to: 'evt-nepali-folk-kathmandu-1972' },
  { from: 'evt-nepali-folk-kathmandu-1972', to: 'evt-rigsar-thimphu-2000' },
  { from: 'evt-bollywood-mumbai-1960', to: 'evt-rigsar-thimphu-2000' },
  { from: 'evt-baila-colombo-1960', to: 'evt-bodu-beru-male-1980' },
  { from: 'evt-rubab-kabul-1965', to: 'evt-qawwali-lahore-1985' },
  { from: 'evt-group-sounds-tokyo-1966', to: 'evt-chinese-rock-beijing-1986' },
  { from: 'evt-punk-london-1976', to: 'evt-chinese-rock-beijing-1986' },
  { from: 'evt-electronic-dusseldorf-1979', to: 'evt-city-pop-tokyo-1981' },
  { from: 'evt-city-pop-tokyo-1981', to: 'evt-citypop-tokyo-1982' },
  { from: 'evt-classical-vienna-1900', to: 'evt-opera-pyongyang-1971' },
  { from: 'evt-hsaingwaing-yangon-1950', to: 'evt-lukthung-bangkok-1964' },
  { from: 'evt-bollywood-mumbai-1960', to: 'evt-dangdut-jakarta-1975' },
  { from: 'evt-lukthung-bangkok-1964', to: 'evt-khmerrock-phnompenh-1967' },
  { from: 'evt-psychedelia-sf-1967', to: 'evt-khmerrock-phnompenh-1967' },
  { from: 'evt-khene-vientiane-1960', to: 'evt-lukthung-bangkok-1964' },
  { from: 'evt-lukthung-bangkok-1964', to: 'evt-dangdut-jakarta-1975' },
  { from: 'evt-dangdut-jakarta-1975', to: 'evt-dikir-kualalumpur-1985' },
  { from: 'evt-city-pop-tokyo-1981', to: 'evt-xinyao-singapore-1983' },
  { from: 'evt-dangdut-jakarta-1975', to: 'evt-opm-manila-1978' },
  { from: 'evt-opm-manila-1978', to: 'evt-resistance-dili-1999' },
  { from: 'evt-dangdut-jakarta-1975', to: 'evt-resistance-dili-1999' },
  { from: 'evt-dikir-kualalumpur-1985', to: 'evt-gulingtangan-brunei-1992' },
  { from: 'evt-hsaingwaing-yangon-1950', to: 'evt-catru-hanoi-2009' },
  { from: 'evt-british-blues-london-1962', to: 'evt-pubrock-melbourne-1975' },
  { from: 'evt-punk-london-1976', to: 'evt-splitenz-auckland-1980' },
  { from: 'evt-pubrock-melbourne-1975', to: 'evt-splitenz-auckland-1980' },
  { from: 'evt-pubrock-melbourne-1975', to: 'evt-melbourne-indie-2015' },
  { from: 'evt-splitenz-auckland-1980', to: 'evt-melbourne-indie-2015' },
  { from: 'evt-panpipe-honiara-1969', to: 'evt-singsing-portmoresby-1970' },
  { from: 'evt-singsing-portmoresby-1970', to: 'evt-stringband-portvila-1980' },
  { from: 'evt-choral-apia-1962', to: 'evt-choral-suva-1985' },
  { from: 'evt-choral-apia-1962', to: 'evt-lakalaka-nukualofa-2003' },
  { from: 'evt-choral-apia-1962', to: 'evt-tebino-tarawa-1978' },
  { from: 'evt-choral-apia-1962', to: 'evt-fatele-funafuti-2000' },
  { from: 'evt-panpipe-honiara-1969', to: 'evt-chant-palikir-1986' },
  { from: 'evt-tebino-tarawa-1978', to: 'evt-jebwa-majuro-1979' },
  { from: 'evt-chant-palikir-1986', to: 'evt-omengat-ngerulmud-1995' },
  { from: 'evt-panpipe-honiara-1969', to: 'evt-folk-yaren-1968' },
  { from: 'evt-tebino-tarawa-1978', to: 'evt-fatele-funafuti-2000' },
  { from: 'evt-jebwa-majuro-1979', to: 'evt-chant-palikir-1986' },
  { from: 'evt-steelguitar-honolulu-1927', to: 'evt-choral-apia-1962' },
  { from: 'evt-manas-epic-bishkek-1995', to: 'evt-throat-singing-kyzyl-1993' },
  { from: 'evt-anatolian-rock-istanbul-1972', to: 'evt-persian-pop-tehran-1970' },
  { from: 'evt-throat-singing-kyzyl-1993', to: 'evt-throatsinging-ulaanbaatar-1992' },

  // ── Europe (new) ──
  { from: 'evt-classical-vienna-1700', to: 'evt-chopin-warsaw-1927' },
  { from: 'evt-classical-vienna-1700', to: 'evt-philharmonic-montecarlo-1911' },
  { from: 'evt-classical-vienna-1700', to: 'evt-neapolitan-naples-1898' },
  { from: 'evt-classical-vienna-1900', to: 'evt-chopin-warsaw-1927' },
  { from: 'evt-classical-vienna-1900', to: 'evt-sistine-vatican-1956' },
  { from: 'evt-neapolitan-naples-1898', to: 'evt-fado-lisbon-1950' },
  { from: 'evt-neapolitan-naples-1898', to: 'evt-rebetiko-athens-1932' },
  { from: 'evt-neapolitan-naples-1898', to: 'evt-ghana-valletta-1962' },
  { from: 'evt-philharmonic-montecarlo-1911', to: 'evt-sistine-vatican-1956' },
  { from: 'evt-philharmonic-montecarlo-1911', to: 'evt-choral-vaduz-1960' },
  { from: 'evt-song-festival-riga-1873', to: 'evt-singing-revolution-tallinn-1988' },
  { from: 'evt-song-festival-riga-1873', to: 'evt-sutartines-vilnius-2010' },
  { from: 'evt-song-festival-riga-1873', to: 'evt-choral-vaduz-1960' },
  { from: 'evt-rebetiko-athens-1932', to: 'evt-cypriot-music-nicosia-1975' },
  { from: 'evt-rebetiko-athens-1932', to: 'evt-fado-lisbon-1950' },
  { from: 'evt-rebetiko-athens-1932', to: 'evt-bijelo-dugme-sarajevo-1974' },
  { from: 'evt-fado-lisbon-1950', to: 'evt-folk-andorra-1990' },
  { from: 'evt-rtl-luxembourg-1954', to: 'evt-beatles-liverpool-1963' },
  { from: 'evt-rtl-luxembourg-1954', to: 'evt-british-blues-london-1962' },
  { from: 'evt-merseybeat-liverpool-1963', to: 'evt-beatles-liverpool-1963' },
  { from: 'evt-beatles-liverpool-1963', to: 'evt-u2-dublin-1983' },
  { from: 'evt-beatles-liverpool-1963', to: 'evt-bjork-reykjavik-1993' },
  { from: 'evt-beatles-liverpool-1963', to: 'evt-swedish-pop-stockholm-2012' },
  { from: 'evt-bartok-budapest-1906', to: 'evt-bulgarian-voices-sofia-1975' },
  { from: 'evt-bartok-budapest-1906', to: 'evt-slovak-folk-bratislava-1960' },
  { from: 'evt-krautrock-dusseldorf-1974', to: 'evt-bjork-reykjavik-1993' },
  { from: 'evt-electronic-dusseldorf-1979', to: 'evt-bjork-reykjavik-1993' },
  { from: 'evt-electronic-dusseldorf-1979', to: 'evt-swedish-pop-stockholm-2012' },
  { from: 'evt-electronic-dusseldorf-1979', to: 'evt-ozone-chisinau-2003' },
  { from: 'evt-punk-london-1976', to: 'evt-u2-dublin-1983' },
  { from: 'evt-punk-london-1976', to: 'evt-plastic-people-prague-1976' },
  { from: 'evt-punk-london-1976', to: 'evt-underground-minsk-2000' },
  { from: 'evt-newwave-london-1981', to: 'evt-u2-dublin-1983' },
  { from: 'evt-newwave-london-1981', to: 'evt-bjork-reykjavik-1993' },
  { from: 'evt-black-metal-oslo-1993', to: 'evt-metal-helsinki-2006' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-metal-helsinki-2006' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-bijelo-dugme-sarajevo-1974' },
  { from: 'evt-bijelo-dugme-sarajevo-1974', to: 'evt-punk-zagreb-1978' },
  { from: 'evt-bijelo-dugme-sarajevo-1974', to: 'evt-turbofolk-belgrade-1990' },
  { from: 'evt-bijelo-dugme-sarajevo-1974', to: 'evt-laibach-ljubljana-1980' },
  { from: 'evt-laibach-ljubljana-1980', to: 'evt-turbofolk-belgrade-1990' },
  { from: 'evt-punk-zagreb-1978', to: 'evt-turbofolk-belgrade-1990' },
  { from: 'evt-bulgarian-voices-sofia-1975', to: 'evt-iso-polyphony-tirana-2005' },
  { from: 'evt-bulgarian-voices-sofia-1975', to: 'evt-roma-brass-skopje-1990' },
  { from: 'evt-bulgarian-voices-sofia-1975', to: 'evt-dakhabrakha-kyiv-2004' },
  { from: 'evt-turbofolk-belgrade-1990', to: 'evt-ozone-chisinau-2003' },
  { from: 'evt-turbofolk-belgrade-1990', to: 'evt-sea-dance-podgorica-2014' },
  { from: 'evt-roma-brass-skopje-1990', to: 'evt-sea-dance-podgorica-2014' },
  { from: 'evt-plastic-people-prague-1976', to: 'evt-singing-revolution-tallinn-1988' },
  { from: 'evt-plastic-people-prague-1976', to: 'evt-underground-minsk-2000' },
  { from: 'evt-singing-revolution-tallinn-1988', to: 'evt-sutartines-vilnius-2010' },
  { from: 'evt-singing-revolution-tallinn-1988', to: 'evt-underground-minsk-2000' },
  { from: 'evt-slovak-folk-bratislava-1960', to: 'evt-dakhabrakha-kyiv-2004' },
  { from: 'evt-underground-minsk-2000', to: 'evt-dakhabrakha-kyiv-2004' },
  { from: 'evt-techno-berlin-1991', to: 'evt-sea-dance-podgorica-2014' },
  { from: 'evt-edm-amsterdam-2005', to: 'evt-sea-dance-podgorica-2014' },
  { from: 'evt-edm-amsterdam-2005', to: 'evt-swedish-pop-stockholm-2012' },
  { from: 'evt-jazz-age-paris-1925', to: 'evt-rebetiko-athens-1932' },
  { from: 'evt-jazz-copenhagen-1979', to: 'evt-bjork-reykjavik-1993' },
  { from: 'evt-trip-hop-bristol-1994', to: 'evt-bjork-reykjavik-1993' },
  { from: 'evt-britpop-london-1995', to: 'evt-swedish-pop-stockholm-2012' },
  { from: 'evt-sistine-vatican-1956', to: 'evt-iso-polyphony-tirana-2005' },
  { from: 'evt-ghana-valletta-1962', to: 'evt-eurovision-sanmarino-2011' },
  { from: 'evt-flamenco-seville-1922', to: 'evt-fado-lisbon-1950' },
  { from: 'evt-french-touch-paris-1996', to: 'evt-swedish-pop-stockholm-2012' },
  { from: 'evt-ozone-chisinau-2003', to: 'evt-eurovision-sanmarino-2011' },

  // ── North America: United States + Canada (new) ──
  { from: 'evt-motown-detroit-1963', to: 'evt-motown-detroit-1966' },
  { from: 'evt-motown-detroit-1966', to: 'evt-philly-soul-philadelphia-1972' },
  { from: 'evt-motown-detroit-1966', to: 'evt-funk-augusta-1970' },
  { from: 'evt-psychedelia-sf-1967', to: 'evt-psychedelic-sf-1967' },
  { from: 'evt-doors-la-1965', to: 'evt-psychedelic-sf-1967' },
  { from: 'evt-british-blues-london-1962', to: 'evt-doors-la-1965' },
  { from: 'evt-jazz-la-1942', to: 'evt-doors-la-1965' },
  { from: 'evt-psychedelic-sf-1967', to: 'evt-redrocks-denver-1971' },
  { from: 'evt-blues-memphis-1951', to: 'evt-moondog-cleveland-1952' },
  { from: 'evt-moondog-cleveland-1952', to: 'evt-elvis-memphis-1954' },
  { from: 'evt-moondog-cleveland-1952', to: 'evt-halloffame-cleveland-1986' },
  { from: 'evt-chuck-berry-stlouis-1955', to: 'evt-halloffame-cleveland-1986' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-queenlatifah-newark-1989' },
  { from: 'evt-bebop-nyc-1945', to: 'evt-jazzheritage-newark-1967' },
  { from: 'evt-jazzheritage-newark-1967', to: 'evt-queenlatifah-newark-1989' },
  { from: 'evt-westcoast-la-1988', to: 'evt-chopped-houston-1995' },
  { from: 'evt-funk-augusta-1970', to: 'evt-chopped-houston-1995' },
  { from: 'evt-chopped-houston-1995', to: 'evt-hiphop-atlanta-2003' },
  { from: 'evt-subpop-seattle-1988', to: 'evt-grunge-seattle-1991' },
  { from: 'evt-punk-london-1976', to: 'evt-hardcore-hartford-1984' },
  { from: 'evt-minorthreat-washingtondc-1981', to: 'evt-hardcore-hartford-1984' },
  { from: 'evt-hardcore-hartford-1984', to: 'evt-hatebreed-hartford-2000' },
  { from: 'evt-pixies-boston-1988', to: 'evt-grunge-seattle-1991' },
  { from: 'evt-pixies-boston-1988', to: 'evt-indie-brooklyn-2005' },
  { from: 'evt-pixies-boston-1988', to: 'evt-builttospill-boise-1992' },
  { from: 'evt-grunge-seattle-1991', to: 'evt-ginblossoms-phoenix-1993' },
  { from: 'evt-grunge-seattle-1991', to: 'evt-killrockstars-portland-1991' },
  { from: 'evt-killrockstars-portland-1991', to: 'evt-indie-portland-2003' },
  { from: 'evt-shins-albuquerque-2001', to: 'evt-indie-portland-2003' },
  { from: 'evt-indie-portland-2003', to: 'evt-indie-brooklyn-2005' },
  { from: 'evt-indie-brooklyn-2005', to: 'evt-austin-sxsw-2007' },
  { from: 'evt-austin-sxsw-2007', to: 'evt-streaming-global-2015' },
  { from: 'evt-indie-brooklyn-2005', to: 'evt-streaming-global-2015' },
  { from: 'evt-gogo-dc-1979', to: 'evt-baltimore-club-baltimore-1993' },
  { from: 'evt-house-chicago-1984', to: 'evt-baltimore-club-baltimore-1993' },
  { from: 'evt-baltimore-club-baltimore-1993', to: 'evt-whamcity-baltimore-2007' },
  { from: 'evt-jazz-origins-nola-1890', to: 'evt-meters-neworleans-1969' },
  { from: 'evt-funk-augusta-1970', to: 'evt-meters-neworleans-1969' },
  { from: 'evt-meters-neworleans-1969', to: 'evt-funk-minneapolis-1979' },
  { from: 'evt-soul-memphis-1962', to: 'evt-diaspora-memphis-stax-soul-1967' },
  { from: 'evt-southern-soul-memphis-1965', to: 'evt-diaspora-memphis-stax-soul-1967' },
  { from: 'evt-hiphop-nyc-1979', to: 'evt-diaspora-nyc-hip-hop-africa-1982' },
  { from: 'evt-conscious-rap-nyc-1982', to: 'evt-diaspora-nyc-hip-hop-africa-1982' },
  { from: 'evt-funk-minneapolis-1979', to: 'evt-rhymesayers-minneapolis-2002' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-rhymesayers-minneapolis-2002' },
  { from: 'evt-rhymesayers-minneapolis-2002', to: 'evt-hiphop-pittsburgh-2010' },
  { from: 'evt-hiphop-atlanta-2003', to: 'evt-hiphop-pittsburgh-2010' },
  { from: 'evt-soul-memphis-1962', to: 'evt-gospel-jackson-1965' },
  { from: 'evt-diaspora-chicago-gospel-1932', to: 'evt-gospel-jackson-1965' },
  { from: 'evt-blues-clarksdale-1903', to: 'evt-blues-jackson-1930' },
  { from: 'evt-blues-jackson-1930', to: 'evt-blues-mississippi-1936' },
  { from: 'evt-blues-jackson-1930', to: 'evt-gospel-jackson-1965' },
  { from: 'evt-spiritual-nashville-1867', to: 'evt-freedomsongs-birmingham-1963' },
  { from: 'evt-sunra-birmingham-1914', to: 'evt-freedomsongs-birmingham-1963' },
  { from: 'evt-sunra-birmingham-1914', to: 'evt-bebop-nyc-1945' },
  { from: 'evt-sunra-birmingham-1914', to: 'evt-jazz-la-1942' },
  { from: 'evt-folkfestival-anchorage-1980', to: 'evt-pamyua-anchorage-2010' },
  { from: 'evt-ginblossoms-phoenix-1993', to: 'evt-jimmyeatworld-phoenix-2001' },
  { from: 'evt-pixies-boston-1988', to: 'evt-jimmyeatworld-phoenix-2001' },
  { from: 'evt-rosettatharpe-littlerock-1950', to: 'evt-rockabilly-littlerock-1955' },
  { from: 'evt-elvis-memphis-1954', to: 'evt-rockabilly-littlerock-1955' },
  { from: 'evt-redrocks-denver-1971', to: 'evt-thefray-denver-2005' },
  { from: 'evt-boston-boston-1976', to: 'evt-pixies-boston-1988' },
  { from: 'evt-psychedelic-sf-1967', to: 'evt-boston-boston-1976' },
  { from: 'evt-bobmarley-wilmington-1965', to: 'evt-diypunk-wilmington-1993' },
  { from: 'evt-punk-london-1976', to: 'evt-diypunk-wilmington-1993' },
  { from: 'evt-steelguitar-honolulu-1927', to: 'evt-country-bristol-1927' },
  { from: 'evt-steelguitar-honolulu-1927', to: 'evt-iz-honolulu-1993' },
  { from: 'evt-builttospill-boise-1992', to: 'evt-treefort-boise-2015' },
  { from: 'evt-builttospill-boise-1992', to: 'evt-indie-portland-2003' },
  { from: 'evt-kc-jazz-kansascity-1936', to: 'evt-wesmontgomery-indianapolis-1955' },
  { from: 'evt-wesmontgomery-indianapolis-1955', to: 'evt-mellencamp-indianapolis-1982' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-slipknot-desmoines-1999' },
  { from: 'evt-deathmetal-tampa-1990', to: 'evt-slipknot-desmoines-1999' },
  { from: 'evt-slipknot-desmoines-1999', to: 'evt-8035fest-desmoines-2008' },
  { from: 'evt-kc-jazz-kansascity-1936', to: 'evt-jazztouring-wichita-1936' },
  { from: 'evt-jazztouring-wichita-1936', to: 'evt-embarrassment-wichita-1983' },
  { from: 'evt-slint-louisville-1991', to: 'evt-mmj-louisville-2003' },
  { from: 'evt-minorthreat-washingtondc-1981', to: 'evt-slint-louisville-1991' },
  { from: 'evt-folktradition-portland-2000', to: 'evt-portlandmusic-portland-2012' },
  { from: 'evt-folkamericana-missoula-1999', to: 'evt-wilma-missoula-2014' },
  { from: 'evt-roots-nashville-1972', to: 'evt-folkamericana-missoula-1999' },
  { from: 'evt-saddlecreek-omaha-1996', to: 'evt-brighteyes-omaha-2005' },
  { from: 'evt-killrockstars-portland-1991', to: 'evt-saddlecreek-omaha-1996' },
  { from: 'evt-swing-nyc-1935', to: 'evt-ratpack-lasvegas-1960' },
  { from: 'evt-ratpack-lasvegas-1960', to: 'evt-killers-lasvegas-2003' },
  { from: 'evt-newwave-london-1981', to: 'evt-killers-lasvegas-2003' },
  { from: 'evt-hardcore-hartford-1984', to: 'evt-hardcore-manchester-1990' },
  { from: 'evt-hardcore-manchester-1990', to: 'evt-indiescene-manchester-2010' },
  { from: 'evt-powwow-albuquerque-1970', to: 'evt-shins-albuquerque-2001' },
  { from: 'evt-blues-jackson-1930', to: 'evt-piedmontblues-charlotte-1940' },
  { from: 'evt-piedmontblues-charlotte-1940', to: 'evt-dababy-charlotte-2019' },
  { from: 'evt-trap-atlanta-2012', to: 'evt-dababy-charlotte-2019' },
  { from: 'evt-scandinavianfolk-fargo-1990', to: 'evt-indierock-fargo-2008' },
  { from: 'evt-roots-nashville-1972', to: 'evt-tulsasound-tulsa-1972' },
  { from: 'evt-rockabilly-littlerock-1955', to: 'evt-tulsasound-tulsa-1972' },
  { from: 'evt-tulsasound-tulsa-1972', to: 'evt-hanson-tulsa-2007' },
  { from: 'evt-lightningbolt-providence-1995', to: 'evt-artrock-providence-2002' },
  { from: 'evt-punk-london-1976', to: 'evt-lightningbolt-providence-1995' },
  { from: 'evt-charlestondance-charleston-1923', to: 'evt-swing-nyc-1935' },
  { from: 'evt-charlestondance-charleston-1923', to: 'evt-shovelsrope-charleston-2010' },
  { from: 'evt-roots-nashville-1972', to: 'evt-shovelsrope-charleston-2010' },
  { from: 'evt-lakotadrums-siouxfalls-1990', to: 'evt-indierock-siouxfalls-2010' },
  { from: 'evt-punk-london-1976', to: 'evt-theused-saltlakecity-2001' },
  { from: 'evt-jimmyeatworld-phoenix-2001', to: 'evt-theused-saltlakecity-2001' },
  { from: 'evt-theused-saltlakecity-2001', to: 'evt-neontrees-saltlakecity-2010' },
  { from: 'evt-newwave-london-1981', to: 'evt-neontrees-saltlakecity-2010' },
  { from: 'evt-phish-burlington-1983', to: 'evt-folkfestival-burlington-2005' },
  { from: 'evt-psychedelic-sf-1967', to: 'evt-phish-burlington-1983' },
  { from: 'evt-gwar-richmond-1985', to: 'evt-lambofgod-richmond-2004' },
  { from: 'evt-deathmetal-tampa-1990', to: 'evt-lambofgod-richmond-2004' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-gwar-richmond-1985' },
  { from: 'evt-appalachia-bristol-1830', to: 'evt-oldtimefiddle-charleston-1930' },
  { from: 'evt-oldtimefiddle-charleston-1930', to: 'evt-hazeldickens-charleston-1968' },
  { from: 'evt-roots-nashville-1972', to: 'evt-hazeldickens-charleston-1968' },
  { from: 'evt-hazeldickens-charleston-1968', to: 'evt-folkamericana-missoula-1999' },
  { from: 'evt-summerfest-milwaukee-1968', to: 'evt-violentfemmes-milwaukee-1983' },
  { from: 'evt-punk-london-1976', to: 'evt-violentfemmes-milwaukee-1983' },
  { from: 'evt-frontierdays-cheyenne-1940', to: 'evt-chrisledoux-cheyenne-1997' },
  { from: 'evt-grand-ole-opry-nashville-1925', to: 'evt-frontierdays-cheyenne-1940' },
  { from: 'evt-soul-memphis-1962', to: 'evt-dallas-soul-dallas-2015' },
  { from: 'evt-diaspora-memphis-stax-soul-1967', to: 'evt-dallas-soul-dallas-2015' },
  { from: 'evt-powwow-albuquerque-1970', to: 'evt-folkfestival-anchorage-1980' },
  { from: 'evt-powwow-albuquerque-1970', to: 'evt-lakotadrums-siouxfalls-1990' },
  { from: 'evt-edm-miami-2006', to: 'evt-streaming-global-2015' },
  { from: 'evt-trap-atlanta-2012', to: 'evt-streaming-global-2015' },
  { from: 'evt-slint-louisville-1991', to: 'evt-saddlecreek-omaha-1996' },
  { from: 'evt-artrock-providence-2002', to: 'evt-whamcity-baltimore-2007' },
  { from: 'evt-mmj-louisville-2003', to: 'evt-thefray-denver-2005' },
  { from: 'evt-folkfestival-anchorage-1980', to: 'evt-scandinavianfolk-fargo-1990' },
  { from: 'evt-brighteyes-omaha-2005', to: 'evt-austin-sxsw-2007' },
  { from: 'evt-jazzfest-montreal-1980', to: 'evt-arcade-fire-montreal-2004' },
  { from: 'evt-indie-brooklyn-2005', to: 'evt-arcade-fire-montreal-2004' },
  { from: 'evt-british-blues-london-1962', to: 'evt-rush-toronto-1974' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-rush-toronto-1974' },
  { from: 'evt-rush-toronto-1974', to: 'evt-drake-toronto-2015' },
  { from: 'evt-doa-vancouver-1978', to: 'evt-newporn-vancouver-2000' },
  { from: 'evt-newporn-vancouver-2000', to: 'evt-indie-portland-2003' },
  { from: 'evt-folkfest-edmonton-1980', to: 'evt-cadenceweapon-edmonton-2005' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-cadenceweapon-edmonton-2005' },
  { from: 'evt-merseybeat-liverpool-1963', to: 'evt-guesswho-winnipeg-1965' },
  { from: 'evt-guesswho-winnipeg-1965', to: 'evt-weakerthans-winnipeg-2000' },
  { from: 'evt-punk-london-1976', to: 'evt-weakerthans-winnipeg-2000' },
  { from: 'evt-jonimitchell-saskatoon-1964', to: 'evt-sask-jazz-saskatoon-1987' },
  { from: 'evt-jonimitchell-saskatoon-1964', to: 'evt-roots-nashville-1972' },
  { from: 'evt-celtic-halifax-1970', to: 'evt-sloan-halifax-1992' },
  { from: 'evt-grunge-seattle-1991', to: 'evt-sloan-halifax-1992' },
  { from: 'evt-sloan-halifax-1992', to: 'evt-eric-trip-moncton-1993' },
  { from: 'evt-celtic-halifax-1970', to: 'evt-acadian-moncton-1994' },
  { from: 'evt-acadian-moncton-1994', to: 'evt-greatbigseea-stjohns-1993' },
  { from: 'evt-georgestreet-stjohns-1985', to: 'evt-greatbigseea-stjohns-1993' },
  { from: 'evt-celtic-halifax-1970', to: 'evt-georgestreet-stjohns-1985' },
  { from: 'evt-celtic-halifax-1970', to: 'evt-ceilidh-charlottetown-1977' },
  { from: 'evt-ceilidh-charlottetown-1977', to: 'evt-rootsfest-charlottetown-2010' },
  { from: 'evt-folkfest-edmonton-1980', to: 'evt-folkfestival-anchorage-1980' },
  { from: 'evt-jazzfest-montreal-1980', to: 'evt-sask-jazz-saskatoon-1987' },
  { from: 'evt-eric-trip-moncton-1993', to: 'evt-indie-brooklyn-2005' },
  { from: 'evt-jazz-nola-1923', to: 'evt-jazztouring-wichita-1936' },
  { from: 'evt-embarrassment-wichita-1983', to: 'evt-killrockstars-portland-1991' },
  { from: 'evt-freedomsongs-birmingham-1963', to: 'evt-gospel-jackson-1965' },
  { from: 'evt-jazz-nola-1923', to: 'evt-jazzfest-montreal-1980' },
  { from: 'evt-indierock-fargo-2008', to: 'evt-indierock-siouxfalls-2010' },
  { from: 'evt-folktradition-portland-2000', to: 'evt-folkfestival-burlington-2005' },
  { from: 'evt-reggae-kingston-1971', to: 'evt-bobmarley-wilmington-1965' },
  { from: 'evt-mellencamp-indianapolis-1982', to: 'evt-slipknot-desmoines-1999' },

  // ── Final remaining events ──
  { from: 'evt-reggae-kingston-1971', to: 'evt-reggae-kingston-1977' },
  { from: 'evt-reggae-kingston-1977', to: 'evt-roots-reggae-kingston-1973' },
  { from: 'evt-balearic-ibiza-1988', to: 'evt-electronic-ibiza-1988' },
  { from: 'evt-electronic-ibiza-1988', to: 'evt-edm-amsterdam-2005' },
  { from: 'evt-philly-soul-philadelphia-1972', to: 'evt-philly-soul-philadelphia-1974' },
  { from: 'evt-philly-soul-philadelphia-1974', to: 'evt-disco-nyc-1977' },
  { from: 'evt-amapiano-joburg-2019', to: 'evt-amapiano-johannesburg-2019' },
  { from: 'evt-township-jive-johannesburg-1981', to: 'evt-amapiano-johannesburg-2019' },

  // ── West Asia ──
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-anatolian-rock-istanbul-1972' },
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-fairuz-beirut-1957' },
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-maqam-baghdad-1932' },
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-oud-damascus-1920' },
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-persian-pop-tehran-1970' },
  { from: 'evt-psychedelia-sf-1967', to: 'evt-anatolian-rock-istanbul-1972' },
  { from: 'evt-merseybeat-liverpool-1963', to: 'evt-anatolian-rock-istanbul-1972' },
  { from: 'evt-fairuz-beirut-1957', to: 'evt-persian-pop-tehran-1970' },
  { from: 'evt-fairuz-beirut-1957', to: 'evt-mizrahi-telaviv-1980' },
  { from: 'evt-fairuz-beirut-1957', to: 'evt-khaleeji-dubai-2005' },
  { from: 'evt-maqam-baghdad-1932', to: 'evt-fairuz-beirut-1957' },
  { from: 'evt-oud-damascus-1920', to: 'evt-maqam-baghdad-1932' },
  { from: 'evt-oud-damascus-1920', to: 'evt-fairuz-beirut-1957' },
  { from: 'evt-persian-pop-tehran-1970', to: 'evt-khaleeji-dubai-2005' },
  { from: 'evt-mugham-baku-2003', to: 'evt-persian-pop-tehran-1970' },
  { from: 'evt-duduk-yerevan-1950', to: 'evt-polyphony-tbilisi-2001' },
  { from: 'evt-polyphony-tbilisi-2001', to: 'evt-mugham-baku-2003' },

  // ── Central Asia ──
  { from: 'evt-shashmaqam-tashkent-2003', to: 'evt-dombra-almaty-1990' },
  { from: 'evt-throatsinging-ulaanbaatar-1992', to: 'evt-dombra-almaty-1990' },

  // ── South Asia ──
  { from: 'evt-bollywood-mumbai-1935', to: 'evt-qawwali-lahore-1987' },
  { from: 'evt-qawwali-lahore-1987', to: 'evt-indian-hiphop-mumbai-2020' },
  { from: 'evt-baul-dhaka-2005', to: 'evt-indian-hiphop-mumbai-2020' },
  { from: 'evt-raga-rock-mumbai-1965', to: 'evt-qawwali-lahore-1987' },

  // ── East Asia ──
  { from: 'evt-electronic-dusseldorf-1979', to: 'evt-ymo-tokyo-1978' },
  { from: 'evt-ymo-tokyo-1978', to: 'evt-city-pop-tokyo-1981' },
  { from: 'evt-ymo-tokyo-1978', to: 'evt-citypop-tokyo-1982' },
  { from: 'evt-ymo-tokyo-1978', to: 'evt-kpop-seoul-1996' },
  { from: 'evt-peking-opera-beijing-1790', to: 'evt-cantopop-beijing-1980' },
  { from: 'evt-peking-opera-beijing-1790', to: 'evt-chinese-rock-beijing-1986' },
  { from: 'evt-cantopop-beijing-1980', to: 'evt-chinese-rock-beijing-1986' },
  { from: 'evt-pansori-seoul-1800', to: 'evt-kpop-seoul-1996' },
  { from: 'evt-pansori-seoul-1800', to: 'evt-k-hiphop-seoul-1996' },
  { from: 'evt-group-sounds-tokyo-1966', to: 'evt-ymo-tokyo-1978' },

  // ── Oceania ──
  { from: 'evt-pubrock-melbourne-1975', to: 'evt-aboriginal-melbourne-1991' },
  { from: 'evt-aboriginal-melbourne-1991', to: 'evt-melbourne-indie-2015' },
  { from: 'evt-reggae-kingston-1971', to: 'evt-polynesian-auckland-1990' },
  { from: 'evt-splitenz-auckland-1980', to: 'evt-polynesian-auckland-1990' },
  { from: 'evt-maori-haka-auckland-1900', to: 'evt-polynesian-auckland-1990' },
  { from: 'evt-maori-haka-auckland-1900', to: 'evt-splitenz-auckland-1980' },
  { from: 'evt-stringband-portmoresby-1970', to: 'evt-pacific-suva-1985' },
  { from: 'evt-pacific-suva-1985', to: 'evt-polynesian-auckland-1990' },

  // ── Afro-Cuban expanded chain ──
  { from: 'evt-contradanza-havana-1800', to: 'evt-danzon-havana-1879' },
  { from: 'evt-danzon-havana-1879', to: 'evt-son-havana-1930' },
  { from: 'evt-danzon-havana-1879', to: 'evt-chacha-havana-1953' },
  { from: 'evt-son-havana-1930', to: 'evt-son-montuno-havana-1940' },
  { from: 'evt-son-montuno-havana-1940', to: 'evt-mambo-havana-1948' },
  { from: 'evt-son-montuno-havana-1940', to: 'evt-palladium-nyc-1954' },
  { from: 'evt-son-montuno-havana-1940', to: 'evt-fania-nyc-1971' },
  { from: 'evt-mambo-havana-1948', to: 'evt-chacha-havana-1953' },
  { from: 'evt-chacha-havana-1953', to: 'evt-palladium-nyc-1954' },
  { from: 'evt-palladium-nyc-1954', to: 'evt-boogaloo-nyc-1966' },
  { from: 'evt-palladium-nyc-1954', to: 'evt-pachanga-nyc-1961' },
  { from: 'evt-pachanga-nyc-1961', to: 'evt-boogaloo-nyc-1966' },
  { from: 'evt-pachanga-nyc-1961', to: 'evt-salsa-nyc-1971' },
  { from: 'evt-merengue-santodomingo-1958', to: 'evt-merengue-nyc-1985' },
  { from: 'evt-fania-nyc-1971', to: 'evt-merengue-nyc-1985' },
  { from: 'evt-salsa-nyc-1973', to: 'evt-salsa-romantica-nyc-1987' },
  { from: 'evt-fania-nyc-1971', to: 'evt-salsa-romantica-nyc-1987' },
  { from: 'evt-son-montuno-havana-1940', to: 'evt-timba-havana-1990' },
  { from: 'evt-diaspora-havana-rumba-1886', to: 'evt-timba-havana-1990' },
  { from: 'evt-revolution-havana-1959', to: 'evt-timba-havana-1990' },
  { from: 'evt-timba-havana-1990', to: 'evt-buena-vista-havana-1996' },

  // ═══════════════════════════════════════════════════════════════
  // ██  WESTERN CLASSICAL MUSIC CONNECTIONS  ██
  // ═══════════════════════════════════════════════════════════════

  // ── Medieval (intra-period) ──
  { from: 'evt-gregorian-rome-590', to: 'evt-notredame-paris-1163' },
  { from: 'evt-gregorian-rome-590', to: 'evt-troubadour-seville-1200' },
  { from: 'evt-notredame-paris-1163', to: 'evt-arsnova-paris-1320' },
  { from: 'evt-troubadour-seville-1200', to: 'evt-arsnova-paris-1320' },

  // ── Renaissance (intra-period) ──
  { from: 'evt-burgundian-brussels-1430', to: 'evt-josquin-rome-1486' },
  { from: 'evt-josquin-rome-1486', to: 'evt-palestrina-rome-1565' },
  { from: 'evt-josquin-rome-1486', to: 'evt-venetian-venice-1550' },
  { from: 'evt-venetian-venice-1550', to: 'evt-madrigal-london-1588' },
  { from: 'evt-palestrina-rome-1565', to: 'evt-madrigal-london-1588' },

  // ── Baroque (intra-period) ──
  { from: 'evt-opera-florence-1597', to: 'evt-monteverdi-venice-1613' },
  { from: 'evt-monteverdi-venice-1613', to: 'evt-vivaldi-venice-1711' },
  { from: 'evt-vivaldi-venice-1711', to: 'evt-bach-leipzig-1723' },
  { from: 'evt-vivaldi-venice-1711', to: 'evt-handel-london-1741' },
  { from: 'evt-bach-leipzig-1723', to: 'evt-handel-london-1741' },

  // ── Classical Period (intra-period) ──
  { from: 'evt-haydn-vienna-1761', to: 'evt-mozart-salzburg-1773' },
  { from: 'evt-mozart-salzburg-1773', to: 'evt-mozart-vienna-1786' },
  { from: 'evt-haydn-vienna-1761', to: 'evt-mozart-vienna-1786' },
  { from: 'evt-haydn-vienna-1761', to: 'evt-beethoven-bonn-1792' },
  { from: 'evt-mozart-vienna-1786', to: 'evt-beethoven-bonn-1792' },
  { from: 'evt-beethoven-bonn-1792', to: 'evt-beethoven-vienna-1808' },

  // ── Early Romantic (intra-period) ──
  { from: 'evt-schubert-vienna-1814', to: 'evt-chopin-paris-1832' },
  { from: 'evt-schubert-vienna-1814', to: 'evt-mendelssohn-leipzig-1843' },
  { from: 'evt-berlioz-paris-1830', to: 'evt-liszt-weimar-1848' },
  { from: 'evt-chopin-paris-1832', to: 'evt-liszt-weimar-1848' },
  { from: 'evt-mendelssohn-leipzig-1843', to: 'evt-liszt-weimar-1848' },

  // ── Late Romantic (intra-period) ──
  { from: 'evt-verdi-milan-1871', to: 'evt-wagner-bayreuth-1876' },
  { from: 'evt-wagner-bayreuth-1876', to: 'evt-brahms-vienna-1876' },
  { from: 'evt-wagner-bayreuth-1876', to: 'evt-tchaikovsky-stpetersburg-1877' },
  { from: 'evt-brahms-vienna-1876', to: 'evt-sibelius-helsinki-1899' },
  { from: 'evt-tchaikovsky-stpetersburg-1877', to: 'evt-sibelius-helsinki-1899' },

  // ── Modernism (intra-period) ──
  { from: 'evt-debussy-paris-1894', to: 'evt-stravinsky-paris-1913' },
  { from: 'evt-debussy-paris-1894', to: 'evt-schoenberg-vienna-1921' },
  { from: 'evt-stravinsky-paris-1913', to: 'evt-schoenberg-vienna-1921' },
  { from: 'evt-schoenberg-vienna-1921', to: 'evt-shostakovich-moscow-1937' },
  { from: 'evt-stravinsky-paris-1913', to: 'evt-shostakovich-moscow-1937' },

  // ── Contemporary (intra-period) ──
  { from: 'evt-cage-nyc-1952', to: 'evt-stockhausen-dusseldorf-1956' },
  { from: 'evt-cage-nyc-1952', to: 'evt-minimalism-nyc-1964' },
  { from: 'evt-stockhausen-dusseldorf-1956', to: 'evt-minimalism-nyc-1964' },
  { from: 'evt-stockhausen-dusseldorf-1956', to: 'evt-part-tallinn-1977' },
  { from: 'evt-minimalism-nyc-1964', to: 'evt-part-tallinn-1977' },

  // ── Cross-Period Bridges ──

  // Medieval → Renaissance
  { from: 'evt-arsnova-paris-1320', to: 'evt-burgundian-brussels-1430' },
  { from: 'evt-troubadour-seville-1200', to: 'evt-burgundian-brussels-1430' },

  // Renaissance → Baroque
  { from: 'evt-palestrina-rome-1565', to: 'evt-opera-florence-1597' },
  { from: 'evt-venetian-venice-1550', to: 'evt-opera-florence-1597' },
  { from: 'evt-venetian-venice-1550', to: 'evt-monteverdi-venice-1613' },
  { from: 'evt-madrigal-london-1588', to: 'evt-handel-london-1741' },

  // Baroque → Classical
  { from: 'evt-bach-leipzig-1723', to: 'evt-haydn-vienna-1761' },
  { from: 'evt-handel-london-1741', to: 'evt-haydn-vienna-1761' },

  // Classical → Early Romantic
  { from: 'evt-beethoven-vienna-1808', to: 'evt-schubert-vienna-1814' },
  { from: 'evt-beethoven-vienna-1808', to: 'evt-berlioz-paris-1830' },
  { from: 'evt-mozart-vienna-1786', to: 'evt-schubert-vienna-1814' },

  // Early Romantic → Late Romantic
  { from: 'evt-liszt-weimar-1848', to: 'evt-wagner-bayreuth-1876' },
  { from: 'evt-berlioz-paris-1830', to: 'evt-wagner-bayreuth-1876' },
  { from: 'evt-mendelssohn-leipzig-1843', to: 'evt-brahms-vienna-1876' },
  { from: 'evt-chopin-paris-1832', to: 'evt-tchaikovsky-stpetersburg-1877' },
  { from: 'evt-liszt-weimar-1848', to: 'evt-verdi-milan-1871' },

  // Late Romantic → Modernism
  { from: 'evt-wagner-bayreuth-1876', to: 'evt-debussy-paris-1894' },
  { from: 'evt-wagner-bayreuth-1876', to: 'evt-schoenberg-vienna-1921' },
  { from: 'evt-brahms-vienna-1876', to: 'evt-schoenberg-vienna-1921' },
  { from: 'evt-tchaikovsky-stpetersburg-1877', to: 'evt-stravinsky-paris-1913' },
  { from: 'evt-sibelius-helsinki-1899', to: 'evt-part-tallinn-1977' },

  // Modernism → Contemporary
  { from: 'evt-schoenberg-vienna-1921', to: 'evt-cage-nyc-1952' },
  { from: 'evt-stravinsky-paris-1913', to: 'evt-minimalism-nyc-1964' },
  { from: 'evt-shostakovich-moscow-1937', to: 'evt-part-tallinn-1977' },
  { from: 'evt-debussy-paris-1894', to: 'evt-cage-nyc-1952' },

  // ── Integration with Existing Classical Events ──
  { from: 'evt-bach-leipzig-1723', to: 'evt-classical-vienna-1700' },
  { from: 'evt-brahms-vienna-1876', to: 'evt-classical-vienna-1900' },
  { from: 'evt-wagner-bayreuth-1876', to: 'evt-classical-vienna-1900' },
  { from: 'evt-debussy-paris-1894', to: 'evt-bartok-budapest-1906' },
  { from: 'evt-chopin-paris-1832', to: 'evt-chopin-warsaw-1927' },
  { from: 'evt-debussy-paris-1894', to: 'evt-philharmonic-montecarlo-1911' },

  // ── Cross-Genre Connections ──

  // Iberian medieval → Flamenco
  { from: 'evt-troubadour-seville-1200', to: 'evt-flamenco-seville-1600' },

  // Gregorian chant → Baltic song festival tradition
  { from: 'evt-gregorian-rome-590', to: 'evt-song-festival-riga-1873' },

  // Italian opera → Neapolitan song
  { from: 'evt-verdi-milan-1871', to: 'evt-neapolitan-naples-1898' },

  // French modernism → Jazz in Paris
  { from: 'evt-debussy-paris-1894', to: 'evt-jazz-age-paris-1925' },
  { from: 'evt-stravinsky-paris-1913', to: 'evt-jazz-age-paris-1925' },

  // Stockhausen → Krautrock/Kraftwerk
  { from: 'evt-stockhausen-dusseldorf-1956', to: 'evt-krautrock-dusseldorf-1974' },
  { from: 'evt-stockhausen-dusseldorf-1956', to: 'evt-electronic-dusseldorf-1979' },

  // Dada → Cage
  { from: 'evt-dada-zurich-1916', to: 'evt-cage-nyc-1952' },

  // Minimalism → electronic crossover
  { from: 'evt-minimalism-nyc-1964', to: 'evt-electronic-dusseldorf-1979' },

  // Part → Bjork (Nordic classical → Icelandic avant-garde)
  { from: 'evt-part-tallinn-1977', to: 'evt-bjork-reykjavik-1993' },

  // Part → Singing Revolution (Estonian identity)
  { from: 'evt-part-tallinn-1977', to: 'evt-singing-revolution-tallinn-1988' },

  // Shostakovich → Plastic People of Prague (art under totalitarianism)
  { from: 'evt-shostakovich-moscow-1937', to: 'evt-plastic-people-prague-1976' },

  // Tchaikovsky → Bollywood (orchestral scoring tradition)
  { from: 'evt-tchaikovsky-stpetersburg-1877', to: 'evt-bollywood-mumbai-1935' },

  // ═══════════════════════════════════════════════════════════════
  // ██  ASIAN & MIDDLE EASTERN TRADITIONAL MUSIC CONNECTIONS  ██
  // ═══════════════════════════════════════════════════════════════

  // ── Southeast Asian (intra-region) ──

  // Khmer-Javanese musical exchange
  { from: 'evt-pinpeat-phnompenh-802', to: 'evt-gamelan-jakarta-900' },
  // Khmer → Thai classical
  { from: 'evt-pinpeat-phnompenh-802', to: 'evt-piphat-bangkok-1350' },
  // Javanese → Thai court ensemble
  { from: 'evt-gamelan-jakarta-900', to: 'evt-piphat-bangkok-1350' },
  // Javanese gamelan → Malay gamelan
  { from: 'evt-gamelan-jakarta-900', to: 'evt-klasik-kualalumpur-1400' },
  // Piphat → Mahori evolution
  { from: 'evt-piphat-bangkok-1350', to: 'evt-mahori-bangkok-1600' },

  // ── Indian Classical (intra-region) ──

  // North-South classical dialogue
  { from: 'evt-hindustani-varanasi-1560', to: 'evt-carnatic-chennai-1800' },
  // Hindustani influence on Odissi revival
  { from: 'evt-hindustani-varanasi-1560', to: 'evt-odissi-mumbai-1952' },
  // Carnatic influence on Odissi revival
  { from: 'evt-carnatic-chennai-1800', to: 'evt-odissi-mumbai-1952' },

  // ── East Asian (intra-region) ──

  // East Asian court music lineage
  { from: 'evt-gagaku-kyoto-794', to: 'evt-jeongak-seoul-1392' },
  // Korean-Chinese court exchange
  { from: 'evt-jeongak-seoul-1392', to: 'evt-yayue-beijing-1420' },
  // East Asian classical continuum
  { from: 'evt-gagaku-kyoto-794', to: 'evt-nanguan-taipei-1600' },
  // Chinese classical → southern chamber music
  { from: 'evt-yayue-beijing-1420', to: 'evt-nanguan-taipei-1600' },
  // Chinese Confucian → Vietnamese court
  { from: 'evt-yayue-beijing-1420', to: 'evt-nhanhac-hue-1802' },
  // South Chinese → Vietnamese classical
  { from: 'evt-nanguan-taipei-1600', to: 'evt-nhanhac-hue-1802' },

  // ── Middle Eastern & Central Asian (intra-region) ──

  // Arabic → Andalusian
  { from: 'evt-arabic-classical-baghdad-800', to: 'evt-andalusi-fez-1492' },
  // Arabic → Persian classical
  { from: 'evt-arabic-classical-baghdad-800', to: 'evt-persian-classical-isfahan-1501' },
  // Arabic → Ottoman
  { from: 'evt-arabic-classical-baghdad-800', to: 'evt-ottoman-istanbul-1700' },
  // Persian → Central Asian Shashmaqam
  { from: 'evt-persian-classical-isfahan-1501', to: 'evt-shashmaqam-bukhara-1600' },
  // Persian → Ottoman
  { from: 'evt-persian-classical-isfahan-1501', to: 'evt-ottoman-istanbul-1700' },

  // ── Cross-Regional Influence Bridges ──

  // Arabic → European troubadour (the Ziryab bridge)
  { from: 'evt-arabic-classical-baghdad-800', to: 'evt-troubadour-seville-1200' },
  // Persian dastgah → Hindustani raga (the Mughal bridge)
  { from: 'evt-persian-classical-isfahan-1501', to: 'evt-hindustani-varanasi-1560' },
  // Islamic music → Malay courts via trade routes
  { from: 'evt-arabic-classical-baghdad-800', to: 'evt-klasik-kualalumpur-1400' },
  // Abbasid maqam theory → Cairo school
  { from: 'evt-arabic-classical-baghdad-800', to: 'evt-maqam-cairo-1870' },
  // Andalusian expulsion → flamenco roots
  { from: 'evt-andalusi-fez-1492', to: 'evt-flamenco-seville-1600' },
  // Gamelan at 1889 Paris Exposition → Debussy
  { from: 'evt-gamelan-jakarta-900', to: 'evt-debussy-paris-1894' },
  // Gamelan → minimalism (Reich/Glass studied gamelan)
  { from: 'evt-gamelan-jakarta-900', to: 'evt-minimalism-nyc-1964' },
  // Historical Shashmaqam → UNESCO inscription
  { from: 'evt-shashmaqam-bukhara-1600', to: 'evt-shashmaqam-tashkent-2003' },
  // East/SE Asian exchange (both received Chinese/Indian inputs)
  { from: 'evt-gagaku-kyoto-794', to: 'evt-gamelan-jakarta-900' },
  // Khmer → Malay via maritime routes
  { from: 'evt-pinpeat-phnompenh-802', to: 'evt-klasik-kualalumpur-1400' },
  // Indian influence on Thai court music
  { from: 'evt-hindustani-varanasi-1560', to: 'evt-mahori-bangkok-1600' },

  // ── Connections to Existing Modern Events (downstream) ──

  // Ancient Khmer → Cambodian rock
  { from: 'evt-pinpeat-phnompenh-802', to: 'evt-khmerrock-phnompenh-1967' },
  // Thai classical → luk thung
  { from: 'evt-piphat-bangkok-1350', to: 'evt-lukthung-bangkok-1964' },
  // Thai chamber → luk thung
  { from: 'evt-mahori-bangkok-1600', to: 'evt-lukthung-bangkok-1964' },
  // Gamelan → dangdut
  { from: 'evt-gamelan-jakarta-900', to: 'evt-dangdut-jakarta-1975' },
  // SE Asian ensemble tradition
  { from: 'evt-gamelan-jakarta-900', to: 'evt-hsaingwaing-yangon-1950' },
  // Malay classical → modern Malay
  { from: 'evt-klasik-kualalumpur-1400', to: 'evt-dikir-kualalumpur-1985' },
  // Hindustani → Bollywood
  { from: 'evt-hindustani-varanasi-1560', to: 'evt-bollywood-mumbai-1935' },
  // Raga tradition → raga rock
  { from: 'evt-hindustani-varanasi-1560', to: 'evt-raga-rock-mumbai-1965' },
  // Hindustani → Ravi Shankar international
  { from: 'evt-hindustani-varanasi-1560', to: 'evt-raga-mumbai-1966' },
  // Shared raga/raag tradition → qawwali
  { from: 'evt-hindustani-varanasi-1560', to: 'evt-qawwali-lahore-1985' },
  // Carnatic → Bollywood film music
  { from: 'evt-carnatic-chennai-1800', to: 'evt-bollywood-mumbai-1935' },
  // Korean court → narrative singing tradition
  { from: 'evt-jeongak-seoul-1392', to: 'evt-pansori-seoul-1800' },
  // Vietnamese court → ca tru heritage
  { from: 'evt-nhanhac-hue-1802', to: 'evt-catru-hanoi-2009' },
  // Persian classical → Persian pop
  { from: 'evt-persian-classical-isfahan-1501', to: 'evt-persian-pop-tehran-1970' },
]

// Build event lookup map once at module scope
const EVENT_MAP = new Map<string, HistoricalEvent>()
for (const event of MUSIC_HISTORY) {
  EVENT_MAP.set(event.id, event)
}

// City name → country color lookup for arc/pill coloring
const CITY_COUNTRY_COLOR_MAP = new Map<string, string>()
for (const city of CITIES) {
  const iso = CITY_COUNTRY_TO_ISO[city.country]
  if (iso) {
    CITY_COUNTRY_COLOR_MAP.set(city.name.toLowerCase(), getCountryColor(iso))
  }
}

export function getEventCountryColor(event: HistoricalEvent): string {
  return CITY_COUNTRY_COLOR_MAP.get(event.location.city.toLowerCase()) ?? '#a1a1aa'
}

export interface EventConnectionInfo {
  event: HistoricalEvent
  direction: 'upstream' | 'downstream'
}

export function getConnectionsForEvent(eventId: string): EventConnectionInfo[] {
  const connections: EventConnectionInfo[] = []
  for (const conn of EVENT_CONNECTIONS) {
    if (conn.to === eventId) {
      const other = EVENT_MAP.get(conn.from)
      if (other) connections.push({ event: other, direction: 'upstream' })
    }
    if (conn.from === eventId) {
      const other = EVENT_MAP.get(conn.to)
      if (other) connections.push({ event: other, direction: 'downstream' })
    }
  }
  return connections.sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === 'upstream' ? -1 : 1
    return a.event.year - b.event.year
  })
}

export interface UpstreamChainNode {
  event: HistoricalEvent
  upstream: UpstreamChainNode[]
}

export function getUpstreamChain(eventId: string, maxDepth = 10): UpstreamChainNode[] {
  const visited = new Set<string>()

  function walk(id: string, depth: number): UpstreamChainNode[] {
    if (depth <= 0) return []
    const nodes: UpstreamChainNode[] = []
    for (const conn of EVENT_CONNECTIONS) {
      if (conn.to === id && !visited.has(conn.from)) {
        const event = EVENT_MAP.get(conn.from)
        if (event) {
          visited.add(conn.from)
          nodes.push({
            event,
            upstream: walk(conn.from, depth - 1),
          })
        }
      }
    }
    return nodes.sort((a, b) => a.event.year - b.event.year)
  }

  visited.add(eventId)
  return walk(eventId, maxDepth)
}

export function getDownstreamChain(eventId: string, maxDepth = 10): UpstreamChainNode[] {
  const visited = new Set<string>()

  function walk(id: string, depth: number): UpstreamChainNode[] {
    if (depth <= 0) return []
    const nodes: UpstreamChainNode[] = []
    for (const conn of EVENT_CONNECTIONS) {
      if (conn.from === id && !visited.has(conn.to)) {
        const event = EVENT_MAP.get(conn.to)
        if (event) {
          visited.add(conn.to)
          nodes.push({
            event,
            upstream: walk(conn.to, depth - 1),
          })
        }
      }
    }
    return nodes.sort((a, b) => a.event.year - b.event.year)
  }

  visited.add(eventId)
  return walk(eventId, maxDepth)
}

export function getArcsForEvent(eventId: string): ArcDatum[] {
  const pinned = EVENT_MAP.get(eventId)
  if (!pinned) return []

  const arcs: ArcDatum[] = []

  for (const conn of EVENT_CONNECTIONS) {
    if (conn.to === eventId) {
      const other = EVENT_MAP.get(conn.from)
      if (other) {
        arcs.push({
          startLat: other.location.lat,
          startLng: other.location.lng,
          endLat: pinned.location.lat,
          endLng: pinned.location.lng,
          label: other.title,
          eventId: other.id,
          direction: 'upstream',
          color: getEventCountryColor(other),
        })
      }
    }

    if (conn.from === eventId) {
      const other = EVENT_MAP.get(conn.to)
      if (other) {
        arcs.push({
          startLat: pinned.location.lat,
          startLng: pinned.location.lng,
          endLat: other.location.lat,
          endLng: other.location.lng,
          label: other.title,
          eventId: other.id,
          direction: 'downstream',
          color: getEventCountryColor(pinned),
        })
      }
    }
  }

  return arcs
}

export function getRecursiveArcsForEvent(eventId: string, maxDepth = 10): ArcDatum[] {
  const arcs: ArcDatum[] = []
  const visited = new Set<string>()

  function walkUp(id: string, depth: number) {
    if (depth <= 0) return
    for (const conn of EVENT_CONNECTIONS) {
      if (conn.to === id && !visited.has(`${conn.from}->${conn.to}`)) {
        const fromEvt = EVENT_MAP.get(conn.from)
        const toEvt = EVENT_MAP.get(conn.to)
        if (fromEvt && toEvt) {
          visited.add(`${conn.from}->${conn.to}`)
          arcs.push({
            startLat: fromEvt.location.lat,
            startLng: fromEvt.location.lng,
            endLat: toEvt.location.lat,
            endLng: toEvt.location.lng,
            label: fromEvt.title,
            eventId: fromEvt.id,
            direction: 'upstream',
            color: getEventCountryColor(fromEvt),
          })
          walkUp(conn.from, depth - 1)
        }
      }
    }
  }

  function walkDown(id: string, depth: number) {
    if (depth <= 0) return
    for (const conn of EVENT_CONNECTIONS) {
      if (conn.from === id && !visited.has(`${conn.from}->${conn.to}`)) {
        const fromEvt = EVENT_MAP.get(conn.from)
        const toEvt = EVENT_MAP.get(conn.to)
        if (fromEvt && toEvt) {
          visited.add(`${conn.from}->${conn.to}`)
          arcs.push({
            startLat: fromEvt.location.lat,
            startLng: fromEvt.location.lng,
            endLat: toEvt.location.lat,
            endLng: toEvt.location.lng,
            label: toEvt.title,
            eventId: toEvt.id,
            direction: 'downstream',
            color: getEventCountryColor(fromEvt),
          })
          walkDown(conn.to, depth - 1)
        }
      }
    }
  }

  walkUp(eventId, maxDepth)
  walkDown(eventId, maxDepth)
  return arcs
}
