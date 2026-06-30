import type { Song } from '@/curriculum/types/songLibrary';

export const the_overload: Song = {
  id: 'the_overload',
  title: 'The Overload',
  artist: 'Talking Heads',
  year: 1980,
  historicalDescription:
    "Talking Heads close their landmark album 'Remain in Light' with 'The Overload', a deliberately stark, brooding piece the band writes as their imagining of what Joy Division sounds like — having never actually heard them. The result captures a rare moment of transatlantic post-punk convergence, two scenes arriving at the same bleak, cavernous sound from opposite sides of the Atlantic.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=fNpc8jv7Awk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
