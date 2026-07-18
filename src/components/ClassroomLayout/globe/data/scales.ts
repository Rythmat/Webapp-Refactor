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
  | 'Other Traditions'
  | 'Persian'
  | 'Xenharmonic';

export interface WorldScale {
  id: string;
  name: string;
  tradition: ScaleTradition;
  region: string;
  /** Short character/interval note used as the card subtitle. */
  character: string;
  /** Longer prose blurb for the detail view (optional; backfill later). */
  description?: string;
  /** YouTube id of the creator-wiki source video that teaches this scale. */
  sourceVideoId?: string;
  /** Attribution for the source video, e.g. "Farzad Milani". */
  sourceCreator?: string;
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
    {
      tradition: 'Persian',
      blurb: 'Persian dastgah — 17 tones with neutral intervals',
    },
    {
      tradition: 'Xenharmonic',
      blurb: 'Equal-division tunings beyond 12-TET (e.g. 31-EDO)',
    },
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
  // Persian
  // source: wiki/topics/persian-music.md · Farzad Milani — https://youtu.be/PIlHb5GgjMI
  {
    id: 'mahur',
    name: 'Mahur',
    tradition: 'Persian',
    region: 'West Asia',
    character:
      'Two Mahur tetrachords around a shahed pivot; upper genus swaps mid-melody',
    sourceVideoId: 'PIlHb5GgjMI',
    sourceCreator: 'Farzad Milani',
  },
  // source: wiki/topics/persian-music.md · Farzad Milani — https://youtu.be/_QN_DG-OJ_4
  {
    id: 'segah',
    name: 'Segah',
    tradition: 'Persian',
    region: 'West Asia',
    character:
      'Off-piano genus built on the 17-tone neutral (koron) quarter-tones',
    sourceVideoId: '_QN_DG-OJ_4',
    sourceCreator: 'Farzad Milani',
  },
  // source: wiki/topics/persian-music.md · Farzad Milani — https://youtu.be/_QN_DG-OJ_4
  {
    id: 'homayoun',
    name: 'Homayoun',
    tradition: 'Persian',
    region: 'West Asia',
    character: 'Nava/Homayoun genus — minor-leaning, beyond the 12-tone piano',
    sourceVideoId: '_QN_DG-OJ_4',
    sourceCreator: 'Farzad Milani',
  },
  // source: wiki/topics/persian-music.md · Farzad Milani — https://youtu.be/_QN_DG-OJ_4
  {
    id: 'chahargah',
    name: 'Chahargah',
    tradition: 'Persian',
    region: 'West Asia',
    character: 'Bold augmented-second step; a Hijaz-like Persian genus',
    sourceVideoId: '_QN_DG-OJ_4',
    sourceCreator: 'Farzad Milani',
  },
  // Xenharmonic
  // source: wiki/topics/31-edo.md · Zheanna Erose — https://youtu.be/uH3ahBzDSrs
  {
    id: '31edo-supermajor-hexatonic',
    name: '31-EDO Supermajor Hexatonic',
    tradition: 'Xenharmonic',
    region: 'Global',
    character:
      'Six stacked super-major (~8:7) seconds; a fuzzy, dreamy major-seven',
    sourceVideoId: 'uH3ahBzDSrs',
    sourceCreator: 'Zheanna Erose',
  },
  // source: wiki/topics/31-edo.md · Zheanna Erose — https://youtu.be/unuVHCZ2snE
  {
    id: '31edo-overtone',
    name: '31-EDO Overtone Scale',
    tradition: 'Xenharmonic',
    region: 'Global',
    character:
      'Approximates harmonics 8-16; buzzy, metallic, near-just intonation',
    sourceVideoId: 'unuVHCZ2snE',
    sourceCreator: 'Zheanna Erose',
  },
];
