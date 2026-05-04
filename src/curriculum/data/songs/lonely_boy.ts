import type { Song } from '@/curriculum/types/songLibrary';

export const lonely_boy: Song = {
  id: 'lonely_boy',
  title: "Lonely Boy",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 166,
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
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
