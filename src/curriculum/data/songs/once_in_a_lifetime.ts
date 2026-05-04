import type { Song } from '@/curriculum/types/songLibrary';

export const once_in_a_lifetime: Song = {
  id: 'once_in_a_lifetime',
  title: "Once In A Lifetime",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
