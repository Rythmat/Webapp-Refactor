import type { Song } from '@/curriculum/types/songLibrary';

export const joy_inside_my_tears: Song = {
  id: 'joy_inside_my_tears',
  title: 'Joy Inside My Tears',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Joy Inside My Tears' as the closing track of Songs in the Key of Life, his sweeping double album that arrives in 1976 as a landmark of Black American music. The song distills the album's emotional core — grief and gratitude held in the same breath — and helps cement Wonder's place as one of the most complete artist-composers of his generation.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 50,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'E/B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'E/B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'E/B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'E/B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Ecl4I_5ZLgk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
