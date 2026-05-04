import type { Song } from '@/curriculum/types/songLibrary';

export const fame: Song = {
  id: 'fame',
  title: "Fame",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
