// ── Curated spotlights for the Globe dashboard's Explore tab ──────────────
// Hand-authored first-pass content (easily expanded). FEATURED_CITY_IDS point
// into `src/components/atlas/data/cities.ts`; the shelf filters to existing ids.

export interface FeaturedTraditionEntry {
  id: string;
  title: string;
  region: string;
  blurb: string;
  /** Seed for the deterministic curated hex-tile palette. */
  seed: string;
}

/** Rotating "Featured Tradition" spotlights — cultures/traditions with context. */
export const FEATURED_TRADITIONS: FeaturedTraditionEntry[] = [
  {
    id: 'griot',
    title: 'The Griots of West Africa',
    region: 'West Africa',
    blurb:
      'For centuries, hereditary griot (jali) musicians of the Mande world have been oral historians, praise-singers and kora players — a living archive whose call-and-response threads run straight through the blues, jazz and hip-hop.',
    seed: 'griot',
  },
  {
    id: 'gamelan',
    title: 'Gamelan of Java & Bali',
    region: 'Southeast Asia',
    blurb:
      'Interlocking bronze gongs, metallophones and drums tuned to the slendro and pelog systems — a communal orchestra where no single part is complete on its own, and the ensemble itself is the instrument.',
    seed: 'gamelan',
  },
  {
    id: 'qawwali',
    title: 'Qawwali — Sufi Devotional Song',
    region: 'South Asia',
    blurb:
      'Ecstatic Sufi devotional music of the Indian subcontinent, built on hand-clapped rhythm, harmonium and soaring call-and-response vocals meant to carry singer and listener toward the divine.',
    seed: 'qawwali',
  },
  {
    id: 'flamenco',
    title: 'Flamenco of Andalusia',
    region: 'West Europe',
    blurb:
      'A fusion of Romani, Andalusian, Moorish and Jewish traditions — cante (song), toque (guitar) and baile (dance) bound together by the compás, its intricate cycle of accents and silence.',
    seed: 'flamenco',
  },
  {
    id: 'throat-singing',
    title: 'Tuvan Throat Singing',
    region: 'North Asia',
    blurb:
      'Khöömei overtone singing from the steppes of Tuva and Mongolia, where a single voice sounds two or more pitches at once — a whistling harmonic riding over a low drone, imitating wind, water and open land.',
    seed: 'throat',
  },
  {
    id: 'andean',
    title: 'Music of the Andes',
    region: 'South America',
    blurb:
      'Panpipes (siku), kena flutes and the small charango over highland rhythms — Quechua and Aymara traditions that later fuelled the politically charged Nueva Canción movement across Latin America.',
    seed: 'andean',
  },
];

/**
 * Curated, globally diverse city ids for the "Music Cities" shelf. All verified
 * to exist in CITIES; the shelf filters to present ids and falls back if short.
 */
export const FEATURED_CITY_IDS = [
  'new-orleans',
  'kingston',
  'havana',
  'salvador',
  'lagos',
  'new-york',
  'london',
  'rio',
  'bamako',
  'memphis',
  'dakar',
  'vienna',
];
