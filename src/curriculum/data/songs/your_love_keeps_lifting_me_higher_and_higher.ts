import type { Song } from '@/curriculum/types/songLibrary';

export const your_love_keeps_lifting_me_higher_and_higher: Song = {
  id: 'your_love_keeps_lifting_me_higher_and_higher',
  title: '(Your Love Keeps Lifting Me) Higher And Higher',
  artist: 'Jackie Wilson',
  year: 1967,
  historicalDescription:
    "Jackie Wilson releases '(Your Love Keeps Lifting Me) Higher And Higher' in 1967, a euphoric burst of soul that showcases his extraordinary vocal range and infectious energy. The song becomes one of his signature recordings, blending gospel fervor with polished pop production and cementing Wilson's reputation as one of the most dynamic performers of his era — a direct influence on Michael Jackson and generations of soul singers that follow.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 192,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [] }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=mzDVaKRApcg' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/jackie-wilson.webp',
  popularity: 50,
};
