import type { Song } from '@/curriculum/types/songLibrary';

export const slippery_people: Song = {
  id: 'slippery_people',
  title: "Slippery People",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Amin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
