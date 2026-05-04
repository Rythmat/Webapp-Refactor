import type { Song } from '@/curriculum/types/songLibrary';

export const cake_by_the_ocean: Song = {
  id: 'cake_by_the_ocean',
  title: "Cake By The Ocean",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Amin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Amin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
