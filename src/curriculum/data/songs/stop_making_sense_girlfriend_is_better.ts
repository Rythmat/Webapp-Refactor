import type { Song } from '@/curriculum/types/songLibrary';

export const stop_making_sense_girlfriend_is_better: Song = {
  id: 'stop_making_sense_girlfriend_is_better',
  title: "Stop Making Sense:Girlfriend is Better",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 119,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Dmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
