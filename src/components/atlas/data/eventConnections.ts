import type { HistoricalEvent } from '@/components/atlas/types';
import { CITIES } from './cities';
import { getCountryColor } from './continentColors';
import { CITY_COUNTRY_TO_ISO } from './flagColors';
import { MUSIC_HISTORY } from './musicHistory';

// Directed pair: `from` influenced `to` (chronological flow)
interface EventConnection {
  from: string; // upstream event ID (the influencer)
  to: string; // downstream event ID (the influenced)
}

export interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  label: string; // connected event's title
  eventId: string; // connected event's ID (for click navigation)
  direction: 'upstream' | 'downstream';
  color: string; // hex color based on "from" event's region
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
  {
    from: 'evt-diaspora-nola-mardi-gras-indians-1885',
    to: 'evt-jazz-origins-nola-1890',
  },
  {
    from: 'evt-diaspora-kingston-kumina-1950',
    to: 'evt-soundsystem-kingston-1956',
  },
  { from: 'evt-diaspora-accra-armstrong-1956', to: 'evt-highlife-accra-1958' },
  { from: 'evt-diaspora-chicago-gospel-1932', to: 'evt-soul-memphis-1962' },
  {
    from: 'evt-diaspora-chicago-gospel-1932',
    to: 'evt-rosettatharpe-littlerock-1950',
  },
  {
    from: 'evt-diaspora-london-lovers-rock-1977',
    to: 'evt-jungle-london-1993',
  },

  // ── Appalachian / Country ──
  {
    from: 'evt-appalachia-bristol-1830',
    to: 'evt-grand-ole-opry-nashville-1925',
  },
  { from: 'evt-appalachia-bristol-1830', to: 'evt-country-bristol-1927' },
  { from: 'evt-country-bristol-1927', to: 'evt-roots-nashville-1972' },

  // ── Spirituals / Gospel / Soul ──
  {
    from: 'evt-spiritual-nashville-1867',
    to: 'evt-diaspora-chicago-gospel-1932',
  },
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
  {
    from: 'evt-diaspora-salvador-bloco-afro-1979',
    to: 'evt-baile-funk-saopaulo-2004',
  },

  // ── Rock Chain ──
  {
    from: 'evt-british-blues-london-1962',
    to: 'evt-merseybeat-liverpool-1963',
  },
  { from: 'evt-british-blues-london-1962', to: 'evt-psychedelia-sf-1967' },
  {
    from: 'evt-british-blues-london-1962',
    to: 'evt-heavy-metal-birmingham-1970',
  },
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
  {
    from: 'evt-krautrock-dusseldorf-1974',
    to: 'evt-electronic-dusseldorf-1979',
  },
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
  {
    from: 'evt-dancehall-kingston-1985',
    to: 'evt-dancehall-digital-kingston-1998',
  },
  { from: 'evt-dancehall-kingston-1985', to: 'evt-jungle-london-1993' },
  {
    from: 'evt-dancehall-kingston-1985',
    to: 'evt-reggaeton-underground-sanjuan-1993',
  },
  {
    from: 'evt-dancehall-digital-kingston-1998',
    to: 'evt-reggaeton-san-juan-2004',
  },
  {
    from: 'evt-dancehall-digital-kingston-1998',
    to: 'evt-dancehall-kingston-2010',
  },

  // ── Reggaeton / Latin Urban ──
  {
    from: 'evt-reggae-espanol-panamacity-1985',
    to: 'evt-reggaeton-underground-sanjuan-1993',
  },
  {
    from: 'evt-reggaeton-underground-sanjuan-1993',
    to: 'evt-reggaeton-san-juan-2004',
  },
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
  {
    from: 'evt-township-jive-johannesburg-1981',
    to: 'evt-amapiano-joburg-2019',
  },

  // ── Desert Blues / Saharan ──
  { from: 'evt-desert-blues-bamako-1980', to: 'evt-desert-blues-bamako-1994' },
  { from: 'evt-desert-blues-bamako-1994', to: 'evt-mdou-moctar-niamey-2019' },

  // ── Gnawa ──
  { from: 'evt-gnawa-marrakech-2000', to: 'evt-gnawa-marrakech-2005' },

  // ── Windrush / UK Caribbean ──
  {
    from: 'evt-windrush-london-1948',
    to: 'evt-diaspora-london-lovers-rock-1977',
  },
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
  {
    from: 'evt-cumbia-barranquilla-1962',
    to: 'evt-cumbia-villera-buenosaires-1990',
  },

  // ── Dominican / Merengue / Bachata ──
  {
    from: 'evt-merengue-santodomingo-1958',
    to: 'evt-bachata-santodomingo-1980',
  },

  // ── K-Pop / Korean ──
  { from: 'evt-kpop-seoul-1996', to: 'evt-gangnam-style-seoul-2012' },
  { from: 'evt-k-hiphop-seoul-1996', to: 'evt-gangnam-style-seoul-2012' },
  { from: 'evt-gangnam-style-seoul-2012', to: 'evt-bts-seoul-2013' },
  { from: 'evt-bts-seoul-2013', to: 'evt-kpop-global-2020' },

  // ── Turkish / Anatolian ──
  {
    from: 'evt-anatolian-rock-istanbul-1972',
    to: 'evt-arabesque-istanbul-1985',
  },

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
  {
    from: 'evt-merengue-santodomingo-1958',
    to: 'evt-bachata-santodomingo-1962',
  },
  {
    from: 'evt-bachata-santodomingo-1962',
    to: 'evt-bachata-santodomingo-1980',
  },
  {
    from: 'evt-diaspora-portofspain-calypso-1914',
    to: 'evt-steelpan-portofspain-1951',
  },
  {
    from: 'evt-diaspora-portofspain-calypso-1914',
    to: 'evt-junkanoo-nassau-1958',
  },
  {
    from: 'evt-diaspora-portofspain-calypso-1914',
    to: 'evt-benna-stjohns-1960',
  },
  {
    from: 'evt-diaspora-portofspain-calypso-1914',
    to: 'evt-calypso-sanjose-1970',
  },
  {
    from: 'evt-steelpan-portofspain-1951',
    to: 'evt-diaspora-portofspain-soca-1973',
  },
  { from: 'evt-steelpan-portofspain-1951', to: 'evt-spouge-bridgetown-1969' },
  { from: 'evt-diaspora-portofspain-soca-1973', to: 'evt-bouyon-roseau-1988' },
  {
    from: 'evt-diaspora-portofspain-soca-1973',
    to: 'evt-sugar-mas-basseterre-1971',
  },
  {
    from: 'evt-diaspora-portofspain-soca-1973',
    to: 'evt-vincy-soca-kingstown-2009',
  },
  { from: 'evt-diaspora-portofspain-soca-1973', to: 'evt-jab-stgeorges-2000' },
  {
    from: 'evt-diaspora-portofspain-soca-1973',
    to: 'evt-dennery-castries-2014',
  },
  { from: 'evt-bouyon-roseau-1988', to: 'evt-dennery-castries-2014' },
  { from: 'evt-vincy-soca-kingstown-2009', to: 'evt-dennery-castries-2014' },
  {
    from: 'evt-spouge-bridgetown-1969',
    to: 'evt-diaspora-portofspain-soca-1973',
  },
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
  {
    from: 'evt-diaspora-portofspain-calypso-1914',
    to: 'evt-kaseko-paramaribo-1970',
  },
  { from: 'evt-kaseko-paramaribo-1970', to: 'evt-chutney-georgetown-1996' },
  {
    from: 'evt-diaspora-portofspain-soca-1973',
    to: 'evt-chutney-georgetown-1996',
  },
  { from: 'evt-dancehall-kingston-1985', to: 'evt-bouyon-roseau-1988' },
  { from: 'evt-kompa-portauprince-1957', to: 'evt-bachata-santodomingo-1962' },
  { from: 'evt-guarania-asuncion-1944', to: 'evt-andean-lapaz-1965' },
  {
    from: 'evt-bad-bunny-sanjuan-2020',
    to: 'evt-latin-streaming-mexicocity-2023',
  },
  {
    from: 'evt-latin-urban-medellin-2017',
    to: 'evt-latin-streaming-mexicocity-2023',
  },
  {
    from: 'evt-rosalia-sanjuan-2018',
    to: 'evt-latin-streaming-mexicocity-2023',
  },
  { from: 'evt-dancehall-digital-kingston-1998', to: 'evt-jab-stgeorges-2000' },
  { from: 'evt-marimba-guatemalacity-1955', to: 'evt-sonnica-managua-1975' },
  {
    from: 'evt-diaspora-salvador-candomble-1830',
    to: 'evt-diaspora-havana-rumba-1886',
  },
  { from: 'evt-diaspora-lima-afro-peruvian-1957', to: 'evt-andean-lapaz-1965' },
  { from: 'evt-junkanoo-nassau-1958', to: 'evt-spouge-bridgetown-1969' },
  { from: 'evt-reggaeton-san-juan-2004', to: 'evt-dennery-castries-2014' },
  {
    from: 'evt-latin-trap-medellin-2005',
    to: 'evt-latin-streaming-mexicocity-2023',
  },

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
  {
    from: 'evt-diaspora-freetown-maroon-1800',
    to: 'evt-palmwine-freetown-1952',
  },
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
  {
    from: 'evt-township-jive-johannesburg-1981',
    to: 'evt-motswako-gaborone-2005',
  },
  {
    from: 'evt-township-jive-johannesburg-1981',
    to: 'evt-shambo-windhoek-2000',
  },
  { from: 'evt-zamrock-lusaka-1974', to: 'evt-shambo-windhoek-2000' },
  {
    from: 'evt-umhlanga-mbabane-1940',
    to: 'evt-township-jive-johannesburg-1981',
  },
  { from: 'evt-umhlanga-mbabane-1940', to: 'evt-famo-maseru-1970' },
  { from: 'evt-famo-maseru-1970', to: 'evt-township-jive-johannesburg-1981' },
  {
    from: 'evt-township-jive-johannesburg-1981',
    to: 'evt-cape-jazz-capetown-1974',
  },
  { from: 'evt-cape-jazz-capetown-1974', to: 'evt-amapiano-joburg-2019' },
  { from: 'evt-soukous-kinshasa-1992', to: 'evt-kuduro-luanda-2000' },
  { from: 'evt-kuduro-luanda-2000', to: 'evt-kuduro-luanda-2005' },
  { from: 'evt-kuduro-luanda-2005', to: 'evt-afrobeats-lagos-2010' },
  {
    from: 'evt-desert-blues-bamako-1980',
    to: 'evt-dimi-mint-abba-nouakchott-1977',
  },
  { from: 'evt-kora-banjul-1970', to: 'evt-morna-praia-1988' },
  { from: 'evt-makossa-douala-1972', to: 'evt-coupe-decale-abidjan-2002' },
  { from: 'evt-highlife-accra-1960', to: 'evt-gangbe-cotonou-2001' },
  {
    from: 'evt-diaspora-dakar-blues-roots-1960',
    to: 'evt-dimi-mint-abba-nouakchott-1977',
  },

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
  {
    from: 'evt-palestinian-hiphop-ramallah-2007',
    to: 'evt-arabic-hiphop-dubai-2017',
  },
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
  {
    from: 'evt-anatolian-rock-istanbul-1972',
    to: 'evt-persian-pop-tehran-1970',
  },
  {
    from: 'evt-throat-singing-kyzyl-1993',
    to: 'evt-throatsinging-ulaanbaatar-1992',
  },

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
  {
    from: 'evt-song-festival-riga-1873',
    to: 'evt-singing-revolution-tallinn-1988',
  },
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
  {
    from: 'evt-electronic-dusseldorf-1979',
    to: 'evt-swedish-pop-stockholm-2012',
  },
  { from: 'evt-electronic-dusseldorf-1979', to: 'evt-ozone-chisinau-2003' },
  { from: 'evt-punk-london-1976', to: 'evt-u2-dublin-1983' },
  { from: 'evt-punk-london-1976', to: 'evt-plastic-people-prague-1976' },
  { from: 'evt-punk-london-1976', to: 'evt-underground-minsk-2000' },
  { from: 'evt-newwave-london-1981', to: 'evt-u2-dublin-1983' },
  { from: 'evt-newwave-london-1981', to: 'evt-bjork-reykjavik-1993' },
  { from: 'evt-black-metal-oslo-1993', to: 'evt-metal-helsinki-2006' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-metal-helsinki-2006' },
  {
    from: 'evt-heavy-metal-birmingham-1970',
    to: 'evt-bijelo-dugme-sarajevo-1974',
  },
  { from: 'evt-bijelo-dugme-sarajevo-1974', to: 'evt-punk-zagreb-1978' },
  { from: 'evt-bijelo-dugme-sarajevo-1974', to: 'evt-turbofolk-belgrade-1990' },
  { from: 'evt-bijelo-dugme-sarajevo-1974', to: 'evt-laibach-ljubljana-1980' },
  { from: 'evt-laibach-ljubljana-1980', to: 'evt-turbofolk-belgrade-1990' },
  { from: 'evt-punk-zagreb-1978', to: 'evt-turbofolk-belgrade-1990' },
  {
    from: 'evt-bulgarian-voices-sofia-1975',
    to: 'evt-iso-polyphony-tirana-2005',
  },
  { from: 'evt-bulgarian-voices-sofia-1975', to: 'evt-roma-brass-skopje-1990' },
  { from: 'evt-bulgarian-voices-sofia-1975', to: 'evt-dakhabrakha-kyiv-2004' },
  { from: 'evt-turbofolk-belgrade-1990', to: 'evt-ozone-chisinau-2003' },
  { from: 'evt-turbofolk-belgrade-1990', to: 'evt-sea-dance-podgorica-2014' },
  { from: 'evt-roma-brass-skopje-1990', to: 'evt-sea-dance-podgorica-2014' },
  {
    from: 'evt-plastic-people-prague-1976',
    to: 'evt-singing-revolution-tallinn-1988',
  },
  { from: 'evt-plastic-people-prague-1976', to: 'evt-underground-minsk-2000' },
  {
    from: 'evt-singing-revolution-tallinn-1988',
    to: 'evt-sutartines-vilnius-2010',
  },
  {
    from: 'evt-singing-revolution-tallinn-1988',
    to: 'evt-underground-minsk-2000',
  },
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
  {
    from: 'evt-minorthreat-washingtondc-1981',
    to: 'evt-hardcore-hartford-1984',
  },
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
  {
    from: 'evt-baltimore-club-baltimore-1993',
    to: 'evt-whamcity-baltimore-2007',
  },
  { from: 'evt-jazz-origins-nola-1890', to: 'evt-meters-neworleans-1969' },
  { from: 'evt-funk-augusta-1970', to: 'evt-meters-neworleans-1969' },
  { from: 'evt-meters-neworleans-1969', to: 'evt-funk-minneapolis-1979' },
  { from: 'evt-soul-memphis-1962', to: 'evt-diaspora-memphis-stax-soul-1967' },
  {
    from: 'evt-southern-soul-memphis-1965',
    to: 'evt-diaspora-memphis-stax-soul-1967',
  },
  { from: 'evt-hiphop-nyc-1979', to: 'evt-diaspora-nyc-hip-hop-africa-1982' },
  {
    from: 'evt-conscious-rap-nyc-1982',
    to: 'evt-diaspora-nyc-hip-hop-africa-1982',
  },
  { from: 'evt-funk-minneapolis-1979', to: 'evt-rhymesayers-minneapolis-2002' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-rhymesayers-minneapolis-2002' },
  {
    from: 'evt-rhymesayers-minneapolis-2002',
    to: 'evt-hiphop-pittsburgh-2010',
  },
  { from: 'evt-hiphop-atlanta-2003', to: 'evt-hiphop-pittsburgh-2010' },
  { from: 'evt-soul-memphis-1962', to: 'evt-gospel-jackson-1965' },
  { from: 'evt-diaspora-chicago-gospel-1932', to: 'evt-gospel-jackson-1965' },
  { from: 'evt-blues-clarksdale-1903', to: 'evt-blues-jackson-1930' },
  { from: 'evt-blues-jackson-1930', to: 'evt-blues-mississippi-1936' },
  { from: 'evt-blues-jackson-1930', to: 'evt-gospel-jackson-1965' },
  {
    from: 'evt-spiritual-nashville-1867',
    to: 'evt-freedomsongs-birmingham-1963',
  },
  { from: 'evt-sunra-birmingham-1914', to: 'evt-freedomsongs-birmingham-1963' },
  { from: 'evt-sunra-birmingham-1914', to: 'evt-bebop-nyc-1945' },
  { from: 'evt-sunra-birmingham-1914', to: 'evt-jazz-la-1942' },
  { from: 'evt-folkfestival-anchorage-1980', to: 'evt-pamyua-anchorage-2010' },
  {
    from: 'evt-ginblossoms-phoenix-1993',
    to: 'evt-jimmyeatworld-phoenix-2001',
  },
  { from: 'evt-pixies-boston-1988', to: 'evt-jimmyeatworld-phoenix-2001' },
  {
    from: 'evt-rosettatharpe-littlerock-1950',
    to: 'evt-rockabilly-littlerock-1955',
  },
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
  {
    from: 'evt-kc-jazz-kansascity-1936',
    to: 'evt-wesmontgomery-indianapolis-1955',
  },
  {
    from: 'evt-wesmontgomery-indianapolis-1955',
    to: 'evt-mellencamp-indianapolis-1982',
  },
  {
    from: 'evt-heavy-metal-birmingham-1970',
    to: 'evt-slipknot-desmoines-1999',
  },
  { from: 'evt-deathmetal-tampa-1990', to: 'evt-slipknot-desmoines-1999' },
  { from: 'evt-slipknot-desmoines-1999', to: 'evt-8035fest-desmoines-2008' },
  { from: 'evt-kc-jazz-kansascity-1936', to: 'evt-jazztouring-wichita-1936' },
  {
    from: 'evt-jazztouring-wichita-1936',
    to: 'evt-embarrassment-wichita-1983',
  },
  { from: 'evt-slint-louisville-1991', to: 'evt-mmj-louisville-2003' },
  {
    from: 'evt-minorthreat-washingtondc-1981',
    to: 'evt-slint-louisville-1991',
  },
  {
    from: 'evt-folktradition-portland-2000',
    to: 'evt-portlandmusic-portland-2012',
  },
  { from: 'evt-folkamericana-missoula-1999', to: 'evt-wilma-missoula-2014' },
  { from: 'evt-roots-nashville-1972', to: 'evt-folkamericana-missoula-1999' },
  { from: 'evt-saddlecreek-omaha-1996', to: 'evt-brighteyes-omaha-2005' },
  { from: 'evt-killrockstars-portland-1991', to: 'evt-saddlecreek-omaha-1996' },
  { from: 'evt-swing-nyc-1935', to: 'evt-ratpack-lasvegas-1960' },
  { from: 'evt-ratpack-lasvegas-1960', to: 'evt-killers-lasvegas-2003' },
  { from: 'evt-newwave-london-1981', to: 'evt-killers-lasvegas-2003' },
  { from: 'evt-hardcore-hartford-1984', to: 'evt-hardcore-manchester-1990' },
  {
    from: 'evt-hardcore-manchester-1990',
    to: 'evt-indiescene-manchester-2010',
  },
  { from: 'evt-powwow-albuquerque-1970', to: 'evt-shins-albuquerque-2001' },
  { from: 'evt-blues-jackson-1930', to: 'evt-piedmontblues-charlotte-1940' },
  { from: 'evt-piedmontblues-charlotte-1940', to: 'evt-dababy-charlotte-2019' },
  { from: 'evt-trap-atlanta-2012', to: 'evt-dababy-charlotte-2019' },
  { from: 'evt-scandinavianfolk-fargo-1990', to: 'evt-indierock-fargo-2008' },
  { from: 'evt-roots-nashville-1972', to: 'evt-tulsasound-tulsa-1972' },
  { from: 'evt-rockabilly-littlerock-1955', to: 'evt-tulsasound-tulsa-1972' },
  { from: 'evt-tulsasound-tulsa-1972', to: 'evt-hanson-tulsa-2007' },
  {
    from: 'evt-lightningbolt-providence-1995',
    to: 'evt-artrock-providence-2002',
  },
  { from: 'evt-punk-london-1976', to: 'evt-lightningbolt-providence-1995' },
  { from: 'evt-charlestondance-charleston-1923', to: 'evt-swing-nyc-1935' },
  {
    from: 'evt-charlestondance-charleston-1923',
    to: 'evt-shovelsrope-charleston-2010',
  },
  { from: 'evt-roots-nashville-1972', to: 'evt-shovelsrope-charleston-2010' },
  {
    from: 'evt-lakotadrums-siouxfalls-1990',
    to: 'evt-indierock-siouxfalls-2010',
  },
  { from: 'evt-punk-london-1976', to: 'evt-theused-saltlakecity-2001' },
  {
    from: 'evt-jimmyeatworld-phoenix-2001',
    to: 'evt-theused-saltlakecity-2001',
  },
  {
    from: 'evt-theused-saltlakecity-2001',
    to: 'evt-neontrees-saltlakecity-2010',
  },
  { from: 'evt-newwave-london-1981', to: 'evt-neontrees-saltlakecity-2010' },
  { from: 'evt-phish-burlington-1983', to: 'evt-folkfestival-burlington-2005' },
  { from: 'evt-psychedelic-sf-1967', to: 'evt-phish-burlington-1983' },
  { from: 'evt-gwar-richmond-1985', to: 'evt-lambofgod-richmond-2004' },
  { from: 'evt-deathmetal-tampa-1990', to: 'evt-lambofgod-richmond-2004' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-gwar-richmond-1985' },
  {
    from: 'evt-appalachia-bristol-1830',
    to: 'evt-oldtimefiddle-charleston-1930',
  },
  {
    from: 'evt-oldtimefiddle-charleston-1930',
    to: 'evt-hazeldickens-charleston-1968',
  },
  { from: 'evt-roots-nashville-1972', to: 'evt-hazeldickens-charleston-1968' },
  {
    from: 'evt-hazeldickens-charleston-1968',
    to: 'evt-folkamericana-missoula-1999',
  },
  {
    from: 'evt-summerfest-milwaukee-1968',
    to: 'evt-violentfemmes-milwaukee-1983',
  },
  { from: 'evt-punk-london-1976', to: 'evt-violentfemmes-milwaukee-1983' },
  {
    from: 'evt-frontierdays-cheyenne-1940',
    to: 'evt-chrisledoux-cheyenne-1997',
  },
  {
    from: 'evt-grand-ole-opry-nashville-1925',
    to: 'evt-frontierdays-cheyenne-1940',
  },
  { from: 'evt-soul-memphis-1962', to: 'evt-dallas-soul-dallas-2015' },
  {
    from: 'evt-diaspora-memphis-stax-soul-1967',
    to: 'evt-dallas-soul-dallas-2015',
  },
  {
    from: 'evt-powwow-albuquerque-1970',
    to: 'evt-folkfestival-anchorage-1980',
  },
  {
    from: 'evt-powwow-albuquerque-1970',
    to: 'evt-lakotadrums-siouxfalls-1990',
  },
  { from: 'evt-edm-miami-2006', to: 'evt-streaming-global-2015' },
  { from: 'evt-trap-atlanta-2012', to: 'evt-streaming-global-2015' },
  { from: 'evt-slint-louisville-1991', to: 'evt-saddlecreek-omaha-1996' },
  { from: 'evt-artrock-providence-2002', to: 'evt-whamcity-baltimore-2007' },
  { from: 'evt-mmj-louisville-2003', to: 'evt-thefray-denver-2005' },
  {
    from: 'evt-folkfestival-anchorage-1980',
    to: 'evt-scandinavianfolk-fargo-1990',
  },
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
  {
    from: 'evt-jonimitchell-saskatoon-1964',
    to: 'evt-sask-jazz-saskatoon-1987',
  },
  { from: 'evt-jonimitchell-saskatoon-1964', to: 'evt-roots-nashville-1972' },
  { from: 'evt-celtic-halifax-1970', to: 'evt-sloan-halifax-1992' },
  { from: 'evt-grunge-seattle-1991', to: 'evt-sloan-halifax-1992' },
  { from: 'evt-sloan-halifax-1992', to: 'evt-eric-trip-moncton-1993' },
  { from: 'evt-celtic-halifax-1970', to: 'evt-acadian-moncton-1994' },
  { from: 'evt-acadian-moncton-1994', to: 'evt-greatbigseea-stjohns-1993' },
  {
    from: 'evt-georgestreet-stjohns-1985',
    to: 'evt-greatbigseea-stjohns-1993',
  },
  { from: 'evt-celtic-halifax-1970', to: 'evt-georgestreet-stjohns-1985' },
  { from: 'evt-celtic-halifax-1970', to: 'evt-ceilidh-charlottetown-1977' },
  {
    from: 'evt-ceilidh-charlottetown-1977',
    to: 'evt-rootsfest-charlottetown-2010',
  },
  { from: 'evt-folkfest-edmonton-1980', to: 'evt-folkfestival-anchorage-1980' },
  { from: 'evt-jazzfest-montreal-1980', to: 'evt-sask-jazz-saskatoon-1987' },
  { from: 'evt-eric-trip-moncton-1993', to: 'evt-indie-brooklyn-2005' },
  { from: 'evt-jazz-nola-1923', to: 'evt-jazztouring-wichita-1936' },
  {
    from: 'evt-embarrassment-wichita-1983',
    to: 'evt-killrockstars-portland-1991',
  },
  { from: 'evt-freedomsongs-birmingham-1963', to: 'evt-gospel-jackson-1965' },
  { from: 'evt-jazz-nola-1923', to: 'evt-jazzfest-montreal-1980' },
  { from: 'evt-indierock-fargo-2008', to: 'evt-indierock-siouxfalls-2010' },
  {
    from: 'evt-folktradition-portland-2000',
    to: 'evt-folkfestival-burlington-2005',
  },
  { from: 'evt-reggae-kingston-1971', to: 'evt-bobmarley-wilmington-1965' },
  {
    from: 'evt-mellencamp-indianapolis-1982',
    to: 'evt-slipknot-desmoines-1999',
  },

  // ── Final remaining events ──
  { from: 'evt-reggae-kingston-1971', to: 'evt-reggae-kingston-1977' },
  { from: 'evt-reggae-kingston-1977', to: 'evt-roots-reggae-kingston-1973' },
  { from: 'evt-balearic-ibiza-1988', to: 'evt-electronic-ibiza-1988' },
  { from: 'evt-electronic-ibiza-1988', to: 'evt-edm-amsterdam-2005' },
  {
    from: 'evt-philly-soul-philadelphia-1972',
    to: 'evt-philly-soul-philadelphia-1974',
  },
  { from: 'evt-philly-soul-philadelphia-1974', to: 'evt-disco-nyc-1977' },
  { from: 'evt-amapiano-joburg-2019', to: 'evt-amapiano-johannesburg-2019' },
  {
    from: 'evt-township-jive-johannesburg-1981',
    to: 'evt-amapiano-johannesburg-2019',
  },

  // ── West Asia ──
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-anatolian-rock-istanbul-1972' },
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-fairuz-beirut-1957' },
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-maqam-baghdad-1932' },
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-oud-damascus-1920' },
  { from: 'evt-ottoman-istanbul-1700', to: 'evt-persian-pop-tehran-1970' },
  { from: 'evt-psychedelia-sf-1967', to: 'evt-anatolian-rock-istanbul-1972' },
  {
    from: 'evt-merseybeat-liverpool-1963',
    to: 'evt-anatolian-rock-istanbul-1972',
  },
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
  {
    from: 'evt-peking-opera-beijing-1790',
    to: 'evt-chinese-rock-beijing-1986',
  },
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
  {
    from: 'evt-tchaikovsky-stpetersburg-1877',
    to: 'evt-sibelius-helsinki-1899',
  },

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
  {
    from: 'evt-tchaikovsky-stpetersburg-1877',
    to: 'evt-stravinsky-paris-1913',
  },
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
  {
    from: 'evt-stockhausen-dusseldorf-1956',
    to: 'evt-krautrock-dusseldorf-1974',
  },
  {
    from: 'evt-stockhausen-dusseldorf-1956',
    to: 'evt-electronic-dusseldorf-1979',
  },

  // Dada → Cage
  { from: 'evt-dada-zurich-1916', to: 'evt-cage-nyc-1952' },

  // Minimalism → electronic crossover
  { from: 'evt-minimalism-nyc-1964', to: 'evt-electronic-dusseldorf-1979' },

  // Part → Bjork (Nordic classical → Icelandic avant-garde)
  { from: 'evt-part-tallinn-1977', to: 'evt-bjork-reykjavik-1993' },

  // Part → Singing Revolution (Estonian identity)
  { from: 'evt-part-tallinn-1977', to: 'evt-singing-revolution-tallinn-1988' },

  // Shostakovich → Plastic People of Prague (art under totalitarianism)
  {
    from: 'evt-shostakovich-moscow-1937',
    to: 'evt-plastic-people-prague-1976',
  },

  // Tchaikovsky → Bollywood (orchestral scoring tradition)
  {
    from: 'evt-tchaikovsky-stpetersburg-1877',
    to: 'evt-bollywood-mumbai-1935',
  },

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
  {
    from: 'evt-arabic-classical-baghdad-800',
    to: 'evt-persian-classical-isfahan-1501',
  },
  // Arabic → Ottoman
  { from: 'evt-arabic-classical-baghdad-800', to: 'evt-ottoman-istanbul-1700' },
  // Persian → Central Asian Shashmaqam
  {
    from: 'evt-persian-classical-isfahan-1501',
    to: 'evt-shashmaqam-bukhara-1600',
  },
  // Persian → Ottoman
  {
    from: 'evt-persian-classical-isfahan-1501',
    to: 'evt-ottoman-istanbul-1700',
  },

  // ── Cross-Regional Influence Bridges ──

  // Arabic → European troubadour (the Ziryab bridge)
  {
    from: 'evt-arabic-classical-baghdad-800',
    to: 'evt-troubadour-seville-1200',
  },
  // Persian dastgah → Hindustani raga (the Mughal bridge)
  {
    from: 'evt-persian-classical-isfahan-1501',
    to: 'evt-hindustani-varanasi-1560',
  },
  // Islamic music → Malay courts via trade routes
  {
    from: 'evt-arabic-classical-baghdad-800',
    to: 'evt-klasik-kualalumpur-1400',
  },
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
  {
    from: 'evt-persian-classical-isfahan-1501',
    to: 'evt-persian-pop-tehran-1970',
  },

  // ═══════════════════════════════════════════════════════════════
  // ██  NEO SOUL CONNECTIONS  ██
  // ═══════════════════════════════════════════════════════════════

  // Existing R&B/Soul → Neo Soul founders
  { from: 'evt-pop-losangeles-1976-steviewonder', to: 'evt-neosoul-richmond-1995-dangelo' },
  { from: 'evt-pop-losangeles-1976-steviewonder', to: 'evt-neosoul-dallas-1997-badu' },
  { from: 'evt-pop-losangeles-1976-steviewonder', to: 'evt-neosoul-southorange-1998-laurynhill' },
  { from: 'evt-motown-detroit-1966', to: 'evt-neosoul-richmond-1995-dangelo' },
  { from: 'evt-southern-soul-memphis-1965', to: 'evt-neosoul-richmond-1995-dangelo' },
  { from: 'evt-funk-augusta-1970', to: 'evt-neosoul-richmond-1995-dangelo' },

  // D'Angelo Brown Sugar → downstream
  { from: 'evt-neosoul-richmond-1995-dangelo', to: 'evt-neosoul-nyc-2000-dangelo' },
  { from: 'evt-neosoul-richmond-1995-dangelo', to: 'evt-neosoul-dallas-1997-badu' },
  { from: 'evt-neosoul-richmond-1995-dangelo', to: 'evt-neosoul-philadelphia-2000-jillscott' },
  { from: 'evt-neosoul-richmond-1995-dangelo', to: 'evt-neosoul-philadelphia-2000-musiq' },
  { from: 'evt-neosoul-richmond-1995-dangelo', to: 'evt-neosoul-atlanta-2001-indiaarie' },

  // Erykah Badu → downstream
  { from: 'evt-neosoul-dallas-1997-badu', to: 'evt-neosoul-houston-2016-solange' },
  { from: 'evt-neosoul-dallas-1997-badu', to: 'evt-neosoul-maplewood-2017-sza' },
  { from: 'evt-neosoul-dallas-1997-badu', to: 'evt-neosoul-vallejo-2017-her' },
  { from: 'evt-neosoul-dallas-1997-badu', to: 'evt-neosoul-atlanta-2019-summerwalker' },

  // Lauryn Hill → downstream
  { from: 'evt-neosoul-southorange-1998-laurynhill', to: 'evt-neosoul-longbeach-2012-frankocean' },
  { from: 'evt-neosoul-southorange-1998-laurynhill', to: 'evt-neosoul-maplewood-2017-sza' },
  { from: 'evt-neosoul-southorange-1998-laurynhill', to: 'evt-neosoul-chicago-2018-noname' },
  { from: 'evt-neosoul-southorange-1998-laurynhill', to: 'evt-neosoul-chicago-2019-jamilawoods' },

  // D'Angelo Voodoo → downstream
  { from: 'evt-neosoul-nyc-2000-dangelo', to: 'evt-neosoul-houston-2012-glasper' },
  { from: 'evt-neosoul-nyc-2000-dangelo', to: 'evt-neosoul-oxnard-2016-andersonpaak' },
  { from: 'evt-neosoul-nyc-2000-dangelo', to: 'evt-neosoul-la-2017-thundercat' },
  { from: 'evt-neosoul-nyc-2000-dangelo', to: 'evt-neosoul-compton-2022-stevelacy' },

  // Robert Glasper → downstream
  { from: 'evt-neosoul-houston-2012-glasper', to: 'evt-neosoul-houston-2013-glasper-experiment' },
  { from: 'evt-neosoul-houston-2012-glasper', to: 'evt-neosoul-la-2021-terracemartin' },
  { from: 'evt-neosoul-houston-2012-glasper', to: 'evt-neosoul-montreal-2016-kaytranada' },
  { from: 'evt-neosoul-houston-2012-glasper', to: 'evt-neosoul-la-2015-theinternet' },

  // Other neo soul chains
  { from: 'evt-neosoul-philadelphia-2000-jillscott', to: 'evt-neosoul-philadelphia-2021-jazminesullivan' },
  { from: 'evt-neosoul-philadelphia-2000-musiq', to: 'evt-neosoul-toronto-2017-danielcaesar' },
  { from: 'evt-neosoul-longbeach-2012-frankocean', to: 'evt-neosoul-longbeach-2020-giveon' },
  { from: 'evt-neosoul-la-2015-theinternet', to: 'evt-neosoul-compton-2022-stevelacy' },
  { from: 'evt-neosoul-london-2017-sampha', to: 'evt-neosoul-london-2018-tommisch' },
  { from: 'evt-neosoul-london-2012-liannalahavas', to: 'evt-neosoul-london-2017-sampha' },

  // ═══════════════════════════════════════════════════════════════
  // ██  JAM BAND CONNECTIONS  ██
  // ═══════════════════════════════════════════════════════════════

  // Grateful Dead → downstream
  { from: 'evt-jamband-paloalto-1965-grateful-dead', to: 'evt-jamband-sf-1970-grateful-dead' },
  { from: 'evt-jamband-paloalto-1965-grateful-dead', to: 'evt-phish-burlington-1983' },
  { from: 'evt-jamband-paloalto-1965-grateful-dead', to: 'evt-jamband-athens-1986-widespread-panic' },
  { from: 'evt-jamband-paloalto-1965-grateful-dead', to: 'evt-jamband-crestedbutte-1993-sci' },
  { from: 'evt-jamband-paloalto-1965-grateful-dead', to: 'evt-jamband-buffalo-1989-moe' },
  { from: 'evt-jamband-paloalto-1965-grateful-dead', to: 'evt-jamband-philadelphia-1995-disco-biscuits' },

  // Allman Brothers → downstream
  { from: 'evt-jamband-macon-1969-allman-brothers', to: 'evt-jamband-nyc-1971-allman-brothers' },
  { from: 'evt-jamband-macon-1969-allman-brothers', to: 'evt-jamband-nyc-1994-govt-mule' },
  { from: 'evt-jamband-macon-1969-allman-brothers', to: 'evt-jamband-jacksonville-1994-derek-trucks' },
  { from: 'evt-jamband-macon-1969-allman-brothers', to: 'evt-jamband-jacksonville-2010-ttb' },
  { from: 'evt-jamband-macon-1969-allman-brothers', to: 'evt-jamband-athens-1986-widespread-panic' },

  // Phish → downstream
  { from: 'evt-phish-burlington-1983', to: 'evt-jamband-burlington-1995-phish' },
  { from: 'evt-phish-burlington-1983', to: 'evt-jamband-nyc-1998-tab' },
  { from: 'evt-phish-burlington-1983', to: 'evt-jamband-southbend-1997-umphreys' },
  { from: 'evt-phish-burlington-1983', to: 'evt-jamband-norwalk-2016-goose' },
  { from: 'evt-phish-burlington-1983', to: 'evt-jamband-castleton-2004-twiddle' },
  { from: 'evt-phish-burlington-1983', to: 'evt-jamband-prescott-2009-spafford' },

  // Lettuce → downstream
  { from: 'evt-jamband-boston-1992-lettuce', to: 'evt-jamband-nyc-2019-vulfpeck' },
  { from: 'evt-jamband-boston-1992-lettuce', to: 'evt-jamband-minneapolis-2017-cory-wong' },
  { from: 'evt-jamband-boston-1992-lettuce', to: 'evt-jamband-utrecht-2014-snarky-puppy' },

  // Other jam band chains
  { from: 'evt-jamband-jacksonville-1994-derek-trucks', to: 'evt-jamband-jacksonville-2010-ttb' },
  { from: 'evt-jamband-nyc-2019-vulfpeck', to: 'evt-jamband-minneapolis-2017-cory-wong' },
  { from: 'evt-jamband-nashville-1988-flecktones', to: 'evt-jamband-lansing-2019-billy-strings' },
  { from: 'evt-jamband-nashville-1988-flecktones', to: 'evt-jamband-kalamazoo-2000-greensky-bluegrass' },
  { from: 'evt-jamband-neworleans-1994-galactic', to: 'evt-jamband-neworleans-2003-dumpstaphunk' },

  // Existing rock/blues → Jam Band founders
  { from: 'evt-psychedelia-sf-1967', to: 'evt-jamband-paloalto-1965-grateful-dead' },
  { from: 'evt-british-blues-london-1962', to: 'evt-jamband-macon-1969-allman-brothers' },
  { from: 'evt-blues-memphis-1951', to: 'evt-jamband-macon-1969-allman-brothers' },

  // ═══════════════════════════════════════════════════════════════
  // ██  POP CONNECTIONS  ██
  // ═══════════════════════════════════════════════════════════════

  // Michael Jackson → downstream
  { from: 'evt-pop-losangeles-1982-michaeljackson', to: 'evt-pop-houston-2016-beyonce' },
  { from: 'evt-pop-losangeles-1982-michaeljackson', to: 'evt-pop-losangeles-2015-justinbieber' },
  { from: 'evt-pop-losangeles-1982-michaeljackson', to: 'evt-pop-losangeles-2012-brunomars' },
  { from: 'evt-pop-losangeles-1982-michaeljackson', to: 'evt-pop-toronto-2020-theweeknd' },

  // Madonna → downstream
  { from: 'evt-pop-nyc-1984-madonna', to: 'evt-pop-nyc-2008-ladygaga' },
  { from: 'evt-pop-nyc-1984-madonna', to: 'evt-pop-nyc-1999-britneyspears' },
  { from: 'evt-pop-nyc-1984-madonna', to: 'evt-pop-nyc-2007-rihanna' },

  // Whitney Houston → downstream
  { from: 'evt-pop-newark-1985-whitneyhouston', to: 'evt-pop-nyc-1990-mariahcarey' },
  { from: 'evt-pop-newark-1985-whitneyhouston', to: 'evt-pop-london-2011-adele' },
  { from: 'evt-pop-newark-1985-whitneyhouston', to: 'evt-pop-losangeles-2019-arianagrande' },

  // Prince → downstream
  { from: 'evt-pop-minneapolis-1984-prince', to: 'evt-pop-toronto-2020-theweeknd' },
  { from: 'evt-pop-minneapolis-1984-prince', to: 'evt-pop-london-2020-dualipa' },
  { from: 'evt-pop-minneapolis-1984-prince', to: 'evt-pop-losangeles-2012-brunomars' },

  // Taylor Swift → Olivia Rodrigo
  { from: 'evt-pop-nashville-2008-taylorswift', to: 'evt-pop-nyc-2014-taylorswift' },
  { from: 'evt-pop-nyc-2014-taylorswift', to: 'evt-pop-losangeles-2021-oliviarodrigo' },

  // Other pop chains
  { from: 'evt-pop-losangeles-1986-janetjackson', to: 'evt-pop-houston-2016-beyonce' },
  { from: 'evt-pop-losangeles-1986-janetjackson', to: 'evt-pop-nyc-1999-britneyspears' },
  { from: 'evt-pop-nyc-1990-mariahcarey', to: 'evt-pop-losangeles-2019-arianagrande' },
  { from: 'evt-pop-london-1996-spicegirls', to: 'evt-pop-london-2020-dualipa' },
  { from: 'evt-pop-london-1973-eltonjohn', to: 'evt-pop-london-2011-edsheeran' },
  { from: 'evt-pop-losangeles-1977-fleetwoodmac', to: 'evt-pop-nashville-2008-taylorswift' },
  { from: 'evt-pop-stockholm-1976-abba', to: 'evt-pop-stockholm-2010-robyn' },
  { from: 'evt-pop-london-1987-georgemichael', to: 'evt-pop-losangeles-2022-harrystyles' },
  { from: 'evt-pop-nyc-2007-rihanna', to: 'evt-pop-london-2020-dualipa' },
  { from: 'evt-pop-nyc-2008-ladygaga', to: 'evt-pop-losangeles-2021-dojacat' },
  { from: 'evt-pop-auckland-2013-lorde', to: 'evt-pop-losangeles-2019-billieeilish' },
  { from: 'evt-pop-miami-2001-shakira', to: 'evt-pop-losangeles-2012-brunomars' },
  { from: 'evt-pop-minneapolis-1984-prince', to: 'evt-pop-minneapolis-2019-lizzo' },

  // Stevie Wonder → pop legacy
  { from: 'evt-pop-losangeles-1976-steviewonder', to: 'evt-pop-losangeles-1982-michaeljackson' },
  { from: 'evt-pop-losangeles-1976-steviewonder', to: 'evt-pop-losangeles-2012-brunomars' },

  // ═══════════════════════════════════════════════════════════════
  // ██  REGGAE CONNECTIONS  ██
  // ═══════════════════════════════════════════════════════════════

  // Bob Marley → downstream
  { from: 'evt-reggae-kingston-1978-marley', to: 'evt-reggae-kingston-1977-tosh' },
  { from: 'evt-reggae-kingston-1978-marley', to: 'evt-reggae-kingston-1972-cliff' },
  { from: 'evt-reggae-kingston-1978-marley', to: 'evt-roots-reggae-kingston-1975-spear' },
  { from: 'evt-reggae-kingston-1978-marley', to: 'evt-reggae-birmingham-1978-steel-pulse' },
  { from: 'evt-reggae-kingston-1978-marley', to: 'evt-reggae-kingston-1977-third-world' },
  { from: 'evt-reggae-kingston-1978-marley', to: 'evt-reggae-kingston-1988-ziggy' },
  { from: 'evt-reggae-kingston-1978-marley', to: 'evt-reggae-kingston-2005-damian' },

  // Dub lineage
  { from: 'evt-dub-kingston-1972-tubby', to: 'evt-dub-kingston-1976-pablo' },
  { from: 'evt-dub-kingston-1972-tubby', to: 'evt-reggae-kingston-1978-marley' },

  // Dancehall lineage
  { from: 'evt-dancehall-kingston-1982-yellowman', to: 'evt-dancehall-kingston-1991-shabba' },
  { from: 'evt-dancehall-kingston-1991-shabba', to: 'evt-dancehall-kingston-2002-sean-paul' },
  { from: 'evt-dancehall-kingston-1991-shabba', to: 'evt-dancehall-kingston-2000-beenie' },

  // Reggae revival
  { from: 'evt-reggae-kingston-2017-chronixx', to: 'evt-reggae-kingston-2018-protoje' },
  { from: 'evt-reggae-kingston-2018-protoje', to: 'evt-reggae-spanish-town-2019-koffee' },
  { from: 'evt-roots-reggae-kingston-1975-spear', to: 'evt-reggae-kingston-2017-chronixx' },

  // Marley family
  { from: 'evt-reggae-kingston-1988-ziggy', to: 'evt-reggae-kingston-2005-damian' },

  // Roots reggae chains
  { from: 'evt-reggae-kingston-1971', to: 'evt-reggae-kingston-1978-marley' },
  { from: 'evt-reggae-kingston-1971', to: 'evt-reggae-kingston-1973-maytals' },
  { from: 'evt-reggae-kingston-1971', to: 'evt-reggae-kingston-1972-cliff' },
  { from: 'evt-roots-reggae-kingston-1973', to: 'evt-roots-reggae-kingston-1975-spear' },
  { from: 'evt-reggae-kingston-1993-inner-circle', to: 'evt-dancehall-nyc-1995-shaggy' },
  { from: 'evt-reggae-kingston-1995-buju', to: 'evt-reggae-kingston-1997-sizzla' },
  { from: 'evt-reggae-kingston-1997-sizzla', to: 'evt-reggae-kingston-2009-tarrus' },

  // ═══════════════════════════════════════════════════════════════
  // ██  AFRICAN CONNECTIONS  ██
  // ═══════════════════════════════════════════════════════════════

  // Ewe drumming lineage
  { from: 'evt-ewe-tradition-volta-1900', to: 'evt-ewe-drums-accra-1965-agbeli' },
  { from: 'evt-ewe-drums-accra-1965-agbeli', to: 'evt-ewe-drums-accra-2005-korku' },

  // Kora / Mande lineage
  { from: 'evt-kora-bamako-1988-toumani', to: 'evt-kora-bamako-2009-sissoko' },
  { from: 'evt-kora-bamako-1988-toumani', to: 'evt-kora-bamako-1999-newancient' },
  { from: 'evt-griot-timbuktu-1500', to: 'evt-kora-bamako-1988-toumani' },

  // Fela Kuti → downstream
  { from: 'evt-afrobeat-lagos-1971', to: 'evt-afrobeat-lagos-2008-seunkuti' },
  { from: 'evt-afrobeat-lagos-1971', to: 'evt-afrobeat-brooklyn-2002-antibalas' },

  // Saharan guitar lineage (Ali Farka Toure → desert guitar)
  { from: 'evt-desert-blues-niafunke-1994-toure', to: 'evt-tuareg-kidal-2004-tinariwen' },
  { from: 'evt-desert-blues-niafunke-1994-toure', to: 'evt-tuareg-agadez-2013-bombino' },
  { from: 'evt-desert-blues-niafunke-1994-toure', to: 'evt-tuareg-agadez-2021-moctar' },
  { from: 'evt-tuareg-kidal-2004-tinariwen', to: 'evt-tuareg-agadez-2013-bombino' },
  { from: 'evt-tuareg-agadez-2013-bombino', to: 'evt-tuareg-agadez-2021-moctar' },

  // Youssou N'Dour → modern Afrobeats / Afropop
  { from: 'evt-mbalax-dakar-1990-ndour', to: 'evt-afrobeats-lagos-2010' },
  { from: 'evt-mbalax-dakar-1990-ndour', to: 'evt-afropop-cotonou-1991-kidjo' },

  // King Sunny Ade → Afrobeats artists
  { from: 'evt-juju-lagos-1982-ade', to: 'evt-afrobeats-lagos-2020-wizkid' },
  { from: 'evt-juju-lagos-1982-ade', to: 'evt-afrobeats-portharcourt-2019-burna' },

  // Highlife → Afrobeats
  { from: 'evt-highlife-accra-1960', to: 'evt-afrobeats-lagos-2010' },
  { from: 'evt-highlife-lagos-1952', to: 'evt-juju-lagos-1982-ade' },

  // Ethiopian jazz lineage
  { from: 'evt-ethiojazz-addis-1969-mulatu', to: 'evt-ethiojazz-addis-1972-getatchew' },
  { from: 'evt-ethiojazz-addis-1969-mulatu', to: 'evt-ethiopian-addis-1975-mahmoud' },
  { from: 'evt-ethiojazz-addis-1969-mulatu', to: 'evt-ethiojazz-addis-2018-hailu' },
  { from: 'evt-ethiojazz-addis-1972-getatchew', to: 'evt-ethiopiques-paris-1997' },

  // South African lineage
  { from: 'evt-jazz-johannesburg-1968-masekela', to: 'evt-crossover-johannesburg-1982-clegg' },
  { from: 'evt-mbaqanga-johannesburg-1964-mahotella', to: 'evt-bubblegum-johannesburg-1983-fassie' },

  // West African pop chains
  { from: 'evt-mande-pop-bamako-1987-keita', to: 'evt-mande-bamako-2011-diawara' },
  { from: 'evt-wassoulou-bamako-1989-sangare', to: 'evt-mande-bamako-2011-diawara' },
  { from: 'evt-afrocuban-dakar-1970-baobab', to: 'evt-mbalax-dakar-1990-ndour' },
  { from: 'evt-afropop-dakar-1989-maal', to: 'evt-mbalax-dakar-1990-ndour' },
  { from: 'evt-afropop-bamako-2004-amadou', to: 'evt-afrofusion-accra-2019' },
  { from: 'evt-highlife-saltpond-2010-ebotaylor', to: 'evt-afrofusion-accra-2019' },

  // Afrobeats modern chains
  { from: 'evt-afrobeats-lagos-2020-wizkid', to: 'evt-afrobeats-lagos-2021-tems' },
  { from: 'evt-afrobeats-portharcourt-2019-burna', to: 'evt-burna-boy-lagos-2020' },
  { from: 'evt-afrobeats-lagos-2019-davido', to: 'evt-afrobeats-lagos-2023' },
  { from: 'evt-afrobeats-lagos-2020-tiwa', to: 'evt-afrobeats-lagos-2023' },
  { from: 'evt-afrosoul-paris-2007-asa', to: 'evt-afrobeats-lagos-2021-tems' },

  // Kenyan / East African
  { from: 'evt-kenyanpop-nairobi-2001-wainaina', to: 'evt-afropop-nairobi-2012-sautisol' },

  // ─── FUNK CONNECTIONS (Phase 2) ────────────────────────────────────

  // James Brown lineage
  { from: 'evt-funk-nyc-1963-james-brown-apollo', to: 'evt-funk-macon-1965-james-brown-papas' },
  { from: 'evt-funk-macon-1965-james-brown-papas', to: 'evt-funk-la-1975-parliament-mothership' },
  { from: 'evt-funk-la-1975-parliament-mothership', to: 'evt-funk-cincinnati-1977-bootsy-collins' },
  { from: 'evt-funk-macon-1965-james-brown-papas', to: 'evt-funk-memphis-1967-bar-kays' },
  { from: 'evt-funk-macon-1965-james-brown-papas', to: 'evt-funk-oakland-1973-tower-of-power' },

  // Sly Stone -> funk bands
  { from: 'evt-funk-sf-1969-sly-stone-stand', to: 'evt-funk-la-1975-earth-wind-fire' },
  { from: 'evt-funk-sf-1969-sly-stone-stand', to: 'evt-funk-dayton-1974-ohio-players' },
  { from: 'evt-funk-sf-1969-sly-stone-stand', to: 'evt-funk-longbeach-1975-war-low-rider' },
  { from: 'evt-funk-sf-1969-sly-stone-stand', to: 'evt-funk-la-1975-parliament-mothership' },

  // The Meters -> New Orleans funk lineage
  { from: 'evt-funk-neworleans-1974-meters-rejuvenation', to: 'evt-jamband-neworleans-1994-galactic' },
  { from: 'evt-funk-neworleans-1974-meters-rejuvenation', to: 'evt-jamband-neworleans-2003-dumpstaphunk' },
  { from: 'evt-meters-neworleans-1969', to: 'evt-funk-neworleans-1974-meters-rejuvenation' },

  // Isley Brothers -> Rick James, Cameo
  { from: 'evt-funk-cincinnati-1969-isley-brothers', to: 'evt-funk-buffalo-1981-rick-james' },
  { from: 'evt-funk-cincinnati-1969-isley-brothers', to: 'evt-funk-nyc-1986-cameo-word-up' },

  // Rufus/Chaka Khan lineage
  { from: 'evt-funk-chicago-1970-rufus-chaka-khan', to: 'evt-funk-chicago-1978-chaka-khan' },

  // Nile Rodgers/Chic -> Disco
  { from: 'evt-funk-nyc-1978-chic-le-freak', to: 'evt-disco-nyc-1977' },

  // George Clinton -> hip hop roots
  { from: 'evt-funk-detroit-1982-george-clinton-solo', to: 'evt-hiphop-nyc-1984' },
  { from: 'evt-funk-la-1975-parliament-mothership', to: 'evt-funk-detroit-1982-george-clinton-solo' },

  // Betty Davis -> Janelle Monáe
  { from: 'evt-funk-pittsburgh-1974-betty-davis', to: 'evt-funk-kansascity-2010-janelle-monae' },

  // Stevie Wonder connections
  { from: 'evt-funk-detroit-1972-stevie-wonder-superstition', to: 'evt-funk-la-1975-earth-wind-fire' },
  { from: 'evt-funk-detroit-1972-stevie-wonder-superstition', to: 'evt-funk-chicago-1978-chaka-khan' },

  // Dayton funk scene connections
  { from: 'evt-funk-dayton-1974-ohio-players', to: 'evt-funk-dayton-1980-zapp-roger' },
  { from: 'evt-funk-dayton-1980-zapp-roger', to: 'evt-funk-dayton-1981-lakeside' },

  // Commodores and misc funk
  { from: 'evt-funk-tuskegee-1974-commodores', to: 'evt-funk-jerseycity-1980-kool-gang' },
  { from: 'evt-funk-tulsa-1982-gap-band', to: 'evt-funk-nyc-1986-cameo-word-up' },

  // ─── BLUES CONNECTIONS (Phase 2) ───────────────────────────────────

  // Delta blues lineage: Patton -> Son House -> Robert Johnson -> Muddy Waters -> Buddy Guy
  { from: 'evt-blues-clarksdale-1929-patton', to: 'evt-blues-rochester-1965' },
  { from: 'evt-blues-rochester-1965', to: 'evt-blues-grafton-1931' },
  { from: 'evt-blues-grafton-1931', to: 'evt-blues-chicago-1958' },
  { from: 'evt-blues-chicago-1958', to: 'evt-blues-chicago-1968-buddy' },

  // Robert Johnson -> Elmore James
  { from: 'evt-blues-grafton-1931', to: 'evt-blues-canton-1951' },

  // Women in blues chain: Memphis Minnie -> Big Mama Thornton -> Koko Taylor
  { from: 'evt-blues-memphis-1929-minnie', to: 'evt-blues-la-1952-thornton' },
  { from: 'evt-blues-la-1952-thornton', to: 'evt-blues-chicago-1966-koko' },

  // Ma Rainey -> Bessie Smith
  { from: 'evt-blues-atlanta-1923-rainey', to: 'evt-blues-nyc-1923-bessie' },

  // Three Kings: B.B. King -> Albert King, Freddie King
  { from: 'evt-blues-chicago-1965-bking', to: 'evt-blues-memphis-1967-albert' },
  { from: 'evt-blues-chicago-1965-bking', to: 'evt-blues-dallas-1961' },

  // Muddy Waters -> Howlin' Wolf, Little Walter
  { from: 'evt-blues-chicago-1958', to: 'evt-blues-chicago-1956-wolf' },
  { from: 'evt-blues-chicago-1958', to: 'evt-blues-chicago-1952-walter' },

  // Lightnin' Hopkins -> John Lee Hooker
  { from: 'evt-blues-houston-1946', to: 'evt-blues-detroit-1948' },

  // Stevie Ray Vaughan -> Gary Clark Jr.
  { from: 'evt-blues-austin-1983', to: 'evt-blues-austin-2012' },

  // Lead Belly -> folk/blues bridge
  { from: 'evt-blues-angola-1933', to: 'evt-blues-rochester-1965' },
  { from: 'evt-blues-angola-1933', to: 'evt-blues-statesboro-1928' },

  // Dr. John -> New Orleans blues/funk
  { from: 'evt-blues-nola-1968', to: 'evt-funk-neworleans-1974-meters-rejuvenation' },
  { from: 'evt-blues-nola-1968', to: 'evt-meters-neworleans-1969' },

  // Delta blues -> Chicago blues bridge
  { from: 'evt-blues-clarksdale-1929-patton', to: 'evt-blues-como-1959' },
  { from: 'evt-blues-como-1959', to: 'evt-blues-hollysprings-1992' },
  { from: 'evt-blues-hollysprings-1992', to: 'evt-blues-hollysprings-1996' },

  // Bonnie Raitt, Taj Mahal, Keb' Mo' modern blues
  { from: 'evt-blues-la-1968-taj', to: 'evt-blues-la-1994-keb' },
  { from: 'evt-blues-burbank-1989', to: 'evt-blues-boston-1998' },
  { from: 'evt-blues-austin-1983', to: 'evt-blues-utica-2000' },

  // Etta James bridge
  { from: 'evt-blues-chicago-1961-etta', to: 'evt-blues-burbank-1989' },

  // ─── LATIN CONNECTIONS (Phase 2) ───────────────────────────────────

  // Tito Puente -> Celia Cruz, Hector Lavoe
  { from: 'evt-tito-puente-nyc-1958', to: 'evt-celia-cruz-havana-1960' },
  { from: 'evt-tito-puente-nyc-1958', to: 'evt-hector-lavoe-nyc-1975' },

  // Hector Lavoe -> Ruben Blades -> Marc Anthony
  { from: 'evt-hector-lavoe-nyc-1975', to: 'evt-ruben-blades-siembra-1978' },
  { from: 'evt-ruben-blades-siembra-1978', to: 'evt-marc-anthony-nyc-1999' },

  // Violeta Parra -> Mercedes Sosa (nueva cancion)
  { from: 'evt-violeta-parra-santiago-1966', to: 'evt-mercedes-sosa-tucuman-1971' },

  // Joao Gilberto -> bossa nova -> Jorge Ben
  { from: 'evt-joao-gilberto-bossanova-1958', to: 'evt-bossanova-rio-1962' },
  { from: 'evt-joao-gilberto-bossanova-1958', to: 'evt-jorge-ben-jor-rio-1963' },
  { from: 'evt-jorge-ben-jor-rio-1963', to: 'evt-tropicalia-sao-paulo-1968' },

  // Cafe Tacvba -> Natalia Lafourcade
  { from: 'evt-cafe-tacvba-re-1994', to: 'evt-natalia-lafourcade-musas-2017' },

  // Soda Stereo -> Latin rock lineage
  { from: 'evt-soda-stereo-buenosaires-1984', to: 'evt-fabulosos-cadillacs-buenosaires-1986' },
  { from: 'evt-soda-stereo-buenosaires-1984', to: 'evt-aterciopelados-bogota-1990' },
  { from: 'evt-soda-stereo-buenosaires-1984', to: 'evt-cafe-tacvba-re-1994' },

  // Reggaeton pioneers -> modern
  { from: 'evt-reggaeton-underground-sanjuan-1993', to: 'evt-reggaeton-san-juan-2004' },
  { from: 'evt-reggaeton-san-juan-2004', to: 'evt-bad-bunny-sanjuan-2020' },
  { from: 'evt-reggaeton-san-juan-2004', to: 'evt-jbalvin-energia-2016' },
  { from: 'evt-reggaeton-san-juan-2004', to: 'evt-ozuna-aura-2018' },
  { from: 'evt-bad-bunny-sanjuan-2020', to: 'evt-bad-bunny-verano-2022' },

  // Ivy Queen, Tego Calderon -> reggaeton pioneers -> modern
  { from: 'evt-ivy-queen-anasco-2003', to: 'evt-reggaeton-san-juan-2004' },
  { from: 'evt-tego-calderon-santurce-2003', to: 'evt-reggaeton-san-juan-2004' },
  { from: 'evt-tego-calderon-santurce-2003', to: 'evt-calle13-sanjuan-2005' },

  // Selena -> Shakira crossover
  { from: 'evt-selena-amor-prohibido-1994', to: 'evt-shakira-laundry-2001' },

  // Cuban son/salsa -> new entries
  { from: 'evt-son-havana-1930', to: 'evt-son-montuno-havana-1940' },
  { from: 'evt-son-montuno-havana-1940', to: 'evt-mambo-havana-1948' },
  { from: 'evt-mambo-havana-1948', to: 'evt-palladium-nyc-1954' },
  { from: 'evt-palladium-nyc-1954', to: 'evt-tito-puente-nyc-1958' },
  { from: 'evt-chacha-havana-1953', to: 'evt-pachanga-nyc-1961' },
  { from: 'evt-fania-nyc-1971', to: 'evt-hector-lavoe-nyc-1975' },
  { from: 'evt-fania-nyc-1971', to: 'evt-salsa-nyc-1973' },
  { from: 'evt-salsa-romantica-nyc-1987', to: 'evt-marc-anthony-nyc-1999' },
  { from: 'evt-danzon-havana-1879', to: 'evt-son-havana-1930' },
  { from: 'evt-contradanza-havana-1800', to: 'evt-danzon-havana-1879' },

  // Mon Laferte, Bomba Estereo, Juanes, Karol G
  { from: 'evt-mon-laferte-vina-2015', to: 'evt-natalia-lafourcade-musas-2017' },
  { from: 'evt-juanes-fijate-bien-2000', to: 'evt-bomba-estereo-bogota-2015' },
  { from: 'evt-jbalvin-energia-2016', to: 'evt-karol-g-manana-2023' },

  // Santana bridge
  { from: 'evt-santana-abraxas-1970', to: 'evt-cafe-tacvba-re-1994' },

  // Cumbia lineage
  { from: 'evt-cumbia-barranquilla-1962', to: 'evt-sonidero-mexicocity-1975' },
  { from: 'evt-cumbia-barranquilla-1962', to: 'evt-cumbia-villera-buenosaires-1990' },

  // Merengue -> NYC
  { from: 'evt-merengue-santodomingo-1958', to: 'evt-merengue-nyc-1985' },

  // Buena Vista revival
  { from: 'evt-son-havana-1930', to: 'evt-buena-vista-havana-1996' },

  // ═══════════════════════════════════════════════════════════════════
  // ██  PHASE 3 — Jazz Influence Connections                        ██
  // ═══════════════════════════════════════════════════════════════════

  // ── Early Jazz Lineage (Congo Square -> New Orleans -> Chicago) ──
  { from: 'evt-jazz-congo-square-nola-1819', to: 'evt-jazz-jelly-roll-morton-chicago-1926' },
  { from: 'evt-jazz-jelly-roll-morton-chicago-1926', to: 'evt-jazz-armstrong-hotfive-chicago-1925' },
  { from: 'evt-jazz-armstrong-hotfive-chicago-1925', to: 'evt-jazz-ellington-cotton-club-1927' },

  // ── Louis Armstrong & Lil' Hardin (collaborators) ──
  { from: 'evt-jazz-armstrong-hotfive-chicago-1925', to: 'evt-jazz-lil-hardin-chicago-1925' },

  // ── Ellington Branching ──
  { from: 'evt-jazz-ellington-cotton-club-1927', to: 'evt-jazz-mary-lou-williams-nyc-1945' },
  { from: 'evt-jazz-ellington-cotton-club-1927', to: 'evt-jazz-art-blakey-messengers-nyc-1955' },

  // ── Bebop Revolution (Parker -> Gillespie, Monk -> Miles) ──
  { from: 'evt-jazz-parker-savoy-nyc-1945', to: 'evt-jazz-monk-brilliant-corners-nyc-1956' },
  { from: 'evt-jazz-monk-brilliant-corners-nyc-1956', to: 'evt-jazz-miles-kind-of-blue-nyc-1959' },
  { from: 'evt-jazz-parker-savoy-nyc-1945', to: 'evt-jazz-miles-kind-of-blue-nyc-1959' },

  // ── Kind of Blue Radiations ──
  { from: 'evt-jazz-miles-kind-of-blue-nyc-1959', to: 'evt-jazz-bill-evans-vanguard-1961' },
  { from: 'evt-jazz-miles-kind-of-blue-nyc-1959', to: 'evt-jazz-coltrane-love-supreme-1965' },
  { from: 'evt-jazz-miles-kind-of-blue-nyc-1959', to: 'evt-jazz-wayne-shorter-speak-no-evil-1966' },

  // ── Bitches Brew Radiations ──
  { from: 'evt-jazz-miles-bitches-brew-1970', to: 'evt-jazz-herbie-hancock-headhunters-la-1973' },
  { from: 'evt-jazz-miles-bitches-brew-1970', to: 'evt-jazz-chick-corea-return-to-forever-1972' },
  { from: 'evt-jazz-miles-bitches-brew-1970', to: 'evt-jazz-weather-report-heavy-weather-la-1977' },

  // ── Miles: Kind of Blue -> Bitches Brew ──
  { from: 'evt-jazz-miles-kind-of-blue-nyc-1959', to: 'evt-jazz-miles-bitches-brew-1970' },

  // ── Coltrane Branching ──
  { from: 'evt-jazz-coltrane-love-supreme-1965', to: 'evt-jazz-mccoy-tyner-real-mccoy-1967' },
  { from: 'evt-jazz-coltrane-love-supreme-1965', to: 'evt-jazz-ornette-coleman-shape-nyc-1959' },

  // ── Vocal Jazz Lineage (Holiday -> Vaughan -> Simone -> Spalding) ──
  { from: 'evt-jazz-billie-holiday-nyc-1939', to: 'evt-jazz-sarah-vaughan-clifford-brown-1954' },
  { from: 'evt-jazz-sarah-vaughan-clifford-brown-1954', to: 'evt-jazz-nina-simone-mississippi-goddam-1964' },
  { from: 'evt-jazz-nina-simone-mississippi-goddam-1964', to: 'evt-jazz-esperanza-spalding-portland-2016' },

  // ── Women Arrangers/Composers Lineage ──
  { from: 'evt-jazz-melba-liston-nyc-1958', to: 'evt-jazz-carla-bley-escalator-nyc-1971' },
  { from: 'evt-jazz-carla-bley-escalator-nyc-1971', to: 'evt-jazz-maria-schneider-concert-garden-nyc-2004' },
  { from: 'evt-jazz-maria-schneider-concert-garden-nyc-2004', to: 'evt-jazz-artemis-nyc-2017' },

  // ── Art Blakey -> Wynton Marsalis ──
  { from: 'evt-jazz-art-blakey-messengers-nyc-1955', to: 'evt-jazz-wynton-marsalis-black-codes-1985' },

  // ── Kamasi Washington Connections ──
  { from: 'evt-jazz-coltrane-love-supreme-1965', to: 'evt-jazz-kamasi-washington-the-epic-la-2015' },
  { from: 'evt-jazz-kamasi-washington-the-epic-la-2015', to: 'evt-jazz-artemis-nyc-2017' },

  // ── Ahmad Jamal -> Modern Jazz ──
  { from: 'evt-jazz-ahmad-jamal-chicago-1958', to: 'evt-jazz-miles-kind-of-blue-nyc-1959' },
  { from: 'evt-jazz-ahmad-jamal-chicago-1958', to: 'evt-jazz-brad-mehldau-largo-la-2002' },

  // ── Wes Montgomery Connections ──
  { from: 'evt-jazz-wes-montgomery-indianapolis-1960', to: 'evt-jazz-pat-metheny-bright-size-life-1976' },

  // ── Sun Ra -> Kamasi (spiritual jazz lineage) ──
  { from: 'evt-jazz-sunra-arkestra-chicago-1956', to: 'evt-jazz-kamasi-washington-the-epic-la-2015' },

  // ── Mingus -> Carla Bley ──
  { from: 'evt-jazz-mingus-ah-um-nyc-1959', to: 'evt-jazz-carla-bley-escalator-nyc-1971' },

  // ── Terri Lyne Carrington (modern hub) ──
  { from: 'evt-jazz-art-blakey-messengers-nyc-1955', to: 'evt-jazz-terri-lyne-carrington-boston-2011' },
  { from: 'evt-jazz-terri-lyne-carrington-boston-2011', to: 'evt-jazz-esperanza-spalding-portland-2016' },

  // ═══════════════════════════════════════════════════════════════════
  // ██  PHASE 3 — Rock Influence Connections                        ██
  // ═══════════════════════════════════════════════════════════════════

  // ── Sister Rosetta Tharpe -> Rock Origins ──
  { from: 'evt-sister-rosetta-tharpe-nyc-1945', to: 'evt-elvis-memphis-1954' },
  { from: 'evt-sister-rosetta-tharpe-nyc-1945', to: 'evt-chuck-berry-stlouis-1955' },

  // ── Tina Turner -> Female Rock Lineage ──
  { from: 'evt-tina-turner-la-1966', to: 'evt-janis-joplin-sf-1967' },
  { from: 'evt-tina-turner-la-1966', to: 'evt-heart-seattle-1976' },

  // ── Janis Joplin -> Heart, Patti Smith ──
  { from: 'evt-janis-joplin-sf-1967', to: 'evt-heart-seattle-1976' },
  { from: 'evt-janis-joplin-sf-1967', to: 'evt-patti-smith-nyc-1975' },

  // ── Carole King / Carole Kaye (Session Musician Era) ──
  { from: 'evt-carole-kaye-la-1963', to: 'evt-carole-king-la-1971' },

  // ── Led Zeppelin -> Metallica, Tool ──
  { from: 'evt-led-zeppelin-london-1971', to: 'evt-metallica-sf-1986' },
  { from: 'evt-led-zeppelin-london-1971', to: 'evt-tool-la-2001' },

  // ── Pink Floyd -> Radiohead (no Radiohead event), Tame Impala ──
  { from: 'evt-pink-floyd-london-1973', to: 'evt-tame-impala-perth-2015' },

  // ── Punk Lineage (Clash -> Bikini Kill -> Sleater-Kinney) ──
  { from: 'evt-clash-london-1979', to: 'evt-bikini-kill-olympia-1990' },
  { from: 'evt-bikini-kill-olympia-1990', to: 'evt-sleater-kinney-olympia-1997' },

  // ── Talking Heads -> Sonic Youth -> My Bloody Valentine ──
  { from: 'evt-talking-heads-nyc-1980', to: 'evt-sonic-youth-nyc-1988' },
  { from: 'evt-sonic-youth-nyc-1988', to: 'evt-my-bloody-valentine-london-1991' },

  // ── Pearl Jam -> Foo Fighters; Soundgarden ──
  { from: 'evt-pearl-jam-seattle-1991', to: 'evt-foo-fighters-seattle-1995' },
  { from: 'evt-soundgarden-seattle-1994', to: 'evt-foo-fighters-seattle-1995' },

  // ── Joan Jett -> Hole, Paramore ──
  { from: 'evt-joan-jett-nyc-1981', to: 'evt-hole-la-1994' },
  { from: 'evt-joan-jett-nyc-1981', to: 'evt-paramore-franklin-2007' },

  // ── Blondie -> Yeah Yeah Yeahs ──
  { from: 'evt-blondie-nyc-1978', to: 'evt-yeah-yeah-yeahs-nyc-2003' },

  // ── PJ Harvey, Alanis Morissette Connections ──
  { from: 'evt-pj-harvey-london-1993', to: 'evt-st-vincent-nyc-2011' },
  { from: 'evt-alanis-morissette-la-1995', to: 'evt-paramore-franklin-2007' },

  // ── Patti Smith -> Sonic Youth ──
  { from: 'evt-patti-smith-nyc-1975', to: 'evt-sonic-youth-nyc-1988' },

  // ── Strokes -> Arctic Monkeys; White Stripes ──
  { from: 'evt-strokes-nyc-2001', to: 'evt-arctic-monkeys-sheffield-2006' },
  { from: 'evt-white-stripes-detroit-2003', to: 'evt-arctic-monkeys-sheffield-2006' },

  // ── Hole -> Garbage ──
  { from: 'evt-hole-la-1994', to: 'evt-garbage-madison-1995' },

  // ── Heavy Metal -> Metallica ──
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-led-zeppelin-london-1971' },
  { from: 'evt-heavy-metal-birmingham-1970', to: 'evt-metallica-sf-1986' },

  // ── Queen -> RHCP (showmanship lineage) ──
  { from: 'evt-queen-london-1975', to: 'evt-rhcp-la-1991' },

  // ── Rage Against the Machine -> Tool ──
  { from: 'evt-rage-la-1992', to: 'evt-tool-la-2001' },

  // ── Stevie Nicks connections ──
  { from: 'evt-stevie-nicks-la-1975', to: 'evt-st-vincent-nyc-2011' },

  // ── Pretenders -> Sleater-Kinney ──
  { from: 'evt-pretenders-london-1980', to: 'evt-sleater-kinney-olympia-1997' },

  // ═══════════════════════════════════════════════════════════════════
  // ██  PHASE 3 — Folk Influence Connections                        ██
  // ═══════════════════════════════════════════════════════════════════

  // ── Woody Guthrie -> Pete Seeger -> Bob Dylan -> Joni Mitchell ──
  { from: 'evt-woody-guthrie-this-land-nyc-1940', to: 'evt-pete-seeger-overcome-nyc-1963' },
  { from: 'evt-pete-seeger-overcome-nyc-1963', to: 'evt-bob-dylan-freewheelin-nyc-1963' },
  { from: 'evt-bob-dylan-freewheelin-nyc-1963', to: 'evt-joni-mitchell-blue-la-1971' },

  // ── Odetta -> Joan Baez -> Tracy Chapman -> Indigo Girls -> Ani DiFranco ──
  { from: 'evt-odetta-folk-revival-sf-1956', to: 'evt-joan-baez-newport-1959' },
  { from: 'evt-joan-baez-newport-1959', to: 'evt-tracy-chapman-debut-boston-1988' },
  { from: 'evt-tracy-chapman-debut-boston-1988', to: 'evt-indigo-girls-decatur-1989' },
  { from: 'evt-indigo-girls-decatur-1989', to: 'evt-ani-difranco-righteous-babe-buffalo-1990' },

  // ── Bob Dylan -> Simon & Garfunkel, Phil Ochs, Arlo Guthrie ──
  { from: 'evt-bob-dylan-freewheelin-nyc-1963', to: 'evt-simon-garfunkel-bridge-nyc-1970' },
  { from: 'evt-bob-dylan-freewheelin-nyc-1963', to: 'evt-phil-ochs-protest-nyc-1964' },
  { from: 'evt-bob-dylan-freewheelin-nyc-1963', to: 'evt-arlo-guthrie-alice-nyc-1967' },

  // ── Nick Drake -> Bon Iver, Fleet Foxes, Sufjan Stevens ──
  { from: 'evt-nick-drake-pink-moon-london-1972', to: 'evt-bon-iver-emma-eau-claire-2008' },
  { from: 'evt-nick-drake-pink-moon-london-1972', to: 'evt-fleet-foxes-debut-seattle-2008' },
  { from: 'evt-nick-drake-pink-moon-london-1972', to: 'evt-sufjan-stevens-illinois-brooklyn-2005' },

  // ── Emmylou Harris -> Lucinda Williams -> Gillian Welch -> Jason Isbell ──
  { from: 'evt-emmylou-harris-wrecking-ball-nashville-1995', to: 'evt-lucinda-williams-car-wheels-nashville-1998' },
  { from: 'evt-lucinda-williams-car-wheels-nashville-1998', to: 'evt-gillian-welch-revival-nashville-1996' },
  { from: 'evt-gillian-welch-revival-nashville-1996', to: 'evt-jason-isbell-southeastern-nashville-2013' },

  // ── Elizabeth Cotten -> Folk Guitar Tradition ──
  { from: 'evt-elizabeth-cotten-freight-train-dc-1958', to: 'evt-bob-dylan-freewheelin-nyc-1963' },
  { from: 'evt-elizabeth-cotten-freight-train-dc-1958', to: 'evt-joan-baez-newport-1959' },

  // ── John Prine -> Phoebe Bridgers, Brandi Carlile ──
  { from: 'evt-john-prine-debut-chicago-1971', to: 'evt-phoebe-bridgers-punisher-la-2020' },
  { from: 'evt-john-prine-debut-chicago-1971', to: 'evt-brandi-carlile-forgive-you-seattle-2018' },

  // ── Townes Van Zandt -> Lucinda Williams ──
  { from: 'evt-townes-van-zandt-houston-1968', to: 'evt-lucinda-williams-car-wheels-nashville-1998' },

  // ── Buffy Sainte-Marie Connections ──
  { from: 'evt-buffy-sainte-marie-soldier-nyc-1964', to: 'evt-joni-mitchell-blue-la-1971' },
  { from: 'evt-buffy-sainte-marie-soldier-nyc-1964', to: 'evt-tracy-chapman-debut-boston-1988' },

  // ── Woody Guthrie -> Arlo Guthrie (family lineage) ──
  { from: 'evt-woody-guthrie-this-land-nyc-1940', to: 'evt-arlo-guthrie-alice-nyc-1967' },

  // ── Iron & Wine, Richie Havens connections ──
  { from: 'evt-richie-havens-woodstock-1969', to: 'evt-tracy-chapman-debut-boston-1988' },
  { from: 'evt-bon-iver-emma-eau-claire-2008', to: 'evt-phoebe-bridgers-punisher-la-2020' },

  // ═══════════════════════════════════════════════════════════════════
  // ██  PHASE 3 — Hip Hop Influence Connections                     ██
  // ═══════════════════════════════════════════════════════════════════

  // ── Public Enemy -> Nas, Wu-Tang, A Tribe Called Quest ──
  { from: 'evt-hiphop-longisland-1988-publicenemy', to: 'evt-hiphop-queens-1994-nas' },
  { from: 'evt-hiphop-longisland-1988-publicenemy', to: 'evt-hiphop-statenisland-1993-wutang' },
  { from: 'evt-hiphop-longisland-1988-publicenemy', to: 'evt-hiphop-queens-1991-tribecalledquest' },

  // ── A Tribe Called Quest -> Gang Starr -> Black Star ──
  { from: 'evt-hiphop-queens-1991-tribecalledquest', to: 'evt-hiphop-brooklyn-1991-gangstarr' },
  { from: 'evt-hiphop-brooklyn-1991-gangstarr', to: 'evt-hiphop-brooklyn-1998-blackstar' },

  // ── Nas -> Jay-Z (rivalry/influence) ──
  { from: 'evt-hiphop-queens-1994-nas', to: 'evt-hiphop-brooklyn-1996-jayz' },

  // ── OutKast -> Kanye West -> Kendrick Lamar -> J. Cole ──
  { from: 'evt-hiphop-atlanta-1998-outkast', to: 'evt-hiphop-chicago-2004-kanyewest' },
  { from: 'evt-hiphop-chicago-2004-kanyewest', to: 'evt-hiphop-compton-2012-kendricklamar' },
  { from: 'evt-hiphop-compton-2012-kendricklamar', to: 'evt-hiphop-fayetteville-2014-jcole' },

  // ── Jay-Z -> Kanye West -> Drake, Travis Scott ──
  { from: 'evt-hiphop-brooklyn-1996-jayz', to: 'evt-hiphop-chicago-2004-kanyewest' },
  { from: 'evt-hiphop-chicago-2004-kanyewest', to: 'evt-hiphop-toronto-2011-drake' },
  { from: 'evt-hiphop-chicago-2004-kanyewest', to: 'evt-hiphop-houston-2018-travisscott' },

  // ── Lil Wayne -> Nicki Minaj, Drake ──
  { from: 'evt-hiphop-neworleans-2008-lilwayne', to: 'evt-hiphop-nyc-2010-nickiminaj' },
  { from: 'evt-hiphop-neworleans-2008-lilwayne', to: 'evt-hiphop-toronto-2011-drake' },

  // ── Missy Elliott -> Cardi B, Megan Thee Stallion, Doechii ──
  { from: 'evt-hiphop-portsmouth-1997-missyelliott', to: 'evt-hiphop-bronx-2018-cardib' },
  { from: 'evt-hiphop-portsmouth-1997-missyelliott', to: 'evt-hiphop-houston-2020-megtheestallion' },
  { from: 'evt-hiphop-portsmouth-1997-missyelliott', to: 'evt-hiphop-tampa-2024-doechii' },

  // ── Queen Latifah -> Eve -> Nicki Minaj -> Cardi B (female MC lineage) ──
  { from: 'evt-queenlatifah-newark-1989', to: 'evt-hiphop-philly-1999-eve' },
  { from: 'evt-hiphop-philly-1999-eve', to: 'evt-hiphop-nyc-2010-nickiminaj' },
  { from: 'evt-hiphop-nyc-2010-nickiminaj', to: 'evt-hiphop-bronx-2018-cardib' },

  // ── Lil' Kim -> Nicki Minaj ──
  { from: 'evt-hiphop-brooklyn-1996-lilkim', to: 'evt-hiphop-nyc-2010-nickiminaj' },

  // ── Wu-Tang -> MF DOOM ──
  { from: 'evt-hiphop-statenisland-1993-wutang', to: 'evt-hiphop-la-2004-mfdoom' },

  // ── The Roots -> Common, Chance the Rapper ──
  { from: 'evt-hiphop-philly-1999-theroots', to: 'evt-hiphop-chicago-2000-common' },
  { from: 'evt-hiphop-philly-1999-theroots', to: 'evt-hiphop-chicago-2016-chancetherapper' },

  // ── Big Pun -> Fat Joe; Cypress Hill connections ──
  { from: 'evt-hiphop-bronx-1998-bigpun', to: 'evt-hiphop-bronx-1998-fatjoe' },
  { from: 'evt-hiphop-la-1991-cypresshill', to: 'evt-hiphop-bronx-1998-bigpun' },

  // ── Rapsody, Little Simz, Tierra Whack connections ──
  { from: 'evt-hiphop-raleigh-2017-rapsody', to: 'evt-hiphop-compton-2012-kendricklamar' },
  { from: 'evt-hiphop-queens-1994-nas', to: 'evt-hiphop-raleigh-2017-rapsody' },
  { from: 'evt-hiphop-london-2021-littlesimz', to: 'evt-hiphop-raleigh-2017-rapsody' },
  { from: 'evt-hiphop-portsmouth-1997-missyelliott', to: 'evt-hiphop-philly-2018-tierrawhack' },

  // ── Conscious rap -> Tribe, Common ──
  { from: 'evt-conscious-rap-nyc-1982', to: 'evt-hiphop-queens-1991-tribecalledquest' },
  { from: 'evt-conscious-rap-nyc-1982', to: 'evt-hiphop-longisland-1988-publicenemy' },

  // ── OutKast -> Atlanta trap lineage ──
  { from: 'evt-hiphop-atlanta-1998-outkast', to: 'evt-hiphop-atlanta-2003' },

  // ── Eminem connections ──
  { from: 'evt-hiphop-brooklyn-1996-jayz', to: 'evt-hiphop-detroit-2000-eminem' },

  // ── Tyler the Creator connections ──
  { from: 'evt-hiphop-la-2004-mfdoom', to: 'evt-hiphop-la-2019-tylerthecreator' },
  { from: 'evt-hiphop-compton-2012-kendricklamar', to: 'evt-hiphop-la-2019-tylerthecreator' },

  // ══════════════════════════════════════════════════════════════════
  // ── Music for Media ──
  // ══════════════════════════════════════════════════════════════════

  // ── Opera -> Musical Theater -> Film chain ──
  { from: 'evt-media-mantua-1607-orfeo', to: 'evt-media-vienna-1786-figaro' },
  { from: 'evt-media-vienna-1786-figaro', to: 'evt-media-venice-1853-traviata' },
  { from: 'evt-media-venice-1853-traviata', to: 'evt-media-turin-1896-boheme' },
  { from: 'evt-media-turin-1896-boheme', to: 'evt-media-nyc-1996-rent' },
  { from: 'evt-media-london-1878-savoy', to: 'evt-media-nyc-1943-oklahoma' },
  { from: 'evt-media-nyc-1943-oklahoma', to: 'evt-media-nyc-1957-westsidestory' },
  { from: 'evt-media-nyc-1957-westsidestory', to: 'evt-media-nyc-1970-company' },
  { from: 'evt-media-nyc-1970-company', to: 'evt-media-nyc-1996-rent' },
  { from: 'evt-media-nyc-1996-rent', to: 'evt-media-nyc-2015-hamilton' },
  { from: 'evt-media-nyc-1911-treemonisha', to: 'evt-media-nyc-1935-porgy' },
  { from: 'evt-media-nyc-1935-porgy', to: 'evt-media-nyc-1957-westsidestory' },
  { from: 'evt-media-london-1971-superstar', to: 'evt-media-nyc-1996-rent' },
  { from: 'evt-media-berlin-1928-threepenny', to: 'evt-media-nyc-1970-company' },
  { from: 'evt-media-mantua-1607-orfeo', to: 'evt-media-berlin-1928-threepenny' },
  { from: 'evt-media-london-1878-savoy', to: 'evt-media-london-1971-superstar' },

  // ── Film scoring lineage ──
  { from: 'evt-media-nyc-1900-silentfilm', to: 'evt-media-la-1927-jazzsinger' },
  { from: 'evt-media-la-1927-jazzsinger', to: 'evt-media-la-1933-kingkong' },
  { from: 'evt-media-la-1933-kingkong', to: 'evt-media-la-1960-psycho' },
  { from: 'evt-media-la-1960-psycho', to: 'evt-media-la-1975-jaws' },
  { from: 'evt-media-la-1975-jaws', to: 'evt-media-la-1977-starwars' },
  { from: 'evt-media-la-1960-psycho', to: 'evt-media-la-1989-elfman' },
  { from: 'evt-media-rome-1966-morricone', to: 'evt-media-london-2010-inception' },
  { from: 'evt-media-munich-1978-moroder', to: 'evt-media-london-1981-chariots' },
  { from: 'evt-media-london-1981-chariots', to: 'evt-media-la-2010-socialnetwork' },
  { from: 'evt-media-la-1977-starwars', to: 'evt-media-wellington-2001-lotr' },
  { from: 'evt-media-la-1977-starwars', to: 'evt-media-london-2010-inception' },
  { from: 'evt-media-tokyo-1984-ghibli', to: 'evt-media-tokyo-1987-sakamoto' },
  { from: 'evt-media-la-1967-quincyjones', to: 'evt-media-chennai-2008-rahman' },
  { from: 'evt-media-memphis-1971-shaft', to: 'evt-media-la-2018-blackpanther' },
  { from: 'evt-media-london-2007-greenwood', to: 'evt-media-la-2017-getout' },
  { from: 'evt-media-la-1961-moonriver', to: 'evt-media-la-1969-bacharach' },
  { from: 'evt-media-la-1966-missionimpossible', to: 'evt-media-la-1967-quincyjones' },
  { from: 'evt-media-la-1933-kingkong', to: 'evt-media-la-1940-fantasia' },
  { from: 'evt-media-la-1940-fantasia', to: 'evt-media-london-1994-lionking' },
  { from: 'evt-media-london-1962-bond', to: 'evt-media-la-1966-missionimpossible' },
  { from: 'evt-media-la-2005-santaolalla-bbm', to: 'evt-media-la-2013-lastofus' },
  { from: 'evt-media-la-1960-psycho', to: 'evt-media-london-2007-greenwood' },
  { from: 'evt-media-rome-1966-morricone', to: 'evt-media-la-2005-santaolalla-bbm' },

  // ── TV scoring ──
  { from: 'evt-media-la-1951-tvtheme', to: 'evt-media-la-1966-missionimpossible' },
  { from: 'evt-media-la-1951-tvtheme', to: 'evt-media-la-1990-lawandorder' },
  { from: 'evt-media-la-1951-tvtheme', to: 'evt-media-la-1990-twinpeaks' },
  { from: 'evt-media-la-1990-twinpeaks', to: 'evt-media-la-2004-bsg' },
  { from: 'evt-media-london-2010-inception', to: 'evt-media-la-2011-gameofthrones' },
  { from: 'evt-media-london-2010-inception', to: 'evt-media-la-2019-mandalorian' },
  { from: 'evt-media-la-1990-twinpeaks', to: 'evt-media-la-2021-whitelotus' },
  { from: 'evt-media-la-2011-gameofthrones', to: 'evt-media-la-2019-mandalorian' },
  { from: 'evt-media-nyc-2009-madmen', to: 'evt-media-nyc-2018-succession' },
  { from: 'evt-media-nyc-2018-succession', to: 'evt-media-la-2021-whitelotus' },
  { from: 'evt-media-la-2004-bsg', to: 'evt-media-la-2011-gameofthrones' },
  { from: 'evt-media-la-2010-socialnetwork', to: 'evt-media-la-2013-houseofcards' },

  // ── Video game music ──
  { from: 'evt-media-kyoto-1985-mario', to: 'evt-media-kyoto-1986-zelda' },
  { from: 'evt-media-tokyo-1987-finalfantasy', to: 'evt-media-la-2020-ffviiremake' },
  { from: 'evt-media-seattle-2001-halo', to: 'evt-media-copenhagen-2007-assassinscreed' },
  { from: 'evt-media-kyoto-1985-mario', to: 'evt-media-tokyo-1996-pokemon' },
  { from: 'evt-media-tokyo-1987-finalfantasy', to: 'evt-media-la-2012-journey' },
  { from: 'evt-media-la-2012-journey', to: 'evt-media-seattle-2018-celeste' },
  { from: 'evt-media-kyoto-1986-zelda', to: 'evt-media-la-2018-godsofwar' },
  { from: 'evt-media-tokyo-1991-streetsofrage', to: 'evt-media-melbourne-2016-doom' },
  { from: 'evt-media-twycross-1998-banjokazooie', to: 'evt-media-la-2005-vglive' },

  // ── Streaming & tech platform chain ──
  { from: 'evt-media-sanmateo-1999-napster', to: 'evt-media-cupertino-2003-itunes' },
  { from: 'evt-media-cupertino-2003-itunes', to: 'evt-media-sanbruno-2005-youtube' },
  { from: 'evt-media-sanbruno-2005-youtube', to: 'evt-media-stockholm-2008-spotify' },
  { from: 'evt-media-sanbruno-2005-youtube', to: 'evt-media-berlin-2008-soundcloud' },
  { from: 'evt-media-sanbruno-2005-youtube', to: 'evt-media-oakland-2008-bandcamp' },
  { from: 'evt-media-nyc-1999-moby', to: 'evt-media-cupertino-2003-ipod' },
  { from: 'evt-media-stockholm-2008-spotify', to: 'evt-media-la-2017-tiktok' },
  { from: 'evt-media-la-2017-tiktok', to: 'evt-media-la-2022-renaissance' },

  // ── Advertising & sync ──
  { from: 'evt-media-minneapolis-1926-wheaties', to: 'evt-media-nyc-1970-manilow' },
  { from: 'evt-media-nyc-1970-manilow', to: 'evt-media-london-1971-coke' },
  { from: 'evt-media-london-1971-coke', to: 'evt-media-vienna-1994-intel' },
  { from: 'evt-media-vienna-1994-intel', to: 'evt-media-nyc-1999-moby' },
  { from: 'evt-media-pasadena-1993-superbowl', to: 'evt-media-cupertino-2003-ipod' },

  // ── Cross-genre connections (media <-> existing events) ──
  { from: 'evt-funk-augusta-1970', to: 'evt-media-memphis-1971-shaft' },
  { from: 'evt-hiphop-nyc-1973', to: 'evt-media-nyc-2015-hamilton' },
  { from: 'evt-jazz-kamasi-washington-the-epic-la-2015', to: 'evt-media-la-2016-lalaland' },
  { from: 'evt-media-nyc-2021-tick', to: 'evt-media-la-2022-renaissance' },
  { from: 'evt-hiphop-nyc-1984', to: 'evt-media-toronto-2024-drakevsken' },
];

// Build event lookup map once at module scope
const EVENT_MAP = new Map<string, HistoricalEvent>();
for (const event of MUSIC_HISTORY) {
  EVENT_MAP.set(event.id, event);
}

// Adjacency maps for O(1) connection lookups (replaces linear scans)
const UPSTREAM_MAP = new Map<string, string[]>(); // to → [from, from, ...]
const DOWNSTREAM_MAP = new Map<string, string[]>(); // from → [to, to, ...]
for (const conn of EVENT_CONNECTIONS) {
  const ups = UPSTREAM_MAP.get(conn.to);
  if (ups) ups.push(conn.from);
  else UPSTREAM_MAP.set(conn.to, [conn.from]);

  const downs = DOWNSTREAM_MAP.get(conn.from);
  if (downs) downs.push(conn.to);
  else DOWNSTREAM_MAP.set(conn.from, [conn.to]);
}

// City name → country color lookup for arc/pill coloring
const CITY_COUNTRY_COLOR_MAP = new Map<string, string>();
for (const city of CITIES) {
  const iso = CITY_COUNTRY_TO_ISO[city.country];
  if (iso) {
    CITY_COUNTRY_COLOR_MAP.set(city.name.toLowerCase(), getCountryColor(iso));
  }
}

export function getEventCountryColor(event: HistoricalEvent): string {
  return (
    CITY_COUNTRY_COLOR_MAP.get(event.location.city.toLowerCase()) ?? '#a1a1aa'
  );
}

export interface EventConnectionInfo {
  event: HistoricalEvent;
  direction: 'upstream' | 'downstream';
}

export function getConnectionsForEvent(eventId: string): EventConnectionInfo[] {
  const connections: EventConnectionInfo[] = [];
  for (const fromId of UPSTREAM_MAP.get(eventId) ?? []) {
    const other = EVENT_MAP.get(fromId);
    if (other) connections.push({ event: other, direction: 'upstream' });
  }
  for (const toId of DOWNSTREAM_MAP.get(eventId) ?? []) {
    const other = EVENT_MAP.get(toId);
    if (other) connections.push({ event: other, direction: 'downstream' });
  }
  return connections.sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === 'upstream' ? -1 : 1;
    return a.event.year - b.event.year;
  });
}

