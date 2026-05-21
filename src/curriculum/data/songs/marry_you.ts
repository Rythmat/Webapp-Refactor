import type { Song } from '@/curriculum/types/songLibrary';

export const marry_you: Song = {
  id: 'marry_you',
  title: 'Marry You',
  artist: 'Bruno Mars',
  year: 2011,
  historicalDescription:
    "Bruno Mars releases 'Marry You' as part of his debut album era, capturing a carefree, spontaneous vision of romance that resonates far beyond radio play. The song becomes a cultural staple at weddings and flash mobs worldwide, cementing Mars as a hitmaker with an instinct for timeless, feel-good pop.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 144,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop_rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=dElRVQFqj-k' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
