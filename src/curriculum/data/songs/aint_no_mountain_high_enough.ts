import type { Song } from '@/curriculum/types/songLibrary';

export const aint_no_mountain_high_enough: Song = {
  id: 'aint_no_mountain_high_enough',
  title: 'Ain’t No Mountain High Enough',
  artist: 'Marvin Gaye',
  year: 2012,
  historicalDescription:
    "Marvin Gaye and Tammi Terrell release 'Ain't No Mountain High Enough' on Motown, a soaring declaration of devotion written by Nickolas Ashford and Valerie Simpson. Their electric vocal chemistry captures the joy and ambition of soul music at its peak, and the song becomes one of the defining duets of the 1960s — later reimagined as a #1 hit by Diana Ross in 1970.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '♯3 min7/2', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7/2', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'A♭min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'A♭min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♯7 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '5 maj/♯7', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '♯6 maj/♭2', chordName: 'E/G♯', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '♯3 min7/2', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7/2', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'A♭min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'A♭min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♯7 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '5 maj/♯7', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '♯6 maj/♭2', chordName: 'E/G♯', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '2 7', chordName: 'A7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'A7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'A7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'A7sus', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♯7 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/1', chordName: 'A/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/1', chordName: 'A/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '♯3 min7/2', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7/2', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Cmin7/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Cmin7/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Cmin7/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Cmin7/B♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Cmin7/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Cmin7/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '6 maj/1', chordName: 'E♭/G', beat: 2, duration: 1 },
            { degree: '♭2 maj', chordName: 'A♭', beat: 3, duration: 1 },
            { degree: '7 7/2', chordName: 'F7/A', beat: 4, duration: 1 },
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
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 maj/1', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=IC5PL0XImjw' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
