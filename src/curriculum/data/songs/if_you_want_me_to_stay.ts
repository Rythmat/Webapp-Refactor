import type { Song } from '@/curriculum/types/songLibrary';

export const if_you_want_me_to_stay: Song = {
  id: 'if_you_want_me_to_stay',
  title: 'If You Want Me To Stay',
  artist: 'Sly and the Family Stone',
  year: undefined,

  historicalDescription:
    "Sly and the Family Stone release 'If You Want Me To Stay', a hypnotic funk statement that doubles as a personal ultimatum from Sly Stone himself — demanding respect and space on his own terms. The track's locked groove and understated cool stand in stark contrast to the chaotic turbulence surrounding the band at the time, capturing a genius in tension with his own fame.",
  key: 'B♭ minor',
  keyRoot: 70,
  mode: 'minor',
  tempo: 105,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [], restBars: 1 },
        { chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '♭3 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '♭3 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '♭3 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=gZFabOuF4Ps' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sly-and-the-family-stone.webp',
  popularity: 50,
};
