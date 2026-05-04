import type { Song } from '@/curriculum/types/songLibrary';

export const blurred_lines: Song = {
  id: 'blurred_lines',
  title: "Blurred Lines",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
