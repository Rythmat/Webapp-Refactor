/**
 * Split musicHistory.ts into genre-family modules.
 * Run: node scripts/split-music-history.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const ROOT = 'src/components/atlas/data';

// ── Hard-coded genre-to-file mapping (matches genreMapping.ts) ──
const genreToFile = {};
const addMapping = (genres, bucket) =>
  genres.forEach((g) => {
    genreToFile[g] = bucket;
  });

addMapping(
  [
    'Jazz',
    'Bebop',
    'Swing',
    'Free Jazz',
    'Avant-Garde Jazz',
    'Dixieland',
    'Vocal Jazz',
    'Cape Jazz',
    'Ethio-Jazz',
    'Afro-Cuban Jazz',
    'Latin Jazz',
    'Ragtime',
    'Somali Jazz',
    'Azerbaijani Jazz',
    'Afro-Jazz',
    'Jug Band',
    'Lounge',
    'Musical Theatre',
    'Vaudeville',
  ],
  'jazz',
);

addMapping(
  [
    'Blues',
    'Country Blues',
    'Chicago Blues',
    'Piedmont Blues',
    'British Blues',
    'Desert Blues',
    'Tuareg Blues',
  ],
  'blues',
);

addMapping(
  [
    'Rock',
    'Punk',
    'Punk Rock',
    'Grunge',
    'Alternative Rock',
    'Alternative',
    'Indie Rock',
    'Indie',
    'Psychedelic Rock',
    'Psychedelic',
    'Post-Punk',
    'New Wave',
    'Heavy Metal',
    'Hard Rock',
    'Britpop',
    'Merseybeat',
    'Progressive Rock',
    'Classic Rock',
    'Heartland Rock',
    'Southern Rock',
    'Nu-Metal',
    'Metalcore',
    'Death Metal',
    'Black Metal',
    'Thrash Metal',
    'Extreme Metal',
    'Groove Metal',
    'Metal',
    'Noise Rock',
    'Art Rock',
    'Post-Rock',
    'Math Rock',
    'Emo',
    'Screamo',
    'Post-Hardcore',
    'Hardcore Punk',
    'Hardcore',
    'Anatolian Rock',
    'Rockabilly',
    'Rock & Roll',
    'Rock and Roll',
    'Folk Rock',
    'Folk Punk',
    'Country Rock',
    'Blues Rock',
    'Acid Rock',
    'Noise',
    'Experimental',
    'Shock Rock',
    'Pub Rock',
    'Raga Rock',
    'Desert Rock',
    'Cambodian Rock',
    'Malay Rock',
    'Japanese Rock',
    'Filipino Rock',
    'Aboriginal Rock',
    'Post-Soviet Rock',
    'Group Sounds',
    'Zamrock',
    'Rock en Español',
    'Punta Rock',
    'Indie Dance',
    'Lo-Fi',
    'Sound Art',
    'Arabic Indie Rock',
  ],
  'rock',
);

addMapping(
  [
    'Hip Hop',
    'Rap',
    'Trap',
    'Drill',
    'UK Drill',
    'Grime',
    'Southern Hip Hop',
    'West Coast Hip Hop',
    'G-Funk',
    'Crunk',
    'Chopped & Screwed',
    'Conscious Rap',
    'Rap Rock',
    'Indie Hip Hop',
    'Latin Trap',
    'Hiplife',
    'Hipco',
    'Motswako',
    'Bongo Flava',
    'Baile Funk',
    'Indian Hip Hop',
    'Gully Rap',
    'African Hip Hop',
    'Japanese Hip Hop',
    'Brazilian Hip Hop',
    'K-Hip Hop',
    'Cuban Hip Hop',
    'Mahraganat',
    'Arabic Indie',
    'Ragga',
    'Afroswing',
  ],
  'hiphop',
);

addMapping(
  [
    'Electronic',
    'Techno',
    'House',
    'EDM',
    'Trance',
    'Psytrance',
    'Goa Trance',
    'Drum and Bass',
    'Jungle',
    'Trip-Hop',
    'Trip Hop',
    'Acid House',
    'Dubstep',
    'Minimal Techno',
    'French Touch',
    'Balearic Beat',
    'Hardstyle',
    'EBM',
    'New Beat',
    'Madchester',
    'Industrial',
    'Krautrock',
    'Kuduro',
    'Amapiano',
    'Dance',
    'Dance Music',
    'Rave',
    'Baltimore Club',
    'Sound System',
    'DJ Style',
    'Asian Underground',
    'Kwaito',
  ],
  'electronic',
);

addMapping(
  [
    'R&B',
    'Soul',
    'Funk',
    'Motown',
    'Disco',
    'Philadelphia Soul',
    'Southern Soul',
    'Neo Soul',
    'Gospel',
    'Gospel Choir',
    'Go-Go',
    'Minneapolis Sound',
    'Afro-Funk',
    'Thai Funk',
    'Tribal Funk',
  ],
  'rnbSoulFunk',
);

addMapping(
  [
    'Folk',
    'Country',
    'Bluegrass',
    'Celtic',
    'Traditional',
    'Appalachian',
    'Singer-Songwriter',
    'Roots',
    'Protest',
    'Protest Music',
    'Americana',
    'Acadian',
    'Old-Time',
    'Hawaiian',
    'Native American',
    'Indigenous',
    'Outlaw Country',
    'Rodeo Country',
    'Cowboy Music',
    'Western',
    'Fiddle',
    'Harp Music',
    'String Band',
    'Turbo-Folk',
    'Indie Folk',
    'Scandinavian Folk',
    'Greek Folk',
    'Turkish Folk',
    'Armenian Folk',
    'Kazakh Folk',
    'Kyrgyz Folk',
    'Turkmen Folk',
    'Bengali Folk',
    'Nepali Folk',
    'Bhutanese Folk',
    'Pashto Folk',
    'Afar Folk',
    'Omani Folk',
    'Lebanese Folk',
    'Andean Folk',
    'Vietnamese Folk',
    'Maldivian Folk',
    'Sudanese Folk',
    'Nauruan Folk',
    'Fijian Folk',
    'Pacific Folk',
    'Pacific Island Music',
    'Newari Folk',
    'Mongolian Folk',
    'Slack-Key Guitar',
    'Powwow',
    'Acoustic',
    'World Music',
    'Fado',
    'Flamenco',
    'Rebetiko',
    'Raï',
    'Qawwali',
    'Gnawa',
    'Devotional',
    'Spiritual',
    'Sufi Music',
    'Baul',
    'Throat Singing',
    'Call and Response',
    'Ring Shout',
    'Ritual',
    'Mardi Gras Indian',
    'Brass Band',
    'Baila',
    'Dangdut',
    'Luk Thung',
    'Lam',
    'Khene Music',
    'Ca Tru',
    'Xinyao',
    'Tabla',
    'Duduk',
    'Dutar',
    'Rubab',
    'Oud Music',
    'Dombra',
    'Gulingtangan',
    'Marimba',
    'Panpipe Ensemble',
    'Candombe',
    'Afoxé',
    'Candomblé',
    'Vodou Drumming',
    'Vodun Music',
    'Bwiti Music',
    'Fijian Choral',
    'Samoan Choral',
    'Tongan Choral',
    'Tuvaluan Choral',
    'Haka',
    'Māori Music',
    'Fatele',
    'Lakalaka',
    'Sing-Sing',
    'Custom Music',
    'Kiribati Chant',
    'Marshallese Chant',
    'Palauan Chant',
    'Micronesian Chant',
    'Omengat Song',
    'Dinka Chant',
    'Bodu Beru',
    'Balélé',
    'Moutya',
    'Famo',
    'Malipenga',
    'Sibhaca',
    'Sesotho Traditional',
    'Swazi Traditional',
    'Guayla',
    'Tigrinya Music',
    'Somali Music',
    'Qaraami',
    'Haqiba',
    'Fado Timorense',
    "Fa'ataupati",
    'Te Bino',
    'Rigsar',
    'Akyns',
    'Bakhshi',
    'Stick Dance',
    'Warba',
    'Fihiri',
    'Liwa',
    'Khaliji',
    'Sawt',
    'Muwashah',
    "Ma'luf",
    'Malouf',
    'Chaabi',
    'Andalusian',
    'Arabesque',
    'Mizrahi',
    'Revival',
    'Roma Brass',
    'Festival',
    "Al-Ghina Al-San'ani",
    'Falak',
    'Shambo',
    'Mgodro',
    'Resistance Music',
    'Secular',
    'Thangyat',
    'Sai',
    'Yemeni Folk',
    'African Drumming',
    'Fijiri',
  ],
  'folk',
);

addMapping(
  [
    'Pop',
    'K-Pop',
    'J-Pop',
    'City Pop',
    'C-Pop',
    'Mandopop',
    'Synth-Pop',
    'Synth Pop',
    'Latin Pop',
    'Indie Pop',
    'Art Pop',
    'Pop Rock',
    'Pop Punk',
    'Pop Rap',
    'Arabian Pop',
    'Arabic Pop',
    'Khaleeji Pop',
    'Gulf Pop',
    'Turkish Pop',
    'Persian Pop',
    'Power Pop',
    'Jangle Pop',
    'Noise Pop',
    'Indonesian Pop',
    'Malaysian Pop',
    'Polynesian Pop',
    'Mediterranean Pop',
    'Khmer Pop',
    'North Korean Pop',
    'Sri Lankan Pop',
    'OPM',
    'Technopop',
    'Bollywood',
    'Filmi',
    'Chanson',
  ],
  'pop',
);

addMapping(
  [
    'Salsa',
    'Cumbia',
    'Merengue',
    'Bachata',
    'Reggaeton',
    'Bossa Nova',
    'Samba',
    'Samba de Roda',
    'Samba-Reggae',
    'Tango',
    'Latin',
    'Son Cubano',
    'Son Montuno',
    'Mambo',
    'Bolero',
    'Cha-cha-chá',
    'Charanga',
    'Contradanza',
    'Danzón',
    'Mariachi',
    'Ranchera',
    'Norteño',
    'Regional Mexican',
    'Tropicália',
    'MPB',
    'Axé',
    'Maxixe',
    'Lundu',
    'Pasillo',
    'Guarania',
    'Chicha',
    'Festejo',
    'Landó',
    'Punta',
    'Dembow',
    'Cumbia Peruana',
    'Cumbia Sonidera',
    'Cumbia Villera',
    'Pachanga',
    'Latin Boogaloo',
    'Salsa Romántica',
    'Son Nica',
    'Timba',
    'Nueva Canción',
    'Nueva Canci\u00f3n',
    'Afro-Cuban',
    'Afro-Peruvian',
  ],
  'latin',
);

addMapping(
  [
    'Reggae',
    'Ska',
    'Ska Revival',
    '2 Tone',
    'Dancehall',
    'Dub',
    'Rocksteady',
    'Lovers Rock',
    'Roots Reggae',
    'Island Reggae',
    'Pacific Reggae',
    'Reggae en Español',
    'Reggae en Espa\u00f1ol',
    'Calypso',
    'Soca',
    'Ragga Soca',
    'Mento',
    'Kaiso',
    'Steelpan',
    'Kompa',
    'Rara',
    'Bouyon',
    'Dennery Segment',
    'Cadence-lypso',
    'Spouge',
    'Goombay',
    'Junkanoo',
    'Kaseko',
    'Kawina',
    'Chutney',
    'Caribbean',
    'Antigua Benna',
    'Kumina',
    'Maroon Music',
    'Seggae',
    'Sound System',
  ],
  'reggae',
);

addMapping(
  [
    'Afrobeats',
    'Afrobeat',
    'Highlife',
    'Mbalax',
    'Soukous',
    'Congolese Rumba',
    'Rumba Congolaise',
    'Rumba',
    'Makossa',
    'Mbaqanga',
    'Township Jive',
    'Mbira',
    'Chimurenga',
    'Jùjú',
    'Palm Wine',
    'Griot',
    'Griot Tradition',
    'Kora Music',
    'West African',
    'Mandingue',
    'Salegy',
    'Morna',
    'Sega',
    'Gumbe',
    'Maringa',
    'Twarab',
    'Tarab',
    'Benga',
    'Kadongo Kamu',
    'Royal Drumming',
    'Afro-Pop',
    'Afro-Manding',
    'Afro-Portuguese',
    'Afro-Fusion',
    'Afro-Psych',
    'Ghana',
    'Zouglou',
    'Coupé-Décalé',
    'Marrabenta',
    'Ússua',
    'Spanish-African Fusion',
    'Socopé',
  ],
  'african',
);

addMapping(['Jam Band'], 'jamband');

addMapping(
  [
    'Classical',
    'Opera',
    'Baroque',
    'Romantic',
    'Impressionism',
    'Minimalism',
    'Sacred',
    'Sacred Music',
    'Choral',
    'Symphonic',
    'Indian Classical',
    'Hindustani Classical',
    'Carnatic',
    'Persian Classical',
    'Arabic Classical',
    'Ottoman Classical',
    'Gamelan',
    'Gagaku',
    'Mugham',
    'Shashmaqam',
    'Pansori',
    'Peking Opera',
    'Film Music',
    'Avant-Garde',
    'Ballet',
    'Chamber Music',
    'Gregorian Chant',
    'Chinese Classical',
    'Japanese Classical',
    'Javanese Classical',
    'Khmer Classical',
    'Burmese Classical',
    'Vietnamese Classical',
    'Thai Classical',
    'Korean Classical',
    'Afghan Classical',
    'Azerbaijani Classical',
    'Armenian Classical',
    'Tajik Classical',
    'Central Asian Classical',
    'Moorish Classical',
    'Andalusi Classical',
    'Malay Classical',
    'Revolutionary Opera',
    'Court Music',
    'Nha nhac',
    'Nanguan',
    'Yayue',
    'Jeongak',
    'Piphat',
    'Pinpeat',
    'Mahori',
    'Dastgah',
    'Makam',
    'Iraqi Maqam',
    'Maqam',
    'Odissi',
    'Neapolitan Song',
    'Confucian',
    'Classical Fusion',
    'Polyphony',
    'Georgian Polyphony',
    'Iso-Polyphony',
    'Pygmy Polyphony',
  ],
  'classical',
);

console.log('Mapped genres:', Object.keys(genreToFile).length);

// ── Parse events from musicHistory.ts ──
const content = readFileSync(`${ROOT}/musicHistory.ts`, 'utf8');
const arrayStart = content.indexOf('[');
const arrayEnd = content.lastIndexOf(']');
const arrayContent = content.slice(arrayStart + 1, arrayEnd);

const events = [];
let depth = 0,
  start = -1;
for (let i = 0; i < arrayContent.length; i++) {
  if (arrayContent[i] === '{' && depth === 0) start = i;
  if (arrayContent[i] === '{') depth++;
  if (arrayContent[i] === '}') {
    depth--;
    if (depth === 0 && start >= 0) {
      events.push(arrayContent.slice(start, i + 1).trim());
      start = -1;
    }
  }
}

// ── Classify events ──
const buckets = {
  jazz: [],
  blues: [],
  rock: [],
  hiphop: [],
  electronic: [],
  rnbSoulFunk: [],
  folk: [],
  pop: [],
  latin: [],
  reggae: [],
  african: [],
  classical: [],
  jamband: [],
  world: [],
};

const unmatched = {};
for (const evt of events) {
  const m = evt.match(/genre:\s*\[\s*'([^']+)'/);
  if (!m) {
    buckets.world.push(evt);
    continue;
  }
  const firstGenre = m[1];
  const bucket = genreToFile[firstGenre];
  if (bucket) {
    buckets[bucket].push(evt);
  } else {
    buckets.world.push(evt);
    unmatched[firstGenre] = (unmatched[firstGenre] || 0) + 1;
  }
}

// ── Report ──
let total = 0;
for (const [key, evts] of Object.entries(buckets)) {
  console.log(`${key}: ${evts.length}`);
  total += evts.length;
}
console.log(`TOTAL: ${total} (expected ${events.length})`);
if (Object.keys(unmatched).length > 0) {
  console.log('\nUnmatched genres:');
  for (const [g, c] of Object.entries(unmatched).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c} ${g}`);
  }
}

// ── Write genre files ──
const typeImport =
  "import type { HistoricalEvent } from '@/components/atlas/types';\n\n";

for (const [key, evts] of Object.entries(buckets)) {
  if (evts.length === 0) continue;
  const varName = `${key.toUpperCase()}_EVENTS`;
  const fileContent = `${typeImport}export const ${varName}: HistoricalEvent[] = [\n  ${evts.join(',\n  ')},\n];\n`;
  const path = `${ROOT}/events/${key}.ts`;
  writeFileSync(path, fileContent);
  console.log(`Wrote ${path} (${evts.length} events)`);
}

// ── Write index.ts aggregator ──
const fileNames = Object.keys(buckets).filter((k) => buckets[k].length > 0);
const imports = fileNames
  .map((f) => `import { ${f.toUpperCase()}_EVENTS } from './${f}';`)
  .join('\n');
const spread = fileNames
  .map((f) => `  ...${f.toUpperCase()}_EVENTS,`)
  .join('\n');

const indexContent = `${imports}
import { CITIES } from '../cities';
import type { HistoricalEvent } from '@/components/atlas/types';

export const MUSIC_HISTORY: HistoricalEvent[] = [
${spread}
];

// Deduplicated list of all genres across cities + events for search matching
export const ALL_GENRES: string[] = (() => {
  const cityGenres = CITIES.flatMap((c) => c.genres);
  const eventGenres = MUSIC_HISTORY.flatMap((e) => e.genre);
  return [...new Set([...cityGenres, ...eventGenres])].sort();
})();
`;

writeFileSync(`${ROOT}/events/index.ts`, indexContent);
console.log(`\nWrote ${ROOT}/events/index.ts`);
