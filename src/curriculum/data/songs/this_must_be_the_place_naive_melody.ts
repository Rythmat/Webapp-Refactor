import type { Song } from '@/curriculum/types/songLibrary';

export const this_must_be_the_place_naive_melody: Song = {
  id: 'this_must_be_the_place_naive_melody',
  title: 'This Must Be The Place (Naive Melody)',
  artist: 'Talking Heads / Tina Weymouth',
  year: undefined,

  historicalDescription:
    "Talking Heads release 'This Must Be The Place (Naive Melody)', a rare love song from a band better known for anxious, cerebral art-rock. David Byrne's deliberately simple guitar lines — hence the subtitle — give the track a warm, disarming quality that stands apart from the era's edgier new wave. It becomes one of the band's most enduring songs, a gentle emotional anchor in their otherwise restless catalog.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '3 maj/7', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/7', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Fb2q141rMNE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
