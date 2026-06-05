import type { Song } from '@/curriculum/types/songLibrary';

export const cruise: Song = {
  id: 'cruise',
  title: 'Cruise',
  artist: 'Florida Georgia Line',
  year: 2013,
  historicalDescription:
    "Florida Georgia Line's 'Cruise' becomes a cultural flashpoint for the bro-country movement sweeping Nashville in the early 2010s. Its sun-soaked blend of country twang and hip-hop influenced production captures the sound of Southern youth on a summer night — and its massive crossover success forces country radio to reckon with a new generation's tastes.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 74,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 9,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8PvebsWcpto' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/florida-georgia-line.webp',
  popularity: 50,
};
