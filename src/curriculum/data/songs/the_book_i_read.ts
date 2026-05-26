import type { Song } from '@/curriculum/types/songLibrary';

export const the_book_i_read: Song = {
  id: 'the_book_i_read',
  title: 'The Book I Read',
  artist: 'Talking Heads',
  year: 1977,
  historicalDescription:
    "Talking Heads release 'The Book I Read' on their debut album, emerging from the fertile art-punk scene of CBGB in New York City. David Byrne's anxious, nervy delivery and the band's jittery rhythms announce a new kind of rock — cerebral, twitchy, and utterly unlike anything coming out of mainstream America in 1977.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
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
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
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
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      repeatCount: 6,
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
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
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      repeatCount: 6,
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ZLkmYOGZHzE' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/talking-heads.webp',
  popularity: 50,
};
