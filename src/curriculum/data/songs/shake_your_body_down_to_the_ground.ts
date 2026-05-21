import type { Song } from '@/curriculum/types/songLibrary';

export const shake_your_body_down_to_the_ground: Song = {
  id: 'shake_your_body_down_to_the_ground',
  title: 'Shake Your Body (Down To The Ground)',
  artist: 'Michael Jackson',
  year: 1979,
  historicalDescription:
    "Michael Jackson and his brother Randy co-write 'Shake Your Body (Down To The Ground)', a funk-driven anthem that becomes one of The Jacksons' biggest hits. Released in 1979, the track showcases Michael's explosive vocal range and his gift for crafting irresistible grooves — a clear signal that a solo superstar is about to emerge. It points directly toward the disco-funk fusion that will define the early 1980s pop landscape.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 3,
      bars: [
        { chords: [], restBars: 3 },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=kldVOhKe4rg' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
