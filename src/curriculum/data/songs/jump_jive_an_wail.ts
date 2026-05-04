import type { Song } from '@/curriculum/types/songLibrary';

export const jump_jive_an_wail: Song = {
  id: 'jump_jive_an_wail',
  title: "Jump, Jive An' Wail",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 200,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'C♯min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F♯7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'C♯min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F♯7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
