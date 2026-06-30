import type { Song } from '@/curriculum/types/songLibrary';

export const ill_take_you_there: Song = {
  id: 'ill_take_you_there',
  title: 'I’ll Take You There',
  artist: 'The Staple Singers',
  year: 1972,
  historicalDescription:
    "The Staple Singers release 'I'll Take You There', a gospel-rooted anthem built on a hypnotic bass groove and Mavis Staples' commanding vocal lead. The song reaches #1 and becomes one of the defining moments of early 1970s soul — a rare recording that carries the moral weight of the Civil Rights movement into the mainstream with pure joy rather than protest.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=IhHBr7nMMio' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-staple-singers.webp',
  popularity: 50,
};
