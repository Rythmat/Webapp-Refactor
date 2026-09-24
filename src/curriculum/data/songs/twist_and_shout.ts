import type { Song } from '@/curriculum/types/songLibrary';

export const twist_and_shout: Song = {
  id: 'twist_and_shout',
  title: 'Twist And Shout',
  artist: 'The Beatles/Isley Brothers',
  year: undefined,

  historicalDescription:
    "The Isley Brothers record 'Twist and Shout' in 1962, igniting a raw, call-and-response frenzy that captures the explosive energy of early rock and roll. The Beatles then cover it on their debut album 'Please Please Me', with John Lennon delivering a throat-shredding vocal recorded in a single take at the end of a marathon session. The cover introduces the song to a global audience and becomes one of the most iconic moments in Beatles history.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 126,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=cTaqn8_gMR0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
