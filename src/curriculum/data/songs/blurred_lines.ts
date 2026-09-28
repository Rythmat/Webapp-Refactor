import type { Song } from '@/curriculum/types/songLibrary';

export const blurred_lines: Song = {
  id: 'blurred_lines',
  title: 'Blurred Lines',
  artist: 'Robin Thicke',
  year: 2013,
  historicalDescription:
    "Robin Thicke's 'Blurred Lines' dominates the summer of 2013, becoming one of the best-selling singles of the year worldwide. Its groove-driven sound draws direct comparisons to Marvin Gaye's 1977 classic 'Got to Give It Up', sparking a landmark copyright lawsuit that reshapes how the music industry thinks about the line between inspiration and infringement.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [] }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=yyDUC1LUXSU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/robin-thicke.webp',
  popularity: 50,
};
