import type { Song } from '@/curriculum/types/songLibrary';

export const isnt_she_lovely: Song = {
  id: 'isnt_she_lovely',
  title: "Isn't She Lovely",
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Isn't She Lovely' on the landmark double album 'Songs in the Key of Life', a joyful celebration written for his newborn daughter Aisha. The song's infectious harmonica melody and euphoric groove capture Wonder at the peak of his creative powers — a period widely regarded as one of the most extraordinary runs in pop music history.",
  key: 'D♭ minor',
  keyRoot: 61,
  mode: 'minor',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funky_pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '7 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '3 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '7 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '3 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '7 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '3 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 3,
      bars: [
        {
          chords: [{ degree: '7 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '3 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=oE56g61mW44' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
