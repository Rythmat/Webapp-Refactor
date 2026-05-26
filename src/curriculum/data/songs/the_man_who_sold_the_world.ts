import type { Song } from '@/curriculum/types/songLibrary';

export const the_man_who_sold_the_world: Song = {
  id: 'the_man_who_sold_the_world',
  title: 'The Man Who Sold The World',
  artist: 'David Bowie',
  year: 1970,
  historicalDescription:
    "David Bowie releases 'The Man Who Sold The World' in 1970, a brooding, heavy rock track that signals a dramatic artistic shift. With guitarist Mick Ronson shaping its dark, muscular sound, the album marks Bowie's move toward a harder edge — laying the groundwork for the glam rock reinventions that would soon make him a global icon.",
  key: 'D minor',
  keyRoot: 62,
  mode: 'minor',
  tempo: 117,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            {
              degree: '6 min7/♯7',
              chordName: 'B♭min7/D♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '6 min7/♯7',
              chordName: 'B♭min7/D♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '6 min7/♯7',
              chordName: 'B♭min7/D♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '6 min7/♯7',
              chordName: 'B♭min7/D♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=u3MX-rUtS6M' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/david-bowie.webp',
  popularity: 50,
};
