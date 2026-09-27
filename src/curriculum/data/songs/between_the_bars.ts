import type { Song } from '@/curriculum/types/songLibrary';

export const between_the_bars: Song = {
  id: 'between_the_bars',
  title: 'Between The Bars',
  artist: 'Elliott Smith',
  year: 1996,
  historicalDescription:
    "Elliott Smith releases 'Between The Bars' on his album 'Either/Or', a hushed, intimate portrait of addiction and longing that showcases his gift for confessional songwriting. The song's delicate fingerpicked guitar and close-mic'd vocals create an almost unbearable closeness — as if Smith is whispering directly into the listener's ear. It becomes one of his most beloved songs, later reaching wider audiences through its placement in Gus Van Sant's film 'Good Will Hunting'.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 133,
  timeSignature: [3, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 3 }],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'F/A', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'F/A', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 3 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '7 maj6', chordName: 'G♭6', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'F6', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7/6', chordName: 'C7/E', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7/6', chordName: 'C7/E', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 3 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 3 }],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'E♭min7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'E♭min7', beat: 1, duration: 3 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=p4cJv6s_Yjw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/elliott-smith.webp',
  popularity: 50,
};