export interface UpstreamChainNode {
  event: HistoricalEvent;
  upstream: UpstreamChainNode[];
}

export function getUpstreamChain(
  eventId: string,
  maxDepth = 10,
): UpstreamChainNode[] {
  const visited = new Set<string>();

  function walk(id: string, depth: number): UpstreamChainNode[] {
    if (depth <= 0) return [];
    const nodes: UpstreamChainNode[] = [];
    for (const fromId of UPSTREAM_MAP.get(id) ?? []) {
      if (!visited.has(fromId)) {
        const event = EVENT_MAP.get(fromId);
        if (event) {
          visited.add(fromId);
          nodes.push({
            event,
            upstream: walk(fromId, depth - 1),
          });
        }
      }
    }
    return nodes.sort((a, b) => a.event.year - b.event.year);
  }

  visited.add(eventId);
  return walk(eventId, maxDepth);
}

export function getDownstreamChain(
  eventId: string,
  maxDepth = 10,
): UpstreamChainNode[] {
  const visited = new Set<string>();

  function walk(id: string, depth: number): UpstreamChainNode[] {
    if (depth <= 0) return [];
    const nodes: UpstreamChainNode[] = [];
    for (const toId of DOWNSTREAM_MAP.get(id) ?? []) {
      if (!visited.has(toId)) {
        const event = EVENT_MAP.get(toId);
        if (event) {
          visited.add(toId);
          nodes.push({
            event,
            upstream: walk(toId, depth - 1),
          });
        }
      }
    }
    return nodes.sort((a, b) => a.event.year - b.event.year);
  }

  visited.add(eventId);
  return walk(eventId, maxDepth);
}

