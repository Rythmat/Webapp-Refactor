import type { Song } from '@/curriculum/types/songLibrary';

export const keep_your_soul_together: Song = {
  id: 'keep_your_soul_together',
  title: "Keep Your Soul Together",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 192,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funky_jazz'],
  techniques: [],

  sections: [
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Dmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Amin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'D♭dim7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
