/**
 * Names the artist extractor finds that are not artists.
 *
 * `artists.ts` reads the capitalized phrase that opens an event title and keeps
 * it only when the curator also tagged it — which is accurate enough that this
 * list is short, but a title can just as easily open with a record label, a
 * festival, a platform, or an empire. Those belong to no one and must never get
 * a clickable artist chip.
 *
 * Entries are compared after `normalizeArtistName()`, so casing, accents, and
 * punctuation here are irrelevant. Add to it freely — a false entry costs one
 * missing chip, while a missing entry puts "Spotify" in the artist list.
 */
export const ARTIST_STOP_LIST: string[] = [
  // Labels, studios, and collectives-as-business
  'chess records',
  'stax records',
  'hi records',
  'island records',
  'kill rock stars',
  'rhymesayers',
  'motown records',
  'sun records',

  // Festivals, venues, and events
  'sxsw',
  'summerfest',
  'copenhagen jazz festival',
  'amsterdam dance event',
  'mdl beast',
  'bassiani',
  'video games live',
  'cheyenne frontier days',
  'las llamadas',
  'summer of love',
  'sugar mas',
  'afrika shrine',
  'club baobab',

  // Platforms, broadcasters, and brands
  'mtv',
  'apple',
  'tiktok',
  'napster',
  'youtube',
  'soundcloud',
  'bandcamp',
  'spotify',
  'streaming',
  'digital',
  'wheaties',
  'radio luxembourg',
  'unesco',

  // Institutions and schools
  'berklee',
  'risd',
  'university of ghana',

  // Places and regions the extractor cannot tell from a stage name
  'new england',
  'cape breton',
  'george street',
  'williamsburg',
  'png',
  'pei',
  'ottoman',
  'joseon',
  'malacca sultanate',
  'colombian',
  'scots-irish',

  // Movements, peoples, forms, and abstractions
  'independence',
  'adzogbo',
  'agbadza',
  'dada',
  'bwiti',
  'garifuna',
  'sonidero',
  'sea of blood',
  'nsk',
  'zeus',

  // People who shaped the music without being musicians
  'thomas sankara',
  'hugo zemp',
];
