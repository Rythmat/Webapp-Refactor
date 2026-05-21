import type { Song } from '@/curriculum/types/songLibrary';

export const no_diggity: Song = {
  id: 'no_diggity',
  title: 'No Diggity',
  artist: 'Chet Faker',
  year: 2012,
  historicalDescription:
    "Australian artist Chet Faker releases a haunting solo cover of Blackstreet's 1996 classic 'No Diggity', stripping the track down to brooding piano and his deep, smoky vocals. The recording circulates widely online, transforming a hip hop radio staple into something sparse and melancholic — and introducing Chet Faker to a global audience hungry for soulful, left-field R&B.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 158,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['r_and_b'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=z4EvQOpgp9o' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
