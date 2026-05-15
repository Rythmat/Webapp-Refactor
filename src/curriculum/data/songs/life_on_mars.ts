import type { Song } from '@/curriculum/types/songLibrary';

export const life_on_mars: Song = {
  id: 'life_on_mars',
  title: 'Life On Mars',
  artist: 'David Bowie',
  year: 1972,
  historicalDescription:
    "David Bowie releases 'Life On Mars?' in 1972, a sweeping, cinematic ballad that captures the restless alienation of a generation raised on Hollywood dreams and television disappointment. Arranged with lush orchestration, it cements Bowie's gift for grand theatrical rock — part glam, part art song — and stands as one of the defining statements of his Ziggy Stardust era.",
  key: 'B♭ minor',
  keyRoot: 70,
  mode: 'minor',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '♯7 min7/♭5',
              chordName: 'Amin7/E',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♯7 dim7/4',
              chordName: 'Adim7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♯3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '7 maj/4', chordName: 'A♭/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'E7aug', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'A7aug', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/♭2', chordName: 'D♭/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'G♭7aug', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'G♭7aug', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Emin7b5', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '♯7 min7/♭5',
              chordName: 'Amin7/E',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♯7 dim7/4',
              chordName: 'Adim7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♯3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '7 maj/4', chordName: 'A♭/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'E7aug', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'A7aug', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/♭2', chordName: 'D♭/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'G♭7aug', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'G♭7aug', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Emin7b5', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=AZKcl4-tcuo' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
