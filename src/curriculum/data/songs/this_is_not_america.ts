import type { Song } from '@/curriculum/types/songLibrary';

export const this_is_not_america: Song = {
  id: 'this_is_not_america',
  title: 'This Is Not America',
  artist: 'David Bowie',
  year: 1985,
  historicalDescription:
    "David Bowie collaborates with jazz trumpeter Pat Metheny Group to create 'This Is Not America', the haunting theme for the Cold War spy film 'The Falcon and the Snowman'. The track blurs the line between pop and jazz, its melancholy restraint making it one of Bowie's most quietly devastating recordings — a meditation on disillusionment with the American dream.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7/2', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7/2', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7/2', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7/2', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Emin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
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
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Emin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Emin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '♯3 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7/2', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 min7/2', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/3',
              chordName: 'D♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/3',
              chordName: 'D♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/3',
              chordName: 'D♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '1 min7/3',
              chordName: 'D♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ubc3o2KZA4w' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/david-bowie.webp',
  popularity: 50,
};
