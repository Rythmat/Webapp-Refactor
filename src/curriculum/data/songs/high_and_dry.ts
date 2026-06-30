import type { Song } from '@/curriculum/types/songLibrary';

export const high_and_dry: Song = {
  id: 'high_and_dry',
  title: 'High And Dry',
  artist: 'Radiohead',
  year: 1995,
  historicalDescription:
    "Radiohead releases 'High and Dry' as a single from their landmark album 'The Bends', marking a moment of surprising accessibility for a band already pushing the boundaries of alternative rock. Written during the 'Pablo Honey' era but saved for 'The Bends', the song's melodic restraint and Thom Yorke's plaintive vocals help cement Radiohead's transition from one-hit-wonder fears to one of Britain's most vital rock acts of the decade.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 86,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 2 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=7qFfFVSerQo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/radiohead.webp',
  popularity: 50,
};
