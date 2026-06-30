import type { Song } from '@/curriculum/types/songLibrary';

export const you_made_me_love_you_i_didnt_want_to_do_it: Song = {
  id: 'you_made_me_love_you_i_didnt_want_to_do_it',
  title: 'You Made Me Love You (I Didn’t Want To Do It)',
  artist: 'Patsy Cline',
  year: 1968,
  historicalDescription:
    "Patsy Cline's recording of 'You Made Me Love You' arrives as a posthumous release, extending her legacy years after her tragic death in 1963. The song — a pop standard first recorded in 1913 — showcases Cline's singular ability to dissolve the line between country and pop, a gift that made her one of the most influential vocalists in American music history.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 78,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['folk'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '♭2 dim7', chordName: 'A♭dim7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 7', chordName: 'C7(♯5)', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♯6 7', chordName: 'E7', beat: 3, duration: 1 },
            { degree: '6 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '♭2 dim7', chordName: 'A♭dim7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 7/♯6', chordName: 'C7/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/♯6', chordName: 'C/E', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭5 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '♯7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '2 dim7', chordName: 'Adim7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [{ degree: '♭5 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 7/7', chordName: 'D♭7/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '6 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '♭5 7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '♯7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj/7', chordName: 'D♭/F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'E♭min7', beat: 2, duration: 1 },
            { degree: '♭2 min7', chordName: 'A♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭5 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 7', chordName: 'A7', beat: 1, duration: 1 },
            { degree: '♭2 7', chordName: 'A♭7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♯7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=nfwTIheDo6A' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/patsy-cline.webp',
  popularity: 50,
};
