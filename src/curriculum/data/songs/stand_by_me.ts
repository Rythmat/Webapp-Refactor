import type { Song } from '@/curriculum/types/songLibrary';

export const stand_by_me: Song = {
  id: 'stand_by_me',
  title: 'Stand By Me',
  artist: 'Ben E. King',
  year: 1961,
  historicalDescription:
    "Ben E. King records 'Stand By Me' in 1961, drawing on the gospel tradition of Sam Cooke and the doo-wop of his years with The Drifters to create one of soul music's most enduring ballads. Its spare, hypnotic bass line and King's aching vocal become a template for intimacy in popular song — a sound so timeless it charts again decades later and crosses into virtually every corner of global music.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=hwZNL7QVJjE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/ben-e-king.webp',
  popularity: 50,
};
