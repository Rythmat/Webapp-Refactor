import type { Song } from '@/curriculum/types/songLibrary';

export const have_a_talk_with_god: Song = {
  id: 'have_a_talk_with_god',
  title: "Have A Talk With God",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 78,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'D♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
