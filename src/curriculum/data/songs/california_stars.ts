import type { Song } from '@/curriculum/types/songLibrary';

export const california_stars: Song = {
  id: 'california_stars',
  title: 'California Stars',
  artist: 'Wilco',
  year: 1998,
  historicalDescription:
    "Wilco records 'California Stars' for the Mermaid Avenue project, setting an unrecorded Woody Guthrie lyric to music alongside Billy Bragg. The collaboration bridges the gap between Guthrie's Depression-era folk tradition and the alt-country sound Wilco is forging in 1990s Chicago — a reminder that American roots music is a living, breathing inheritance.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['folk_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=FeQX-9Uxh_w' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
