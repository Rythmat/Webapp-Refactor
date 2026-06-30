import type { Song } from '@/curriculum/types/songLibrary';

export const best_of_my_love: Song = {
  id: 'best_of_my_love',
  title: 'Best Of My Love',
  artist: 'The Emotions',
  year: 1996,
  historicalDescription:
    "The Emotions bring their silky harmonies back to the charts with 'Best Of My Love', a buoyant pop track that leans into the decade's taste for feel-good nostalgia. The song reintroduces the Chicago-bred sister trio to a new generation raised on contemporary R&B, reminding listeners that the warmth and precision of classic soul vocal groups still has a place in the 1990s.",
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
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [{ degree: '2 7', chordName: 'D7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Pbg66_KdJ5Q' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-emotions.webp',
  popularity: 50,
};