export function getArcsForEvent(eventId: string): ArcDatum[] {
  const pinned = EVENT_MAP.get(eventId);
  if (!pinned) return [];

  const arcs: ArcDatum[] = [];

  for (const fromId of UPSTREAM_MAP.get(eventId) ?? []) {
    const other = EVENT_MAP.get(fromId);
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
      });
    }
  }

  for (const toId of DOWNSTREAM_MAP.get(eventId) ?? []) {
    const other = EVENT_MAP.get(toId);
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
      });
    }
  }

  return arcs;
}

export function getRecursiveArcsForEvent(
  eventId: string,
  maxDepth = 10,
): ArcDatum[] {
  const arcs: ArcDatum[] = [];
  const visited = new Set<string>();

  function walkUp(id: string, depth: number) {
    if (depth <= 0) return;
    const toEvt = EVENT_MAP.get(id);
    if (!toEvt) return;
    for (const fromId of UPSTREAM_MAP.get(id) ?? []) {
      const key = `${fromId}->${id}`;
      if (!visited.has(key)) {
        const fromEvt = EVENT_MAP.get(fromId);
        if (fromEvt) {
          visited.add(key);
          arcs.push({
            startLat: fromEvt.location.lat,
            startLng: fromEvt.location.lng,
            endLat: toEvt.location.lat,
            endLng: toEvt.location.lng,
            label: fromEvt.title,
            eventId: fromEvt.id,
            direction: 'upstream',
            color: getEventCountryColor(fromEvt),
          });
          walkUp(fromId, depth - 1);
        }
      }
    }
  }

  function walkDown(id: string, depth: number) {
    if (depth <= 0) return;
    const fromEvt = EVENT_MAP.get(id);
    if (!fromEvt) return;
    for (const toId of DOWNSTREAM_MAP.get(id) ?? []) {
      const key = `${id}->${toId}`;
      if (!visited.has(key)) {
        const toEvt = EVENT_MAP.get(toId);
        if (toEvt) {
          visited.add(key);
          arcs.push({
            startLat: fromEvt.location.lat,
            startLng: fromEvt.location.lng,
            endLat: toEvt.location.lat,
            endLng: toEvt.location.lng,
            label: toEvt.title,
            eventId: toEvt.id,
            direction: 'downstream',
            color: getEventCountryColor(fromEvt),
          });
          walkDown(toId, depth - 1);
        }
      }
    }
  }

  walkUp(eventId, maxDepth);
  walkDown(eventId, maxDepth);
  return arcs;
}
