import type { GenreProfile } from '../../types/genreProfile';

/**
 * Blues Overview. Mirrors the authored flows (blues_v2.ts), built from Peter's
 * ICP Studio blues material: L1 Shuffle Blues (C, G), L2 The 12-Bar Blues
 * (E, G; C Jam Blues in C), L3 Jazz Blues (F, B♭). Artists are grouped by the
 * style whose language they made (styleRef l1a; l2a the 4/4 shuffle and the
 * 12-bar, l2b the half-time shuffle and the slow 12/8 blues; l3a —
 * lessonStyles.ts).
 */
export const bluesProfile: GenreProfile = {
  id: 'blues',
  displayName: 'Blues',
  // The progress map's Blues slate, so the genre reads the same everywhere.
  accentColor: '#64748B',
  tagline: 'Three chords. Twelve bars. Every feeling there is.',

  history: `The blues grew up in the Mississippi Delta and across the American South in the years after slavery ended, out of work songs, field hollers, spirituals and the call and response at the heart of African American music. Around 1903, waiting for a train in Tutwiler, Mississippi, the bandleader W. C. Handy heard a man sliding a knife along his guitar strings and singing about going “where the Southern cross the Dog,” where two railroads met; Handy went on to publish “Memphis Blues” (1912) and “St. Louis Blues” (1914). In 1920 Mamie Smith’s “Crazy Blues” became the first blues recorded by a Black singer, and it sold so well that record companies went looking for more. They found Ma Rainey, the “Mother of the Blues,” who had sung in traveling tent shows since the early 1900s, and Bessie Smith, the “Empress of the Blues,” whose “St. Louis Blues” (1925) has a young Louis Armstrong answering her on cornet.

In the Delta, singers with guitars played for dances at juke joints and plantations: Charley Patton, Son House, and Robert Johnson, who recorded just twenty-nine songs, in San Antonio and Dallas in 1936 and 1937, and left “Sweet Home Chicago” and “Cross Road Blues” to every guitarist since. Memphis Minnie, as fierce a guitarist as any of them, recorded from 1929 into the 1950s; her “When the Levee Breaks” (1929, with Kansas Joe McCoy) remembers the great Mississippi flood of 1927. Big Bill Broonzy, a star of Chicago’s blues scene before the war, recorded “Key to the Highway” (1941), the eight-bar blues this course begins with. At the piano, boogie-woogie — a rolling left hand of eighth notes, from the barrelhouses and lumber camps of Texas and the South — took its name from Pinetop Smith’s “Pine Top’s Boogie Woogie” (1928). When Albert Ammons, Pete Johnson and Meade Lux Lewis played John Hammond’s From Spirituals to Swing concert at Carnegie Hall in 1938, boogie-woogie became a national craze. Sister Rosetta Tharpe played gospel on an electric guitar over a swinging beat, and songs like “Strange Things Happening Every Day” pointed the way to rock and roll.

During the Great Migration millions of African Americans moved north and west, and the blues went with them — and got louder. Muddy Waters came up from Mississippi to Chicago in 1943, plugged in, and at Chess Records built the Chicago band sound: harmonica, electric guitars, drums, Willie Dixon’s bass and songs, and Otis Spann’s piano. Howlin’ Wolf, Little Walter and Memphis Slim played the same South Side clubs. In Texas and California, T-Bone Walker took the electric guitar to the front of the band, and his “Call It Stormy Monday” (1947) is still the slow blues every band learns. In Memphis a young radio DJ called the Beale Street Blues Boy — B.B. for short — learned from T-Bone and from jazz, and for more than sixty years B.B. King and his guitar, Lucille, took the blues around the world. Big Mama Thornton’s “Hound Dog” topped the R&B chart in 1953, three years before Elvis Presley’s version; John Lee Hooker rode a single chord to a hit with “Boogie Chillen’”; Ray Charles poured gospel into the blues and helped invent soul; and in New Orleans, Professor Longhair mixed boogie-woogie with rumba into a piano style the city still dances to.

In the 1960s the blues crossed the ocean and came back as rock. The Rolling Stones named themselves after a Muddy Waters song, and young guitarists in Britain and America studied Freddie King’s “Hide Away,” Albert King’s string bends and Buddy Guy’s fire. At Chess, Etta James sang “At Last,” and Koko Taylor, later crowned the Queen of the Blues, broke through with “Wang Dang Doodle.” Katie Webster, the “Swamp Boogie Queen,” played piano on many Louisiana recording sessions and toured with Otis Redding. The session drummer Bernard Purdie worked out the half-time shuffle, ghost notes and all, that carries Steely Dan’s “Home at Last” (1977). In the 1980s Stevie Ray Vaughan brought the Texas shuffle back with Texas Flood (1983), and Bonnie Raitt, a slide guitarist who learned from and played with older masters like Sippie Wallace, won the Grammy for Album of the Year with Nick of Time. Today Shemekia Copeland, Christone “Kingfish” Ingram and many more carry it on.

The blues was in jazz from the start. In 1930s Kansas City, Count Basie’s band swung on blues riffs, and the pianist Pete Johnson and the singer Big Joe Turner made boogie-woogie roar. Duke Ellington turned a two-note riff into “C Jam Blues” (1942). Charlie Parker played the blues with bebop’s harmony in “Now’s the Time” (1945), and in “Blues for Alice” (1951) packed its twelve bars with ii–Vs: the Bird blues. In the 1950s every jazz group played blues heads — Milt Jackson’s “Bags’ Groove,” Red Garland’s “Blues by Five,” Sonny Rollins’s “Blue Seven,” Thelonious Monk’s “Blues Five Spot,” Oscar Pettiford’s “Blues in the Closet” and, on Kind of Blue (1959), Miles Davis’s “Freddie Freeloader.” Jimmy Smith and Shirley Scott put the Hammond organ at the center of it, and Kenny Burrell’s Midnight Blue (1963) is the blues at its coolest.

Underneath it all: three chords, a shuffle, and a voice — sung or played — telling the truth.`,

  primaryArtists: [
    {
      name: 'Ma Rainey',
      era: '1920s–1939',
      styleRef: 'l1a',
      role: 'Vocals — the Mother of the Blues',
      tracks: ['Bo-Weavil Blues', 'See See Rider Blues'],
    },
    {
      name: 'Bessie Smith',
      era: '1920s–1937',
      styleRef: 'l1a',
      role: 'Vocals — the Empress of the Blues',
      tracks: ['St. Louis Blues (with Louis Armstrong)', 'Downhearted Blues'],
    },
    {
      name: 'Big Bill Broonzy',
      era: '1920s–1958',
      styleRef: 'l1a',
      role: 'Guitar / Vocals',
      tracks: ['Key to the Highway', 'Just a Dream'],
    },
    {
      name: 'Memphis Minnie',
      era: '1920s–1973',
      styleRef: 'l1a',
      role: 'Guitar / Vocals',
      tracks: [
        'When the Levee Breaks (with Kansas Joe McCoy)',
        'Nothing in Rambling',
      ],
    },
    {
      name: 'Meade Lux Lewis',
      era: '1920s–1964',
      styleRef: 'l1a',
      role: 'Piano — boogie-woogie',
      tracks: ['Honky Tonk Train Blues', 'Yancey Special'],
    },
    {
      name: 'Albert Ammons',
      era: '1930s–1949',
      styleRef: 'l1a',
      role: 'Piano — boogie-woogie',
      tracks: ['Boogie Woogie Stomp', 'Shout for Joy'],
    },
    {
      name: 'Sister Rosetta Tharpe',
      era: '1930s–1973',
      styleRef: 'l1a',
      role: 'Guitar / Vocals',
      tracks: [
        'Strange Things Happening Every Day',
        'Up Above My Head (with Marie Knight)',
      ],
    },
    {
      name: 'Katie Webster',
      era: '1950s–1999',
      styleRef: 'l1a',
      role: 'Piano / Vocals — the Swamp Boogie Queen',
      tracks: ['Katie’s Boogie Woogie', 'C.Q. Boogie'],
    },
    {
      name: 'B.B. King',
      era: '1940s–2015',
      styleRef: 'l1a',
      role: 'Guitar / Vocals',
      tracks: ['The Thrill Is Gone', 'Every Day I Have the Blues'],
    },
    {
      name: 'Robert Johnson',
      era: '1930s–1938',
      styleRef: 'l2a',
      role: 'Guitar / Vocals',
      tracks: ['Sweet Home Chicago', 'Cross Road Blues'],
    },
    {
      name: 'Muddy Waters',
      era: '1940s–1983',
      styleRef: 'l2a',
      role: 'Guitar / Vocals / Bandleader',
      tracks: ['Got My Mojo Working', 'Rollin’ Stone'],
    },
    {
      name: 'Otis Spann',
      era: '1950s–1970',
      styleRef: 'l2a',
      role: 'Piano / Vocals',
      tracks: ['Great Northern Stomp', 'Otis in the Dark'],
    },
    {
      name: 'Big Mama Thornton',
      era: '1950s–1984',
      styleRef: 'l2a',
      role: 'Vocals',
      tracks: ['Hound Dog', 'Ball and Chain'],
    },
    {
      name: 'Professor Longhair',
      era: '1940s–1980',
      styleRef: 'l2a',
      role: 'Piano / Vocals',
      tracks: ['Tipitina', 'Go to the Mardi Gras'],
    },
    {
      name: 'Freddie King',
      era: '1950s–1976',
      styleRef: 'l2a',
      role: 'Guitar / Vocals',
      tracks: ['Hide Away', 'The Stumble'],
    },
    {
      name: 'Buddy Guy',
      era: '1950s–present',
      styleRef: 'l2a',
      role: 'Guitar / Vocals',
      tracks: ['Mary Had a Little Lamb', 'First Time I Met the Blues'],
    },
    {
      name: 'Koko Taylor',
      era: '1960s–2009',
      styleRef: 'l2a',
      role: 'Vocals — the Queen of the Blues',
      tracks: ['Wang Dang Doodle', 'Let the Good Times Roll'],
    },
    {
      name: 'Stevie Ray Vaughan',
      era: '1980s–1990',
      styleRef: 'l2a',
      role: 'Guitar / Vocals',
      tracks: ['Pride and Joy', 'Texas Flood'],
    },
    {
      name: 'T-Bone Walker',
      era: '1940s–1975',
      styleRef: 'l2b',
      role: 'Guitar / Vocals',
      tracks: ['Call It Stormy Monday', 'T-Bone Shuffle'],
    },
    {
      name: 'Ray Charles',
      era: '1950s–2004',
      styleRef: 'l2b',
      role: 'Piano / Vocals',
      tracks: ['I Got a Woman', 'Hallelujah, I Love Her So'],
    },
    {
      name: 'Etta James',
      era: '1950s–2012',
      styleRef: 'l2b',
      role: 'Vocals',
      tracks: ['I’d Rather Go Blind', 'At Last'],
    },
    {
      name: 'Bonnie Raitt',
      era: '1970s–present',
      styleRef: 'l2b',
      role: 'Slide Guitar / Vocals',
      tracks: ['Something to Talk About', 'Love Me Like a Man'],
    },
    {
      name: 'Bernard Purdie',
      era: '1960s–present',
      styleRef: 'l2b',
      role: 'Drums — the Purdie Shuffle',
      tracks: ['Home at Last (Steely Dan)'],
    },
    {
      name: 'Duke Ellington',
      era: '1920s–1974',
      styleRef: 'l3a',
      role: 'Piano / Bandleader / Composer',
      tracks: ['C Jam Blues', 'Happy-Go-Lucky Local'],
    },
    {
      name: 'Milt Jackson',
      era: '1940s–1999',
      styleRef: 'l3a',
      role: 'Vibraphone',
      tracks: ['Bags’ Groove', 'Bluesology'],
    },
    {
      name: 'Red Garland',
      era: '1950s–1984',
      styleRef: 'l3a',
      role: 'Piano',
      tracks: ['Blues by Five (Miles Davis Quintet)', 'C-Jam Blues'],
    },
    {
      name: 'Miles Davis',
      era: '1940s–1991',
      styleRef: 'l3a',
      role: 'Trumpet / Bandleader',
      tracks: ['Freddie Freeloader', 'All Blues'],
    },
    {
      name: 'Jimmy Smith',
      era: '1950s–2005',
      styleRef: 'l3a',
      role: 'Hammond Organ',
      tracks: ['Back at the Chicken Shack', 'The Sermon!'],
    },
    {
      name: 'Shirley Scott',
      era: '1950s–2002',
      styleRef: 'l3a',
      role: 'Hammond Organ',
      tracks: ['Blue Seven', 'Soul Shoutin’'],
    },
  ],

  subGenres: [
    'Classic Blues',
    'Delta Blues',
    'Country Blues',
    'Boogie-Woogie',
    'Texas Blues',
    'Chicago Blues',
    'Jump Blues',
    'New Orleans R&B',
    'Swamp Blues',
    'Soul Blues',
    'Blues Rock',
    'Jazz Blues',
  ],
  crossoverGenres: ['Jazz', 'Rock', 'R&B', 'Funk', 'Folk', 'Jam Band'],

  characteristics: [
    'The shuffle: eighths played as triplets, long–short — four to the bar, or slow and heavy in 12/8',
    'The 12-bar blues: three chords — I, IV and V — all of them dominant 7ths',
    'Blue notes: the ♭3 bending up toward the 3, the ♭7, and the ♭5 in between',
    'Lyrics in AAB form: a line, the same line again, then the answer',
    'Call and response: the voice sings, the guitar or piano answers',
    'A boogie bass in the left hand, rolling up and down every chord',
    'Feeling over flash: bends, slides and space, so every note says something',
  ],

  levels: {
    1: {
      keyCenter: 'C major',
      mode: 'Major blues / Mixolydian',
      keyMidi: 60,
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleNotes: ['C', 'D', 'E♭', 'E', 'G', 'A'],
      scales: [
        {
          name: 'Major Blues',
          scaleId: 'major_blues',
          intervals: [0, 2, 3, 4, 7, 9],
          notes: ['C', 'D', 'E♭', 'E', 'G', 'A'],
        },
        {
          name: 'Mixolydian',
          scaleId: 'mixolydian',
          intervals: [0, 2, 4, 5, 7, 9, 10],
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B♭'],
        },
        {
          name: 'Dorian',
          scaleId: 'dorian',
          intervals: [0, 2, 3, 5, 7, 9, 10],
          notes: ['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭'],
        },
        {
          name: 'Minor Pentatonic',
          scaleId: 'minor_pentatonic',
          intervals: [0, 3, 5, 7, 10],
          notes: ['C', 'E♭', 'F', 'G', 'B♭'],
        },
        {
          name: 'Minor Blues',
          scaleId: 'minor_blues',
          intervals: [0, 3, 5, 6, 7, 10],
          notes: ['G', 'B♭', 'C', 'D♭', 'D', 'F'],
          key: 'G minor',
          keyMidi: 67,
        },
      ],
      tempoRange: '90–100 BPM, shuffled',
      primaryVoicings: [
        {
          label: 'I–IV pair: C',
          symbol: 'C',
          midis: [64, 67, 72], // E4-G4-C5
          description: 'The I triad with its root on top',
        },
        {
          label: 'I–IV pair: F',
          symbol: 'F',
          midis: [65, 69, 72], // F4-A4-C5
          description:
            'The IV triad under the same top note: rock between them',
        },
        {
          label: '1-7 shell, C7',
          symbol: 'C7',
          midis: [48, 58], // C3-Bb3
          description: 'Root and ♭7: two notes, and the blues is there',
        },
        {
          label: '1-3-7 shell, G7',
          symbol: 'G7',
          midis: [55, 59, 65], // G3-B3-F4
          description: 'Add the 3rd: every chord of a blues is a dominant 7th',
        },
      ],
      technique: {
        melody: {
          summary:
            'Blues Language and B.B. King–style phrases, one at a time, over the shuffle.',
          details: [
            'C major blues: up and down, then in shuffled eighths',
            'Eight blues phrases over C7, and two of them again in G',
            'B.B. King–style phrases in G: few notes, a bend, a phrase repeated with a new ending',
            'The G minor blues scale and four minor lines over Gm7',
          ],
        },
        chords: {
          summary: 'The I–IV triad pair, then shells.',
          details: [
            'C and F/C: up and down, back and forth, a groove and a melody',
            'The groove again in G',
            '1-7 and 1-3-7 shells on C7, F7 and G7',
            'Both 8-bar blues: “Key to the Highway” in C, the other form in G',
          ],
        },
        bass: {
          summary: 'Roots, then the boogie.',
          details: [
            'Just Roots through both 8-bar forms',
            'Peter’s blues bass line: 1-3-5-6, then ♭7-6-5-3',
            'The boogie through the 8-bar blues, and in G minor',
          ],
        },
        performance: {
          summary: 'Two hands: shells under phrases, the boogie under triads.',
          details: [
            'Left hand 1-3-7, right hand a blues phrase',
            'Left hand the boogie, right hand the I–IV groove, in C and G',
            'The 8-bar blues in two hands, ending with a whole B.B. King–style chorus',
          ],
        },
      },
      entryLabel: 'Start Level 1',
      locked: false,
    },

    2: {
      keyCenter: 'E major',
      mode: 'Blues scale / Mixolydian',
      keyMidi: 64,
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleNotes: ['E', 'G', 'A', 'B♭', 'B', 'D'],
      scales: [
        {
          name: 'Blues',
          scaleId: 'minor_blues',
          intervals: [0, 3, 5, 6, 7, 10],
          notes: ['E', 'G', 'A', 'B♭', 'B', 'D'],
        },
        {
          name: 'Mixolydian',
          scaleId: 'mixolydian',
          intervals: [0, 2, 4, 5, 7, 9, 10],
          notes: ['E', 'F♯', 'G♯', 'A', 'B', 'C♯', 'D'],
        },
        {
          name: 'Dorian',
          scaleId: 'dorian',
          intervals: [0, 2, 3, 5, 7, 9, 10],
          notes: ['E', 'F♯', 'G', 'A', 'B', 'C♯', 'D'],
        },
        {
          name: 'Minor Pentatonic',
          scaleId: 'minor_pentatonic',
          intervals: [0, 3, 5, 7, 10],
          notes: ['E', 'G', 'A', 'B', 'D'],
        },
      ],
      tempoRange: '100 BPM shuffle; half-time shuffle in 12/8 at 100',
      primaryVoicings: [
        {
          label: '7-3-5, E7',
          symbol: 'E7',
          midis: [50, 56, 59], // D3-G#3-B3
          description: 'Rootless: the ♭7 on the bottom',
        },
        {
          label: '3-7-9, A9',
          symbol: 'A9',
          midis: [49, 55, 59], // C#3-G3-B3
          description: 'From E7, two notes move a half step and one holds',
        },
        {
          label: 'Rootless A, E9',
          symbol: 'E9',
          midis: [56, 59, 62, 66], // G#3-B3-D4-F#4
          description: 'Four notes for the half-time shuffle',
        },
        {
          label: 'C Jam Blues shell, C9',
          symbol: 'C9',
          midis: [52, 58, 62], // E3-Bb3-D4
          description: 'Peter’s left hand on the home chord of C Jam Blues',
        },
      ],
      technique: {
        melody: {
          summary: 'Phrases through the 12-bar, and what the IV changes.',
          details: [
            'The E blues scale, with its ♭5',
            'Six blues phrases moved to E',
            'Over A7 the G♯ bends down to G; over B7 the blues notes all fit',
            'Whole choruses: one riff in every bar, Phrase 3 with the bend, Phrase 1 moving with the chords',
          ],
        },
        chords: {
          summary: 'Shells that barely move, in two feels.',
          details: [
            'Peter’s C Jam Blues left hand, then its rhythm through the blues in G',
            '7-3-5 / 3-7-9 and rootless A over the Purdie Shuffle, in 12/8',
            'Long-short comping that leaves room for the backbeat',
            'The I–IV triad pair on every chord of the blues',
          ],
        },
        bass: {
          summary: 'The half-time shuffle and the boogie.',
          details: [
            'The half-time shuffle: each big beat with a triplet pickup, in E and G',
            'Peter’s line through the form, one note a beat in 12/8',
            'The boogie through the I–IV–V blues and the quick change',
          ],
        },
        performance: {
          summary: 'Both hands through the form.',
          details: [
            'Peter’s line under 3-7 shells, and the half-time shuffle under 7-3-5 / 3-7-9',
            'The boogie under triad pairs',
            'Shells under a riff, and under Phrase 3 with the bend',
          ],
        },
      },
      entryLabel: 'Start Level 2',
      locked: false,
    },

    3: {
      keyCenter: 'F major',
      mode: 'Mixolydian / Blues',
      keyMidi: 65,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleNotes: ['F', 'G', 'A', 'B♭', 'C', 'D', 'E♭'],
      scales: [
        {
          name: 'Mixolydian',
          scaleId: 'mixolydian',
          intervals: [0, 2, 4, 5, 7, 9, 10],
          notes: ['F', 'G', 'A', 'B♭', 'C', 'D', 'E♭'],
        },
        {
          name: 'Blues',
          scaleId: 'minor_blues',
          intervals: [0, 3, 5, 6, 7, 10],
          notes: ['F', 'A♭', 'B♭', 'B', 'C', 'E♭'],
        },
        {
          name: 'Dorian',
          scaleId: 'dorian',
          intervals: [0, 2, 3, 5, 7, 9, 10],
          notes: ['F', 'G', 'A♭', 'B♭', 'C', 'D', 'E♭'],
        },
        {
          name: 'Minor Pentatonic',
          scaleId: 'minor_pentatonic',
          intervals: [0, 3, 5, 7, 10],
          notes: ['F', 'A♭', 'B♭', 'C', 'E♭'],
        },
      ],
      tempoRange: '110–120 BPM, swung',
      primaryVoicings: [
        {
          label: 'Rootless A, F9',
          symbol: 'F9',
          midis: [57, 60, 63, 67], // A3-C4-Eb4-G4
          description: '3-5-7-9 on the home chord',
        },
        {
          label: 'Rootless A, Cm9 → F13',
          symbol: 'F13',
          midis: [51, 55, 57, 62], // Eb3-G3-A3-D4
          description: '7-9-3-13: the ii–V into the IV in bar 4',
        },
        {
          label: 'Two hands, F13',
          symbol: 'F13',
          midis: [41, 51, 57, 62, 65], // F2-Eb3 | A3-D4-F4
          description:
            'Peter’s home voicing: left hand 1-♭7, right hand 3-13-1',
        },
        {
          label: 'Two hands, D7♭9',
          symbol: 'D7b9',
          midis: [50, 54, 60, 63, 69], // D3-F#3 | C4-Eb4-A4
          description: 'Left hand 1-3, right hand 7-♭9-5: the VI7 into the ii',
        },
      ],
      technique: {
        melody: {
          summary: 'Blues phrases on the I, ii–V lines into the cadences.',
          details: [
            'The F blues scale, swung',
            'Blues phrases in F, the jazz blues key',
            'ii–V lines into the IV, in B♭, and four-bar lines home in F',
            'A whole chorus: phrases on the F7, a line into the B♭7, a line home',
          ],
        },
        chords: {
          summary: 'Shells, then rootless A and B.',
          details: [
            '1-7 and 1-3 shells through the jazz blues',
            'Rootless A and B in F, then rootless A in B♭',
          ],
        },
        bass: {
          summary: 'The two-feel, then walking.',
          details: [
            'The two-feel through the jazz blues',
            'Walking one chord a bar, and through the blues with the ♯iv°7',
            'Walking two chords a bar, then in B♭',
          ],
        },
        performance: {
          summary: 'Two hands, and comping real blues heads.',
          details: [
            'A walking left hand under 3-7 guide tones, in F and B♭',
            'Peter’s two-hand voicings through the jazz blues, in F and B♭',
            'Comping C Jam Blues, Bags’ Groove, Freddie Freeloader, Blues Five Spot, Blues by Five and Blue Seven over their changes',
          ],
        },
      },
      entryLabel: 'Start Level 3',
      locked: false,
    },
  },
};
