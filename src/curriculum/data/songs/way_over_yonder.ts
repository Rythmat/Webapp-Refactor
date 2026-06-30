import type { Song } from '@/curriculum/types/songLibrary';

export const way_over_yonder: Song = {
  id: 'way_over_yonder',
  title: 'Way Over Yonder',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King releases 'Way Over Yonder' on her landmark album Tapestry, a soulful ballad rooted in gospel yearning and quiet spiritual longing. In a year when Tapestry rewrites the rules for singer-songwriters, the track stands as one of its most intimate moments — King's voice and piano stripped to their emotional core, proving that vulnerability itself can be a kind of mastery.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 88,
  timeSignature: [6, 8],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 1 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'B♭min7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '3 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 5,
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '7 maj/4', chordName: 'D♭/A♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'D♭/A♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'D♭/F', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'B♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'B♭min7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      measuresPerRow: 5,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [
            {
              degree: '♯3 min7/♯6',
              chordName: 'Gmin7/C',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♯3 min7/♯6',
              chordName: 'Gmin7/C',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E♭/G', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 2, duration: 1 },
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'A♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E♭/G', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 6 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=G8se6T5d3K0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/carole-king.webp',
  popularity: 50,
};
