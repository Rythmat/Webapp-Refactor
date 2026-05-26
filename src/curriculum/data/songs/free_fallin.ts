import type { Song } from '@/curriculum/types/songLibrary';

export const free_fallin: Song = {
  id: 'free_fallin',
  title: 'Free Fallin’',
  artist: 'Tom Petty',
  year: 1989,
  historicalDescription:
    "Tom Petty releases 'Free Fallin'' as the lead single from his debut solo album 'Full Moon Fever', a sun-drenched love letter to Los Angeles and the San Fernando Valley. Co-written with Jeff Lynne, the song's effortless, open-hearted sound becomes one of Petty's most beloved anthems — a defining moment of late-1980s American rock that cements his status as a storyteller of everyday life.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 85,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1lWJXDG2i0A' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/tom-petty.webp',
  popularity: 50,
};
