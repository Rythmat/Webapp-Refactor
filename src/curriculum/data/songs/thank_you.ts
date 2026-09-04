import type { Song } from '@/curriculum/types/songLibrary';

export const thank_you: Song = {
  id: 'thank_you',
  title: 'Thank You',
  artist: 'Unknown Artist',
  year: undefined,

  historicalDescription:
    "With no confirmed artist or release details, this funk track titled 'Thank You' resists easy placement in the broader story of the genre. Funk's DNA — syncopated rhythms, bass-driven grooves, and communal energy — runs through countless songs sharing this title, from Sly Stone to Dido, each using gratitude as a vehicle for something deeper.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'section_e',
      label: 'Section E',
      repeatCount: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      repeatCount: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=jXScXVYEON4' },
  ],
  artistImageSource: 'commissioned',
  popularity: 50,
};
