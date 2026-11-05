import type { GenreProfile } from '../../types/genreProfile';

/**
 * Jazz Overview. Mirrors the authored flows (jazz_v2.ts), built from Peter's
 * ICP Studio jazz material: L1 Jazz Foundations (C), L2 Color & Transfer (C), L3 The
 * ii–V–I (F; C; D minor). Artists are grouped by the level whose language
 * they made (styleRef l1a / l2a / l3a).
 */
export const jazzProfile: GenreProfile = {
  id: 'jazz',
  displayName: 'Jazz',
  // The progress map's Jazz indigo, so the genre reads the same everywhere.
  accentColor: '#6366F1',
  tagline:
    'It starts with the blues. It swings. Lineage, Culture, and Innovation always in conversation.',

  history: `Jazz was born in New Orleans around 1900, in African American communities where the blues, ragtime, brass bands and church music met — in a city whose Congo Square had kept African drumming and dance alive. Louis Armstrong’s Hot Five and Hot Seven recordings of the 1920s put the improvising soloist at the center, and his “West End Blues” (1928) showed the world what one horn could say. At the piano was Lil Hardin Armstrong. Born in Memphis and classically trained, she met Louis in King Oliver’s Creole Jazz Band, married him in 1924, and wrote “My Heart,” the first tune the Hot Five recorded (1925); she went on to lead her own bands and to play as Decca’s house pianist.

In the 1930s jazz became America’s popular music. Duke Ellington’s orchestra turned the blues into compositions like “C Jam Blues”; Count Basie’s band, out of Kansas City, built its swing on blues riffs and a light, steady rhythm section; Mary Lou Williams wrote and played for the best bands of the era and later mentored the beboppers. Ella Fitzgerald, Billie Holiday and Sarah Vaughan made the voice an instrument.

In the 1940s, at Minton’s Playhouse in Harlem, Charlie Parker, Dizzy Gillespie, Bud Powell and Thelonious Monk created bebop: fast tempos, rich harmony, and long lines through the ii–V–I that every jazz musician still learns. Dizzy brought in the Cuban drummer Chano Pozo, and with “Manteca” Afro-Cuban jazz was born. Melba Liston played trombone and wrote arrangements for Dizzy’s big band, and went on to arrange Randy Weston’s Uhuru Afrika. In the 1950s Horace Silver and Art Blakey brought the blues and gospel back to the front, and Shirley Scott, the “Queen of the Organ,” led the Hammond B-3 into soul jazz; pianists like Ahmad Jamal, Red Garland, Wynton Kelly and Bill Evans found new ways to voice chords — the rootless voicings at the heart of this course. Miles Davis’s Kind of Blue (1959) opened modal jazz with “So What.”

In the 1960s John Coltrane pushed harmony and spirit further than anyone had, with McCoy Tyner’s chords built in fourths beneath him, and Herbie Hancock’s “Maiden Voyage” floated on sus chords. Jazz has since met rock, funk, hip hop and music from every continent, and it is taught and played all over the world.

Marian McPartland, a British pianist who made New York her home in 1946, brought jazz to the radio: for more than thirty years her Piano Jazz paired talk and duets with Bill Evans, Dave Brubeck, Chick Corea, Mary Lou Williams and many more. Maria Schneider, who learned her craft assisting Gil Evans, reshaped the modern big band around the composer’s voice. Terri Lyne Carrington, a drummer who played with Herbie Hancock and Wayne Shorter, founded Berklee’s Institute of Jazz and Gender Justice and mentors the next generations of women in the music.

Underneath it all: the blues, the swing, and a conversation between players who listen as hard as they play.`,

  primaryArtists: [
    {
      name: 'Louis Armstrong',
      era: '1920s–1971',
      styleRef: 'l1a',
      role: 'Trumpet / Vocals',
      tracks: ['West End Blues', 'What a Wonderful World'],
    },
    {
      name: 'Lil Hardin Armstrong',
      era: '1920s–1971',
      styleRef: 'l1a',
      role: 'Piano / Composer / Bandleader',
      tracks: ['My Heart (Hot Five)', 'Struttin’ with Some Barbecue'],
    },
    {
      name: 'Duke Ellington',
      era: '1920s–1974',
      styleRef: 'l1a',
      role: 'Piano / Bandleader / Composer',
      tracks: ['C Jam Blues', "Take the 'A' Train"],
    },
    {
      name: 'Count Basie',
      era: '1930s–1984',
      styleRef: 'l1a',
      role: 'Piano / Bandleader',
      tracks: ["One O'Clock Jump", 'Jumpin’ at the Woodside'],
    },
    {
      name: 'Mary Lou Williams',
      era: '1930s–1981',
      styleRef: 'l1a',
      role: 'Piano / Composer / Arranger',
      tracks: ["Roll 'Em", 'Zodiac Suite'],
    },
    {
      name: 'Oscar Peterson',
      era: '1940s–2007',
      styleRef: 'l1a',
      role: 'Piano',
      tracks: ['C Jam Blues', 'Hymn to Freedom'],
    },
    {
      name: 'Horace Silver',
      era: '1950s–2014',
      styleRef: 'l1a',
      role: 'Piano / Composer',
      tracks: ['Song for My Father', 'Señor Blues'],
    },
    {
      name: 'Shirley Scott',
      era: '1950s–2002',
      styleRef: 'l1a',
      role: 'Hammond Organ',
      tracks: ['Blue Seven', 'Soul Shoutin’'],
    },
    {
      name: 'Miles Davis',
      era: '1940s–1991',
      styleRef: 'l2a',
      role: 'Trumpet / Bandleader',
      tracks: ['So What', 'All Blues'],
    },
    {
      name: 'Bill Evans',
      era: '1950s–1980',
      styleRef: 'l2a',
      role: 'Piano',
      tracks: ['Waltz for Debby', 'Peace Piece'],
    },
    {
      name: 'Red Garland',
      era: '1950s–1984',
      styleRef: 'l2a',
      role: 'Piano',
      tracks: ['Billy Boy', 'C Jam Blues'],
    },
    {
      name: 'Wynton Kelly',
      era: '1950s–1971',
      styleRef: 'l2a',
      role: 'Piano',
      tracks: ['Kelly Blue', 'Freddie Freeloader (with Miles Davis)'],
    },
    {
      name: 'Ahmad Jamal',
      era: '1950s–2023',
      styleRef: 'l2a',
      role: 'Piano',
      tracks: ['Poinciana', 'Ahmad’s Blues'],
    },
    {
      name: 'Marian McPartland',
      era: '1940s–2013',
      styleRef: 'l2a',
      role: 'Piano / Composer / Radio Host',
      tracks: ['Twilight World', 'Theme from Piano Jazz'],
    },
    {
      name: 'Herbie Hancock',
      era: '1960s–present',
      styleRef: 'l2a',
      role: 'Piano / Keyboards',
      tracks: ['Maiden Voyage', 'Watermelon Man'],
    },
    {
      name: 'Terri Lyne Carrington',
      era: '1980s–present',
      styleRef: 'l2a',
      role: 'Drums / Composer / Educator',
      tracks: ['Continental Cliff', 'Very Special'],
    },
    {
      name: 'Maria Schneider',
      era: '1990s–present',
      styleRef: 'l2a',
      role: 'Composer / Big Band Leader',
      tracks: ['Bluebird', 'Cerulean Skies'],
    },
    {
      name: 'Charlie Parker',
      era: '1940s–1955',
      styleRef: 'l3a',
      role: 'Alto Saxophone',
      tracks: ['Now’s the Time', 'Confirmation'],
    },
    {
      name: 'Dizzy Gillespie',
      era: '1940s–1993',
      styleRef: 'l3a',
      role: 'Trumpet / Bandleader',
      tracks: ['A Night in Tunisia', 'Manteca'],
    },
    {
      name: 'Melba Liston',
      era: '1940s–1999',
      styleRef: 'l3a',
      role: 'Trombone / Arranger / Composer',
      tracks: ['Blues Melba', 'Uhuru Afrika (with Randy Weston)'],
    },
    {
      name: 'Thelonious Monk',
      era: '1940s–1982',
      styleRef: 'l3a',
      role: 'Piano / Composer',
      tracks: ["'Round Midnight", 'Straight, No Chaser'],
    },
    {
      name: 'Art Blakey',
      era: '1940s–1990',
      styleRef: 'l3a',
      role: 'Drums / Bandleader',
      tracks: ["Moanin' (Art Blakey and the Jazz Messengers)"],
    },
    {
      name: 'John Coltrane',
      era: '1950s–1967',
      styleRef: 'l3a',
      role: 'Tenor and Soprano Saxophone',
      tracks: ['Giant Steps', 'Blue Train'],
    },
    {
      name: 'McCoy Tyner',
      era: '1960s–2020',
      styleRef: 'l3a',
      role: 'Piano',
      tracks: ['Passion Dance', 'Fly with the Wind'],
    },
    {
      name: 'Ella Fitzgerald',
      era: '1930s–1996',
      styleRef: 'l3a',
      role: 'Vocals',
      tracks: ['How High the Moon', 'Mack the Knife'],
    },
    {
      name: 'Sarah Vaughan',
      era: '1940s–1990',
      styleRef: 'l3a',
      role: 'Vocals',
      tracks: ['Misty', 'Lullaby of Birdland'],
    },
  ],

  subGenres: [
    'New Orleans',
    'Swing',
    'Kansas City Blues',
    'Bebop',
    'Hard Bop',
    'Cool Jazz',
    'Modal Jazz',
    'Soul Jazz',
    'Afro-Cuban Jazz',
    'Jazz Waltz',
    'Post-Bop',
    'Fusion',
  ],
  crossoverGenres: ['Blues', 'Latin', 'Funk', 'R&B', 'Hip Hop', 'Neo Soul'],

  characteristics: [
    'Swing: eighths played long–short, the off-beats leaning forward',
    'The blues underneath everything — its form, its notes, its feeling',
    'Improvisation: the same tune never played the same way twice',
    'The ii–V–I: the chord move most jazz harmony is built from',
    'Rootless voicings and shells: the bass plays the root, the piano the color',
    'A walking bass, four to the bar, and a ride cymbal keeping time',
    'Call and response between players — a conversation in real time',
  ],

  levels: {
    1: {
      keyCenter: 'C major',
      mode: 'Major / Major Blues / Minor Blues',
      keyMidi: 60,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      scales: [
        {
          name: 'Major',
          scaleId: 'ionian',
          intervals: [0, 2, 4, 5, 7, 9, 11],
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        },
        {
          name: 'Major Blues',
          scaleId: 'major_blues',
          intervals: [0, 2, 3, 4, 7, 9],
          notes: ['C', 'D', 'E♭', 'E', 'G', 'A'],
        },
        {
          name: 'Minor Blues',
          scaleId: 'minor_blues',
          intervals: [0, 3, 5, 6, 7, 10],
          notes: ['C', 'E♭', 'F', 'G♭', 'G', 'B♭'],
        },
      ],
      tempoRange: '90–100 BPM, swung',
      primaryVoicings: [
        {
          label: '1-3-7 shell, Cmaj7',
          symbol: 'Cmaj7',
          midis: [48, 52, 59], // C3-E3-B3
          description: 'Root, 3rd and 7th: the left hand’s first jazz voicing',
        },
        {
          label: '1-3-6 shell, C6',
          symbol: 'C6',
          midis: [48, 52, 57], // C3-E3-A3
          description: 'The 6th in place of the 7th',
        },
        {
          label: '7-3-5, Dm7',
          symbol: 'Dm7',
          midis: [60, 65, 69], // C4-F4-A4
          description: 'Rootless: the bass has the root',
        },
        {
          label: '3-7-9, G7',
          symbol: 'G7',
          midis: [59, 65, 69], // B3-F4-A4
          description: 'The secret formula: from Dm7, one note moves',
        },
      ],
      technique: {
        melody: {
          summary:
            'Blues language: the C major and C minor blues scales, then a phrase at a time.',
          details: [
            'The C major blues scale, C–D–E♭–E–G–A: up, down, then in swung eighths',
            'Four blues phrases over C7: the minor 3rd against the major 3rd, grace notes, a triplet',
            'Phrase 1 again over F7 and B♭7',
            'The C minor blues scale, C–E♭–F–G♭–G–B♭, then four minor blues lines',
          ],
        },
        chords: {
          summary: '1-3-7 shells, then rootless 7-3-5 and the secret formula.',
          details: [
            '1-3-7 on Cmaj7 and 1-3-6 on C6, then on major 7, dominant 7 and minor 7',
            'Shells through a ii–V–I with the secret formula',
            '7-3-5 on Cmaj7, C7 and Cm7, then the ii–V–I in a Charleston rhythm',
            'The C blues in 1-3-7 shells',
          ],
        },
        bass: {
          summary: 'Roots, root and 5, then the two-feel.',
          details: [
            'Just Roots through the C blues',
            'Root and 5 in half notes, on one chord and through the blues',
            'The two-feel over a ii–V–I and the C blues',
          ],
        },
        performance: {
          summary:
            'Left-hand roots under right-hand voicings; 7-3-5 under a phrase.',
          details: [
            'Left hand roots, right hand rootless voicings through the ii–V–I, then swinging it',
            'Left hand roots, right hand voicings through the C blues',
            'Left hand 7-3-5, right hand Blues Phrase 1 or Minor Blues Line 1',
          ],
        },
      },
      entryLabel: 'Start Level 1',
      locked: false,
    },

    2: {
      keyCenter: 'C major',
      mode: 'Major (Ionian)',
      keyMidi: 60,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      scales: [
        {
          name: 'Major',
          scaleId: 'ionian',
          intervals: [0, 2, 4, 5, 7, 9, 11],
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        },
      ],
      tempoRange: '100–110 BPM, swung',
      primaryVoicings: [
        {
          label: '7-9-3-5, Cmaj9',
          symbol: 'Cmaj9',
          midis: [59, 62, 64, 67], // B3-D4-E4-G4
          description: 'Rootless with the 9: 7-3-5 filled in',
        },
        {
          label: 'Area code: Dm7 → G7',
          symbol: 'Dm7',
          midis: [60, 65, 69], // C4-F4-A4
          description:
            'Drop the 7 of the ii a half step: C becomes B, the 3 of G7',
        },
        {
          label: 'Rootless B, G13',
          symbol: 'G13',
          midis: [59, 64, 65, 69], // B3-E4-F4-A4
          description: '3-13-7-9 on the V, between 7-9-3-5 on the ii and the I',
        },
        {
          label: 'C Jam Blues shell, C9',
          symbol: 'C9',
          midis: [52, 58, 62], // E3-Bb3-D4
          description: '3-7-9 on the home chord of the C Jam Blues',
        },
      ],
      technique: {
        melody: {
          summary:
            'Melodies to Transfer: one scale, six colors, then into other keys.',
          details: [
            'Lines from the C major scale over Cmaj9',
            'One line each over Dmin9, Esus4♭9, Fmaj7♯11, G13sus4 and Amin7♭6 — the same notes, a new color',
            'Two-bar lines, then a line moved to F and B♭',
          ],
        },
        chords: {
          summary: 'Add the 9, learn the area codes, rootless B.',
          details: [
            '7-9-3-5 on every chord type',
            'The 7-3-5 and 3-7-9 area codes: the 7 of the ii drops a half step to the 3 of the V',
            'Rootless B, major and minor',
            'The C Jam Blues shells in their written rhythm',
          ],
        },
        bass: {
          summary: 'Peter’s blues line, then roots with approaches.',
          details: [
            'Up the chord and back: 1–3–5–6 | ♭7–6–5–3, through the C Jam Blues',
            'Three roots and a half-step approach into the next chord',
          ],
        },
        performance: {
          summary:
            'Both hands: the area code over roots, the shells over the line.',
          details: [
            'Left hand roots, right hand the 3-7-9 area code',
            'Left hand the blues line, right hand the C Jam Blues shells',
            'Left hand a rootless voicing, right hand a transfer line above it',
          ],
        },
      },
      entryLabel: 'Start Level 2',
      locked: false,
    },

    3: {
      keyCenter: 'F major',
      mode: 'Major / Harmonic Minor / Dorian',
      keyMidi: 65,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleNotes: ['F', 'G', 'A', 'B♭', 'C', 'D', 'E'],
      scales: [
        {
          name: 'Major',
          scaleId: 'ionian',
          intervals: [0, 2, 4, 5, 7, 9, 11],
          notes: ['F', 'G', 'A', 'B♭', 'C', 'D', 'E'],
        },
        {
          // The minor tension-and-release lines are in D minor.
          name: 'Harmonic Minor',
          scaleId: 'harmonic_minor',
          intervals: [0, 2, 3, 5, 7, 8, 11],
          notes: ['D', 'E', 'F', 'G', 'A', 'B♭', 'C♯'],
          key: 'D minor',
          keyMidi: 62,
        },
        {
          // The quartals move through C Dorian.
          name: 'Dorian',
          scaleId: 'dorian',
          intervals: [0, 2, 3, 5, 7, 9, 10],
          notes: ['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭'],
          key: 'C dorian',
          keyMidi: 60,
        },
      ],
      tempoRange: '100–120 BPM, swung',
      primaryVoicings: [
        {
          label: 'Rootless A, Dm9',
          symbol: 'Dm9',
          midis: [53, 57, 60, 64], // F3-A3-C4-E4
          description: '3-5-7-9 on the ii',
        },
        {
          label: 'Rootless A, G13',
          symbol: 'G13',
          midis: [53, 57, 59, 64], // F3-A3-B3-E4
          description: '7-9-3-13 on the V: the C drops to B, the rest holds',
        },
        {
          label: 'A7♭9',
          symbol: 'A7b9',
          midis: [61, 64, 67, 70], // C#4-E4-G4-Bb4
          description: 'The minor V: tension before D minor',
          scaleId: 'harmonic_minor',
        },
        {
          label: 'Quartal, C Dorian',
          symbol: 'Cm7',
          midis: [60, 65, 70], // C4-F4-Bb4
          description: 'Stacked 4ths, moving through the mode over a C pedal',
          scaleId: 'dorian',
        },
      ],
      technique: {
        melody: {
          summary:
            'ii–V Fundamental: the ii arpeggio, approaches, and lines that resolve.',
          details: [
            'The Gm7 arpeggio from the root and from the 3rd',
            'ii–V–I lines with the ii and V in one bar, then four-bar lines with an approach into the arpeggio',
            'Four-bar Line 1 in B♭ and E♭',
            'Minor tension and release in D minor',
          ],
        },
        chords: {
          summary: '3-5-7-9, rootless A, and quartals.',
          details: [
            '3-5-7-9 on every chord type',
            'Rootless A, major and minor, with the Charleston',
            'Quartals through C Dorian over a C pedal',
          ],
        },
        bass: {
          summary: 'Walking.',
          details: [
            'One chord a bar: ii–V–I, minor, and a chorus of jazz blues',
            'Two chords a bar: the I–VI–ii–V turnaround',
            'Walking in three: the jazz waltz',
          ],
        },
        performance: {
          summary: 'Two hands, three ways.',
          details: [
            'Left hand roots or walking, right hand rootless voicings',
            'Left hand rootless A, right hand a four-bar line an octave up',
            'Two-hand voicings: shells and upper structures, Peter’s quartals, Peter’s jazz blues in F',
          ],
        },
      },
      entryLabel: 'Start Level 3',
      locked: false,
    },
  },
};
