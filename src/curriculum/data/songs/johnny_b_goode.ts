import type { Song } from '@/curriculum/types/songLibrary';

export const johnny_b_goode: Song = {
  id: 'johnny_b_goode',
  title: "Johnny B. Goode",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 170,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['blues_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
