import type { Song } from '@/curriculum/types/songLibrary';

export const juice: Song = {
  id: 'juice',
  title: 'Juice',
  artist: 'Lizzo',
  year: 2018,
  historicalDescription:
    "Lizzo releases 'Juice', a strutting, self-love anthem that channels the spirit of 1970s funk and 1980s pop into something boldly modern. The Minneapolis-raised artist's unapologetic confidence and genre-blending charisma announce her as a singular voice — one that will soon carry her to mainstream stardom and ignite a cultural conversation around body positivity and self-worth.",
  key: 'D minor',
  keyRoot: 62,
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
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
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
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 8,
      bars: [
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
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
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
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
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
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
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
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 8,
      bars: [
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
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
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
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 8,
      bars: [
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
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
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
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=XaCrQL_8eMY' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
