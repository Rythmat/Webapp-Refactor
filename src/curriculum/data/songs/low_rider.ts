import type { Song } from '@/curriculum/types/songLibrary';

export const low_rider: Song = {
  id: 'low_rider',
  title: "Low Rider",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 142,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Gmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
