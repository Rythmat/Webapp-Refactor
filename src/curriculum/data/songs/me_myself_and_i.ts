import type { Song } from '@/curriculum/types/songLibrary';

export const me_myself_and_i: Song = {
  id: 'me_myself_and_i',
  title: "Me, Myself And I",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 84,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['hip_hop'],
  techniques: [],

  sections: [
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'E♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭min7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Dmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
