// ── Scales & Modes of the World ───────────────────────────────────────────
// Curated first-pass set grouped by tradition — the melodic systems that give
// each culture's music its distinctive colour. `character` is a short subtitle;
// several traditions use intervals outside Western 12-tone equal temperament.

export type ScaleTradition =
  | 'Maqam'
  | 'Raga'
  | 'Gamelan'
  | 'Pentatonic'
  | 'Western Modes'
  | 'Other Traditions';

export interface WorldScale {
  id: string;
  name: string;
  tradition: ScaleTradition;
  region: string;
  /** Short character/interval note used as the card subtitle. */
  character: string;
}

/** Tradition → one-line context, in display order. */
export const SCALE_TRADITIONS: { tradition: ScaleTradition; blurb: string }[] =
  [
    { tradition: 'Maqam', blurb: 'Arabic modal system — often microtonal' },
    {
      tradition: 'Raga',
      blurb: 'Indian melodic frameworks tied to mood & time',
    },
    { tradition: 'Gamelan', blurb: 'Indonesian tunings outside Western pitch' },
    {
      tradition: 'Pentatonic',
      blurb: 'Five-note scales — the world’s most widespread',
    },
    { tradition: 'Western Modes', blurb: 'The European church modes' },
    { tradition: 'Other Traditions', blurb: 'Distinctive regional colours' },
  ];

export const WORLD_SCALES: WorldScale[] = [
  // Maqam
  {
    id: 'rast',
    name: 'Rast',
    tradition: 'Maqam',
    region: 'West Asia',
    character: 'Bright & regal; a 3rd tuned between major and minor',
  },
  {
    id: 'hijaz',
    name: 'Hijaz',
    tradition: 'Maqam',
    region: 'West Asia',
    character: 'Striking wide step between the 2nd and 3rd',
  },
  {
    id: 'bayati',
    name: 'Bayati',
    tradition: 'Maqam',
    region: 'West Asia',
    character: 'Plaintive; a quarter-tone 2nd',
  },
  // Raga
  {
    id: 'bhairav',
    name: 'Bhairav',
    tradition: 'Raga',
    region: 'South Asia',
    character: 'Solemn dawn raga; flat 2nd & flat 6th',
  },
  {
    id: 'yaman',
    name: 'Yaman',
    tradition: 'Raga',
    region: 'South Asia',
    character: 'Serene evening raga; a raised 4th',
  },
  {
    id: 'bhairavi',
    name: 'Bhairavi',
    tradition: 'Raga',
    region: 'South Asia',
    character: 'Devotional; all flatted notes',
  },
  // Gamelan
  {
    id: 'slendro',
    name: 'Slendro',
    tradition: 'Gamelan',
    region: 'Southeast Asia',
    character: 'Five near-equal steps; no semitones',
  },
  {
    id: 'pelog',
    name: 'Pelog',
    tradition: 'Gamelan',
    region: 'Southeast Asia',
    character: 'Seven uneven steps, often played as five',
  },
  // Pentatonic
  {
    id: 'major-pentatonic',
    name: 'Major Pentatonic',
    tradition: 'Pentatonic',
    region: 'Global',
    character: 'Five open, consonant notes',
  },
  {
    id: 'minor-pentatonic',
    name: 'Minor Pentatonic',
    tradition: 'Pentatonic',
    region: 'Global',
    character: 'The backbone of blues & rock',
  },
  {
    id: 'hirajoshi',
    name: 'Hirajoshi',
    tradition: 'Pentatonic',
    region: 'East Asia',
    character: 'A dark Japanese minor pentatonic',
  },
  {
    id: 'yo',
    name: 'Yo Scale',
    tradition: 'Pentatonic',
    region: 'East Asia',
    character: 'Bright Japanese folk pentatonic',
  },
  // Western Modes
  {
    id: 'dorian',
    name: 'Dorian',
    tradition: 'Western Modes',
    region: 'Europe',
    character: 'Minor with a bright raised 6th',
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    tradition: 'Western Modes',
    region: 'Europe',
    character: 'Dark; a flat 2nd (Spanish colour)',
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    tradition: 'Western Modes',
    region: 'Europe',
    character: 'Major with a flat 7th',
  },
  {
    id: 'aeolian',
    name: 'Aeolian',
    tradition: 'Western Modes',
    region: 'Europe',
    character: 'The natural minor scale',
  },
  // Other Traditions
  {
    id: 'blues',
    name: 'Blues Scale',
    tradition: 'Other Traditions',
    region: 'American South',
    character: 'Minor pentatonic plus the "blue" flat 5th',
  },
  {
    id: 'freygish',
    name: 'Freygish',
    tradition: 'Other Traditions',
    region: 'Eastern Europe',
    character: 'Klezmer colour; flat 2nd, major 3rd',
  },
  {
    id: 'hungarian-minor',
    name: 'Hungarian Minor',
    tradition: 'Other Traditions',
    region: 'Eastern Europe',
    character: 'Minor with two dramatic augmented steps',
  },
];
