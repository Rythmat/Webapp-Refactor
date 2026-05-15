import type { Song } from '@/curriculum/types/songLibrary';

export const aint_no_other_man: Song = {
  id: 'aint_no_other_man',
  title: "Ain't No Other Man",
  artist: 'Christina Aguilera',
  year: 2006,
  historicalDescription:
    "Christina Aguilera releases 'Ain't No Other Man' as the lead single from her Back to Basics album, a bold throwback to 1920s jazz and swing wrapped in modern production. The song signals Aguilera's artistic ambitions beyond pop stardom, showcasing her powerhouse vocals against big-band brass and vintage soul — and earns her a Grammy for Best Female Pop Vocal Performance.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '♭5 dim7', chordName: 'Bdim7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/5', chordName: 'Fmin7/C', beat: 1, duration: 2 },
            { degree: '♭2 7/6', chordName: 'G♭7/D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'D♭7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
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
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
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
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'D♭7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
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
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'D♭7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '6 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 7', chordName: 'D♭7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 7', chordName: 'D♭7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '6 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 7', chordName: 'D♭7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
          restBars: 2,
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'D♭7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
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
            { degree: '♯6 min7', chordName: 'Dmin7b5', beat: 1, duration: 1 },
            { degree: '7 7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Dmin7b5', beat: 1, duration: 1 },
            { degree: '7 7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8x7Ta89QLo4' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
