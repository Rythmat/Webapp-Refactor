// ── Instruments of the World ──────────────────────────────────────────────
// Curated first-pass set grouped by the Hornbostel–Sachs classification — the
// standard ethnomusicological taxonomy of instruments by how they make sound.

export type InstrumentFamily =
  | 'Chordophones'
  | 'Aerophones'
  | 'Membranophones'
  | 'Idiophones'
  | 'Electrophones';

export interface WorldInstrument {
  id: string;
  name: string;
  family: InstrumentFamily;
  region: string;
  description: string;
}

/** Family → one-line definition, in display order. */
export const INSTRUMENT_FAMILIES: {
  family: InstrumentFamily;
  blurb: string;
}[] = [
  { family: 'Chordophones', blurb: 'Sound from vibrating strings' },
  { family: 'Aerophones', blurb: 'Sound from vibrating air' },
  { family: 'Membranophones', blurb: 'Sound from a stretched membrane' },
  { family: 'Idiophones', blurb: 'The body of the instrument itself vibrates' },
  {
    family: 'Electrophones',
    blurb: 'Sound generated or shaped electronically',
  },
];

export const WORLD_INSTRUMENTS: WorldInstrument[] = [
  // Chordophones
  {
    id: 'sitar',
    name: 'Sitar',
    family: 'Chordophones',
    region: 'South Asia',
    description:
      'Long-necked plucked lute with sympathetic strings — the voice of Hindustani raga.',
  },
  {
    id: 'oud',
    name: 'Oud',
    family: 'Chordophones',
    region: 'West Asia',
    description:
      'Fretless short-necked lute at the heart of Arabic maqam; ancestor of the European lute.',
  },
  {
    id: 'kora',
    name: 'Kora',
    family: 'Chordophones',
    region: 'West Africa',
    description: '21-string harp-lute of the Mande griots.',
  },
  {
    id: 'koto',
    name: 'Koto',
    family: 'Chordophones',
    region: 'East Asia',
    description:
      'Japanese 13-string zither played with picks worn on the fingers.',
  },
  {
    id: 'erhu',
    name: 'Erhu',
    family: 'Chordophones',
    region: 'East Asia',
    description:
      'Two-string Chinese bowed fiddle with an intensely vocal tone.',
  },
  {
    id: 'charango',
    name: 'Charango',
    family: 'Chordophones',
    region: 'Andes',
    description:
      'Small bright Andean lute, once built on an armadillo-shell back.',
  },
  // Aerophones
  {
    id: 'didgeridoo',
    name: 'Didgeridoo',
    family: 'Aerophones',
    region: 'Oceania',
    description:
      'Aboriginal Australian drone pipe sustained by circular breathing.',
  },
  {
    id: 'shakuhachi',
    name: 'Shakuhachi',
    family: 'Aerophones',
    region: 'East Asia',
    description: 'Japanese end-blown bamboo flute tied to Zen meditation.',
  },
  {
    id: 'ney',
    name: 'Ney',
    family: 'Aerophones',
    region: 'West Asia',
    description:
      'Breathy reed flute central to Sufi, Persian and Arabic music.',
  },
  {
    id: 'bagpipes',
    name: 'Bagpipes',
    family: 'Aerophones',
    region: 'North Europe',
    description: 'Reed pipes fed from a windbag over a constant drone.',
  },
  {
    id: 'siku',
    name: 'Siku (Panpipes)',
    family: 'Aerophones',
    region: 'Andes',
    description:
      'Paired Andean panpipes played interlocking between two players.',
  },
  // Membranophones
  {
    id: 'djembe',
    name: 'Djembe',
    family: 'Membranophones',
    region: 'West Africa',
    description:
      'Goblet hand drum of the Mande — bass, tone and slap from one skin.',
  },
  {
    id: 'tabla',
    name: 'Tabla',
    family: 'Membranophones',
    region: 'South Asia',
    description:
      'Tuned pair of hand drums driving North Indian classical rhythm.',
  },
  {
    id: 'taiko',
    name: 'Taiko',
    family: 'Membranophones',
    region: 'East Asia',
    description: 'Booming Japanese barrel drums of festival and ensemble.',
  },
  {
    id: 'conga',
    name: 'Conga',
    family: 'Membranophones',
    region: 'Caribbean',
    description:
      'Tall single-headed Afro-Cuban drum at the core of Latin rhythm.',
  },
  {
    id: 'bodhran',
    name: 'Bodhrán',
    family: 'Membranophones',
    region: 'North Europe',
    description: 'Irish frame drum struck with a double-ended tipper.',
  },
  // Idiophones
  {
    id: 'gamelan-gong',
    name: 'Gamelan Gongs',
    family: 'Idiophones',
    region: 'Southeast Asia',
    description: 'Tuned bronze gongs and metallophones of Java and Bali.',
  },
  {
    id: 'balafon',
    name: 'Balafon',
    family: 'Idiophones',
    region: 'West Africa',
    description: 'Gourd-resonated wooden xylophone, ancestor of the marimba.',
  },
  {
    id: 'steelpan',
    name: 'Steelpan',
    family: 'Idiophones',
    region: 'Caribbean',
    description: 'Tuned oil-drum idiophone invented in Trinidad and Tobago.',
  },
  {
    id: 'mbira',
    name: 'Mbira',
    family: 'Idiophones',
    region: 'Southern Africa',
    description: 'Plucked metal tines on a board — the Shona "thumb piano".',
  },
  {
    id: 'marimba',
    name: 'Marimba',
    family: 'Idiophones',
    region: 'Central America',
    description:
      'Wooden-bar xylophone with resonators; Guatemala’s national instrument.',
  },
  // Electrophones
  {
    id: 'theremin',
    name: 'Theremin',
    family: 'Electrophones',
    region: 'Eastern Europe',
    description:
      'Played without touch — two antennas sense the position of the hands.',
  },
  {
    id: 'electric-guitar',
    name: 'Electric Guitar',
    family: 'Electrophones',
    region: 'North America',
    description: 'Amplified and effected — the defining voice of rock.',
  },
  {
    id: 'synthesizer',
    name: 'Synthesizer',
    family: 'Electrophones',
    region: 'Global',
    description:
      'Voltage-controlled tone generation; the foundation of electronic music.',
  },
  {
    id: 'turntable',
    name: 'Turntable',
    family: 'Electrophones',
    region: 'North America',
    description:
      'In hip-hop the record player itself becomes a percussive instrument.',
  },
];
