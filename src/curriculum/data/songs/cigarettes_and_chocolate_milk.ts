import type { Song } from '@/curriculum/types/songLibrary';

export const cigarettes_and_chocolate_milk: Song = {
  id: 'cigarettes_and_chocolate_milk',
  title: 'Cigarettes and Chocolate Milk',
  artist: 'Rufus Wainwright',
  year: 2001,
  historicalDescription:
    "Rufus Wainwright releases 'Cigarettes and Chocolate Milk' from his album Poses, a lush, self-deprecating ode to indulgence and ambivalence. The song captures Wainwright's signature blend of baroque pop sophistication and confessional wit, cementing his reputation as one of the most distinctive singer-songwriters of his generation — a rare voice bridging cabaret, classical influence, and modern pop.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '1 maj/7', chordName: 'E/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '5 maj/2', chordName: 'B/F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'F♯min7/C♯',
              beat: 1,
              duration: 2,
            },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '1 maj/7', chordName: 'E/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '5 maj/2', chordName: 'B/F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'F♯min7/C♯',
              beat: 1,
              duration: 2,
            },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7(♯9)', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7/6', chordName: 'Amin7/C', beat: 1, duration: 2 },
            { degree: '2 dim7', chordName: 'F♯dim7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/6',
              chordName: 'F♯min7b5/C',
              beat: 1,
              duration: 2,
            },
            { degree: '5 7', chordName: 'B7b9', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/3', chordName: 'Emin7/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/5', chordName: 'Emin7/B', beat: 1, duration: 2 },
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '7 7', chordName: 'D7', beat: 1, duration: 2 },
            { degree: '7 maj/2', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'D/A', beat: 1, duration: 2 },
            { degree: '7 7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '♭2 maj/5', chordName: 'F/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/1', chordName: 'F/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/5', chordName: 'F/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/5', chordName: 'F/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '5 maj/2', chordName: 'B/F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'A7sus', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '5 maj/2', chordName: 'B/F♯', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj/1', chordName: 'B/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Bmin7/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'B7', beat: 2, duration: 1 },
            { degree: '4 g♯min7', chordName: 'AG♯min7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'B', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '1 maj/7', chordName: 'E/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '5 maj/2', chordName: 'B/F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'F♯min7/C♯',
              beat: 1,
              duration: 2,
            },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=hll_pO59ksc' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/rufus-wainwright.webp',
  popularity: 50,
};
