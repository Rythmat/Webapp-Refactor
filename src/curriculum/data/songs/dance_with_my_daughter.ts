import type { Song } from '@/curriculum/types/songLibrary';

export const dance_with_my_daughter: Song = {
  id: 'dance_with_my_daughter',
  title: 'Dance With My Daughter',
  artist: 'Jason Blaine',
  year: 2015,
  historicalDescription:
    "Jason Blaine releases 'Dance With My Daughter', a country-pop ode to fatherhood that resonates deeply with Canadian country audiences. The song captures the tender, milestone moments between a father and child — a theme that cuts through genre lines and connects with listeners far beyond the country-pop scene.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 158,
  timeSignature: [6, 8],

  difficulty: 2,
  genreTags: ['folk', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 5,
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 5,
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=7q-stqFU5RA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/jason-blaine.webp',
  popularity: 50,
};
