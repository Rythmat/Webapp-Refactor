import type { Song } from '@/curriculum/types/songLibrary';

export const contusion: Song = {
  id: 'contusion',
  title: 'Contusion',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Contusion' as part of his landmark double album 'Songs in the Key of Life' — a rare instrumental showcase that lets his jazz-fusion instincts run wild. The track bristles with technical ferocity, demonstrating Wonder's mastery across multiple instruments and his deep fluency in funk and jazz at the height of his creative peak.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 132,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'A', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '♭7 maj/♭6', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭2', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭6', chordName: 'F♯/E', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj/♭6', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭2', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'A', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '♭7 maj/♭6', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭2', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭6', chordName: 'F♯/E', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj/♭6', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭2', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'A', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_r',
      label: 'Section R',
      bars: [
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'A', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6T5q7BzpEe4' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/stevie-wonder.webp',
  popularity: 50,
};
