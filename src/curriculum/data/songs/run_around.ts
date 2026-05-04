import type { Song } from '@/curriculum/types/songLibrary';

export const run_around: Song = {
  id: 'run_around',
  title: "Run-Around",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 152,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['blues_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Amin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Amin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
