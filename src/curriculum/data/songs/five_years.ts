import type { Song } from '@/curriculum/types/songLibrary';

export const five_years: Song = {
  id: 'five_years',
  title: 'Five Years',
  artist: 'David Bowie',
  year: 2015,
  historicalDescription:
    "David Bowie opens 'The Rise and Fall of Ziggy Stardust and the Spiders from Mars' with 'Five Years', a slow-building apocalyptic vision of Earth's final countdown. The track establishes the emotional core of Bowie's Ziggy Stardust persona — a world on the brink, desperate for a rock and roll savior. It remains one of the most haunting album openers in rock history.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 156,
  timeSignature: [3, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 8,
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 3 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 3 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 3 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 10,
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 10,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 3 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 3 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 3 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8gPSGrpIlkc' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/david-bowie.webp',
  popularity: 50,
};
