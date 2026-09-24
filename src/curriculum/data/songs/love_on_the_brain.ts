import type { Song } from '@/curriculum/types/songLibrary';

export const love_on_the_brain: Song = {
  id: 'love_on_the_brain',
  title: 'Love On The Brain',
  artist: 'Rihanna',
  year: undefined,

  historicalDescription:
    "Rihanna releases 'Love On The Brain', a raw, gospel-drenched soul ballad that stuns listeners expecting club anthems. Channeling the fervor of 1960s soul singers, she delivers one of the most vocally demanding performances of her career — a sharp departure that reveals the full range of her artistry and silences doubters who questioned her vocal depth.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 172,
  timeSignature: [6, 8],

  difficulty: 2,
  genreTags: ['hip hop', 'rnb'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=QMP-o8WXSPM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/rihanna.webp',
  popularity: 50,
};
