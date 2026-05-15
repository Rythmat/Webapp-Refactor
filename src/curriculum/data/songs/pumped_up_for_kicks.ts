import type { Song } from '@/curriculum/types/songLibrary';

export const pumped_up_for_kicks: Song = {
  id: 'pumped_up_for_kicks',
  title: 'Pumped Up For Kicks',
  artist: 'Foster The People',
  year: undefined,

  historicalDescription:
    "Foster The People release 'Pumped Up Kicks', an unsettling indie pop earworm wrapped in a whistling, sun-drenched melody that masks deeply dark lyrical subject matter. The contrast between its breezy, danceable sound and its disturbing narrative becomes a cultural talking point, catapulting the Los Angeles band from obscurity to global recognition and defining a new wave of indie pop crossover success.",
  key: 'F♯ minor',
  keyRoot: 66,
  mode: 'minor',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['indie_pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 2 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 9,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [], fermata: true },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=SDTZ7iX4vTQ' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
