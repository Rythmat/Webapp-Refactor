import type { Song } from '@/curriculum/types/songLibrary';

export const the_bird: Song = {
  id: 'the_bird',
  title: 'The Bird',
  artist: 'Anderson .Paak',
  composer: 'Anderson .Paak, Ron Avant and Shafiq Husayn',
  year: 2016,
  historicalDescription:
    "Anderson .Paak opens his breakthrough album 'Malibu' with 'The Bird', a warm, gospel-tinged portrait of his family and childhood in Oxnard, California. Over a soulful loop of seventh and ninth chords, .Paak sings about a troubled upbringing with gratitude rather than bitterness, and 'Malibu' earns a Grammy nomination for Best Urban Contemporary Album.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 76,
  timeSignature: [4, 4],
  difficulty: 3,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    {
      name: 'Anderson .Paak',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'anderson-paak',
    },
    {
      name: 'Anderson .Paak',
      role: 'songwriter',
      artistGlobeId: 'anderson-paak',
    },
    { name: 'Ron Avant', role: 'songwriter', artistGlobeId: 'ron-avant' },
    {
      name: 'Shafiq Husayn',
      role: 'songwriter',
      artistGlobeId: 'shafiq-husayn',
    },
    {
      name: 'Anderson .Paak',
      role: 'producer',
      artistGlobeId: 'anderson-paak',
    },
  ],
  releases: [{ releaseId: 'anderson-paak-malibu' }],
  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom9', chordName: 'E♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 dom9', chordName: 'E♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom9', chordName: 'E♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 dom9', chordName: 'E♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom9', chordName: 'E♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom9', chordName: 'E♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '5 dom7sus4',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 dom9', chordName: 'E♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom9', chordName: 'D♭9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj7', chordName: 'Emaj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          cue: 'Repeat and Fade',
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=KXdW0g6jAxE' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
