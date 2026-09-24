import type { Song } from '@/curriculum/types/songLibrary';

export const johnny_b_goode: Song = {
  id: 'johnny_b_goode',
  title: 'Johnny B. Goode',
  artist: 'Chuck Berry',
  year: 1958,
  historicalDescription:
    "Chuck Berry records 'Johnny B. Goode' in 1958, distilling rock and roll down to its purest essence — a country boy with a guitar, dreaming of fame. The song's opening riff becomes one of the most recognizable in music history, directly shaping the hands of every guitarist who follows, from Keith Richards to Jimi Hendrix. It is rock and roll's own origin myth, written in real time.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 170,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=aKCt8ssC7cs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/chuck-berry.webp',
  popularity: 50,
};
