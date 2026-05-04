import type { Song } from '@/curriculum/types/songLibrary';

export const if_you_want_me_to_stay: Song = {
  id: 'if_you_want_me_to_stay',
  title: "If You Want Me To Stay",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 105,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
