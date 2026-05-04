import type { Song } from '@/curriculum/types/songLibrary';

export const sneakin_sally_through_the_alley: Song = {
  id: 'sneakin_sally_through_the_alley',
  title: "Sneakin' Sally Through The Alley",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
