import type { Song } from '@/curriculum/types/songLibrary';

export const beautiful: Song = {
  id: 'beautiful',
  title: 'Beautiful',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King opens her landmark album 'Tapestry' with 'Beautiful', a quiet affirmation of self-worth that sets the emotional tone for one of the best-selling albums in history. In 1971, King steps out from behind the songwriting desk — where she had crafted hits for others for over a decade — and plants her own voice at the center of popular music. The song's gentle confidence resonates with a generation searching for exactly that.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 152,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 10,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 dim7/5',
              chordName: 'E♭dim7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'A♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'A♭/B♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/5',
              chordName: 'C min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/5',
              chordName: 'C min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/♭5',
              chordName: 'C min7/A',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/♭5',
              chordName: 'C min7/A',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '♯3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯7 7', chordName: 'D7b9', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯7 7', chordName: 'D7b9', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 10,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 dim7/5',
              chordName: 'E♭dim7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'A♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'A♭/B♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 12,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/♯6', chordName: 'A♭/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/♯6', chordName: 'A♭/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E♭/G', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7/6', chordName: 'C♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7/6', chordName: 'C♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '7 min7/5',
              chordName: 'C♯min7/A♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '7 min7/5',
              chordName: 'C♯min7/A♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'D♯7b9', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'D♯7b9', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♭2 maj/4', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/4', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 12,
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '3 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 maj/4', chordName: 'E/G♯', beat: 1, duration: 1 },
            { degree: '♭5 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '3 7/5', chordName: 'F♯7/A♯', beat: 3, duration: 1 },
            { degree: '♭5 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯6 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯6 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯6 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯6 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj/6', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj/6', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      measuresPerRow: 12,
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 7/♯7', chordName: 'E7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 7/♯7', chordName: 'E7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 maj/4', chordName: 'E/G♯', beat: 1, duration: 1 },
            { degree: '♭5 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '3 7/5', chordName: 'F♯7/A♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯6 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯6 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=dj4A62pJ1Vs' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/carole-king.webp',
  popularity: 50,
};
