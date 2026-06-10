import type { Song } from '@/curriculum/types/songLibrary';

export const hard_to_handle_black_crowes: Song = {
  id: 'hard_to_handle_black_crowes',
  title: 'Hard To Handle',
  artist: 'The Black Crowes',
  year: 1990,
  historicalDescription:
    "The Black Crowes release their debut album 'Shake Your Money Maker', featuring a raw, swaggering cover of Otis Redding's 'Hard To Handle'. At a moment when rock radio is dominated by polished hair metal and the first stirrings of grunge, the Atlanta band's unapologetic embrace of classic soul and Southern rock feels like a revelation — and a rebuke.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [], restBars: 2 },
        {
          chords: [
            { degree: '4 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [], restBars: 2 },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=BRcs_OzQb14' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-black-crowes.webp',
  popularity: 50,
};
