import type { Song } from '@/curriculum/types/songLibrary';

export const uptight_everythings_alright: Song = {
  id: 'uptight_everythings_alright',
  title: 'Uptight (Everything’s Alright)',
  artist: 'Stevie Wonder',
  year: 1965,
  historicalDescription:
    "Fifteen-year-old Stevie Wonder records 'Uptight (Everything's Alright)', his first major hit as a co-writer, signaling a new creative independence within the Motown machine. The track's irresistible groove and jubilant energy announce Wonder not merely as a child prodigy but as a genuine songwriting force — one who will go on to redefine soul music entirely.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 137,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 maj/1', chordName: 'B♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 maj/1', chordName: 'B♭/D♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=kZf3Byq8oLA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
