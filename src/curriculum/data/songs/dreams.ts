import type { Song } from '@/curriculum/types/songLibrary';

export const dreams: Song = {
  id: 'dreams',
  title: "Dreams",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Amin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
