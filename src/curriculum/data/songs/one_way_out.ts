import type { Song } from '@/curriculum/types/songLibrary';

export const one_way_out: Song = {
  id: 'one_way_out',
  title: "One Way Out",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
