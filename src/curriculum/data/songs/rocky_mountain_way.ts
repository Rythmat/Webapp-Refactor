import type { Song } from '@/curriculum/types/songLibrary';

export const rocky_mountain_way: Song = {
  id: 'rocky_mountain_way',
  title: 'Rocky Mountain Way',
  artist: 'Joe Walsh',
  year: 1973,
  historicalDescription:
    "Joe Walsh's 'Rocky Mountain Way' becomes a blues-rock anthem rooted in his time living in Colorado after leaving the James Gang. The song's talk box guitar riff — one of the earliest and most recognizable uses of the effect in rock — cements Walsh's reputation as one of America's most inventive guitarists, paving his way into the Eagles.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 82,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Joe Vitale',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'joe-vitale',
    },
    {
      name: 'Joe Vitale',
      role: 'performer',
      instrument: 'electric-piano',
      artistGlobeId: 'joe-vitale',
    },
    {
      name: 'Joe Walsh',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'joe-walsh',
      primary: true,
    },
    {
      name: 'Joe Walsh',
      role: 'vocals',
      artistGlobeId: 'joe-walsh',
      primary: true,
    },
    {
      name: 'Joe Vitale',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'joe-vitale',
    },
    { name: 'Joe Walsh', role: 'songwriter', artistGlobeId: 'joe-walsh' },
    { name: 'Rocke Grace', role: 'songwriter', artistGlobeId: 'rocke-grace' },
    {
      name: 'Kenny Passarelli',
      role: 'performer',
      artistGlobeId: 'kenny-passarelli',
    },
    { name: 'Bill Szymczyk', role: 'producer', artistGlobeId: 'bill-szymczyk' },
    { name: 'Joe Vitale', role: 'songwriter', artistGlobeId: 'joe-vitale' },
    {
      name: 'Kenny Passarelli',
      role: 'songwriter',
      artistGlobeId: 'kenny-passarelli',
    },
    { name: 'Joe Walsh', role: 'producer', artistGlobeId: 'joe-walsh' },
    {
      name: 'Joe Walsh',
      role: 'performer',
      artistGlobeId: 'joe-walsh',
      primary: true,
    },
    { name: 'Rocke Grace', role: 'performer', artistGlobeId: 'rocke-grace' },
    {
      name: 'Joe Vitale',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'joe-vitale',
    },
    {
      name: 'Joe Walsh',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'joe-walsh',
      primary: true,
    },
    {
      name: 'Kenny Passarelli',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'kenny-passarelli',
    },
    { name: 'Joe Vitale', role: 'performer', artistGlobeId: 'joe-vitale' },
    {
      name: 'Rocke Grace',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'rocke-grace',
    },
    {
      name: 'Kenny Passarelli',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'kenny-passarelli',
    },
  ],
  releases: [
    {
      releaseId: 'joe-walsh-the-smoker-you-drink-the-player-you-get',
      track: 1,
    },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=zdTjzYOqhTo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/joe-walsh.webp',
  popularity: 50,
};
