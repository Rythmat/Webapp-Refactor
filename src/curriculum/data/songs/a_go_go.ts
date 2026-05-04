import type { Song } from '@/curriculum/types/songLibrary';

export const a_go_go: Song = {
  id: 'a_go_go',
  title: "A Go Go",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Gmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Gmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Gmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
