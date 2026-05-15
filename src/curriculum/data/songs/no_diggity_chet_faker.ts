import type { Song } from '@/curriculum/types/songLibrary';

export const no_diggity_chet_faker: Song = {
  id: 'no_diggity_chet_faker',
  title: 'No Diggity',
  artist: 'Chet Faker',
  year: 2012,
  historicalDescription:
    "Australian artist Chet Faker releases a brooding, stripped-back cover of Blackstreet's 1996 R&B classic 'No Diggity', transforming the slick hip-hop production into something sparse and intimate. The cover spreads rapidly online, introducing Faker to a global audience and establishing his signature style — soulful vocals draped over minimalist electronic arrangements. It becomes one of the most celebrated cover versions of the internet era.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 158,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['R&B'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=z4EvQOpgp9o' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
