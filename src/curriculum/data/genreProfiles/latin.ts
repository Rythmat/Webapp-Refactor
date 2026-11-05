import type { GenreProfile } from '../../types/genreProfile';

/**
 * Latin Overview. Mirrors the authored flows (latin_v2.ts) and the planning
 * ledger: L1 Reggaeton, Cumbia, Mariachi (E minor; Mariachi in G major, 3/4);
 * L2 Merengue, Bachata, Cha-cha-chá, Bolero; L3 Bossa & Samba, Tango,
 * Afro-Cuban — all E minor over Em – Am – B7 – Em. Artists are grouped by the
 * style they're listed under (styleRef l1a…l3c, lessonStyles.ts).
 */
export const latinProfile: GenreProfile = {
  id: 'latin',
  displayName: 'Latin',
  // The progress map's Latin teal, so the genre reads the same everywhere.
  accentColor: '#14B8A6',
  tagline: 'The rhythm is the key. The dance follows. Then the song.',

  history: `Latin music is the music of many nations, born where Indigenous, European and African traditions met in the Americas. Enslaved Africans and their descendants brought the drums, the call and response and the layered rhythms that still drive it; Spain and Portugal brought guitars, harmony and song forms; Indigenous peoples brought flutes, rattles and rhythms of their own. Every country mixed them differently, and each gave the world a style.

On Colombia’s Caribbean coast, cumbia grew from Afro-Colombian drums and Indigenous gaita flutes into the dance-band music of the 1940s, then spread across Latin America — Mexico’s Los Ángeles Azules and the Tejano star Selena made it their own. In Jalisco, Mexico, mariachi brought violins, trumpets, the vihuela and the deep guitarrón together; Vicente Fernández sang its rancheras for half a century, and UNESCO named mariachi part of the world’s cultural heritage in 2011. Reggaeton began in the 1990s, when Panama’s reggae en español and Puerto Rico’s underground took up the dembow rhythm of Jamaican dancehall; Tego Calderón, Ivy Queen and Daddy Yankee carried it worldwide, and Bad Bunny became the most-streamed artist on the planet.

In the Dominican Republic, merengue’s tambora, güira and accordion became a national symbol: Johnny Ventura electrified it in the 1960s and Juan Luis Guerra gave it poetry. Bachata, guitar music first recorded in 1962 and long dismissed as music of the poor, won respect with Guerra’s Bachata Rosa (1990), and Aventura, from the Bronx, took it to the charts. In Havana in the early 1950s the violinist Enrique Jorrín wrote the first cha-cha-chás, named for the shuffle of the dancers’ feet. The bolero, born in Santiago de Cuba in the 1880s, became the love song of the whole Spanish-speaking world, from Trío Los Panchos to Luis Miguel.

Brazil’s samba grew in the Afro-Brazilian neighborhoods of Rio de Janeiro early in the twentieth century; in the late 1950s João Gilberto brought its rhythm down to a whisper on a nylon-string guitar, and with Antônio Carlos Jobim’s songs bossa nova — “the new thing” — was born. In Buenos Aires and Montevideo, tango came out of immigrant neighborhoods at the end of the 1800s, mixing European dances with the Afro-Argentine candombe and the milonga; Carlos Gardel was its voice, and Astor Piazzolla’s bandoneón made it modern. In Cuba, the son joined Spanish song to African rhythm around the clave, the five-stroke pattern everything locks to. Arsenio Rodríguez built the son montuno in the 1940s, Machito and Mario Bauzá carried it to New York to meet jazz, and New York’s salsa — Tito Puente, Celia Cruz — sent it around the world, as the Buena Vista Social Club did again in 1997. Latinos were part of hip hop from its very first Bronx parties too; that story is on the Hip Hop page.

Underneath every style: the rhythms of the African diaspora, the dance they were made for, and the song.`,

  primaryArtists: [
    {
      name: 'Daddy Yankee',
      era: '1990s–2020s',
      styleRef: 'l1a',
      role: 'Singer / Rapper',
      tracks: ['Gasolina', 'Despacito (Luis Fonsi ft. Daddy Yankee)'],
    },
    {
      name: 'Ivy Queen',
      era: '1990s–present',
      styleRef: 'l1a',
      role: 'Singer / Rapper — the Queen of Reggaeton',
      tracks: ['Quiero Bailar', 'Te He Querido, Te He Llorado'],
    },
    {
      name: 'Tego Calderón',
      era: '2000s–present',
      styleRef: 'l1a',
      role: 'Rapper',
      tracks: ["Pa' Que Retozen", 'Al Natural'],
    },
    {
      name: 'Bad Bunny',
      era: '2010s–present',
      styleRef: 'l1a',
      role: 'Singer / Rapper',
      tracks: ['Tití Me Preguntó', 'Ojitos Lindos (ft. Bomba Estéreo)'],
    },
    {
      name: 'Totó la Momposina',
      era: '1960s–present',
      styleRef: 'l1b',
      role: 'Singer — Afro-Colombian cumbia',
      tracks: ['La Candela Viva', 'Curura'],
    },
    {
      name: 'Selena',
      era: '1980s–1995',
      styleRef: 'l1b',
      role: 'Singer — Tejano cumbia',
      tracks: ['Baila Esta Cumbia', 'Bidi Bidi Bom Bom'],
    },
    {
      name: 'Los Ángeles Azules',
      era: '1980s–present',
      styleRef: 'l1b',
      role: 'Band — Mexican cumbia',
      tracks: ['Cómo Te Voy a Olvidar', '17 Años'],
    },
    {
      name: 'Mariachi Vargas de Tecalitlán',
      era: '1897–present',
      styleRef: 'l1c',
      role: 'Mariachi',
      tracks: ['El Son de la Negra', 'Cielito Lindo'],
    },
    {
      name: 'Vicente Fernández',
      era: '1960s–2021',
      styleRef: 'l1c',
      role: 'Singer — ranchera',
      tracks: ['Volver, Volver', 'El Rey'],
    },
    {
      name: 'Johnny Ventura',
      era: '1960s–2021',
      styleRef: 'l2a',
      role: 'Bandleader / Singer',
      tracks: ['Patacón Pisao', 'El Cuabero'],
    },
    {
      name: 'Juan Luis Guerra',
      era: '1980s–present',
      styleRef: 'l2a',
      role: 'Singer / Songwriter — merengue and bachata',
      tracks: ['Ojalá Que Llueva Café', 'Burbujas de Amor'],
    },
    {
      name: 'Aventura',
      era: '1990s–present',
      styleRef: 'l2b',
      role: 'Group (Romeo Santos)',
      tracks: ['Obsesión', 'Mi Corazoncito'],
    },
    {
      name: 'Prince Royce',
      era: '2010s–present',
      styleRef: 'l2b',
      role: 'Singer',
      tracks: ['Stand by Me', 'Corazón Sin Cara'],
    },
    {
      name: 'Enrique Jorrín',
      era: '1940s–1987',
      styleRef: 'l2c',
      role: 'Violinist / Composer — created the cha-cha-chá',
      tracks: ['La Engañadora'],
    },
    {
      name: 'Pérez Prado',
      era: '1940s–1989',
      styleRef: 'l2c',
      role: 'Bandleader — the King of Mambo',
      tracks: ['Cherry Pink and Apple Blossom White', 'Mambo No. 5'],
    },
    {
      name: 'Trío Los Panchos',
      era: '1940s–1990s',
      styleRef: 'l2d',
      role: 'Trio',
      tracks: ['Sabor a Mí', 'Bésame Mucho'],
    },
    {
      name: 'Luis Miguel',
      era: '1980s–present',
      styleRef: 'l2d',
      role: 'Singer',
      tracks: ['La Barca', 'Inolvidable'],
    },
    {
      name: 'João Gilberto',
      era: '1950s–2019',
      styleRef: 'l3a',
      role: 'Singer / Guitarist',
      tracks: [
        'Chega de Saudade',
        'The Girl from Ipanema (with Stan Getz and Astrud Gilberto)',
      ],
    },
    {
      name: 'Antônio Carlos Jobim',
      era: '1950s–1994',
      styleRef: 'l3a',
      role: 'Composer / Pianist',
      tracks: ['Águas de Março (with Elis Regina)', 'Wave'],
    },
    {
      name: 'Carlos Gardel',
      era: '1910s–1935',
      styleRef: 'l3b',
      role: 'Singer',
      tracks: ['Por una Cabeza', 'Mi Buenos Aires Querido'],
    },
    {
      name: 'Astor Piazzolla',
      era: '1940s–1992',
      styleRef: 'l3b',
      role: 'Bandoneón / Composer',
      tracks: ['Libertango', 'Adiós Nonino'],
    },
    {
      name: 'Arsenio Rodríguez',
      era: '1930s–1970',
      styleRef: 'l3c',
      role: 'Tres / Bandleader — the son montuno',
      tracks: ['Bruca Maniguá', "Dame un Cachito pa' Huelé"],
    },
    {
      name: 'Machito',
      era: '1940s–1984',
      styleRef: 'l3c',
      role: 'Bandleader — Machito and His Afro-Cubans',
      tracks: ['Tanga', 'Mambo Inn'],
    },
    {
      name: 'Tito Puente',
      era: '1940s–2000',
      styleRef: 'l3c',
      role: 'Timbalero / Bandleader',
      tracks: ['Oye Como Va', 'Ran Kan Kan'],
    },
    {
      name: 'Celia Cruz',
      era: '1950s–2003',
      styleRef: 'l3c',
      role: 'Singer — the Queen of Salsa',
      tracks: ['La Vida Es un Carnaval', 'Quimbara'],
    },
    {
      name: 'Buena Vista Social Club',
      era: '1990s',
      styleRef: 'l3c',
      role: 'Ensemble',
      tracks: ['Chan Chan', 'El Cuarto de Tula'],
    },
  ],

  subGenres: [
    'Reggaeton',
    'Cumbia',
    'Mariachi',
    'Merengue',
    'Bachata',
    'Cha-cha-chá',
    'Bolero',
    'Bossa Nova',
    'Samba',
    'Tango',
    'Son Cubano',
    'Mambo',
    'Salsa',
    'Latin Jazz',
    'Latin Pop',
  ],
  crossoverGenres: ['Hip Hop', 'Jazz', 'Pop', 'R&B', 'Rock', 'African'],

  characteristics: [
    'Rhythm first: every style has a pattern the whole band locks to — the tresillo, the clave, the tumbao',
    'Made for dancing: many styles are named for their dance, and shaped by it',
    'Minor keys with a raised 7th: B7 pulling home to E minor',
    'Comping is rhythm too: chords on the “and”s, rolling arpeggios, montunos',
    'The bass often arrives early, landing the next chord before the bar line',
    'Guitars, piano, brass and hand percussion: güiro, congas, bongos, timbales, claves',
    'African, European and Indigenous roots, mixed differently in every country',
  ],

  levels: {
    1: {
      keyCenter: 'E minor',
      mode: 'Minor Pentatonic / Harmonic Minor / Major',
      keyMidi: 64,
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleNotes: ['E', 'G', 'A', 'B', 'D'],
      scales: [
        {
          name: 'Minor Pentatonic',
          scaleId: 'minor_pentatonic',
          intervals: [0, 3, 5, 7, 10],
          notes: ['E', 'G', 'A', 'B', 'D'],
        },
        {
          name: 'Harmonic Minor',
          scaleId: 'harmonic_minor',
          intervals: [0, 2, 3, 5, 7, 8, 11],
          notes: ['E', 'F♯', 'G', 'A', 'B', 'C', 'D♯'],
        },
        {
          // Mariachi is in G major (D-078, D-089).
          name: 'Major',
          scaleId: 'ionian',
          intervals: [0, 2, 4, 5, 7, 9, 11],
          notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F♯'],
          key: 'G major',
          keyMidi: 67,
        },
      ],
      tempoRange: '92–126 BPM',
      primaryVoicings: [
        {
          label: 'Em → C, voice-led',
          symbol: 'Em',
          midis: [64, 67, 71], // E4-G4-B4
          description:
            'E–G–B to E–G–C: two notes stay, one moves — the reggaeton loop',
        },
        {
          label: 'Am over E',
          symbol: 'Am',
          midis: [64, 69, 72], // E4-A4-C5
          description: 'E–A–C: E stays at the bottom from E minor to A minor',
        },
        {
          label: 'B7 — the first 7th chord',
          symbol: 'B7',
          midis: [59, 63, 66, 69], // B3-D#4-F#4-A4
          description: 'D♯, the leading tone, pulls home to E',
          scaleId: 'harmonic_minor',
        },
        {
          label: 'G — bass, chord, chord',
          symbol: 'G',
          midis: [43, 47, 50, 55], // G2 + B2-D3-G3
          description:
            'The mariachi vals in the left hand: the bass on 1, the chord on 2 and 3',
          scaleId: 'ionian',
        },
        {
          label: 'D7',
          symbol: 'D7',
          midis: [62, 66, 69, 72], // D4-F#4-A4-C5
          description: 'The 5 dom7 of G major, leading the vals home',
          scaleId: 'ionian',
        },
      ],
      technique: {
        melody: {
          summary:
            'E minor pentatonic, E harmonic minor, then G major — a scale for each style, then its melodies.',
          details: [
            'Each scale: up out of time, down out of time, up & down in time',
            'Reggaeton: melodies on the tresillo — beat 1, the “and” of 2, beat 4',
            'Cumbia: D♯, the leading tone, resolving up to E',
            'Mariachi: melodies in 3/4',
          ],
        },
        chords: {
          summary: 'Triads and the first 7th chord, voice-led.',
          details: [
            'Reggaeton: Em – C – G – D, comped on the tresillo',
            'Cumbia: Em – Am – B7 – Em, short chords on every “and”',
            'Mariachi: G – C – D7 – G in 3/4, chords on 2 and 3',
          ],
        },
        bass: {
          summary: 'Three bass patterns, one for each style.',
          details: [
            'Reggaeton: the roots on the tresillo',
            'Cumbia: root, then 3 and 5 — the cumbia bounce',
            'Mariachi: root, then 5, like the guitarrón',
          ],
        },
        performance: {
          summary: 'Left-hand bass, right-hand chords — then the vals.',
          details: [
            'Reggaeton and cumbia: LH bass + RH chords, out of time, then over the groove',
            'Mariachi: the LH vals (bass, chord, chord) under an RH melody',
          ],
        },
      },
      entryLabel: 'Start Level 1',
      locked: false,
    },

    2: {
      keyCenter: 'E minor',
      mode: 'Natural Minor / Melodic Minor',
      keyMidi: 64,
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleNotes: ['E', 'F♯', 'G', 'A', 'B', 'C', 'D'],
      scales: [
        {
          name: 'Natural Minor',
          scaleId: 'aeolian',
          intervals: [0, 2, 3, 5, 7, 8, 10],
          notes: ['E', 'F♯', 'G', 'A', 'B', 'C', 'D'],
        },
        {
          name: 'Melodic Minor',
          scaleId: 'melodic_minor',
          intervals: [0, 2, 3, 5, 7, 9, 11],
          notes: ['E', 'F♯', 'G', 'A', 'B', 'C♯', 'D♯'],
        },
      ],
      tempoRange: '90–148 BPM',
      primaryVoicings: [
        {
          label: 'Merengue — hands taking turns',
          symbol: 'Em',
          midis: [52, 55, 59, 67, 71], // E3-G3-B3 + G4-B4
          description:
            'LH E–G–B on the “and”s, RH G–B and the octave E on the beats',
        },
        {
          label: 'Bachata roll over B7',
          symbol: 'B7',
          midis: [66, 71, 75], // F#4-B4-D#5
          description:
            'F♯–B–D♯, one note at a time: three notes rolling across eight eighths',
        },
        {
          label: 'Cha-cha Am',
          symbol: 'Am',
          midis: [60, 64, 69], // C4-E4-A4
          description: 'C–E–A after E–G–B: each note moves a step or less',
        },
        {
          label: 'Bolero B7, 7th on the bottom',
          symbol: 'B7',
          midis: [57, 59, 63], // A3-B3-D#4
          description: 'A falls to G, D♯ rises to E — the bolero cadence',
          scaleId: 'melodic_minor',
        },
      ],
      technique: {
        melody: {
          summary:
            'The three minor scales: natural, harmonic (over B7) and melodic.',
          details: [
            'Merengue: natural minor in eighths, then riffs that push the “and” of 2',
            'Bachata: three steps and a tap — then every bar arriving early, on the “and” of 4',
            'Cha-cha-chá: the “4 & 1” figure into every chord',
            'Bolero: melodic minor, the leap of a sixth, and a climb over B7 into E',
          ],
        },
        chords: {
          summary:
            'Em – Am – B7 – Em in four styles, from the band’s own keyboard parts.',
          details: [
            'Merengue: dyads and octaves on the beats',
            'Bachata: a three-note arpeggio rolling across the bar',
            'Cha-cha-chá: close voicings, on and off the beat',
            'Bolero: B7 with its 7th on the bottom, chords on every “and”',
          ],
        },
        bass: {
          summary: 'Four bass patterns from the band’s bassist.',
          details: [
            'Merengue: root and 5 on every beat',
            'Bachata: root, root, 5, root',
            'Cha-cha-chá: “cha-cha” on 4 and its “and”, into the next root',
            'Bolero: the 3+3+2 — root, 5, root',
          ],
        },
        performance: {
          summary: 'Both hands, the way the band’s pianist plays them.',
          details: [
            'Merengue and cha-cha-chá: the hands take turns, on and off the beat',
            'Bachata: LH open fifths under the RH arpeggio',
            'Bolero: LH bass + RH chords, then LH chords + RH melody',
          ],
        },
      },
      entryLabel: 'Start Level 2',
      locked: false,
    },

    3: {
      keyCenter: 'E minor',
      mode: 'Natural Minor / Harmonic Minor',
      keyMidi: 64,
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleNotes: ['E', 'F♯', 'G', 'A', 'B', 'C', 'D'],
      scales: [
        {
          name: 'Natural Minor',
          scaleId: 'aeolian',
          intervals: [0, 2, 3, 5, 7, 8, 10],
          notes: ['E', 'F♯', 'G', 'A', 'B', 'C', 'D'],
        },
        {
          name: 'Harmonic Minor',
          scaleId: 'harmonic_minor',
          intervals: [0, 2, 3, 5, 7, 8, 11],
          notes: ['E', 'F♯', 'G', 'A', 'B', 'C', 'D♯'],
        },
      ],
      tempoRange: '100–160 BPM',
      primaryVoicings: [
        {
          label: 'Em9, rootless',
          symbol: 'Em9',
          midis: [40, 55, 59, 62, 66], // E2 + G3-B3-D4-F#4
          description:
            'G–B–D–F♯ over the bass’s E: the 3, 5, 7 and 9 — bossa piano',
        },
        {
          label: 'Am9 → B7, a step down',
          symbol: 'Am9',
          midis: [55, 59, 60, 64], // G3-B3-C4-E4
          description: 'G–B–C–E: to B7, every finger slides down a step',
        },
        {
          label: 'Am6 — tango',
          symbol: 'Am6',
          midis: [66, 69, 72], // F#4-A4-C5
          description: 'F♯–A–C: F♯ stays in every chord of the tango',
        },
        {
          label: 'Montuno octaves',
          symbol: 'Em',
          midis: [67, 71, 79], // G4-B4-G5
          description:
            'An octave with the third inside: the salsa pianist’s montuno',
          scaleId: 'harmonic_minor',
        },
      ],
      technique: {
        melody: {
          summary:
            'Color and clave: 9ths for bossa, two octaves of harmonic minor for tango, coros on the clave.',
          details: [
            'Bossa: Em9 and Am9 arpeggios, then long notes and anticipations',
            'Tango: the band guitarist’s line — C sighing onto B, quick sixteenths on beat 3',
            'Afro-Cuban: rumba clave 2-3 and son clave 3-2, then coros sung on the clave',
          ],
        },
        chords: {
          summary: 'Rootless 9th chords, tango voicings and the montuno.',
          details: [
            'Bossa: four-note voicings without the root, on 1, 2 and the “and” of 3',
            'Tango: F♯ held through every chord; the síncopa (3+3+2), then the marcato',
            'Afro-Cuban: the pianist’s montuno in octaves, 2-3 and 3-2',
          ],
        },
        bass: {
          summary: 'Bossa, tango and the tumbao.',
          details: [
            'Bossa: root and the 5 below, in the bossa rhythm',
            'Tango: root, the note above the 5, then the 5 — on the 3+3+2',
            'Tumbao: beat 1 left empty; the next chord’s root arrives early, on 4',
          ],
        },
        performance: {
          summary: 'Three bands, two hands.',
          details: [
            'Bossa: LH bass + RH rootless voicings',
            'Tango: LH bass + RH marcato, then LH chords under the guitarist’s line',
            'Afro-Cuban: the montuno in both hands — three E’s at once',
          ],
        },
      },
      entryLabel: 'Start Level 3',
      locked: false,
    },
  },
};
